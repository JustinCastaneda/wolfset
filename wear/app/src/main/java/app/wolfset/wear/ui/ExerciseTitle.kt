package app.wolfset.wear.ui

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.wear.compose.material3.Text

/** "01 • Squat" across the top of the set and timer screens (123:3786): the number and
 *  dot in the secondary gray, the exercise in white. */
@Composable
fun BoxScope.ExerciseTitle(exerciseNo: Int, exercise: String) {
    val s = LocalScale.current
    Text(
        text = buildAnnotatedString {
            withStyle(SpanStyle(color = WolfsetColor.TextSecondary)) {
                append(exerciseNo.toString().padStart(2, '0'))
                append(" • ")
            }
            withStyle(SpanStyle(color = WolfsetColor.TextPrimary)) { append(exercise) }
        },
        style = LocalType.current.title,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier
            .align(Alignment.TopCenter)
            .padding(top = s.dp(56), start = s.dp(80), end = s.dp(80)),
    )
}
