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
 * or the rest (each with the Actions panel a swipe to its left), the summary, or — with
 * no session — the opening tiles (TileScreen), where Next Workout asks the phone to start. The watch keeps two small things for itself: whether "End Workout?" is up,
 * and where it is in Change It Up (the day list, then one day's preview) — both drop the
 * moment the phone publishes a different set or day. The clock ticks here — four times a
 * second while a rest counts down on a lit screen, once a second otherwise — so the
 * countdown and the staleness rule (WatchState.freshBpm) both follow it and no screen
 * reads the time itself.
 */
@Composable
fun WatchApp(
    onStartWorkout: () -> Unit,
    onLog: (reps: Int) -> Unit,
    onContinue: () -> Unit,
    onSkipSet: () -> Unit,
    onUndoSkip: () -> Unit,
    onChangeDay: (order: Int) -> Unit,
    onEndWorkout: () -> Unit,
    onStillLifting: () -> Unit,
    onFinish: () -> Unit,
) {
    val state by WatchState.snapshot.collectAsStateWithLifecycle()
    val session = state.session
    // "Which set" as one key: a new set or day from the phone resets what the watch kept.
    val setKey = "${session?.screen}/${session?.dayOrder}/${session?.exerciseNo}/${session?.setNo}"
    var confirmEnd by remember(setKey) { mutableStateOf(false) }
    var changing by remember(setKey) { mutableStateOf(false) }
    /** The day whose preview is open (its order), while Change It Up is up. */
    var previewOrder by remember(setKey) { mutableStateOf<Int?>(null) }
    val counting = session?.isRest == true && !state.isAmbient
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(counting) {
        while (true) {
            now = System.currentTimeMillis()
            delay(if (counting) 250L else 1_000L)
        }
    }
    val bpm = state.freshBpm(now)
    val preview = previewOrder?.let { order -> session?.days?.firstOrNull { it.order == order } }

    when {
        session == null -> TileScreen(state.isAmbient, onStartWorkout)
        session.isDone -> DoneScreen(session, state.isAmbient, onFinish)
        confirmEnd -> EndWorkoutScreen(session, state.isAmbient, onCancel = { confirmEnd = false }, onEnd = onEndWorkout)
        // The phone's forgotten-workout clock ran out of patience: ask, over whatever the
        // loop was doing. End goes through the usual "End Workout?" confirm.
        session.isIdle -> IdleScreen(session, now, state.isAmbient, onContinue = onStillLifting, onEnd = { confirmEnd = true })
        preview != null -> DayPreviewScreen(
            view = session,
            day = preview,
            ambient = state.isAmbient,
            onBack = { previewOrder = null },
            onStart = { onChangeDay(preview.order) },
        )
        changing -> ChangeWorkoutScreen(
            view = session,
            ambient = state.isAmbient,
            onBack = { changing = false },
            onPick = { order -> previewOrder = order },
        )
        // Keyed on the set so a new one from the phone lands back on the loop page.
        else -> key(setKey) {
            LoopPager(
                view = session,
                bpm = bpm,
                now = now,
                ambient = state.isAmbient,
                onLog = onLog,
                onContinue = onContinue,
                onSkipSet = onSkipSet,
                onUndoSkip = onUndoSkip,
                onChangeWorkout = { changing = true },
                onEndWorkout = { confirmEnd = true },
            )
        }
    }
}
