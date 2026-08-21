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
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

class MainActivity : ComponentActivity() {

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            if (grants[Manifest.permission.BODY_SENSORS] == true) HrService.start(this)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { SpikeScreen(onToggle = ::toggleService) } }
    }

    private fun toggleService(running: Boolean) {
        if (running) {
            HrService.stop(this)
        } else {
            val wanted = buildList {
                add(Manifest.permission.BODY_SENSORS)
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
            color = Color(0xFFF04245), // brand red; illustrative only, spike UI is unstyled
        )
        Text("bpm · ${state.availability}", fontSize = 10.sp)
        Text(
            "sent ${state.messagesSent}/${state.samplesSeen}" +
                (if (state.sendFailures > 0) " · ${state.sendFailures} failed" else "") +
                " · ${state.connectedNodes} node(s)",
            fontSize = 10.sp,
        )
        Button(
            onClick = { onToggle(state.serviceRunning) },
            modifier = Modifier.padding(top = 8.dp),
        ) {
            Text(if (state.serviceRunning) "Stop" else "Start", fontSize = 12.sp)
        }
    }
}
