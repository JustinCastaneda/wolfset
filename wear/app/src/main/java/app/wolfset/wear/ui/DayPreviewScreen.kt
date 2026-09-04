package app.wolfset.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.wear.compose.foundation.BasicSwipeToDismissBox
import androidx.wear.compose.material3.Text
import app.wolfset.wear.SessionView

/**
 * One day's preview (Figma 123:3251 "Workout B"), off Change It Up: the day's name, its
 * lifts numbered down the face — name on the left, weight and "5x5" on the right — and
 * Start Workout along the bottom edge. Start tells the phone to run this day instead;
 * the phone answers with the new set, which is what moves the watch back to the loop.
 * Swipe right returns to the list.
 */
@Composable
fun DayPreviewScreen(view: SessionView, day: SessionView.DayView, ambient: Boolean, onBack: () -> Unit, onStart: () -> Unit) {
    val wait = rememberPhoneWait(view)
    BasicSwipeToDismissBox(onDismissed = onBack, modifier = Modifier.fillMaxSize()) { isBackground ->
        Face(ambient) {
            if (!isBackground) DayPreviewFace(day, ambient, enabled = !wait.waiting) {
                wait.start()
                onStart()
            }
        }
    }
}

@Composable
private fun BoxScope.DayPreviewFace(day: SessionView.DayView, ambient: Boolean, enabled: Boolean, onStart: () -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(top = s.dp(52), start = s.dp(47), end = s.dp(47), bottom = s.dp(140)),
    ) {
        Text(
            day.name,
            style = type.h1,
            color = WolfsetColor.TextPrimary,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(s.dp(72 - 44)))
        day.lifts.forEachIndexed { i, lift ->
            if (i > 0) Spacer(Modifier.height(s.dp(3)))
            LiftRow(i + 1, lift)
        }
    }
    // The frame's fade (Rectangle 11): rows scrolled under Start dim into the background.
    Box(
        Modifier
            .align(Alignment.BottomCenter)
            .fillMaxWidth()
            .height(s.dp(138))
            .background(Brush.verticalGradient(listOf(Color.Transparent, if (ambient) Color.Black else WolfsetColor.Background))),
    )
    if (!ambient) {
        BottomEdgeButton(label = "Start Workout", colour = WolfsetColor.Brand, enabled = enabled, onClick = onStart)
    }
}

/** One Line-Item (123:3371, 72 tall): the number in the secondary gray, the lift's name,
 *  and on the right the weight with its sets × reps beside it. */
@Composable
private fun LiftRow(no: Int, lift: SessionView.LiftView) {
    val s = LocalScale.current
    val type = LocalType.current
    Row(
        modifier = Modifier.fillMaxWidth().height(s.dp(72)),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
            Text(no.toString(), style = type.button, color = WolfsetColor.TextSecondary, maxLines = 1, modifier = Modifier.width(s.dp(32)))
            Text(lift.name, style = type.button, color = WolfsetColor.TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(start = s.dp(8))) {
            Text(formatWeight(lift.weight), style = type.title, color = WolfsetColor.TextPrimary, maxLines = 1)
            Spacer(Modifier.width(s.dp(4)))
            Text("${lift.sets}x${lift.reps}", style = type.body, color = WolfsetColor.TextSecondary, maxLines = 1)
        }
    }
}
