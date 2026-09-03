package app.wolfset.wear

/**
 * The timer's colour, the same rule as the phone's Post Set Timer (features/hr/recovered.ts
 * and PostSetTimerScreen): the phone's recovered verdict wins; otherwise a fresh reading is
 * banded by the thresholds the phone sent; with no signal the colour follows time alone —
 * first half of the rest red, second half yellow. Watch frames 123:3825 / 3861 / 3878.
 */
enum class RestZone { Resting, Approaching, Ready }

fun restZone(view: SessionView, bpm: Double?, fractionLeft: Float): RestZone = when {
    view.recovered -> RestZone.Ready
    bpm != null -> when {
        bpm < view.recoveredBelowBpm -> RestZone.Ready
        bpm <= view.approachingUpToBpm -> RestZone.Approaching
        else -> RestZone.Resting
    }
    else -> if (fractionLeft > 0.5f) RestZone.Resting else RestZone.Approaching
}
