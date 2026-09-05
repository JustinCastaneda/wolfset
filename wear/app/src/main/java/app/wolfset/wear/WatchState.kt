package app.wolfset.wear

import kotlinx.coroutines.flow.MutableStateFlow

// What the watch screen shows, shared between the services and Compose.
object WatchState {
    data class Snapshot(
        val streaming: Boolean = false,
        val bpm: Double = 0.0,
        /** Wall-clock ms of the latest sample; the reading is unknown once it goes stale. */
        val bpmAt: Long = 0L,
        val status: String = "Ready",
        val samples: Long = 0,
        val sent: Long = 0,
        val sendFailures: Long = 0,
        val connectedNodes: Int = 0,
        /** True while the activity is in ambient (blurred) mode; stamped on every sample. */
        val isAmbient: Boolean = false,
        /** Whether the HEART_RATE_5_SECONDS batching override took — without it, delivery
         *  stalls in ambient until the wrist is raised (spike session 2). */
        val batching5s: Boolean = false,
        /** The phone's session, as last published; null = nothing to show but the idle screen. */
        val session: SessionView? = null,
        /** Taps the phone has not taken yet, oldest first (PendingTaps). */
        val pending: List<PendingTap> = emptyList(),
    ) {
        /** The same staleness rule as the phone (docs/hr-protocol.md): no sample for ~3× the
         *  1.92 s cadence and the number is unknown — shown as "––", never as the last value. */
        fun freshBpm(now: Long): Double? =
            if (bpm > 0 && bpmAt > 0 && now - bpmAt <= STALE_AFTER_MS) bpm else null
    }

    const val STALE_AFTER_MS = 6_000L

    val snapshot = MutableStateFlow(Snapshot())

    fun update(block: (Snapshot) -> Snapshot) {
        snapshot.value = block(snapshot.value)
    }
}
