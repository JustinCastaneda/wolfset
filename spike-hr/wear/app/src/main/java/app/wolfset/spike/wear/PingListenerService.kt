package app.wolfset.spike.wear

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

/**
 * Replies to phone latency pings with the watch's wall clock, so the phone can estimate
 * clock skew (offset ≈ watchWallMs - (phoneSendMs + phoneRecvMs) / 2) and keep the
 * beat-to-render latency numbers honest.
 */
class PingListenerService : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) {
        if (event.path != SpikeProtocol.PATH_PING) return
        val pong = JSONObject()
            .put("phoneSendMs", String(event.data).toLongOrNull() ?: 0L)
            .put("watchWallMs", System.currentTimeMillis())
            .toString().toByteArray()
        Wearable.getMessageClient(this)
            .sendMessage(event.sourceNodeId, SpikeProtocol.PATH_PONG, pong)
    }
}
