package app.wolfset.wear

// The watch ↔ phone message contract. Mirrored by hand in the phone's native module
// (mobile/modules/wolfset-hr) and documented in docs/hr-protocol.md — change all three.
object HrProtocol {
    /** Watch → phone: one heart-rate sample per message (JSON body). */
    const val PATH_HR = "/wolfset/hr"

    /** Phone → watch: the session drives the stream. Body is one of the commands below. */
    const val PATH_CONTROL = "/wolfset/control"
    const val COMMAND_START = "start"
    const val COMMAND_STOP = "stop"
}
