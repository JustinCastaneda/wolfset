package app.wolfset.spike.wear

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.BatteryManager
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
 * Foreground service: streams live HR to all connected nodes over MessageClient.
 *
 * Session 2 evidence (2026-08-22) forced the switch from MeasureClient to ExerciseClient:
 * with MeasureClient, sampling continued on perfect 1.92s cadence in ambient ("blur") mode,
 * but *delivery* stalled — 141s and 38s queues that only flushed when the user tapped the
 * watch. An active exercise session is how real workout apps (Fitbit et al.) get
 * workout-grade radio/CPU scheduling from Wear OS. Whether it also fixes ambient delivery
 * is exactly what the next hardware session measures — every sample now carries an `amb`
 * flag so the log can correlate stalls with ambient state directly.
 *
 * The OngoingActivity chip is part of the same posture: it marks this app as the active
 * workout on the watchface, which is both the Wear UX convention and part of how the system
 * decides we deserve workout treatment.
 */
class HrService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var wakeLock: PowerManager.WakeLock? = null
    private var seq: Long = 0
    @Volatile private var nodes: List<Node> = emptyList()

    private val exerciseClient by lazy { HealthServices.getClient(this).exerciseClient }
    private val messageClient by lazy { Wearable.getMessageClient(this) }
    private val nodeClient by lazy { Wearable.getNodeClient(this) }

    // Health Services timestamps are durations from boot; anchor them to wall clock once.
    private val bootWallMs = System.currentTimeMillis() - SystemClock.elapsedRealtime()

    private val exerciseCallback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            SpikeState.update { it.copy(availability = update.exerciseStateInfo.state.toString()) }
            update.latestMetrics.getData(DataType.HEART_RATE_BPM).forEach { sample -> onSample(sample) }
        }

        override fun onAvailabilityChanged(dataType: DataType<*, *>, availability: Availability) {
            SpikeState.update { it.copy(availability = availability.toString()) }
        }

        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) {}

        override fun onRegistered() {
            Log.i(TAG, "exercise callback registered")
        }

        override fun onRegistrationFailed(throwable: Throwable) {
            Log.e(TAG, "exercise callback registration failed", throwable)
            SpikeState.update { it.copy(availability = "REGISTRATION_FAILED") }
        }
    }

    override fun onCreate() {
        super.onCreate()
        startAsForeground()
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wolfset-spike:hr").apply { acquire() }

        exerciseClient.setUpdateCallback(exerciseCallback)
        scope.launch {
            // Health Services batches deliveries in non-interactive power states (ambient /
            // screen off) for ExerciseClient too — the documented fix for our measured
            // tap-to-flush stalls is the HEART_RATE_5_SECONDS BatchingMode override.
            // Support is per-device and this client version (1.0.0-rc02) exposes no
            // capability query for it, so: try with the override, fall back without and
            // record which config actually started. The `bm` flag on every sample carries
            // that fact into the session log.
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
                SpikeState.update { it.copy(batching5s = true) }
                Log.i(TAG, "exercise started WITH HEART_RATE_5_SECONDS batching override")
            } else {
                Log.w(TAG, "override rejected, retrying without", withOverride.exceptionOrNull())
                runCatching { exerciseClient.startExerciseAsync(config(false)).await() }
                    .onSuccess {
                        SpikeState.update { s -> s.copy(batching5s = false) }
                        Log.i(TAG, "exercise started WITHOUT batching override — expect ambient stalls")
                    }
                    .onFailure {
                        Log.e(TAG, "startExercise failed", it)
                        SpikeState.update { s -> s.copy(availability = "START_FAILED: ${it.message}") }
                    }
            }
        }
        SpikeState.update { it.copy(serviceRunning = true) }

        // Refresh the connected-node list periodically instead of per sample.
        scope.launch {
            while (true) {
                runCatching { nodes = nodeClient.connectedNodes.await() }
                    .onFailure { Log.w(TAG, "node refresh failed", it) }
                SpikeState.update { it.copy(connectedNodes = nodes.size) }
                delay(15_000)
            }
        }
    }

    private fun onSample(sample: SampleDataPoint<Double>) {
        seq += 1
        val wallMs = bootWallMs + sample.timeDurationFromBoot.toMillis()
        val accuracy = (sample.accuracy as? HeartRateAccuracy)?.sensorStatus?.toString() ?: "UNKNOWN"
        val payload = JSONObject()
            .put("seq", seq)
            .put("bpm", sample.value)
            .put("acc", accuracy)
            .put("watchWallMs", wallMs)
            .put("watchBattery", batteryPercent())
            // 1 = the activity was in ambient (blurred) when this sample was processed.
            // Best-effort: only meaningful while our activity is the foreground one.
            .put("amb", if (SpikeState.snapshot.value.isAmbient) 1 else 0)
            // Whether the 5s batching override was active — the log must be able to say
            // "stall happened WITH the fix on" vs "fix unsupported on this watch".
            .put("bm", if (SpikeState.snapshot.value.batching5s) 1 else 0)
            .toString().toByteArray()

        SpikeState.update { it.copy(bpm = sample.value, samplesSeen = seq) }

        val targets = nodes
        scope.launch {
            targets.forEach { node ->
                runCatching {
                    messageClient.sendMessage(node.id, SpikeProtocol.PATH_HR, payload).await()
                    SpikeState.update { it.copy(messagesSent = it.messagesSent + 1) }
                }.onFailure {
                    SpikeState.update { it.copy(sendFailures = it.sendFailures + 1) }
                }
            }
        }
    }

    private fun batteryPercent(): Int =
        (getSystemService(Context.BATTERY_SERVICE) as BatteryManager)
            .getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

    private fun startAsForeground() {
        val channelId = "hr-spike"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "HR Spike", NotificationManager.IMPORTANCE_LOW)
        )
        val touchIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder: NotificationCompat.Builder = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Wolfset HR spike")
            .setContentText("Workout session — streaming HR to phone")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
        // The ongoing-activity chip on the watchface: marks this as the active workout and
        // gives a one-tap way back into the app from ambient.
        OngoingActivity.Builder(applicationContext, NOTIFICATION_ID, builder)
            .setStaticIcon(android.R.drawable.ic_menu_compass)
            .setTouchIntent(touchIntent)
            .setStatus(Status.Builder().addTemplate("Streaming HR").build())
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
        SpikeState.update { it.copy(serviceRunning = false, availability = "stopped") }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val TAG = "WolfsetHrService"
        private const val NOTIFICATION_ID = 1

        fun start(context: Context) {
            context.startForegroundService(Intent(context, HrService::class.java))
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, HrService::class.java))
        }
    }
}
