package app.wolfset.spike.hrmodule

import android.content.Context
import android.os.BatteryManager
import android.os.Bundle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

/**
 * The RN-bridge face of the native seam. Everything the spike must prove crosses here:
 * HR samples, timer state, and the gate decision arrive as events; JS measures what the
 * trip cost.
 */
class SpikeHrModule : Module() {

    private val context: Context
        get() = requireNotNull(appContext.reactContext) { "React context not ready" }

    private val busListener = SpikeBus.Listener { name, payload ->
        // Stamp bridge-entry time so JS can split native→JS from watch→phone latency.
        val withStamp = Bundle(payload).apply { putLong("bridgeSendMs", System.currentTimeMillis()) }
        sendEvent(name, withStamp)
    }

    override fun definition() = ModuleDefinition {
        Name("SpikeHr")

        Events(SpikeBus.EVENT_HR, SpikeBus.EVENT_TIMER, SpikeBus.EVENT_GATE, SpikeBus.EVENT_LINK)

        OnCreate {
            SpikeBus.addListener(busListener)
        }

        OnDestroy {
            SpikeBus.removeListener(busListener)
        }

        Function("startSession") {
            SpikeBus.resetSession()
            SessionService.start(context)
        }

        Function("stopSession") {
            SessionService.stop(context)
        }

        Function("startTimer") { durationSeconds: Int ->
            SessionService.startTimer(context, durationSeconds * 1000L)
        }

        Function("stopTimer") {
            SessionService.stopTimer(context)
        }

        Function("getMetrics") {
            val phoneBattery = (context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager)
                .getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            mapOf(
                "clockOffsetMs" to SpikeBus.clockOffsetMs,
                "lastRttMs" to SpikeBus.lastRttMs,
                "peakBpm" to SpikeBus.peakBpm,
                "lastBpm" to SpikeBus.lastBpm,
                "recovered" to SpikeBus.recovered,
                "phoneBattery" to phoneBattery,
                "nativeSampleCount" to synchronized(SpikeBus.sessionLog) { SpikeBus.sessionLog.size },
            )
        }

        // Full native-side sample log as JSON — ground truth for "did the bridge drop events".
        Function("getSessionLogJson") {
            val array = JSONArray()
            synchronized(SpikeBus.sessionLog) {
                SpikeBus.sessionLog.forEach { b ->
                    array.put(
                        JSONObject()
                            .put("seq", b.getLong("seq"))
                            .put("bpm", b.getDouble("bpm"))
                            .put("acc", b.getString("acc"))
                            .put("watchWallMs", b.getLong("watchWallMs"))
                            .put("watchBattery", b.getInt("watchBattery"))
                            .put("phoneRecvMs", b.getLong("phoneRecvMs"))
                            .put("clockOffsetMs", b.getLong("clockOffsetMs"))
                            .put("amb", b.getInt("amb"))
                            .put("bm", b.getInt("bm"))
                    )
                }
            }
            array.toString()
        }
    }
}
