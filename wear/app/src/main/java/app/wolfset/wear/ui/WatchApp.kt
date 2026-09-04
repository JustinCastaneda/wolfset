package app.wolfset.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.wolfset.wear.WatchState
import kotlinx.coroutines.delay

/**
 * One screen per thing the phone's session is doing (WatchState.session): the set to log
 * or the rest (each with the Actions panel a swipe to its left), the summary, or
 * nothing. The
 * one piece of state the watch keeps for itself is whether "End Workout?" is up — it
 * drops the moment the phone publishes a different set. The clock ticks here — four
 * times a second while a rest counts down on a lit screen, once a second otherwise — so
 * the countdown and the staleness rule (WatchState.freshBpm) both follow it and no
 * screen reads the time itself.
 */
@Composable
fun WatchApp(
    onToggleStream: (streaming: Boolean) -> Unit,
    onLog: (reps: Int) -> Unit,
    onContinue: () -> Unit,
    onSkipSet: () -> Unit,
    onUndoSkip: () -> Unit,
    onEndWorkout: () -> Unit,
    onFinish: () -> Unit,
) {
    val state by WatchState.snapshot.collectAsStateWithLifecycle()
    val session = state.session
    var confirmEnd by remember(session?.screen, session?.exerciseNo, session?.setNo) { mutableStateOf(false) }
    val counting = session?.isRest == true && !state.isAmbient
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(counting) {
        while (true) {
            now = System.currentTimeMillis()
            delay(if (counting) 250L else 1_000L)
        }
    }
    val bpm = state.freshBpm(now)

    when {
        session == null -> IdleScreen(state, bpm, state.isAmbient, onToggleStream)
        session.isDone -> DoneScreen(session, state.isAmbient, onFinish)
        confirmEnd -> EndWorkoutScreen(session, state.isAmbient, onCancel = { confirmEnd = false }, onEnd = onEndWorkout)
        // Keyed on the set so a new one from the phone lands back on the loop page.
        else -> key(session.exerciseNo, session.setNo) {
            LoopPager(
                view = session,
                bpm = bpm,
                now = now,
                ambient = state.isAmbient,
                onLog = onLog,
                onContinue = onContinue,
                onSkipSet = onSkipSet,
                onUndoSkip = onUndoSkip,
                onEndWorkout = { confirmEnd = true },
            )
        }
    }
}
