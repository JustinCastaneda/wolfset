package app.wolfset.hr

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/** Everything the watch sends enters here (docs/hr-protocol.md). */
class HrListenerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        if (event.path != PATH_HR) return
        val phoneRecvMs = System.currentTimeMillis()
        val json = JSONObject(String(event.data))
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

    companion object {
        const val PATH_HR = "/wolfset/hr"
    }
}
