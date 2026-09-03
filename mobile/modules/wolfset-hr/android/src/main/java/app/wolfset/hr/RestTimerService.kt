package app.wolfset.hr

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
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

/**
 * The doze-proof rest timer (build plan: the native seam's first job). The session's JS
 * keeps the truth — absolute timestamps, so it is never wrong when awake — but Android
 * throttles JS once the screen is off and the phone is in a pocket, which is exactly when
 * a rest runs. This foreground service holds a wake lock for the length of the rest, shows
 * a live countdown in the notification shade, and at the end buzzes and posts "Rest over"
 * so the phone need not be looked at. It also watches the heart-rate bus: the first sample
 * under the recovered threshold buzzes once ("Recovered") — the gate's verdict, delivered
 * while JS sleeps. Neither alert moves the session by itself: the end of the rest is sent
 * to JS (`onRestEnded`) and the machine advances there (brief §01).
 *
 * Started by `WolfsetHrModule.startRest` when a rest begins, stopped by `endRest` when it
 * ends for any reason (timer, Continue, workout ended, screen left).
 */
class RestTimerService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private var wakeLock: PowerManager.WakeLock? = null
    private var endsAtMs = 0L
    private var recoveredBelowBpm = Double.NaN
    private var recoveredShown = false

    private val endRunnable = Runnable { onTimerEnd() }
    private val hrListener = HrBus.Listener { name, payload ->
        if (name == HrBus.EVENT_SAMPLE) onSample(payload.getDouble("bpm"))
    }

    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_TIMER, "Rest timer", NotificationManager.IMPORTANCE_LOW).apply {
                description = "The countdown while you rest between sets"
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ALERT, "Rest alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Rest over, and recovered"
                enableVibration(true)
            },
        )
        HrBus.addListener(hrListener)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // A rest that arrives with no end time cannot be timed — nothing to hold.
        val endsAt = intent?.getLongExtra(EXTRA_ENDS_AT, 0L) ?: 0L
        if (intent == null || endsAt == 0L) {
            stopSelf()
            return START_NOT_STICKY
        }
        endsAtMs = endsAt
        recoveredBelowBpm = intent.getDouble(EXTRA_RECOVERED_BELOW)
        recoveredShown = false
        handler.removeCallbacks(endRunnable)
        notificationManager().cancel(NOTIF_ALERT)

        val started = runCatching {
            val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
            ServiceCompat.startForeground(this, NOTIF_TIMER, timerNotification("Resting"), type)
        }
        if (started.isFailure) {
            // Android 14+: the health type needs a runtime sensor permission; without it
            // the service cannot run. The JS fallback timer still ends the rest on screen.
            Log.w(TAG, "rest timer could not go foreground", started.exceptionOrNull())
            stopSelf()
            return START_NOT_STICKY
        }

        val remaining = (endsAtMs - System.currentTimeMillis()).coerceAtLeast(0L)
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wolfset:rest")
            .apply { acquire(remaining + WAKE_MARGIN_MS) }
        handler.postDelayed(endRunnable, remaining)
        Log.i(TAG, "rest timer armed: ${remaining / 1000} s, recovered below $recoveredBelowBpm bpm")
        // If the OS kills us mid-rest, come back with the same intent and re-arm.
        return START_REDELIVER_INTENT
    }

    private fun onTimerEnd() {
        val at = System.currentTimeMillis()
        Log.i(TAG, "rest over")
        alert(NOTIF_ALERT, "Rest over", "Next set", CHANNEL_ALERT)
        vibrate()
        HrBus.restEnded(at, endsAtMs)
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun onSample(bpm: Double) {
        if (recoveredShown || recoveredBelowBpm.isNaN() || bpm >= recoveredBelowBpm) return
        recoveredShown = true
        Log.i(TAG, "recovered at ${bpm.toInt()} bpm")
        alert(NOTIF_ALERT, "Recovered", "${bpm.toInt()} bpm — Continue when you're ready", CHANNEL_ALERT)
        vibrate()
        notificationManager().notify(NOTIF_TIMER, timerNotification("Recovered · ${bpm.toInt()} bpm"))
    }

    private fun timerNotification(text: String): Notification =
        NotificationCompat.Builder(this, CHANNEL_TIMER)
            .setContentTitle("WOLFSET")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            // Android 12+ may hide a new foreground-service notification for up to 10 s;
            // a 90 s countdown wants to be visible from the first second.
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            // A live countdown drawn by the system: no ticking from us.
            .setWhen(endsAtMs)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setContentIntent(openApp())
            .build()

    private fun alert(id: Int, title: String, text: String, channel: String) {
        val n = NotificationCompat.Builder(this, channel)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setTimeoutAfter(ALERT_TIMEOUT_MS)
            .setContentIntent(openApp())
            .build()
        notificationManager().notify(id, n)
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

    private fun openApp(): PendingIntent? {
        val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
        return PendingIntent.getActivity(
            this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun notificationManager() =
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    override fun onDestroy() {
        handler.removeCallbacks(endRunnable)
        HrBus.removeListener(hrListener)
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "WolfsetHr"
        private const val CHANNEL_TIMER = "wolfset-rest"
        private const val CHANNEL_ALERT = "wolfset-rest-alerts"
        private const val NOTIF_TIMER = 2
        private const val NOTIF_ALERT = 3
        private const val EXTRA_ENDS_AT = "endsAt"
        private const val EXTRA_RECOVERED_BELOW = "recoveredBelow"
        private const val WAKE_MARGIN_MS = 10_000L
        private const val ALERT_TIMEOUT_MS = 90_000L

        fun start(context: Context, endsAtMs: Long, recoveredBelowBpm: Double) {
            context.startForegroundService(
                Intent(context, RestTimerService::class.java)
                    .putExtra(EXTRA_ENDS_AT, endsAtMs)
                    .putExtra(EXTRA_RECOVERED_BELOW, recoveredBelowBpm),
            )
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, RestTimerService::class.java))
        }

        private fun Intent.getDouble(key: String) = getDoubleExtra(key, Double.NaN)
    }
}
