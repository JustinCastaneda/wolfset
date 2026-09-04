package app.wolfset.wear.ui

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.wear.compose.material3.Text
import kotlin.math.sqrt

/** "01 • Squat" across the top of the set and timer screens (123:3786): the number and
 *  dot in the secondary gray, the exercise in white. The name is a [fittedName] — full
 *  when it clears the ring, its initials when it would not. */
@Composable
fun BoxScope.ExerciseTitle(exerciseNo: Int, exercise: String) {
    val s = LocalScale.current
    val type = LocalType.current
    val prefix = exerciseNo.toString().padStart(2, '0') + " • "
    val name = fittedName(exercise, type.title, s.dp(FACE - 2 * TITLE_INSET), prefix)
    Text(
        text = buildAnnotatedString {
            withStyle(SpanStyle(color = WolfsetColor.TextSecondary)) { append(prefix) }
            withStyle(SpanStyle(color = WolfsetColor.TextPrimary)) { append(name) }
        },
        style = type.title,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier
            .align(Alignment.TopCenter)
            .padding(top = s.dp(TITLE_TOP), start = s.dp(TITLE_INSET), end = s.dp(TITLE_INSET)),
    )
}

/**
 * An exercise's name at the width a screen gives it (Justin, 2026-09-04: "Bulgarian Split
 * Squat" ran into the bezel): the full name when it fits in [style] beside [prefix],
 * otherwise its initials — "Bulgarian Split Squat" → "BSS", "Incline Dumbbell Press" →
 * "IDP". Plain initials, not the gym's own shorthand ("Romanian Deadlift" reads "RD",
 * not "RDL"); that would be a short name on the exercise itself, phone-side. A single
 * word has no initials and stays whole; the caller's ellipsis is the backstop.
 * Measured rather than counted, so the same rule holds for every face size and style.
 */
@Composable
fun fittedName(name: String, style: TextStyle, maxWidth: Dp, prefix: String = ""): String {
    val measurer = rememberTextMeasurer()
    val maxWidthPx = with(LocalDensity.current) { maxWidth.roundToPx() }
    return remember(name, style, maxWidthPx, prefix) {
        val width = measurer.measure(prefix + name, style, softWrap = false, maxLines = 1).size.width
        if (width <= maxWidthPx) name else exerciseInitials(name) ?: name
    }
}

/** The first letter of each word, in capitals; null for a single word (hyphenated counts
 *  as one: "Step-Ups" has no initials worth reading). */
fun exerciseInitials(name: String): String? {
    val words = name.split(' ').filter { word -> word.any { it.isLetterOrDigit() } }
    if (words.size < 2) return null
    return words.joinToString("") { word -> word.first { it.isLetterOrDigit() }.uppercaseChar().toString() }
}

/** The title's top edge (123:3786). */
private const val TITLE_TOP = 56f

/** The title's side inset: where the ring's inner edge crosses the title's top row, plus
 *  8 of air. The frame's 80 is drawn for "Squat"; a long name at 80 lands its ends on the
 *  ring (the set pips and the timer's track both run through that row). */
val TITLE_INSET: Float = run {
    val inner = FACE / 2 - RING_INSET - RING_STROKE
    val dy = FACE / 2 - TITLE_TOP
    FACE / 2 - sqrt(inner * inner - dy * dy) + 8f
}
