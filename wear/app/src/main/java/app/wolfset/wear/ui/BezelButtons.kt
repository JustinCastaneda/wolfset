package app.wolfset.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material3.ButtonDefaults
import androidx.wear.compose.material3.EdgeButton
import androidx.wear.compose.material3.EdgeButtonSize
import androidx.wear.compose.material3.Text

/**
 * A pair of buttons along the bottom of the round face (Set frame 123:3818: the reps
 * square and Log, 326 wide, 12 apart, from y 312). Justin's rule for bottom-anchored
 * buttons is the platform's look — a shape whose bottom edge follows the bezel — not the
 * frame's approximated corners (docs/figma-inventory.md §3). Material 3's EdgeButton is
 * one button, so the pair gets the same effect by being clipped to the face at the ring's
 * inset: each button runs to the edge and the circle cuts it.
 */
@Composable
fun BoxScope.BezelButtonRow(content: @Composable RowScope.() -> Unit) {
    val s = LocalScale.current
    Box(
        Modifier
            .matchParentSize()
            .padding(s.dp(RING_INSET))
            .clip(CircleShape),
    ) {
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .width(s.dp(326))
                .height(s.dp(456 - 312 - RING_INSET)),
            horizontalArrangement = Arrangement.spacedBy(s.dp(12)),
            content = content,
        )
    }
}

/** Which side of the pair a BezelButton sits on: only its outer top corner is round. */
enum class BezelEdge { Start, End }

/** One button of the row: the outer top corner as round as the EdgeButton's, the inner
 *  one square (Set / 2, 164:4389 — Justin, 2026-09-03: the frame's 8 "looks funny"
 *  beside Finish, and rounding both makes a pair look like two pills); pressed state
 *  darker for the brand and lighter for the gray (phone `press` tokens); content
 *  centred in the 96 the frame gives the button, the rest of the fill runs under the
 *  bezel. */
@Composable
fun RowScope.BezelButton(
    edge: BezelEdge,
    colour: Color,
    pressedColour: Color,
    enabled: Boolean = true,
    onClick: () -> Unit,
    content: @Composable BoxScope.() -> Unit,
) {
    val s = LocalScale.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    Box(
        Modifier
            .weight(1f)
            .fillMaxHeight()
            .clip(
                RoundedCornerShape(
                    topStart = if (edge == BezelEdge.Start) EDGE_TOP_RADIUS else 0.dp,
                    topEnd = if (edge == BezelEdge.End) EDGE_TOP_RADIUS else 0.dp,
                ),
            )
            .background(if (pressed) pressedColour else colour)
            .alpha(if (enabled) 1f else 0.5f)
            .clickable(interactionSource = interaction, indication = null, enabled = enabled, role = Role.Button, onClick = onClick),
    ) {
        Box(
            Modifier.align(Alignment.TopCenter).fillMaxWidth().height(s.dp(96)),
            contentAlignment = Alignment.Center,
            content = content,
        )
    }
}

/**
 * One bottom-anchored button (Continue 123:3843, Finish 164:4812): the platform's
 * EdgeButton, per Justin's rule, raised off the bezel so it sits inside the ring where
 * the frames draw it (Justin, 2026-09-03: it must not cross the ring).
 */
@Composable
fun BoxScope.BottomEdgeButton(label: String, colour: Color, enabled: Boolean = true, onClick: () -> Unit) {
    val s = LocalScale.current
    EdgeButton(
        onClick = onClick,
        enabled = enabled,
        buttonSize = EdgeButtonSize.Small,
        colors = ButtonDefaults.buttonColors(
            containerColor = colour,
            contentColor = WolfsetColor.TextPrimary,
            disabledContainerColor = colour.copy(alpha = 0.5f),
            disabledContentColor = WolfsetColor.TextPrimary,
        ),
        modifier = Modifier
            .align(Alignment.BottomCenter)
            .padding(bottom = s.dp(EDGE_BUTTON_LIFT)),
    ) {
        Text(label, style = LocalType.current.button, color = WolfsetColor.TextPrimary)
    }
}

/** How far the edge button sits above the bezel: the ring's inset and stroke plus a
 *  hair, which puts the button's top at the frames' y 324–328. */
private const val EDGE_BUTTON_LIFT = 28f

/** The top-corner radius Material 3's EdgeButton draws at its Small size — height 56
 *  minus half its bottom ellipse (58 + 10 × 1.42), from the platform's EdgeButton.kt —
 *  in real dp, not frame units, because the platform button is not frame-scaled. */
private val EDGE_TOP_RADIUS = 20.dp

/** Screens sit on the brand background; in ambient the face goes black (low emission). */
@Composable
fun Face(ambient: Boolean, content: @Composable BoxScope.() -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(if (ambient) Color.Black else WolfsetColor.Background),
        content = content,
    )
}
