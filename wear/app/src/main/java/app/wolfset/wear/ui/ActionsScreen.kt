package app.wolfset.wear.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.wear.compose.material3.Icon
import androidx.wear.compose.material3.Text
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
            ActionCard(
                shape = RoundedCornerShape(topStart = s.dp(96), topEnd = s.dp(96), bottomStart = s.dp(12), bottomEnd = s.dp(12)),
                fill = WolfsetColor.Raised,
                pressedFill = WolfsetColor.Border,
                border = null,
                icon = R.drawable.ic_skip_forward,
                iconTint = if (ambient) WolfsetColor.Muted else WolfsetColor.TextSecondary,
                label = "Skip Set",
                labelColour = WolfsetColor.TextPrimary,
                enabled = enabled && !ambient,
                onClick = onSkipSet,
            )
            if (canChange) {
                ActionCard(
                    shape = RoundedCornerShape(s.dp(12)),
                    fill = WolfsetColor.Raised,
                    pressedFill = WolfsetColor.Border,
                    border = null,
                    icon = R.drawable.ic_replace,
                    iconTint = if (ambient) WolfsetColor.Muted else WolfsetColor.TextSecondary,
                    label = "Change Workout",
                    labelColour = WolfsetColor.TextPrimary,
                    enabled = enabled && !ambient,
                    onClick = onChangeWorkout,
                )
            } else if (canUnskip) {
                ActionCard(
                    shape = RoundedCornerShape(s.dp(12)),
                    fill = WolfsetColor.Raised,
                    pressedFill = WolfsetColor.Border,
                    border = null,
                    icon = R.drawable.ic_undo_2,
                    iconTint = if (ambient) WolfsetColor.Muted else WolfsetColor.TextSecondary,
                    label = "Undo Skip",
                    labelColour = WolfsetColor.TextPrimary,
                    enabled = enabled && !ambient,
                    onClick = onUndoSkip,
                )
            }
            ActionCard(
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

/** One Icon Card (164:4106): 346 × 96, the icon at 48 and the label 16 apart, centred. */
@Composable
private fun ActionCard(
    shape: Shape,
    fill: Color,
    pressedFill: Color,
    border: BorderStroke?,
    icon: Int,
    iconTint: Color,
    label: String,
    labelColour: Color,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val s = LocalScale.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    Row(
        modifier = Modifier
            .width(s.dp(346))
            .height(s.dp(96))
            .clip(shape)
            .background(if (pressed) pressedFill else fill)
            .then(if (border != null) Modifier.border(border, shape) else Modifier)
            .alpha(if (enabled) 1f else 0.5f)
            .clickable(interactionSource = interaction, indication = null, enabled = enabled, role = Role.Button, onClick = onClick),
        horizontalArrangement = Arrangement.spacedBy(s.dp(16), Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painter = painterResource(icon), contentDescription = null, tint = iconTint, modifier = Modifier.size(s.dp(48)))
        Text(label, style = LocalType.current.h3Bold, color = labelColour, maxLines = 1)
    }
}
