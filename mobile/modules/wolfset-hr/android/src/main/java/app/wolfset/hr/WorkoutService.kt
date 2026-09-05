package app.wolfset.hr

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext

/**
 * The workout's one foreground service — "Workout in progress" in the shade from the first
 * set to Finish. It exists so the workout can run with the phone in a pocket, or in a
 * locker, while the watch drives it (build plan Phase 7, the phone-less workout):
 *
 * 1. **It keeps the workout brain alive.** The session controller is JavaScript
 *    (features/set-loop/session-controller.ts) and Android throttles a backgrounded app's
 *    JS timers, then kills the process. A foreground service keeps the process, and a
 *    React Native *headless task* (`WolfsetWorkout`, registered in mobile/index.ts) keeps
 *    the timers running while the app is not on screen. The task is a promise that
 *    resolves when the session closes — nothing more.
 * 2. **It boots JavaScript when the app is dead.** Next Workout on the watch reaches
 *    HrListenerService with no React running (the Data Layer wakes the native listener,
 *    not React). Starting this service starts the React host, and the headless task then
 *    starts the session from the plan, which publishes the watch's Set screen. Whether
 *    Android 12+ allows that start from the background is the spike's open question: when
 *    it refuses, the fallback below posts a notification the user taps to start.
 * 3. **It is the doze-proof rest timer** (docs/rest-timer.md), unchanged in behaviour: a
 *    wake lock for the length of each rest, the countdown drawn in this same notification,
 *    and at the end the buzz, the ding and "Rest over" — the only alert; recovering early
 *    is shown, never announced (Justin, 2026-09-03). "Rest over" goes back to JS
 *    (`onRestEnded`) and the machine advances there — native never moves the loop. One
 *    service rather than two so a workout never has to start a second foreground service
 *    from the background, which is what Android 12+ restricts.
 *
 * Commands arrive as intents (the companion functions): start the workout (with the day's
 * name, and the watch action that caused it when JavaScript has to be booted), arm a rest,
 * end a rest, ask "Still lifting?" (the forgotten-workout card — JavaScript keeps that
 * clock, features/set-loop/idle.ts), withdraw it, end the workout. A rest armed with no
 * workout under way — the Design Kit's test button — runs alone and the service stops
 * when it ends.
 */
