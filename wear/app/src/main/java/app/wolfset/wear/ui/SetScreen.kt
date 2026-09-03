package app.wolfset.wear.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.wear.compose.material3.Text
import app.wolfset.wear.SessionView
import kotlinx.coroutines.delay
import java.util.Locale

/**
 * Set (Figma 123:3615 "Set / 1"): the set pips, "01 • Squat", the weight in Display L,
 * "Lbs x 5 reps", and along the bottom the reps square and Log. Same rules as the phone's
 * Log a Set: tap the number to decrease reps, it wraps back to the target; a reduced count
 * reads "3/5 reps" in brand. Log sends the reps to the phone, which logs the set and
 * publishes the rest — until that arrives the buttons wait, so a second tap cannot log
 * twice (the phone ignores it anyway).
 */
@Composable
fun SetScreen(view: SessionView, ambient: Boolean, onLog: (reps: Int) -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    // Keyed on the set: a new set (or exercise) from the phone resets the counter.
    var reps by remember(view.exerciseNo, view.setsDone) { mutableIntStateOf(view.reps) }
    var waiting by remember(view) { mutableStateOf(false) }
    LaunchedEffect(waiting) {
        if (waiting) {
            delay(WAIT_FOR_PHONE_MS)
            waiting = false
        }
    }

    Face(ambient) {
        SetPips(done = view.setsDone, total = view.setsTotal, ambient = ambient)
        ExerciseTitle(view.exerciseNo, view.exercise)

        Column(
            modifier = Modifier.align(Alignment.Center).offset(y = s.dp(-32)),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(formatWeight(view.weight), style = type.displayL, color = WolfsetColor.TextPrimary, maxLines = 1)
            Spacer(Modifier.height(s.dp(8)))
            Text(
                text = buildAnnotatedString {
                    append("${view.unit} x ")
                    if (reps < view.reps) {
                        withStyle(SpanStyle(color = if (ambient) WolfsetColor.Muted else WolfsetColor.Brand)) {
                            append("$reps/${view.reps} reps")
                        }
                    } else {
                        append("$reps ${if (reps == 1) "rep" else "reps"}")
                    }
                },
                style = type.context,
                color = WolfsetColor.TextSecondary,
                maxLines = 1,
            )
        }

        if (!ambient) {
            BezelButtonRow {
                BezelButton(
                    colour = WolfsetColor.Raised,
                    pressedColour = WolfsetColor.Border,
                    enabled = !waiting,
                    onClick = { reps = if (reps > 1) reps - 1 else view.reps },
                ) {
                    Text(reps.toString(), style = type.h3Bold, color = WolfsetColor.TextPrimary)
                }
                BezelButton(
                    colour = WolfsetColor.Brand,
                    pressedColour = WolfsetColor.BrandPressed,
                    enabled = !waiting,
                    onClick = {
                        waiting = true
                        onLog(reps)
                    },
                ) {
                    Text("Log", style = type.button, color = WolfsetColor.TextPrimary)
                }
            }
        }
    }
}

/** "135" or "62.5" — the phone prints the number as stored. */
fun formatWeight(weight: Double): String =
    if (weight == Math.floor(weight)) String.format(Locale.US, "%.0f", weight)
    else String.format(Locale.US, "%.1f", weight)

/** How long a tap is allowed to wait for the phone's answer before the buttons come back. */
private const val WAIT_FOR_PHONE_MS = 4_000L
