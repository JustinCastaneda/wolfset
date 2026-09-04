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

    /** Phone → watch: what the session is doing, as a Data Layer item that outlives both
     *  processes — the watch reads the latest whenever its screen opens. One string field
     *  holding the JSON described by SessionView. */
    const val PATH_SESSION = "/wolfset/session"
    const val KEY_VIEW = "view"

    /** Watch → phone: a tap on the wrist, JSON body `{ "type": ..., "reps": n }`. The
     *  phone's session applies it exactly as if its own button had been pressed. */
    const val PATH_ACTION = "/wolfset/action"
    const val ACTION_LOG_SET = "logSet"
    const val ACTION_CONTINUE = "continue"
    const val ACTION_SKIP_SET = "skipSet"
    /** Undo Skip: back to this lift's first skipped set. */
    const val ACTION_UNSKIP_SET = "unskipSet"
    /** Sent after the watch's own "End Workout?" — that is the double confirm. */
    const val ACTION_END_WORKOUT = "endWorkout"
    /** Finish on Session Done: the phone leaves the session and clears the watch. */
    const val ACTION_FINISH = "finish"
}
