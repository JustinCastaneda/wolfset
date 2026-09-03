package app.wolfset.wear.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.ButtonDefaults
import androidx.wear.compose.material3.Text
import app.wolfset.wear.WatchState

/**
 * No session on the phone: the wordmark, what to do, and — while the stream runs — the
 * live number with the pipe's status, which is the hardware diagnostic the first runs
 * relied on (docs/hr-protocol.md). Start/Stop stays for a stream test without a workout;
 * a workout never needs it.
 */
@Composable
fun IdleScreen(state: WatchState.Snapshot, bpm: Double?, ambient: Boolean, onToggleStream: (streaming: Boolean) -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    Face(ambient) {
        Column(
            modifier = Modifier.align(Alignment.Center).padding(horizontal = s.dp(48)),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(color = if (ambient) WolfsetColor.Muted else WolfsetColor.Brand)) { append("WOLF") }
                    withStyle(SpanStyle(color = WolfsetColor.TextPrimary)) { append("SET") }
                },
                style = type.title.copy(fontWeight = FontWeight.Black),
            )
            Spacer(Modifier.height(s.dp(16)))
            if (state.streaming) {
                Text(bpm?.let { Math.round(it).toString() } ?: "––", style = type.displayL, color = if (ambient) WolfsetColor.Muted else WolfsetColor.Brand)
                Text("bpm", style = type.body, color = WolfsetColor.TextSecondary)
                Spacer(Modifier.height(s.dp(8)))
                Text(
                    state.status +
                        (if (state.connectedNodes == 0) " · no phone" else "") +
                        (if (state.sendFailures > 0) " · ${state.sendFailures} failed" else ""),
                    style = type.caption,
                    color = WolfsetColor.TextSecondary,
                    textAlign = TextAlign.Center,
                )
            } else {
                Text(
                    "Start a workout on your phone",
                    style = type.body,
                    color = WolfsetColor.TextSecondary,
                    textAlign = TextAlign.Center,
                )
            }
            if (!ambient) {
                Spacer(Modifier.height(s.dp(24)))
                Button(
                    onClick = { onToggleStream(state.streaming) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = WolfsetColor.Raised,
                        contentColor = WolfsetColor.TextPrimary,
                    ),
                ) {
                    Text(if (state.streaming) "Stop" else "Start", style = type.button)
                }
            }
        }
    }
}
