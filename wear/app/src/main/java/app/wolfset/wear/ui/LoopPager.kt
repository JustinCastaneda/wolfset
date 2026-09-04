package app.wolfset.wear.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.wear.compose.foundation.pager.HorizontalPager
import androidx.wear.compose.foundation.pager.rememberPagerState
import app.wolfset.wear.SessionView

/**
 * The loop screen — the set to log, or the timer — with the Actions panel a swipe to its
 * left (Set / 1 123:3615 and the Timer frames → Actions 164:4103). One PhoneWait spans
 * both pages: a Log, Skip or Undo already on its way to the phone holds every button
 * until the phone answers with the next view, and WatchApp re-keys this pager on the
 * set so it lands back on the loop page.
 */
@Composable
fun LoopPager(
    view: SessionView,
    bpm: Double?,
    now: Long,
    ambient: Boolean,
    onLog: (reps: Int) -> Unit,
    onContinue: () -> Unit,
    onSkipSet: () -> Unit,
    onUndoSkip: () -> Unit,
    onEndWorkout: () -> Unit,
) {
    val pager = rememberPagerState { 2 }
    val wait = rememberPhoneWait(view)
    HorizontalPager(state = pager, modifier = Modifier.fillMaxSize(), userScrollEnabled = !ambient) { page ->
        when {
            page == 0 && view.isRest -> TimerScreen(view, bpm, now, ambient, onContinue)
            page == 0 -> SetScreen(view, ambient, wait, onLog)
            else -> ActionsScreen(
                ambient = ambient,
                enabled = !wait.waiting,
                canUnskip = view.canUnskip,
                onSkipSet = {
                    wait.start()
                    onSkipSet()
                },
                onUndoSkip = {
                    wait.start()
                    onUndoSkip()
                },
                onEndWorkout = onEndWorkout,
            )
        }
    }
}
