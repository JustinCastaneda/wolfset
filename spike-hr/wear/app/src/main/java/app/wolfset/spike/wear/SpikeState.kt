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
    )

    val snapshot = MutableStateFlow(Snapshot())

    fun update(block: (Snapshot) -> Snapshot) {
        snapshot.value = block(snapshot.value)
    }
}
