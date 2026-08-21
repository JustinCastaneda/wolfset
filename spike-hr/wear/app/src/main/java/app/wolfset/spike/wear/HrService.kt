package app.wolfset.spike.wear

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
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
import androidx.health.services.client.HealthServices
import androidx.health.services.client.MeasureCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DeltaDataType
import androidx.health.services.client.data.HeartRateAccuracy
import androidx.health.services.client.data.SampleDataPoint
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import java.time.Instant

/**
 * Foreground service: samples live HR via Health Services MeasureClient and streams every
 * sample to all connected nodes over MessageClient.
 *
 * Spike notes:
 * - MeasureClient is the high-power "sensor always on" API. Production may prefer
 *   ExerciseClient (+ batching overrides); one of the spike's jobs is to measure what
 *   MeasureClient actually costs in battery over a 90-minute session.
 * - A partial wakelock keeps our processing alive under doze so any gap we observe on the
 *   phone is the transport's fault, not ours.
 */
class HrService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var wakeLock: PowerManager.WakeLock? = null
    private var seq: Long = 0
    @Volatile private var nodes: List<Node> = emptyList()

    private val measureClient by lazy { HealthServices.getClient(this).measureClient }
    private val messageClient by lazy { Wearable.getMessageClient(this) }
    private val nodeClient by lazy { Wearable.getNodeClient(this) }

    // Health Services timestamps are durations from boot; anchor them to wall clock once.
    private val bootWallMs = System.currentTimeMillis() - SystemClock.elapsedRealtime()

    private val measureCallback = object : MeasureCallback {
        override fun onAvailabilityChanged(dataType: DeltaDataType<*, *>, availability: Availability) {
            SpikeState.update { it.copy(availability = availability.toString()) }
        }

        override fun onDataReceived(data: DataPointContainer) {
            data.getData(DataType.HEART_RATE_BPM).forEach { sample -> onSample(sample) }
        }
    }

    override fun onCreate() {
        super.onCreate()
        startAsForeground()
        wakeLock = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wolfset-spike:hr").apply { acquire() }

        measureClient.registerMeasureCallback(DataType.HEART_RATE_BPM, measureCallback)
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
        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Wolfset HR spike")
            .setContentText("Streaming heart rate to phone")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH else 0
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        runCatching { measureClient.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, measureCallback) }
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
