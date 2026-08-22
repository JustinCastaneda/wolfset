package app.wolfset.spike.hrmodule

import android.os.Bundle
import java.util.concurrent.CopyOnWriteArrayList

/**
 * In-process bus between the Android services (Data Layer listener, session/timer service)
 * and the Expo module that forwards events across the RN bridge.
 *
 * Also keeps the session log in memory so JS can export it and so samples received while
 * JS wasn't listening (doze, startup) are not lost — "did the bridge drop it or did we"
 * must stay answerable.
 */
object SpikeBus {

    const val EVENT_HR = "onHrSample"
    const val EVENT_TIMER = "onTimer"
    const val EVENT_GATE = "onGate"
    const val EVENT_LINK = "onLink"

    fun interface Listener {
        fun onEvent(name: String, payload: Bundle)
    }

    private val listeners = CopyOnWriteArrayList<Listener>()

    // --- Session state (single session at a time; a spike doesn't need more) ---
    @Volatile var clockOffsetMs: Long = 0L      // watchClock - phoneClock, from ping/pong
        private set
    @Volatile var lastRttMs: Long = -1L
        private set
    @Volatile var peakBpm: Double = 0.0
        private set
    @Volatile var lastBpm: Double = 0.0
        private set
    @Volatile var recovered: Boolean = true
        private set

    val sessionLog = ArrayList<Bundle>(8192)    // guarded by synchronized(sessionLog)

    fun addListener(l: Listener) = listeners.add(l)
    fun removeListener(l: Listener) = listeners.remove(l)

    private fun emit(name: String, payload: Bundle) {
        listeners.forEach { it.onEvent(name, payload) }
    }

    fun resetSession() {
        synchronized(sessionLog) { sessionLog.clear() }
        peakBpm = 0.0
        lastBpm = 0.0
        recovered = true
    }

    fun onHrSample(seq: Long, bpm: Double, acc: String, watchWallMs: Long, watchBattery: Int, phoneRecvMs: Long, ambient: Int, batching: Int) {
        lastBpm = bpm
        if (bpm > peakBpm) peakBpm = bpm

        val sample = Bundle().apply {
            putLong("seq", seq)
            putDouble("bpm", bpm)
            putString("acc", acc)
            putLong("watchWallMs", watchWallMs)
            putInt("watchBattery", watchBattery)
            putLong("phoneRecvMs", phoneRecvMs)
            putLong("clockOffsetMs", clockOffsetMs)
            putInt("amb", ambient)
            putInt("bm", batching)
        }
        synchronized(sessionLog) {
            if (sessionLog.size < 100_000) sessionLog.add(Bundle(sample))
        }
        emit(EVENT_HR, sample)
        evaluateGate()
    }

    /**
     * PLACEHOLDER gate rule — exists to exercise the mechanism, not to propose the product
     * rule. Exit criterion B ("define recovered") is decided from real session data.
     * Placeholder: recovered when BPM drops to 65% of session peak, floored at 110 bpm.
     */
    private fun evaluateGate() {
        val threshold = maxOf(110.0, peakBpm * 0.65)
        val nowRecovered = lastBpm > 0 && lastBpm <= threshold
        if (nowRecovered != recovered) {
            recovered = nowRecovered
        }
        emit(EVENT_GATE, Bundle().apply {
            putBoolean("recovered", recovered)
            putDouble("bpm", lastBpm)
            putDouble("peakBpm", peakBpm)
            putDouble("thresholdBpm", threshold)
        })
    }

    fun onPong(phoneSendMs: Long, watchWallMs: Long, phoneRecvMs: Long) {
        val rtt = phoneRecvMs - phoneSendMs
        // Assume symmetric latency: the watch stamped its clock mid-flight.
        clockOffsetMs = watchWallMs - (phoneSendMs + phoneRecvMs) / 2
        lastRttMs = rtt
        emit(EVENT_LINK, Bundle().apply {
            putString("event", "pong")
            putLong("rttMs", rtt)
            putLong("offsetMs", clockOffsetMs)
        })
    }

    fun onTimer(state: String, remainingMs: Long, durationMs: Long) {
        emit(EVENT_TIMER, Bundle().apply {
            putString("state", state)
            putLong("remainingMs", remainingMs)
            putLong("durationMs", durationMs)
        })
    }

    fun onLinkNote(note: String) {
        emit(EVENT_LINK, Bundle().apply {
            putString("event", "note")
            putString("note", note)
        })
    }
}
