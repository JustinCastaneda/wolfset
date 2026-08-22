package app.wolfset.spike.hrmodule

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/**
 * Entry point for everything the watch sends. Play services starts this service on message
 * arrival regardless of app state — this is what lets samples land while the phone is in a
 * pocket with the screen off.
 */
class DataLayerListenerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        val phoneRecvMs = System.currentTimeMillis()
        when (event.path) {
            PATH_HR -> {
                val json = JSONObject(String(event.data))
                SpikeBus.onHrSample(
                    seq = json.optLong("seq"),
                    bpm = json.optDouble("bpm"),
                    acc = json.optString("acc", "UNKNOWN"),
                    watchWallMs = json.optLong("watchWallMs"),
                    watchBattery = json.optInt("watchBattery", -1),
                    phoneRecvMs = phoneRecvMs,
                    // -1 = watch build predates the flag; 1 = sampled while ambient.
                    ambient = json.optInt("amb", -1),
                )
            }
            PATH_PONG -> {
                val json = JSONObject(String(event.data))
                SpikeBus.onPong(
                    phoneSendMs = json.optLong("phoneSendMs"),
                    watchWallMs = json.optLong("watchWallMs"),
                    phoneRecvMs = phoneRecvMs,
                )
            }
        }
    }

    companion object {
        const val PATH_HR = "/wolfset-spike/hr"
        const val PATH_PONG = "/wolfset-spike/pong"
    }
}
