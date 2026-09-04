package app.wolfset.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.wear.compose.material3.Text
import app.wolfset.wear.SessionView

/**
 * End Workout Confirmation (Figma 164:4371): the question, what ending now means, and
 * Cancel / End along the bottom. Ending always double-confirms (Justin, 2026-09-02) —
 * this screen is the confirm, so the phone ends the session on the tap. The copy is
 * the phone's ConfirmEndSheet, which corrected the frame's "miss" to failure semantics
 * (unfinished lifts count as failures, data-model §5.1).
 */
@Composable
fun EndWorkoutScreen(view: SessionView, ambient: Boolean, onCancel: () -> Unit, onEnd: () -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    val wait = rememberPhoneWait(view)
    val early = view.dayDone < view.dayTotal
    Face(ambient) {
        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = s.dp(69), start = s.dp(42), end = s.dp(42)),
            verticalArrangement = Arrangement.spacedBy(s.dp(24)),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("End Workout?", style = type.h1, color = WolfsetColor.TextPrimary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            Text(
                text = if (early) {
                    "Only ${view.dayDone} of ${view.dayTotal} sets done.\n\nUnfinished lifts count as failures and may trigger a deload."
                } else {
                    "All sets done. Nice work."
                },
                style = type.h3Bold.copy(lineHeight = s.sp(34)),
                color = WolfsetColor.TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (!ambient) {
            BezelButtonRow {
                BezelButton(
                    colour = WolfsetColor.Raised,
                    pressedColour = WolfsetColor.Border,
                    enabled = !wait.waiting,
                    onClick = onCancel,
                ) {
                    Text("Cancel", style = type.button, color = WolfsetColor.TextPrimary)
                }
                BezelButton(
                    colour = WolfsetColor.Brand,
                    pressedColour = WolfsetColor.BrandPressed,
                    enabled = !wait.waiting,
                    onClick = {
                        wait.start()
                        onEnd()
                    },
                ) {
                    Text("End", style = type.button, color = WolfsetColor.TextPrimary)
                }
            }
        }
    }
}
