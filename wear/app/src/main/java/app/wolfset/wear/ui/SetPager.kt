package app.wolfset.wear.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.wear.compose.foundation.pager.HorizontalPager
import androidx.wear.compose.foundation.pager.rememberPagerState
import app.wolfset.wear.SessionView

/**
 * The set screen with the Actions panel a swipe to its left (Set / 1 123:3615 → Actions
 * 164:4103). One PhoneWait spans both pages: a Log or a Skip already on its way to the
 * phone holds every button until the phone answers with the next set, and WatchApp
 * re-keys this pager on that set so it lands back on the set page.
 */
@Composable
fun SetPager(
    view: SessionView,
    ambient: Boolean,
    onLog: (reps: Int) -> Unit,
    onSkipSet: () -> Unit,
    onEndWorkout: () -> Unit,
) {
    val pager = rememberPagerState { 2 }
    val wait = rememberPhoneWait(view)
    HorizontalPager(state = pager, modifier = Modifier.fillMaxSize(), userScrollEnabled = !ambient) { page ->
        when (page) {
            0 -> SetScreen(view, ambient, wait, onLog)
            else -> ActionsScreen(
                ambient = ambient,
                enabled = !wait.waiting,
                onSkipSet = {
                    wait.start()
                    onSkipSet()
                },
                onEndWorkout = onEndWorkout,
            )
        }
    }
}
