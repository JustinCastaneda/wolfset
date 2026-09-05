package app.wolfset.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject

/** One tap kept for the phone: the watch's own id (increasing), and when it was made. */
data class PendingTap(val id: Long, val type: String, val reps: Int, val day: Int, val at: Long)

/**
 * The taps the phone has not taken yet (docs/hr-protocol.md, `/wolfset/taps`). Massiv
 * got this right and the first WOLFSET watch got it wrong: a Log tapped with the phone
 * in a locker used to vanish. Now every loop tap is appended to a Data Layer item this
 * watch owns — the Data Layer delivers it the moment the phone is in reach, in order —
 * and stays in the queue until the phone's session says, in its next view, that it took
 * it (`tapAck`, the highest id). The phone applies each once, at the time it was tapped.
 *
 * Meanwhile the wrist must not stall, so [project] draws the loop as those taps leave
 * it: the pips move, a rest counts down from the tap, the next lift comes up from the
 * day's list — the same steps the phone's machine takes, worked out here without it.
 * When the phone answers, its view replaces the guess.
 *
 * Nothing here decides anything about the workout: the phone is still the truth, and a
 * tap it ignores (its machine's guards) is acked and forgotten the same way.
 */
object PendingTaps {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Mutex()
    private var loaded = false

    /** A loop tap: kept here and put on the wire. */
    fun add(context: Context, type: String, reps: Int = 0, day: Int = -1) {
        val app = context.applicationContext
        val at = System.currentTimeMillis()
        scope.launch {
            lock.withLock {
                load(app)
                val taps = WatchState.snapshot.value.pending
                val tap = PendingTap(nextId(taps, at), type, reps, day, at)
                Log.i(TAG, "kept $type for the phone (#${tap.id})")
                store(app, taps + tap)
            }
        }
    }

    /** The phone published a view: drop what it took. A closed session (null) drops all —
     *  those taps belonged to a workout that is over. */
    fun trim(context: Context, view: SessionView?) {
        val app = context.applicationContext
        scope.launch {
            lock.withLock {
                load(app)
                val taps = WatchState.snapshot.value.pending
                val kept = afterAck(taps, view?.tapAck)
                if (kept.size != taps.size) store(app, kept)
            }
        }
    }

    /** The queue as the wrist should draw it, or the tile when there is no session. */
    fun project(view: SessionView?, taps: List<PendingTap>, now: Long, bpm: Double?): SessionView? {
        var v = view ?: return null
        var touched = false
        for (tap in taps) {
            if (tap.id <= v.tapAck) continue
            touched = true
            v = apply(settle(v, tap.at, now), tap, now) ?: return null
        }
        if (!touched) return v
        v = settle(v, now, now)
        // The phone's gate is out of reach: the watch judges its own rest from the
        // thresholds the phone sent (RestZone does the same for the colour).
        val recovered = v.isRest && bpm != null && bpm < v.recoveredBelowBpm
        return v.copy(synced = false, recovered = recovered)
    }

    /** What the queue holds once the phone has taken up to [tapAck]; null = everything. */
    fun afterAck(taps: List<PendingTap>, tapAck: Long?): List<PendingTap> =
        if (tapAck == null) emptyList() else taps.filter { it.id > tapAck }

    /** Ids only ever go up, clock or no clock. */
    fun nextId(taps: List<PendingTap>, now: Long): Long = maxOf(now, (taps.lastOrNull()?.id ?: 0L) + 1)

    /** A rest that had run out by [at] has moved the loop on already. */
    private fun settle(v: SessionView, at: Long, now: Long): SessionView =
        if (v.isRest && v.restEndsAt <= at) advance(v, now) else v

    private fun apply(v: SessionView, tap: PendingTap, now: Long): SessionView? = when (tap.type) {
        HrProtocol.ACTION_LOG_SET -> if (v.screen != SessionView.SCREEN_SET) v else {
            val done = v.setsDone + 1
            val dayDone = v.dayDone + 1
            // The last set of the plan finishes the workout on its own, no rest — the phone's rule.
            if (v.dayTotal > 0 && dayDone >= v.dayTotal) done(v, now).copy(dayDone = dayDone, setsDone = done)
            else v.copy(
                screen = SessionView.SCREEN_REST,
                setsDone = done,
                dayDone = dayDone,
                restEndsAt = tap.at + v.restSeconds * 1_000L,
                recovered = false,
                canUnskip = v.setNo > done,
                canChange = false,
            )
        }
        HrProtocol.ACTION_CONTINUE -> if (v.isRest) advance(v, now) else v
        HrProtocol.ACTION_SKIP_SET -> when {
            // From the timer: the rest ends, and the set that was coming is the one skipped.
            v.isRest -> advance(advance(v, now), now)
            v.screen == SessionView.SCREEN_SET -> advance(v, now)
            else -> v
        }
        HrProtocol.ACTION_UNSKIP_SET -> when {
            v.isRest && v.setNo > v.setsDone -> v.copy(setNo = v.setsDone, canUnskip = false)
            v.screen == SessionView.SCREEN_SET && v.setNo > v.setsDone + 1 -> v.copy(setNo = v.setsDone + 1, canUnskip = false)
            else -> v
        }
        HrProtocol.ACTION_CHANGE_DAY -> {
            val day = v.days.firstOrNull { it.order == tap.day }
            val first = day?.lifts?.firstOrNull()
            if (!v.canChange || day == null || first == null) v
            else lift(v, first, exerciseNo = 1).copy(
                dayOrder = day.order,
                dayDone = 0,
                dayTotal = day.lifts.sumOf { it.sets },
            )
        }
        HrProtocol.ACTION_STILL_LIFTING -> if (!v.isIdle) v else v.copy(
            screen = if (v.restEndsAt > tap.at) SessionView.SCREEN_REST else SessionView.SCREEN_SET,
            idleEndsAt = 0L,
        )
        HrProtocol.ACTION_END_WORKOUT -> if (v.isDone) v else done(v, now)
        HrProtocol.ACTION_FINISH -> if (v.isDone) null else v
        else -> v
    }

