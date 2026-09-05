package app.wolfset.wear.ui

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.wear.compose.material3.Text

/**
 * "Phone out of reach · saved on watch", under the exercise title on the set and timer
 * screens, once a tap has waited longer for the phone than a phone in reach ever takes
 * (PhoneWait's four seconds). The taps are PendingTaps; nothing is lost, the line only
 * says why the phone has not answered.
 */
@Composable
fun BoxScope.OutOfReach(waitingSince: Long?, now: Long) {
    if (waitingSince == null || now - waitingSince < OUT_OF_REACH_AFTER_MS) return
    val s = LocalScale.current
    Text(
        "Phone out of reach · saved on watch",
        style = LocalType.current.caption,
        color = WolfsetColor.Brand,
        maxLines = 1,
        modifier = Modifier.align(Alignment.TopCenter).padding(top = s.dp(NOTICE_TOP)),
    )
}

private const val OUT_OF_REACH_AFTER_MS = 4_000L
/** Just under the title (ExerciseTitle's 56 dp top + its line), above the number. */
private const val NOTICE_TOP = 94f
