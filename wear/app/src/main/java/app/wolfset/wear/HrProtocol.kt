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

    /** Watch → phone: a tap on the wrist, JSON body `{ "type": ..., "reps": n, "day": n }`.
     *  The phone's session applies it exactly as if its own button had been pressed. */
    const val PATH_ACTION = "/wolfset/action"
    const val ACTION_LOG_SET = "logSet"
    const val ACTION_CONTINUE = "continue"
    const val ACTION_SKIP_SET = "skipSet"
    /** Undo Skip: back to this lift's first skipped set. */
    const val ACTION_UNSKIP_SET = "unskipSet"
    /** Start Workout on a day preview (123:3251): `day` carries the plan day's order. */
    const val ACTION_CHANGE_DAY = "changeDay"
    /** Sent after the watch's own "End Workout?" — that is the double confirm. */
    const val ACTION_END_WORKOUT = "endWorkout"
    /** Finish on Session Done: the phone leaves the session and clears the watch. */
    const val ACTION_FINISH = "finish"
    /** Next Workout on the Watch Tile (123:3440): the phone opens its session on the
     *  plan's up-next day, and the session's view is what moves the watch on. */
    const val ACTION_START_WORKOUT = "startWorkout"
    /** Continue on "Still lifting?": the phone restarts its forgotten-workout clock. */
    const val ACTION_STILL_LIFTING = "stillLifting"

    /** Watch → phone: the loop's taps travel as this Data Layer item, not as messages —
     *  the Data Layer keeps it until the phone is in reach, so a Log tapped with the phone
     *  in a locker still lands, in order. One string field: a JSON array of
     *  `{ id, type, reps, day, at }`, oldest first (PendingTaps). The phone acks the
     *  highest id it took in its session view (`tapAck`) and the watch drops up to it. */
    const val PATH_TAPS = "/wolfset/taps"
    const val KEY_TAPS = "taps"
}
