package app.wolfset.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.wear.compose.foundation.BasicSwipeToDismissBox
import androidx.wear.compose.material3.Icon
import androidx.wear.compose.material3.Text
import app.wolfset.wear.R
import app.wolfset.wear.SessionView

/**
 * Change It Up (Figma 164:4192), off the Actions panel's middle card: every day of the
 * plan, the one this session runs marked Current, each other day with the brand arrow
 * button that opens its preview (DayPreviewScreen). The rows scroll under the frame's
 * bottom fade when the plan has more than two days. Swipe right — the platform's back —
 * returns to the panel; nothing here reaches the phone.
 */
@Composable
fun ChangeWorkoutScreen(view: SessionView, ambient: Boolean, onBack: () -> Unit, onPick: (order: Int) -> Unit) {
    BasicSwipeToDismissBox(onDismissed = onBack, modifier = Modifier.fillMaxSize()) { isBackground ->
        Face(ambient) {
            if (!isBackground) ChangeWorkoutFace(view, ambient, onPick)
        }
    }
}

@Composable
private fun BoxScope.ChangeWorkoutFace(view: SessionView, ambient: Boolean, onPick: (order: Int) -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(top = s.dp(52), start = s.dp(40), end = s.dp(24), bottom = s.dp(100)),
    ) {
        Text(
            "Change It Up",
            style = type.h1,
            color = WolfsetColor.TextPrimary,
            textAlign = TextAlign.Center,
            maxLines = 1,
            modifier = Modifier.fillMaxWidth().padding(end = s.dp(16)),
        )
        Spacer(Modifier.height(s.dp(72 - 44)))
        view.days.forEachIndexed { i, day ->
            if (i > 0) Spacer(Modifier.height(s.dp(16)))
            DayRow(
                day,
                current = day.order == view.dayOrder,
                // The button's big corner faces the bezel: up for the top row, down below.
                upperHalf = i == 0,
                ambient = ambient,
                onPick = { onPick(day.order) },
            )
        }
    }
    // Rows scrolled under the bottom edge dim into the background (Rectangle 11).
    Box(
        Modifier
            .align(Alignment.BottomCenter)
            .fillMaxWidth()
            .height(s.dp(100))
            .background(Brush.verticalGradient(listOf(Color.Transparent, if (ambient) Color.Black else WolfsetColor.Background))),
    )
}

/** One Row (164:4271, 392 × 104): the day's name over its lift count on the left; on the
 *  right either "Current" or the 96-square brand button with the arrow (164:4282). */
@Composable
private fun DayRow(day: SessionView.DayView, current: Boolean, upperHalf: Boolean, ambient: Boolean, onPick: () -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    val lifts = day.lifts.size
    Row(
        modifier = Modifier.fillMaxWidth().height(s.dp(104)),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f).padding(start = s.dp(24), end = s.dp(8))) {
            Text(day.name, style = type.h2, color = WolfsetColor.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(s.dp(8)))
            Text(
                "$lifts ${if (lifts == 1) "Exercise" else "Exercises"}",
                style = type.context,
                color = WolfsetColor.TextSecondary,
                maxLines = 1,
            )
        }
        if (current) {
            Text(
                "Current",
                style = type.button,
                color = WolfsetColor.TextSecondary,
                maxLines = 1,
                modifier = Modifier.padding(end = s.dp(24)),
            )
        } else {
            PickButton(upperHalf = upperHalf, ambient = ambient, onClick = onPick)
        }
    }
}

/** The "Do B" button (164:4282): a 96 brand square whose outer corner is rounded to the
 *  bezel — the bottom one on the frame's lower row, the top one when the row sits in the
 *  upper half of the face (Justin, 2026-09-04: it read upside down on Day 1). */
@Composable
private fun PickButton(upperHalf: Boolean, ambient: Boolean, onClick: () -> Unit) {
    val s = LocalScale.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val fill = when {
        ambient -> WolfsetColor.Raised
        pressed -> WolfsetColor.BrandPressed
        else -> WolfsetColor.Brand
    }
    Box(
        modifier = Modifier
            .size(s.dp(96))
            .clip(
                RoundedCornerShape(
                    topStart = s.dp(12),
                    topEnd = if (upperHalf) s.dp(48) else s.dp(12),
                    bottomStart = s.dp(12),
                    bottomEnd = if (upperHalf) s.dp(12) else s.dp(48),
                ),
            )
            .background(fill)
            .clickable(interactionSource = interaction, indication = null, enabled = !ambient, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painter = painterResource(R.drawable.ic_arrow_right),
            contentDescription = "Do this workout",
            tint = if (ambient) WolfsetColor.Muted else WolfsetColor.TextPrimary,
            modifier = Modifier.size(s.dp(40)),
        )
    }
}
