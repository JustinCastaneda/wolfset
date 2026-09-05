package app.wolfset.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.wear.compose.material3.Text
import app.wolfset.wear.SessionView
import java.util.Locale
import kotlin.math.roundToLong

/**
 * Session Done (Figma 164:4712): the title, the four stat rows, and Finish along the
 * bottom edge. The rows scroll under the button behind the frame's fade, as drawn.
 * Finish tells the phone, which leaves the session and clears the watch. A summary the
 * watch worked out itself (the phone out of reach for the last set, PendingTaps) knows
 * only the time — the other rows read "––" until the phone's own arrives.
 */
@Composable
fun DoneScreen(view: SessionView, ambient: Boolean, onFinish: () -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    val wait = rememberPhoneWait(view)
    Face(ambient) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(top = s.dp(66), start = s.dp(66), end = s.dp(66), bottom = s.dp(140)),
            verticalArrangement = Arrangement.spacedBy(s.dp(3)),
        ) {
            Text("Session Done", style = type.h1, color = WolfsetColor.TextPrimary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(s.dp(21)))
            StatRow("Time", formatClock(view.durationSeconds.toDouble()))
            StatRow("Total Weight", if (view.synced) String.format(Locale.US, "%,d", view.volume.roundToLong()) else "––")
            StatRow("Avg. Heart rate", if (view.synced && view.avgBpm > 0) view.avgBpm.roundToLong().toString() else "––")
            StatRow("Exercises", if (view.synced) view.exercisesDone.toString() else "––")
        }
        // The frame's fade (164:4713): rows scrolled under Finish dim into the background.
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(s.dp(122))
                .background(Brush.verticalGradient(listOf(Color.Transparent, if (ambient) Color.Black else WolfsetColor.Background))),
        )
        if (!ambient) {
            BottomEdgeButton(label = "Finish", colour = WolfsetColor.Brand, enabled = !wait.waiting) {
                wait.start()
                onFinish()
            }
        }
    }
}

/** One Row (164:4784): the label in the secondary gray, the number in Geom Black. */
@Composable
private fun StatRow(label: String, value: String) {
    val s = LocalScale.current
    val type = LocalType.current
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = s.dp(12)),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        Text(label, style = type.title, color = WolfsetColor.TextSecondary, maxLines = 1)
        Text(value, style = type.stat, color = WolfsetColor.TextPrimary, maxLines = 1)
    }
}
