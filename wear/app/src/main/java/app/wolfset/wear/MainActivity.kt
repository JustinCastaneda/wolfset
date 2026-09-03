package app.wolfset.wear

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.ambient.AmbientLifecycleObserver
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

/**
 * The watch app's first screen: live BPM and a Start/Stop for the stream. ⚠️ Not the
 * designed watch UI (Figma 123:3945 — set screen, timer, actions) — that is Phase 7's
 * next step; this PR is the pipe. Stays visible in ambient (dimmed) like a workout app.
 */
class MainActivity : ComponentActivity() {

    private val ambientCallback = object : AmbientLifecycleObserver.AmbientLifecycleCallback {
        override fun onEnterAmbient(ambientDetails: AmbientLifecycleObserver.AmbientDetails) {
            WatchState.update { it.copy(isAmbient = true) }
        }

        override fun onExitAmbient() {
            WatchState.update { it.copy(isAmbient = false) }
        }

        override fun onUpdateAmbient() {}
    }
    private val ambientObserver = AmbientLifecycleObserver(this, ambientCallback)

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            val ok = grants[Manifest.permission.BODY_SENSORS] == true &&
                grants[Manifest.permission.ACTIVITY_RECOGNITION] == true &&
                grants[READ_HEART_RATE] != false
            if (ok) HrStreamService.start(this)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycle.addObserver(ambientObserver)
        setContent { MaterialTheme { StreamScreen(onToggle = ::toggleStream) } }
        autoStartIfAsked(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        autoStartIfAsked(intent)
    }

    /** The phone asked for the stream but the service could not start silently
     *  (ControlListenerService): ask for the permissions here, then start. */
    private fun autoStartIfAsked(intent: Intent?) {
        if (intent?.getBooleanExtra(EXTRA_AUTO_START, false) != true) return
        intent.removeExtra(EXTRA_AUTO_START)
        if (!WatchState.snapshot.value.streaming) toggleStream(streaming = false)
    }

    private fun toggleStream(streaming: Boolean) {
        if (streaming) {
            HrStreamService.stop(this)
        } else {
            val wanted = buildList {
                add(Manifest.permission.BODY_SENSORS)
                add(Manifest.permission.ACTIVITY_RECOGNITION)
                // Wear OS 6 heart-rate permission (see the manifest); older watches ignore it.
                add(READ_HEART_RATE)
                if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
            }
            permissionLauncher.launch(wanted.toTypedArray())
        }
    }

    companion object {
        const val READ_HEART_RATE = "android.permission.health.READ_HEART_RATE"
        /** Set by ControlListenerService: the phone wants the stream — ask, then start. */
        const val EXTRA_AUTO_START = "app.wolfset.wear.AUTO_START"
    }
}

// Brand red for the live number; ambient wants low-emission pixels, so it dims to gray.
private val Brand = Color(0xFFF04245)
private val Dim = Color(0xFFA5A09D)

@Composable
private fun StreamScreen(onToggle: (Boolean) -> Unit) {
    val state by WatchState.snapshot.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier.fillMaxSize().padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = if (state.bpm > 0) "${state.bpm.toInt()}" else "––",
            fontSize = 44.sp,
            color = if (state.isAmbient) Dim else Brand,
        )
        Text("bpm", fontSize = 12.sp, color = Dim)
        Text(
            state.status +
                (if (state.streaming && state.connectedNodes == 0) " · no phone" else "") +
                (if (state.sendFailures > 0) " · ${state.sendFailures} failed" else ""),
            fontSize = 10.sp,
            modifier = Modifier.padding(top = 4.dp),
        )
        if (!state.isAmbient) {
            Button(
                onClick = { onToggle(state.streaming) },
                modifier = Modifier.padding(top = 8.dp),
            ) {
                Text(if (state.streaming) "Stop" else "Start", fontSize = 12.sp)
            }
        }
    }
}
