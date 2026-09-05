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
 * Watch → phone: a tap on the wrist (docs/hr-protocol.md). The phone's session is the
 * truth and answers by publishing a new SessionView, which is what moves the watch
 * screen on.
 *
 * The loop's taps — Log, Continue, Skip, End… — are kept on the wrist until the phone
 * takes them (PendingTaps, the `/wolfset/taps` item): a set logged with the phone in a
 * locker is never lost, it lands when the two are in reach again, at the time it was
 * tapped. Meanwhile the watch shows the loop as those taps leave it. Next Workout is the
 * one plain message: with no session there is nothing to keep a tap for, and a start
 * that fired hours later would be a surprise, not a saved set.
 */
object PhoneActions {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun logSet(context: Context, reps: Int) = PendingTaps.add(context, HrProtocol.ACTION_LOG_SET, reps = reps)

    fun continueRest(context: Context) = PendingTaps.add(context, HrProtocol.ACTION_CONTINUE)

    fun skipSet(context: Context) = PendingTaps.add(context, HrProtocol.ACTION_SKIP_SET)

    fun unskipSet(context: Context) = PendingTaps.add(context, HrProtocol.ACTION_UNSKIP_SET)

    /** Start Workout on a day preview: run that plan day (by its order) instead. */
    fun changeDay(context: Context, order: Int) = PendingTaps.add(context, HrProtocol.ACTION_CHANGE_DAY, day = order)

    fun endWorkout(context: Context) = PendingTaps.add(context, HrProtocol.ACTION_END_WORKOUT)

    fun finish(context: Context) = PendingTaps.add(context, HrProtocol.ACTION_FINISH)

    /** Next Workout on the tile: start the plan's up-next day on the phone. */
    fun startWorkout(context: Context) =
        send(context, JSONObject().put("type", HrProtocol.ACTION_START_WORKOUT))

    /** Continue on "Still lifting?": yes, still here. */
    fun stillLifting(context: Context) = PendingTaps.add(context, HrProtocol.ACTION_STILL_LIFTING)

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
