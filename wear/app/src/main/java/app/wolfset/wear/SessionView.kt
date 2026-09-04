package app.wolfset.wear

import org.json.JSONObject

/**
 * What the phone's session shows on the wrist (docs/hr-protocol.md, `/wolfset/session`).
 * The phone is the truth: the watch draws this and sends taps back (PhoneActions); it
 * never decides anything about the workout itself.
 */
data class SessionView(
    /** "set" = log the next set; "rest" = the timer; "done" = the summary. Anything
     *  else means no session. */
    val screen: String,
    /** 1-based position of the exercise in the workout — the "01" in "01 • Squat". */
    val exerciseNo: Int,
    val exercise: String,
    val setsDone: Int,
    val setsTotal: Int,
    /** 1-based index of the set to log — the current pip; past setsDone after a skip. */
    val setNo: Int,
    /** The day's sets, for "Only 3 of 5 sets done." on End Workout. */
    val dayDone: Int,
    val dayTotal: Int,
    val weight: Double,
    val unit: String,
    /** Target reps for the next set — what the reps square starts at. */
    val reps: Int,
    /** Wall-clock ms (the phone's clock) when the rest ends. */
    val restEndsAt: Long,
    val restSeconds: Int,
    /** The phone's recovered verdict for this rest: arms Continue, never presses it. */
    val recovered: Boolean,
    val recoveredBelowBpm: Double,
    val approachingUpToBpm: Double,
    /** Session Done only (164:4712). avgBpm 0 = the watch never streamed. */
    val durationSeconds: Int,
    val volume: Double,
    val avgBpm: Double,
    val exercisesDone: Int,
) {
    val isRest: Boolean get() = screen == SCREEN_REST
    val isDone: Boolean get() = screen == SCREEN_DONE

    companion object {
        const val SCREEN_SET = "set"
        const val SCREEN_REST = "rest"
        const val SCREEN_DONE = "done"

        /** null for a missing or malformed item, or a "none" screen — the watch goes idle. */
        fun fromJson(json: String?): SessionView? {
            if (json == null) return null
            val o = runCatching { JSONObject(json) }.getOrNull() ?: return null
            val screen = o.optString("screen")
            if (screen != SCREEN_SET && screen != SCREEN_REST && screen != SCREEN_DONE) return null
            val setsDone = o.optInt("setsDone", 0)
            return SessionView(
                screen = screen,
                exerciseNo = o.optInt("exerciseNo", 1),
                exercise = o.optString("exercise", ""),
                setsDone = setsDone,
                setsTotal = o.optInt("setsTotal", 0),
                setNo = o.optInt("setNo", setsDone + 1),
                dayDone = o.optInt("dayDone", 0),
                dayTotal = o.optInt("dayTotal", 0),
                weight = o.optDouble("weight", 0.0),
                unit = o.optString("unit", "Lbs"),
                reps = o.optInt("reps", 0),
                restEndsAt = o.optLong("restEndsAt", 0L),
                restSeconds = o.optInt("restSeconds", 0),
                recovered = o.optBoolean("recovered", false),
                recoveredBelowBpm = o.optDouble("recoveredBelowBpm", 120.0),
                approachingUpToBpm = o.optDouble("approachingUpToBpm", 140.0),
                durationSeconds = o.optInt("durationSeconds", 0),
                volume = o.optDouble("volume", 0.0),
                // JSON null (no watch streamed) falls back like a missing field.
                avgBpm = o.optDouble("avgBpm", 0.0),
                exercisesDone = o.optInt("exercisesDone", 0),
            )
        }
    }
}
