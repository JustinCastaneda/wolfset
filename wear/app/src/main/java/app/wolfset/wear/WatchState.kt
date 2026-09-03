package app.wolfset.wear

import kotlinx.coroutines.flow.MutableStateFlow

// What the watch screen shows, shared between the stream service and Compose.
object WatchState {
    data class Snapshot(
        val streaming: Boolean = false,
        val bpm: Double = 0.0,
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
    )

    val snapshot = MutableStateFlow(Snapshot())

    fun update(block: (Snapshot) -> Snapshot) {
        snapshot.value = block(snapshot.value)
    }
}
