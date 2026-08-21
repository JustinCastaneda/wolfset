package app.wolfset.spike.wear

// Message paths shared with the phone app (spike-hr/mobile/modules/spike-hr).
// Keep in sync by hand — this is a throwaway spike, not a shared library.
object SpikeProtocol {
    const val PATH_HR = "/wolfset-spike/hr"
    const val PATH_PING = "/wolfset-spike/ping"
    const val PATH_PONG = "/wolfset-spike/pong"
}
