package app.wolfset.hr

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/** Everything the watch sends enters here (docs/hr-protocol.md): heart-rate samples, and
 *  taps on the wrist — Log, Continue — which the session applies as its own button presses. */
class HrListenerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            PATH_HR -> onSample(JSONObject(String(event.data)))
            PATH_ACTION -> onAction(JSONObject(String(event.data)))
        }
    }

    private fun onSample(json: JSONObject) {
        val phoneRecvMs = System.currentTimeMillis()
        HrBus.onSample(
            seq = json.optLong("seq"),
            bpm = json.optDouble("bpm"),
            acc = json.optString("acc", "UNKNOWN"),
            watchWallMs = json.optLong("watchWallMs"),
            phoneRecvMs = phoneRecvMs,
            ambient = json.optInt("amb", -1),
            batching = json.optInt("bm", -1),
        )
    }

    private fun onAction(json: JSONObject) {
        HrBus.watchAction(type = json.optString("type"), reps = json.optInt("reps", 0))
    }

    companion object {
        const val PATH_HR = "/wolfset/hr"
        const val PATH_ACTION = "/wolfset/action"
    }
}
