package app.wolfset.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import app.wolfset.wear.SessionView
import kotlinx.coroutines.delay

/**
 * A tap sent to the phone waits for its answer — the next SessionView — before the
 * buttons come back, so a second tap cannot double up (the phone ignores it anyway).
 * Keyed on the view: a new view from the phone ends the wait; a phone that never answers
 * ends it after four seconds.
 */
class PhoneWait(private val state: MutableState<Boolean>) {
    val waiting: Boolean get() = state.value

    fun start() {
        state.value = true
    }
}

@Composable
fun rememberPhoneWait(view: SessionView): PhoneWait {
    val state = remember(view) { mutableStateOf(false) }
    LaunchedEffect(state, state.value) {
        if (state.value) {
            delay(WAIT_FOR_PHONE_MS)
            state.value = false
        }
    }
    return remember(state) { PhoneWait(state) }
}

/** How long a tap is allowed to wait for the phone's answer before the buttons come back. */
private const val WAIT_FOR_PHONE_MS = 4_000L
