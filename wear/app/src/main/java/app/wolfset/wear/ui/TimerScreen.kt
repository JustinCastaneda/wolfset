package app.wolfset.wear.ui

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.wear.compose.material3.Icon
import androidx.wear.compose.material3.Text
import app.wolfset.wear.R
import app.wolfset.wear.RestZone
import app.wolfset.wear.SessionView
import app.wolfset.wear.restZone
import kotlin.math.ceil

/**
 * Timer (Figma 123:3825 red · 123:3861 yellow · 123:3878 green): the ring with the
 * countdown inside, the heart line, Continue along the bottom edge. Ring length is time
 * left; ring colour is the heart-rate zone (RestZone). Recovered turns Continue solid
 * brand — the gate arms the button, it never presses it (brief §01). Continue is the
 * BottomEdgeButton, inside the ring. `notice` is the line under the title — "Phone out
 * of reach" while a tap waits for the phone.
 */
@Composable
fun TimerScreen(
    view: SessionView,
    bpm: Double?,
    now: Long,
    ambient: Boolean,
    onContinue: () -> Unit,
    notice: @Composable BoxScope.() -> Unit = {},
) {
    val s = LocalScale.current
    val type = LocalType.current
    val remainingSeconds = ((view.restEndsAt - now) / 1000.0).coerceAtLeast(0.0)
    val fraction = if (view.restSeconds > 0) (remainingSeconds / view.restSeconds).toFloat() else 0f
    val zone = restZone(view, bpm, fraction)
    val zoneColour = when {
        ambient -> WolfsetColor.Muted
        zone == RestZone.Ready -> WolfsetColor.Ready
        zone == RestZone.Approaching -> WolfsetColor.Approaching
        else -> WolfsetColor.Brand
    }

    Face(ambient) {
        RestRing(fractionLeft = fraction, colour = zoneColour)
        ExerciseTitle(view.exerciseNo, view.exercise)
        notice()

        Column(
            modifier = Modifier.align(Alignment.Center).offset(y = s.dp(-26.5f)),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(formatClock(remainingSeconds), style = type.displayL, color = WolfsetColor.TextPrimary, maxLines = 1)
            Spacer(Modifier.height(s.dp(8)))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    painter = painterResource(R.drawable.ic_heart_pulse),
                    contentDescription = null,
                    tint = zoneColour,
                    modifier = Modifier.size(s.dp(32)),
                )
                Spacer(Modifier.width(s.dp(11)))
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(bpm?.let { Math.round(it).toString() } ?: "––", style = type.h2, color = zoneColour, maxLines = 1)
                    Spacer(Modifier.width(s.dp(4)))
                    Text("bpm", style = type.body, color = zoneColour, modifier = Modifier.offset(y = s.dp(-4)))
                }
            }
        }

        if (!ambient) {
            BottomEdgeButton(
                label = "Continue",
                colour = if (view.recovered) WolfsetColor.Brand else WolfsetColor.Raised,
                onClick = onContinue,
            )
        }
    }
}

/** "1:23" from seconds, zero-padded, ceiling — the phone's formatClock. */
fun formatClock(seconds: Double): String {
    val whole = ceil(seconds).toLong().coerceAtLeast(0)
    return "${whole / 60}:${(whole % 60).toString().padStart(2, '0')}"
}
