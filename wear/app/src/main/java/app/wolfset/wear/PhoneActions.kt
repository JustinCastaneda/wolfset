package app.wolfset.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

/**
 * Watch → phone: a tap on the wrist (docs/hr-protocol.md, `/wolfset/action`). Fire and
 * forget — the phone's session is the truth and answers by publishing a new SessionView,
 * which is what moves the watch screen on. A tap that cannot reach the phone changes
 * nothing, on either side.
 */
object PhoneActions {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun logSet(context: Context, reps: Int) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_LOG_SET).put("reps", reps))

    fun continueRest(context: Context) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_CONTINUE))

    fun skipSet(context: Context) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_SKIP_SET))

    fun unskipSet(context: Context) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_UNSKIP_SET))

    /** Start Workout on a day preview: run that plan day (by its order) instead. */
    fun changeDay(context: Context, order: Int) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_CHANGE_DAY).put("day", order))

    fun endWorkout(context: Context) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_END_WORKOUT))

    fun finish(context: Context) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_FINISH))

    private fun send(context: Context, body: JSONObject) {
        val app = context.applicationContext
        val payload = body.toString().toByteArray()
        scope.launch {
            val nodes = runCatching { Wearable.getNodeClient(app).connectedNodes.await() }
                .getOrElse {
                    Log.w(TAG, "could not list phones for $body", it)
                    return@launch
                }
            if (nodes.isEmpty()) Log.w(TAG, "no phone connected; $body not sent")
            nodes.forEach { node ->
                runCatching {
                    Wearable.getMessageClient(app).sendMessage(node.id, HrProtocol.PATH_ACTION, payload).await()
                }.onFailure { Log.w(TAG, "$body failed to reach ${node.displayName}", it) }
            }
        }
    }

    private const val TAG = "WolfsetHr"
}
