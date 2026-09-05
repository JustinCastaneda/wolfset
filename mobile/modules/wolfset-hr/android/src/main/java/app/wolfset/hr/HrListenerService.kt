package app.wolfset.hr

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.util.Log
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONArray
import org.json.JSONObject

/** Everything the watch sends enters here (docs/hr-protocol.md): heart-rate samples, and
 *  taps on the wrist — Log, Continue, Change Workout… — which the session applies as its
 *  own button presses. Play services starts this whatever state the app is in, so it is
 *  also where a dead app comes back to life: Next Workout on the watch starts the workout
 *  service, which boots JavaScript if nothing is running (WorkoutService).
 *
 *  The loop's taps come as the watch's queue item (`/wolfset/taps`), not as messages:
 *  the Data Layer keeps it until the phone is in reach, so a Log tapped with the phone in
 *  a locker arrives when the two meet again — in order, with the watch's id and the time
 *  of the tap. The session takes each once and acks the highest id in its next view. */
class HrListenerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            PATH_HR -> onSample(JSONObject(String(event.data)))
            PATH_ACTION -> onAction(this, JSONObject(String(event.data)))
        }
    }

    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.type != DataEvent.TYPE_CHANGED || event.dataItem.uri.path != PATH_TAPS) continue
            val taps = DataMapItem.fromDataItem(event.dataItem).dataMap.getString(KEY_TAPS) ?: continue
            onTaps(this, runCatching { JSONArray(taps) }.getOrElse {
                Log.w(TAG, "the watch's taps are not JSON: $taps", it)
                return
            })
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

    companion object {
        const val PATH_HR = "/wolfset/hr"
        const val PATH_ACTION = "/wolfset/action"
        /** The watch's queue of taps for the phone: one string field, a JSON array. */
        const val PATH_TAPS = "/wolfset/taps"
        const val KEY_TAPS = "taps"
        const val ACTION_START_WORKOUT = "startWorkout"
        private const val TAG = "WolfsetHr"

        /** A tap on the watch, from the Data Layer or the debug receiver below. */
        fun onAction(context: Context, json: JSONObject) {
            val type = json.optString("type")
            // Next Workout with the app dead: nothing is listening on the bus, so the
            // workout service boots JavaScript and hands it the action. With the app alive
            // the bus event below does the same work and the service start is a no-op —
            // the session controller holds the service either way.
            // The day's name is JavaScript's to know; the session renames the notification.
            if (type == ACTION_START_WORKOUT) WorkoutService.start(context, "Next Workout", type)
            HrBus.watchAction(
                type = type,
                reps = json.optInt("reps", 0),
                day = json.optInt("day", -1),
                id = json.optLong("id", 0L),
                at = json.optLong("at", 0L),
            )
        }

        /** The watch's queue, oldest first — every tap it still holds, whether new or
         *  already taken (the session tells by id). */
        fun onTaps(context: Context, taps: JSONArray) {
            Log.i(TAG, "${taps.length()} tap(s) from the watch")
            for (i in 0 until taps.length()) taps.optJSONObject(i)?.let { onAction(context, it) }
        }
    }

    /** Dev only: the same path a watch tap takes, for an emulator with no watch — a
     *  broadcast, because it reaches the app in any state, backgrounded or dead:
     *  `adb shell "am broadcast -a app.wolfset.hr.WATCH_ACTION -n app.wolfset/app.wolfset.hr.HrListenerService\$DebugWatchAction --es action '{\"type\":\"startWorkout\"}'"`.
     *  A JSON array plays the watch's queue item instead — the same taps, in order.
     *  Debuggable builds only; a release build ignores it. */
    class DebugWatchAction : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val debuggable = context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
            val action = intent.getStringExtra("action") ?: return
            if (!debuggable) return
            runCatching {
                if (action.trimStart().startsWith("[")) onTaps(context, JSONArray(action))
                else onAction(context, JSONObject(action))
            }.onFailure { Log.w(TAG, "debug action is not JSON: $action", it) }
        }
    }
}