    /** After a rest, or a skip: the next set of this lift, the next lift, or the end. */
    private fun advance(v: SessionView, now: Long): SessionView {
        val nextSet = v.setNo + 1
        if (nextSet <= v.setsTotal) {
            return v.copy(
                screen = SessionView.SCREEN_SET,
                setNo = nextSet,
                restEndsAt = 0L,
                recovered = false,
                canUnskip = nextSet > v.setsDone + 1,
                canChange = false,
            )
        }
        val next = v.days.firstOrNull { it.order == v.dayOrder }?.lifts?.getOrNull(v.exerciseNo)
        return if (next == null) done(v, now) else lift(v, next, exerciseNo = v.exerciseNo + 1)
    }

    private fun lift(v: SessionView, lift: SessionView.LiftView, exerciseNo: Int): SessionView = v.copy(
        screen = SessionView.SCREEN_SET,
        exerciseNo = exerciseNo,
        exercise = lift.name,
        weight = lift.weight,
        setsTotal = lift.sets,
        reps = lift.reps,
        restSeconds = lift.rest,
        setsDone = 0,
        setNo = 1,
        canUnskip = false,
        restEndsAt = 0L,
        recovered = false,
        idleEndsAt = 0L,
    )

    /** Session Done with what the watch knows: the time. The rest waits for the phone. */
    private fun done(v: SessionView, now: Long): SessionView = v.copy(
        screen = SessionView.SCREEN_DONE,
        durationSeconds = ((now - v.startedAt) / 1_000L).coerceAtLeast(0L).toInt(),
        volume = 0.0,
        avgBpm = 0.0,
        exercisesDone = 0,
        restEndsAt = 0L,
        idleEndsAt = 0L,
    )

    // --- the item ---------------------------------------------------------------------

    /** Once per process: the queue as this watch last wrote it. */
    private suspend fun load(app: Context) {
        if (loaded) return
        val items = runCatching { Wearable.getDataClient(app).dataItems.await() }
            .getOrElse {
                Log.w(TAG, "could not read the taps item", it)
                return
            }
        try {
            val item = items.firstOrNull { it.uri.path == HrProtocol.PATH_TAPS }
            val taps = item?.let { fromJson(DataMapItem.fromDataItem(it.freeze()).dataMap.getString(HrProtocol.KEY_TAPS)) }
            WatchState.update { it.copy(pending = taps ?: emptyList()) }
        } finally {
            items.release()
        }
        loaded = true
    }

    private suspend fun store(app: Context, taps: List<PendingTap>) {
        WatchState.update { it.copy(pending = taps) }
        val request = PutDataMapRequest.create(HrProtocol.PATH_TAPS)
            .apply { dataMap.putString(HrProtocol.KEY_TAPS, toJson(taps)) }
            .asPutDataRequest()
            .setUrgent()
        runCatching { Wearable.getDataClient(app).putDataItem(request).await() }
            .onFailure { Log.w(TAG, "could not write the taps item", it) }
    }

    fun toJson(taps: List<PendingTap>): String = JSONArray().apply {
        taps.forEach {
            put(
                JSONObject()
                    .put("id", it.id)
                    .put("type", it.type)
                    .put("reps", it.reps)
                    .put("day", it.day)
                    .put("at", it.at),
            )
        }
    }.toString()

    fun fromJson(json: String?): List<PendingTap> {
        val array = runCatching { JSONArray(json ?: return emptyList()) }.getOrNull() ?: return emptyList()
        return (0 until array.length()).mapNotNull { i ->
            val o = array.optJSONObject(i) ?: return@mapNotNull null
            PendingTap(
                id = o.optLong("id"),
                type = o.optString("type"),
                reps = o.optInt("reps", 0),
                day = o.optInt("day", -1),
                at = o.optLong("at"),
            )
        }
    }

    private const val TAG = "WolfsetHr"
}
