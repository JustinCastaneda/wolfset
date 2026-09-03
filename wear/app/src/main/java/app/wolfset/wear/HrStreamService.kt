package app.wolfset.wear

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.BatchingMode
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import androidx.health.services.client.data.HeartRateAccuracy
import androidx.health.services.client.data.SampleDataPoint
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

/**
 * The heart-rate stream: a health foreground service that holds an active Health Services
 * exercise session and sends every sample to the phone over the Wearable Data Layer.
 *
 * Why an exercise session and not a plain sensor read: Wear OS batches sensor delivery
 * whenever the watch is not being looked at (ambient / screen off) and only flushes when
 * the wrist is raised — the 141 s stalls of spike session 2. The documented way out is the
 * HEART_RATE_5_SECONDS batching override, which only an active exercise may request. With
 * it, samples arrive every ~5 s in ambient (spike session 3: p50 6.0 s, p95 8.4 s, 0 drops).
 * Support is per device and the client exposes no capability query, so the service tries
 * with the override and falls back without, stamping every sample with which one it got.
 */
class HrStreamService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var wakeLock: PowerManager.WakeLock? = null
    private var seq: Long = 0
    @Volatile private var nodes: List<Node> = emptyList()

    private val exerciseClient by lazy { HealthServices.getClient(this).exerciseClient }
    private val messageClient by lazy { Wearable.getMessageClient(this) }
    private val nodeClient by lazy { Wearable.getNodeClient(this) }

    // Health Services timestamps are durations since boot; anchor them to the wall clock.
    private val bootWallMs = System.currentTimeMillis() - SystemClock.elapsedRealtime()

    private val exerciseCallback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            update.latestMetrics.getData(DataType.HEART_RATE_BPM).forEach { onSample(it) }
        }

        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {
            WatchState.update { it.copy(status = availability.toString()) }
        }

        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) {}

        override fun onRegistered() {}

        override fun onRegistrationFailed(throwable: Throwable) {
            Log.e(TAG, "exercise callback registration failed", throwable)
            WatchState.update { it.copy(status = "Sensor unavailable") }
        }
    }

    override fun onCreate() {
        super.onCreate()
        startAsForeground()
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wolfset:hr").apply { acquire() }

        exerciseClient.setUpdateCallback(exerciseCallback)
        scope.launch { startExercise() }
        WatchState.update { it.copy(streaming = true, status = "Starting") }

        // Backstop for a phone-driven stream whose "stop" never arrives (app killed, phone
        // out of range, session abandoned): no workout lasts this long, so end it and free
        // the sensor rather than stream all night. The phone restarts it on resume.
        scope.launch {
            delay(MAX_STREAM_MS)
            Log.w(TAG, "stream hit the ${MAX_STREAM_MS / 60_000} min backstop; stopping")
            stopSelf()
        }

        // Refresh the connected phone list periodically rather than per sample.
        scope.launch {
            while (true) {
                runCatching { nodes = nodeClient.connectedNodes.await() }
                    .onFailure { Log.w(TAG, "node refresh failed", it) }
                WatchState.update { it.copy(connectedNodes = nodes.size) }
                delay(15_000)
            }
        }
    }

    private suspend fun startExercise() {
        fun config(withBatching: Boolean) = ExerciseConfig.Builder(ExerciseType.WEIGHTLIFTING)
            .setDataTypes(setOf(DataType.HEART_RATE_BPM))
            .setIsAutoPauseAndResumeEnabled(false)
            .setIsGpsEnabled(false)
            .apply {
                if (withBatching) setBatchingModeOverrides(setOf(BatchingMode.HEART_RATE_5_SECONDS))
            }
            .build()

        val withOverride = runCatching { exerciseClient.startExerciseAsync(config(true)).await() }
        if (withOverride.isSuccess) {
            WatchState.update { it.copy(batching5s = true, status = "Streaming") }
            return
        }
        Log.w(TAG, "batching override rejected, retrying without", withOverride.exceptionOrNull())
        runCatching { exerciseClient.startExerciseAsync(config(false)).await() }
            .onSuccess { WatchState.update { s -> s.copy(batching5s = false, status = "Streaming (no 5s batching)") } }
            .onFailure {
                Log.e(TAG, "startExercise failed", it)
                WatchState.update { s -> s.copy(status = "Could not start: ${it.message}") }
            }
    }

    private fun onSample(sample: SampleDataPoint<Double>) {
        seq += 1
        val wallMs = bootWallMs + sample.timeDurationFromBoot.toMillis()
        val accuracy = (sample.accuracy as? HeartRateAccuracy)?.sensorStatus?.toString() ?: "UNKNOWN"
        val snapshot = WatchState.snapshot.value
        val payload = JSONObject()
            .put("seq", seq)
            .put("bpm", sample.value)
            .put("acc", accuracy)
            .put("watchWallMs", wallMs)
            .put("amb", if (snapshot.isAmbient) 1 else 0)
            .put("bm", if (snapshot.batching5s) 1 else 0)
            .toString().toByteArray()

        WatchState.update { it.copy(bpm = sample.value, bpmAt = wallMs, samples = seq) }

        val targets = nodes
        scope.launch {
            targets.forEach { node ->
                runCatching { messageClient.sendMessage(node.id, HrProtocol.PATH_HR, payload).await() }
                    .onSuccess { WatchState.update { it.copy(sent = it.sent + 1) } }
                    .onFailure { WatchState.update { it.copy(sendFailures = it.sendFailures + 1) } }
            }
        }
    }

    private fun startAsForeground() {
        val channelId = "wolfset-hr"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "Heart rate", NotificationManager.IMPORTANCE_LOW)
        )
        val touchIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(this, channelId)
            .setContentTitle("WOLFSET")
            .setContentText("Streaming heart rate to your phone")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
        // The ongoing-activity chip on the watchface: this is the active workout, one tap back.
        OngoingActivity.Builder(applicationContext, NOTIFICATION_ID, builder)
            .setStaticIcon(android.R.drawable.ic_menu_compass)
            .setTouchIntent(touchIntent)
            .setStatus(Status.Builder().addTemplate("Streaming heart rate").build())
            .build()
            .apply(applicationContext)
        val notification: Notification = builder.build()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        runCatching { exerciseClient.endExerciseAsync() }
        runCatching { exerciseClient.clearUpdateCallbackAsync(exerciseCallback) }
        wakeLock?.let { if (it.isHeld) it.release() }
        scope.cancel()
        WatchState.update { it.copy(streaming = false, status = "Ready", bpm = 0.0) }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "WolfsetHr"
        private const val NOTIFICATION_ID = 1
        private const val MAX_STREAM_MS = 3L * 60 * 60 * 1000

        fun start(context: Context) {
            context.startForegroundService(Intent(context, HrStreamService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, HrStreamService::class.java))
        }
    }
}
