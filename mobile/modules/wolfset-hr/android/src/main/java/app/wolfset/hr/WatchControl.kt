package app.wolfset.hr

import android.content.Context
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.Promise

/**
 * Phone → watch (docs/hr-protocol.md).
 *
 * The session drives the stream (`/wolfset/control`): one message per connected watch;
 * resolves with how many watches took it, 0 when none is connected — the app treats that
 * like "no signal", never as an error.
 *
 * The session also shows itself on the wrist (`/wolfset/session`): a Data Layer item
 * holding the watch's view of the loop — which set, which rest. An item, not a message,
 * because it persists: a watch that wakes up late reads the latest, and the Data Layer
 * only delivers changes, so publishing the same view twice costs nothing.
 */
object WatchControl {
    const val PATH_CONTROL = "/wolfset/control"
    const val COMMAND_START = "start"
    const val COMMAND_STOP = "stop"

    const val PATH_SESSION = "/wolfset/session"
    const val KEY_VIEW = "view"

    fun send(context: Context, command: String, promise: Promise) {
        val nodeClient = Wearable.getNodeClient(context)
        val messageClient = Wearable.getMessageClient(context)
        nodeClient.connectedNodes
            .addOnSuccessListener { nodes ->
                if (nodes.isEmpty()) {
                    Log.i(TAG, "no watch connected; '$command' not sent")
                    promise.resolve(0)
                    return@addOnSuccessListener
                }
                val sends = nodes.map { node ->
                    messageClient.sendMessage(node.id, PATH_CONTROL, command.toByteArray())
                }
                Tasks.whenAllComplete(sends).addOnCompleteListener {
                    val delivered = sends.count { it.isSuccessful }
                    Log.i(TAG, "'$command' delivered to $delivered of ${nodes.size} watch(es)")
                    promise.resolve(delivered)
                }
            }
            .addOnFailureListener { error ->
                // No Play services / Wear support on this phone: same as no watch.
                Log.w(TAG, "could not list watches for '$command'", error)
                promise.reject("ERR_WATCH_UNAVAILABLE", error.message ?: "Wearable API unavailable", error)
            }
    }

    /** Publish the watch's view of the session (JSON, see docs/hr-protocol.md). Urgent, so
     *  it goes now rather than in the Data Layer's next batch. Fire and forget: a phone
     *  without Wearable support just logs. */
    fun publishView(context: Context, viewJson: String) {
        val request = PutDataMapRequest.create(PATH_SESSION)
            .apply { dataMap.putString(KEY_VIEW, viewJson) }
            .asPutDataRequest()
            .setUrgent()
        Wearable.getDataClient(context).putDataItem(request)
            .addOnFailureListener { Log.w(TAG, "could not publish the session view", it) }
    }

    private const val TAG = "WolfsetHr"
}
