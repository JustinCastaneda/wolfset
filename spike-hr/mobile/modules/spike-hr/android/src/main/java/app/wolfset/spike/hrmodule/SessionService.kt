package app.wolfset.spike.hrmodule

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * The native seam this whole spike exists to prove: a foreground service that
 *  - keeps the process alive while the phone sits in a pocket, screen off,
 *  - runs the rest-timer countdown off elapsedRealtime (immune to JS throttling; if a tick
 *    is delayed, the *next* tick still reports the true remaining time),
 *  - arms an exact alarm as a backstop so the "done" event fires even if doze delays ticks,
 *  - pings the watch every 30s so clock skew stays estimated.
 */
class SessionService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var wakeLock: PowerManager.WakeLock? = null
    private lateinit var timerThread: HandlerThread
    private lateinit var timerHandler: Handler

    // Timer state, touched only on the timer thread.
    private var timerEndElapsed: Long = 0
    private var timerDurationMs: Long = 0
    private var timerRunning = false

    private val tick = object : Runnable {
        override fun run() {
            if (!timerRunning) return
            val remaining = timerEndElapsed - SystemClock.elapsedRealtime()
            if (remaining <= 0) {
                finishTimer()
            } else {
                SpikeBus.onTimer("running", remaining, timerDurationMs)
                timerHandler.postDelayed(this, TICK_MS)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        startAsForeground()
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wolfset-spike:session").apply { acquire() }
        timerThread = HandlerThread("wolfset-spike-timer").apply { start() }
        timerHandler = Handler(timerThread.looper)

        // Periodic ping → watch answers with its clock → SpikeBus refines the skew estimate.
        scope.launch {
            val messageClient = Wearable.getMessageClient(this@SessionService)
            val nodeClient = Wearable.getNodeClient(this@SessionService)
            while (true) {
                runCatching {
                    val nodes = nodeClient.connectedNodes.await()
                    if (nodes.isEmpty()) SpikeBus.onLinkNote("no connected watch")
                    nodes.forEach { node ->
                        val payload = System.currentTimeMillis().toString().toByteArray()
                        messageClient.sendMessage(node.id, PATH_PING, payload).await()
                    }
                }.onFailure { Log.w(TAG, "ping failed", it) }
                delay(30_000)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_TIMER -> {
                val durationMs = intent.getLongExtra(EXTRA_DURATION_MS, 180_000)
                timerHandler.post { startTimer(durationMs) }
            }
            ACTION_STOP_TIMER -> timerHandler.post { stopTimer() }
            ACTION_TIMER_ALARM -> timerHandler.post { if (timerRunning) tick.run() }
        }
        return START_STICKY
    }

    private fun startTimer(durationMs: Long) {
        timerDurationMs = durationMs
        timerEndElapsed = SystemClock.elapsedRealtime() + durationMs
        timerRunning = true
        armCompletionAlarm(durationMs)
        SpikeBus.onTimer("running", durationMs, durationMs)
        timerHandler.removeCallbacks(tick)
        timerHandler.postDelayed(tick, TICK_MS)
    }

    private fun stopTimer() {
        timerRunning = false
        timerHandler.removeCallbacks(tick)
        cancelCompletionAlarm()
        SpikeBus.onTimer("idle", 0, timerDurationMs)
    }

    private fun finishTimer() {
        timerRunning = false
        timerHandler.removeCallbacks(tick)
        cancelCompletionAlarm()
        SpikeBus.onTimer("done", 0, timerDurationMs)
    }

    // Backstop: even if doze delays handler ticks, this fires at the deadline. Exact alarms
    // may be denied on Android 14+ (SCHEDULE_EXACT_ALARM); fall back to an inexact
    // allow-while-idle alarm and let the spike record whatever drift that produces.
    private fun armCompletionAlarm(durationMs: Long) {
        val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val triggerAt = SystemClock.elapsedRealtime() + durationMs
        val pi = alarmPendingIntent()
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi)
        } else {
            SpikeBus.onLinkNote("exact alarms denied — using inexact backstop")
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi)
        }
    }

    private fun cancelCompletionAlarm() {
        (getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarmPendingIntent())
    }

    private fun alarmPendingIntent(): PendingIntent {
        val intent = Intent(this, SessionService::class.java).setAction(ACTION_TIMER_ALARM)
        // getForegroundService: the alarm may fire after doze killed us; a plain service
        // start from the background would be denied.
        return PendingIntent.getForegroundService(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun startAsForeground() {
        val channelId = "wolfset-spike-session"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "Workout session", NotificationManager.IMPORTANCE_LOW)
        )
        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Wolfset spike session")
            .setContentText("Rest timer + HR link active")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
        val type =
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE else 0
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
    }

    override fun onDestroy() {
        timerHandler.post { stopTimer() }
        timerThread.quitSafely()
        wakeLock?.let { if (it.isHeld) it.release() }
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "WolfsetSessionService"
        private const val NOTIFICATION_ID = 2
        private const val TICK_MS = 250L
        const val PATH_PING = "/wolfset-spike/ping"

        const val ACTION_START_TIMER = "app.wolfset.spike.START_TIMER"
        const val ACTION_STOP_TIMER = "app.wolfset.spike.STOP_TIMER"
        const val ACTION_TIMER_ALARM = "app.wolfset.spike.TIMER_ALARM"
        const val EXTRA_DURATION_MS = "durationMs"

        fun start(context: Context) {
            context.startForegroundService(Intent(context, SessionService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, SessionService::class.java))
        }

        fun startTimer(context: Context, durationMs: Long) {
            context.startForegroundService(
                Intent(context, SessionService::class.java)
                    .setAction(ACTION_START_TIMER)
                    .putExtra(EXTRA_DURATION_MS, durationMs)
            )
        }

        fun stopTimer(context: Context) {
            context.startForegroundService(
                Intent(context, SessionService::class.java).setAction(ACTION_STOP_TIMER)
            )
        }
    }
}
