package app.wolfset.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import app.wolfset.wear.R

/**
 * The Watch Tile (Figma 123:3440, redrawn 2026-09-04 to match the phone's hub): the
 * opening screen whenever the phone has no session to show, and where Session Done
 * returns to. Three Icon Cards down the face — Cardio, Freestyle, Next Workout. Only
 * Next Workout is live: it asks the phone to start the plan's up-next day, and the phone
 * answers with the session, which is what turns this screen into the Set screen. Cardio
 * and Freestyle are not built on either surface yet, so they sit disabled like the hub's
 * tiles. Nothing here starts the heart-rate stream — the phone's session does that.
 */
@Composable
fun TileScreen(ambient: Boolean, onStartWorkout: () -> Unit) {
    val s = LocalScale.current
    val wait = rememberPhoneWait(null)
    val muted = if (ambient) WolfsetColor.Muted else WolfsetColor.TextSecondary
    Face(ambient) {
        Column(
            modifier = Modifier.align(Alignment.Center).padding(s.dp(24)),
            verticalArrangement = Arrangement.spacedBy(s.dp(24)),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            IconCard(
                shape = RoundedCornerShape(topStart = s.dp(96), topEnd = s.dp(96), bottomStart = s.dp(12), bottomEnd = s.dp(12)),
                fill = WolfsetColor.Raised,
                pressedFill = WolfsetColor.Border,
                icon = R.drawable.ic_bike,
                iconTint = muted,
                label = "Cardio",
                labelColour = WolfsetColor.TextPrimary,
                enabled = false,
                onClick = {},
            )
            IconCard(
                shape = RoundedCornerShape(s.dp(12)),
                fill = WolfsetColor.Raised,
                pressedFill = WolfsetColor.Border,
                icon = R.drawable.ic_dumbbell,
                iconTint = muted,
                label = "Freestyle",
                labelColour = WolfsetColor.TextPrimary,
                enabled = false,
                onClick = {},
            )
            IconCard(
                shape = RoundedCornerShape(topStart = s.dp(12), topEnd = s.dp(12), bottomStart = s.dp(96), bottomEnd = s.dp(96)),
                fill = if (ambient) WolfsetColor.Muted else WolfsetColor.Brand,
                pressedFill = WolfsetColor.BrandPressed,
                label = "Next Workout",
                labelColour = WolfsetColor.TextPrimary,
                enabled = !ambient && !wait.waiting,
                onClick = {
                    wait.start()
                    onStartWorkout()
                },
            )
        }
    }
}
