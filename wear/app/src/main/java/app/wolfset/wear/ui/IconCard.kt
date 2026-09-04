package app.wolfset.wear.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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

/**
 * One Icon Card (Figma 164:4106 on the Actions panel, 634:7423 on the Watch Tile):
 * 346 × 96, an optional icon at 48 and the label 16 apart, centred. Three stack down a
 * face 24 apart, the top one round on top and the bottom one round underneath, so the
 * column follows the bezel. Disabled reads at half strength, like the phone's hub tiles
 * whose destination is not built yet.
 */
@Composable
fun IconCard(
    shape: Shape,
    fill: Color,
    pressedFill: Color,
    label: String,
    labelColour: Color,
    enabled: Boolean,
    onClick: () -> Unit,
    icon: Int? = null,
    iconTint: Color = labelColour,
    border: BorderStroke? = null,
) {
    val s = LocalScale.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    Row(
        // Alpha first, so the fade takes the fill and border with it — after the background
        // it fades only the content, and Compose's layer left the fill behind when the
        // card came back from disabled (seen on the tile, 2026-09-04).
        modifier = Modifier
            .width(s.dp(346))
            .height(s.dp(96))
            .alpha(if (enabled) 1f else 0.5f)
            .clip(shape)
            .background(if (pressed) pressedFill else fill)
            .then(if (border != null) Modifier.border(border, shape) else Modifier)
            .clickable(interactionSource = interaction, indication = null, enabled = enabled, role = Role.Button, onClick = onClick),
        horizontalArrangement = Arrangement.spacedBy(s.dp(16), Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(painter = painterResource(icon), contentDescription = null, tint = iconTint, modifier = Modifier.size(s.dp(48)))
        }
        Text(label, style = LocalType.current.h3Bold, color = labelColour, maxLines = 1)
    }
}
