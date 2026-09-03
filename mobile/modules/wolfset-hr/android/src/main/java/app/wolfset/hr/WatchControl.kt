package app.wolfset.hr

import android.content.Context
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.Promise

/**
 * Phone → watch: the session drives the stream (docs/hr-protocol.md, `/wolfset/control`).
 * One message per connected watch; resolves with how many watches took it, 0 when none
 * is connected — the app treats that like "no signal", never as an error.
 */
object WatchControl {
    const val PATH_CONTROL = "/wolfset/control"
    const val COMMAND_START = "start"
    const val COMMAND_STOP = "stop"

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

    private const val TAG = "WolfsetHr"
}
