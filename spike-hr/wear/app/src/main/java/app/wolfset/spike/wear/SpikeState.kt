package app.wolfset.spike.wear

import kotlinx.coroutines.flow.MutableStateFlow

// Shared between HrService and the Compose UI. Spike-grade global state.
object SpikeState {
    data class Snapshot(
        val serviceRunning: Boolean = false,
        val bpm: Double = 0.0,
        val availability: String = "—",
        val samplesSeen: Long = 0,
        val messagesSent: Long = 0,
        val sendFailures: Long = 0,
        val connectedNodes: Int = 0,
        // True while the activity is in ambient (blurred) mode — stamped onto every HR
        // sample so the phone-side log can correlate delivery stalls with ambient state.
        val isAmbient: Boolean = false,
        // Whether this watch supports the HEART_RATE_5_SECONDS batching override — the
        // documented fix for ambient delivery stalls. If false, expect stalls to persist.
        val batching5s: Boolean = false,
    )

    val snapshot = MutableStateFlow(Snapshot())

    fun update(block: (Snapshot) -> Snapshot) {
        snapshot.value = block(snapshot.value)
    }
}
