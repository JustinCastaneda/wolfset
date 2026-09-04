package app.wolfset.wear.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import app.wolfset.wear.R

/**
 * The Actions panel (Figma 164:4103), a swipe left of the set screen and of the timer
 * (Justin, 2026-09-03): the icon cards stacked down the face — Skip Set in the raised
 * gray, a middle card, End Workout outlined in brand — with the page dots below. From
 * the timer, Skip ends the rest and skips the set that was coming. The middle card is
 * the frame's Change Exercise while the workout is untouched (it leads to Change It Up,
 * 164:4192, so it reads Change Workout), or Undo Skip while this lift has a skipped set
 * to go back to — never both, since a skip is a touch. End opens the watch's own "End
 * Workout?" (EndWorkoutScreen); Change opens Change It Up; the others go straight to the
 * phone.
 */
@Composable
fun ActionsScreen(
    ambient: Boolean,
    enabled: Boolean,
    canUnskip: Boolean,
    canChange: Boolean,
    onSkipSet: () -> Unit,
    onUndoSkip: () -> Unit,
    onChangeWorkout: () -> Unit,
    onEndWorkout: () -> Unit,
) {
    val s = LocalScale.current
    val brand = if (ambient) WolfsetColor.Muted else WolfsetColor.Brand
    Face(ambient) {
        Column(
            modifier = Modifier.align(Alignment.Center),
            verticalArrangement = Arrangement.spacedBy(s.dp(24)),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            IconCard(
                shape = RoundedCornerShape(topStart = s.dp(96), topEnd = s.dp(96), bottomStart = s.dp(12), bottomEnd = s.dp(12)),
                fill = WolfsetColor.Raised,
                pressedFill = WolfsetColor.Border,
                icon = R.drawable.ic_skip_forward,
                iconTint = if (ambient) WolfsetColor.Muted else WolfsetColor.TextSecondary,
                label = "Skip Set",
                labelColour = WolfsetColor.TextPrimary,
                enabled = enabled && !ambient,
                onClick = onSkipSet,
            )
            if (canChange) {
                IconCard(
                    shape = RoundedCornerShape(s.dp(12)),
                    fill = WolfsetColor.Raised,
                    pressedFill = WolfsetColor.Border,
                        icon = R.drawable.ic_replace,
                    iconTint = if (ambient) WolfsetColor.Muted else WolfsetColor.TextSecondary,
                    label = "Change Workout",
                    labelColour = WolfsetColor.TextPrimary,
                    enabled = enabled && !ambient,
                    onClick = onChangeWorkout,
                )
            } else if (canUnskip) {
                IconCard(
                    shape = RoundedCornerShape(s.dp(12)),
                    fill = WolfsetColor.Raised,
                    pressedFill = WolfsetColor.Border,
                        icon = R.drawable.ic_undo_2,
                    iconTint = if (ambient) WolfsetColor.Muted else WolfsetColor.TextSecondary,
                    label = "Undo Skip",
                    labelColour = WolfsetColor.TextPrimary,
                    enabled = enabled && !ambient,
                    onClick = onUndoSkip,
                )
            }
            IconCard(
                shape = RoundedCornerShape(topStart = s.dp(12), topEnd = s.dp(12), bottomStart = s.dp(96), bottomEnd = s.dp(96)),
                fill = Color.Transparent,
                pressedFill = WolfsetColor.Raised,
                border = BorderStroke(s.dp(2), brand),
                icon = R.drawable.ic_circle_stop,
                iconTint = brand,
                label = "End Workout",
                labelColour = brand,
                enabled = enabled && !ambient,
                onClick = onEndWorkout,
            )
        }
        PageDots(count = 2, current = 1, ambient = ambient)
    }
}
