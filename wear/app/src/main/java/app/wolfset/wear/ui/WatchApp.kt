package app.wolfset.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.wolfset.wear.WatchState
import kotlinx.coroutines.delay

/**
 * One screen per thing the phone's session is doing (WatchState.session): the set to log,
 * the rest, or nothing. The clock ticks here — four times a second while a rest counts
 * down on a lit screen, once a second otherwise — so the countdown and the staleness
 * rule (WatchState.freshBpm) both follow it and no screen reads the time itself.
 */
@Composable
fun WatchApp(onToggleStream: (streaming: Boolean) -> Unit, onLog: (reps: Int) -> Unit, onContinue: () -> Unit) {
    val state by WatchState.snapshot.collectAsStateWithLifecycle()
    val session = state.session
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
        session.isRest -> TimerScreen(session, bpm, now, state.isAmbient, onContinue)
        else -> SetScreen(session, state.isAmbient, onLog)
    }
}
