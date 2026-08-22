package app.wolfset.spike.wear

import android.Manifest
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

class MainActivity : ComponentActivity() {

    // Ambient support: instead of yielding to the blurred watchface after screen timeout,
    // the activity stays visible in a dimmed state — the Wear pattern for workout apps.
    // The callback also stamps SpikeState so every HR sample records ambient-or-not.
    private val ambientCallback = object : AmbientLifecycleObserver.AmbientLifecycleCallback {
        override fun onEnterAmbient(ambientDetails: AmbientLifecycleObserver.AmbientDetails) {
            SpikeState.update { it.copy(isAmbient = true) }
        }

        override fun onExitAmbient() {
            SpikeState.update { it.copy(isAmbient = false) }
        }

        override fun onUpdateAmbient() {}
    }
    private val ambientObserver = AmbientLifecycleObserver(this, ambientCallback)

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            val ok = grants[Manifest.permission.BODY_SENSORS] == true &&
                grants[Manifest.permission.ACTIVITY_RECOGNITION] == true
            if (ok) HrService.start(this)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycle.addObserver(ambientObserver)
        setContent { MaterialTheme { SpikeScreen(onToggle = ::toggleService) } }
    }

    private fun toggleService(running: Boolean) {
        if (running) {
            HrService.stop(this)
        } else {
            val wanted = buildList {
                add(Manifest.permission.BODY_SENSORS)
                add(Manifest.permission.ACTIVITY_RECOGNITION)
                if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
            }
            permissionLauncher.launch(wanted.toTypedArray())
        }
    }
}

@Composable
private fun SpikeScreen(onToggle: (Boolean) -> Unit) {
    val state by SpikeState.snapshot.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier.fillMaxSize().padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = if (state.bpm > 0) "${state.bpm.toInt()}" else "--",
            fontSize = 40.sp,
            // Dim in ambient (and skip the brand red — ambient wants low-emission pixels).
            color = if (state.isAmbient) Color(0xFF9A9DA3) else Color(0xFFF04245),
        )
        Text("bpm · ${state.availability}${if (state.isAmbient) " · ambient" else ""}", fontSize = 10.sp)
        Text(
            "sent ${state.messagesSent}/${state.samplesSeen}" +
                (if (state.sendFailures > 0) " · ${state.sendFailures} failed" else "") +
                " · ${state.connectedNodes} node(s)",
            fontSize = 10.sp,
        )
        if (!state.isAmbient) {
            Button(
                onClick = { onToggle(state.serviceRunning) },
                modifier = Modifier.padding(top = 8.dp),
            ) {
                Text(if (state.serviceRunning) "Stop" else "Start", fontSize = 12.sp)
            }
        }
    }
}