class WorkoutService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var wakeLock: PowerManager.WakeLock? = null
    /** The day's name while a workout is under way; null when only a rest is running. */
    private var workoutTitle: String? = null
    private var endsAtMs = 0L
    private var player: MediaPlayer? = null
    /** The headless task's id while one runs in the current React context. */
    private var taskId: Int? = null

    private val endRunnable = Runnable { onTimerEnd() }

    override fun onCreate() {
        super.onCreate()
        running = true
        ensureChannels(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                workoutTitle = intent.getStringExtra(EXTRA_TITLE) ?: "Workout"
                if (!goForeground()) return START_NOT_STICKY
                // The workout is running: a "tap to open" from a refused start is stale.
                notificationManager().cancel(NOTIF_TAP_TO_OPEN)
                startJsTask(intent.getStringExtra(EXTRA_WATCH_ACTION))
                Log.i(TAG, "workout in progress: $workoutTitle")
            }
            ACTION_REST -> {
                val endsAt = intent.getLongExtra(EXTRA_ENDS_AT, 0L)
                // A rest that arrives with no end time cannot be timed — nothing to hold.
                if (endsAt == 0L) return START_NOT_STICKY
                endsAtMs = endsAt
                if (!goForeground()) return START_NOT_STICKY
                armRest()
            }
            ACTION_REST_END -> disarmRest()
            ACTION_ASK_STILL_LIFTING -> stillLifting(intent.getLongExtra(EXTRA_ENDS_AT, 0L))
            ACTION_DISMISS_STILL_LIFTING -> notificationManager().cancel(NOTIF_STILL_LIFTING)
            ACTION_STOP -> {
                Log.i(TAG, "workout over")
                workoutTitle = null
                notificationManager().cancel(NOTIF_STILL_LIFTING)
                disarmRest()
            }
            else -> {
                stopSelf()
                return START_NOT_STICKY
            }
        }
        // If the OS kills us mid-workout, come back with the same intent: a rest re-arms,
        // a start re-boots JavaScript, which resumes the session from its snapshot.
        return START_REDELIVER_INTENT
    }

    /** Foreground with the current notification. False — and the service stops — when
     *  Android refuses: no sensor permission for the health type (Android 14+), or a start
     *  from the background it let through at the call site but not here (Android 12+),
     *  for which the "tap to open" notification is the fallback. */
    private fun goForeground(): Boolean {
        val started = runCatching {
            val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
            ServiceCompat.startForeground(this, NOTIF_WORKOUT, notification(), type)
        }
        val error = started.exceptionOrNull() ?: return true
        Log.w(TAG, "workout service could not go foreground", error)
        workoutTitle?.let { tapToOpen(this, it) }
        workoutTitle = null
        stopSelf()
        return false
    }

    /** The headless task keeps the session's JavaScript running with the app off screen,
     *  and starts the React host when nothing is running at all (the watch started the
     *  workout with the app dead). One task per React context; a second start while it
     *  runs changes nothing — the watch action reaches JavaScript as a bus event then. */
    private fun startJsTask(watchAction: String?) {
        val host = (application as ReactApplication).reactHost ?: return
        val data = Arguments.createMap().apply { putString("watchAction", watchAction) }
        // No timeout: the task lives as long as the workout. Allowed in the foreground so
        // a workout started on the phone keeps its timers when the phone goes in a pocket.
        val config = HeadlessJsTaskConfig(TASK_WORKOUT, data, 0L, true)
        val context = host.currentReactContext
        if (context != null) {
            runTask(context, config)
            return
        }
        Log.i(TAG, "no React context; booting JavaScript for the workout")
        host.addReactInstanceEventListener(
            object : ReactInstanceEventListener {
                override fun onReactContextInitialized(context: ReactContext) {
                    host.removeReactInstanceEventListener(this)
                    handler.post { runTask(context, config) }
                }
            },
        )
        host.start()
    }

    private fun runTask(context: ReactContext, config: HeadlessJsTaskConfig) {
        val tasks = HeadlessJsTaskContext.getInstance(context)
        val running = taskId
        if (running != null && tasks.isTaskRunning(running)) return
        taskId = runCatching { tasks.startTask(config) }
            .onFailure { Log.w(TAG, "could not start the workout task", it) }
            .getOrNull()
    }

    private fun armRest() {
        handler.removeCallbacks(endRunnable)
        notificationManager().cancel(NOTIF_ALERT)
        val remaining = (endsAtMs - System.currentTimeMillis()).coerceAtLeast(0L)
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wolfset:rest")
            .apply { acquire(remaining + WAKE_MARGIN_MS) }
        handler.postDelayed(endRunnable, remaining)
        Log.i(TAG, "rest timer armed: ${remaining / 1000} s")
    }

    /** The rest ended for any reason (timer, Continue, workout over, skipped): back to
     *  "Workout in progress", or gone when no workout is under way. */
    private fun disarmRest() {
        handler.removeCallbacks(endRunnable)
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        endsAtMs = 0L
        if (workoutTitle != null) notificationManager().notify(NOTIF_WORKOUT, notification()) else stopAndRemove()
    }

    private fun onTimerEnd() {
        val at = System.currentTimeMillis()
        val endsAt = endsAtMs
        Log.i(TAG, "rest over")
        alert("Rest over", "Next set")
        vibrate()
        ding()
        HrBus.restEnded(at, endsAt)
        disarmRest()
    }

    /** "Still lifting?" on the phone: a buzzing card on the alert channel that says when
     *  the workout ends by itself and goes away on its own then; tapping it opens the
     *  session, which counts as the lifter showing up. */
    private fun stillLifting(endsAtMs: Long) {
        val minutes = ((endsAtMs - System.currentTimeMillis()).coerceAtLeast(0L) + 59_999L) / 60_000L
        val open = Intent(Intent.ACTION_VIEW, Uri.parse("wolfset://session")).setPackage(packageName)
        val n = NotificationCompat.Builder(this, CHANNEL_ALERT)
            .setContentTitle("Still lifting?")
            .setContentText("${workoutTitle ?: "Your workout"} ends in $minutes min unless you log a set")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setTimeoutAfter((endsAtMs - System.currentTimeMillis()).coerceAtLeast(1_000L))
            .setContentIntent(
                PendingIntent.getActivity(this, 2, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE),
            )
            .build()
        notificationManager().notify(NOTIF_STILL_LIFTING, n)
        vibrate()
        Log.i(TAG, "still lifting? ends in $minutes min")
    }

    private fun stopAndRemove() {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    /** One notification for the whole workout: the day's name, or the countdown while a
     *  rest runs — drawn by the system, no ticking from us. */
    private fun notification(): Notification {
        val resting = endsAtMs != 0L
        val builder = NotificationCompat.Builder(this, CHANNEL_WORKOUT)
            .setContentTitle("WOLFSET")
            .setContentText(if (resting) "Resting" else workoutTitle ?: "Workout in progress")
            .setSubText(if (resting) workoutTitle else null)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            // Android 12+ may hide a new foreground-service notification for up to 10 s;
            // a 90 s countdown wants to be visible from the first second.
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(openApp())
        if (resting) {
            builder.setWhen(endsAtMs).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true)
        } else {
            builder.setShowWhen(false)
        }
        return builder.build()
    }

    private fun alert(title: String, text: String) {
        val n = NotificationCompat.Builder(this, CHANNEL_ALERT)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setTimeoutAfter(ALERT_TIMEOUT_MS)
            .setContentIntent(openApp())
            .build()
        notificationManager().notify(NOTIF_ALERT, n)
    }

    private fun vibrate() {
        val vibrator = if (Build.VERSION.SDK_INT >= 31) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        runCatching { vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 350, 150, 350), -1)) }
    }

    /** The bell (res/raw/rest_ding.wav) on the alarm stream: through headphones, over a
     *  vibrate-mode ringer, ducking a podcast for under a second rather than pausing it. */
    private fun ding() {
        val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(attrs)
            .build()
        runCatching {
            player?.release()
            audio.requestAudioFocus(focus)
            player = MediaPlayer.create(this, R.raw.rest_ding, attrs, audio.generateAudioSessionId()).apply {
                setOnCompletionListener {
                    it.release()
                    player = null
                    audio.abandonAudioFocusRequest(focus)
                }
                start()
            }
            Log.i(TAG, "ding")
        }.onFailure {
            Log.w(TAG, "ding failed", it)
            audio.abandonAudioFocusRequest(focus)
        }
    }

    private fun openApp(): PendingIntent? {
        val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
        return PendingIntent.getActivity(
            this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun notificationManager() =
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    override fun onDestroy() {
        running = false
        handler.removeCallbacks(endRunnable)
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        // A ding already playing finishes on its own; the player frees itself on completion.
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "WolfsetHr"
        /** The headless task's key, registered in mobile/index.ts. */
        const val TASK_WORKOUT = "WolfsetWorkout"
        private const val CHANNEL_TIMER_V1 = "wolfset-rest"
        private const val CHANNEL_WORKOUT = "wolfset-workout"
        private const val CHANNEL_ALERT_V1 = "wolfset-rest-alerts"
        private const val CHANNEL_ALERT = "wolfset-rest-alerts-v2"
        private const val NOTIF_WORKOUT = 2
        private const val NOTIF_ALERT = 3
        private const val NOTIF_TAP_TO_OPEN = 4
        private const val NOTIF_STILL_LIFTING = 5
        private const val ACTION_START = "app.wolfset.hr.WORKOUT_START"
        private const val ACTION_REST = "app.wolfset.hr.REST"
        private const val ACTION_REST_END = "app.wolfset.hr.REST_END"
        private const val ACTION_STOP = "app.wolfset.hr.WORKOUT_STOP"
        private const val ACTION_ASK_STILL_LIFTING = "app.wolfset.hr.STILL_LIFTING"
        private const val ACTION_DISMISS_STILL_LIFTING = "app.wolfset.hr.STILL_LIFTING_DISMISS"
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_WATCH_ACTION = "watchAction"
        private const val EXTRA_ENDS_AT = "endsAt"
        private const val WAKE_MARGIN_MS = 10_000L
        private const val ALERT_TIMEOUT_MS = 90_000L

        /** True between onCreate and onDestroy: a running service takes plain starts,
         *  which Android allows from the background once the app has a foreground service. */
        @Volatile
        private var running = false

        private fun intent(context: Context, action: String) =
            Intent(context, WorkoutService::class.java).setAction(action)

        /** A workout is under way (or the watch wants one): hold the process and the
         *  notification until `stop`. `watchAction` names the wrist tap that asked, for a
         *  JavaScript that has to be booted first. Android 12+ refuses a *foreground* start
         *  from the background right here, at the call — the watch's tap then becomes the
         *  "tap to open" notification, never a dead end (Justin, 2026-09-04). */
        fun start(context: Context, title: String, watchAction: String? = null) {
            val intent = intent(context, ACTION_START).putExtra(EXTRA_TITLE, title).putExtra(EXTRA_WATCH_ACTION, watchAction)
            if (running) {
                command(context, intent)
                return
            }
            runCatching { context.startForegroundService(intent) }
                .onFailure {
                    Log.w(TAG, "workout service refused from the background; asking for a tap", it)
                    tapToOpen(context, title)
                }
        }

        /** Arm a rest. With the workout service up (the normal case) a plain start; alone
         *  — the Design Kit's button — a foreground start, and a refusal leaves the JS timer. */
        fun startRest(context: Context, endsAtMs: Long) {
            val intent = intent(context, ACTION_REST).putExtra(EXTRA_ENDS_AT, endsAtMs)
            if (running) {
                command(context, intent)
                return
            }
            runCatching { context.startForegroundService(intent) }
                .onFailure { Log.w(TAG, "rest timer refused from the background; JS timer only", it) }
        }

        fun endRest(context: Context) = command(context, intent(context, ACTION_REST_END))

        fun askStillLifting(context: Context, endsAtMs: Long) =
            command(context, intent(context, ACTION_ASK_STILL_LIFTING).putExtra(EXTRA_ENDS_AT, endsAtMs))

        fun dismissStillLifting(context: Context) = command(context, intent(context, ACTION_DISMISS_STILL_LIFTING))

        fun stop(context: Context) = command(context, intent(context, ACTION_STOP))

        /** A plain start reaches a service that is already up; with none running there is
         *  nothing to command, and Android may refuse the start from the background —
         *  either way, nothing to do. */
        private fun command(context: Context, intent: Intent) {
            runCatching { context.startService(intent) }
                .onFailure { Log.i(TAG, "${intent.action} with no workout service running") }
        }

        /** Android refused to run the workout from the background: a notification whose
         *  tap opens the session screen — a user action, always allowed — which holds the
         *  service from the foreground and the workout runs from the watch from then on. */
        private fun tapToOpen(context: Context, title: String) {
            ensureChannels(context)
            val open = Intent(Intent.ACTION_VIEW, Uri.parse("wolfset://session")).setPackage(context.packageName)
            val n = NotificationCompat.Builder(context, CHANNEL_ALERT)
                .setContentTitle("$title from your watch")
                .setContentText("Tap once so it can run with the phone in your pocket")
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(
                    PendingIntent.getActivity(context, 1, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE),
                )
                .build()
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIF_TAP_TO_OPEN, n)
        }

        private fun ensureChannels(context: Context) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_WORKOUT, "Workout", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "The workout under way, and the countdown while you rest between sets"
                },
            )
            // The alert channel is silent: the ding is ours (alarm stream), not the ringer's,
            // so it sounds on a phone set to vibrate. A channel's sound is fixed at creation,
            // hence the versioned id; the first versions are removed on upgrade.
            nm.deleteNotificationChannel(CHANNEL_ALERT_V1)
            nm.deleteNotificationChannel(CHANNEL_TIMER_V1)
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ALERT, "Rest alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Rest over"
                    enableVibration(true)
                    setSound(null, null)
                },
            )
        }
    }
}
