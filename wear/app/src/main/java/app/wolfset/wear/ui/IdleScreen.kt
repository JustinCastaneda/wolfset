package app.wolfset.wear.ui

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.wear.compose.material3.Text
import app.wolfset.wear.SessionView

/**
 * "Still lifting?" — the phone's forgotten-workout clock (docs/hr-protocol.md, the
 * `idle` screen): twenty minutes without a set, a skip or a Continue, and the phone
 * asks here and in its own shade; ten more and the workout ends as it stands, at the
 * last thing the lifter did. One buzz when it appears, then quiet. Continue is the
 * answer "yes" — the loop comes back where it was; End goes through the usual "End
 * Workout?" confirm. Drawn like End Workout (164:4371): no frame of its own yet.
 */
@Composable
fun IdleScreen(view: SessionView, now: Long, ambient: Boolean, onContinue: () -> Unit, onEnd: () -> Unit) {
    val s = LocalScale.current
    val type = LocalType.current
    val wait = rememberPhoneWait(view)
    val context = LocalContext.current
    LaunchedEffect(Unit) { buzz(context) }
    val minutesLeft = ((view.idleEndsAt - now).coerceAtLeast(0L) + 59_999L) / 60_000L
    Face(ambient) {
        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = s.dp(69), start = s.dp(42), end = s.dp(42)),
            verticalArrangement = Arrangement.spacedBy(s.dp(24)),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Still lifting?", style = type.h1, color = WolfsetColor.TextPrimary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            Text(
                text = "Nothing logged for a while.\n\nThe workout ends in $minutesLeft min.",
                style = type.h3Bold.copy(lineHeight = s.sp(34)),
                color = WolfsetColor.TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (!ambient) {
            BezelButtonRow {
                BezelButton(
                    edge = BezelEdge.Start,
                    colour = WolfsetColor.Raised,
                    pressedColour = WolfsetColor.Border,
                    enabled = !wait.waiting,
                    onClick = onEnd,
                ) {
                    Text("End", style = type.button, color = WolfsetColor.TextPrimary)
                }
                BezelButton(
                    edge = BezelEdge.End,
                    colour = WolfsetColor.Brand,
                    pressedColour = WolfsetColor.BrandPressed,
                    enabled = !wait.waiting,
                    onClick = {
                        wait.start()
                        onContinue()
                    },
                ) {
                    Text("Continue", style = type.button, color = WolfsetColor.TextPrimary)
                }
            }
        }
    }
}

/** One short double buzz — the wrist's first, so it stays gentle. */
private fun buzz(context: Context) {
    val vibrator = if (Build.VERSION.SDK_INT >= 31) {
        (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    runCatching { vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 120, 100, 120), -1)) }
}
