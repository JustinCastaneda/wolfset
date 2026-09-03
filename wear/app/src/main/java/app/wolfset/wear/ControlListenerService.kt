package app.wolfset.wear

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/**
 * The phone's remote control for the stream (docs/hr-protocol.md, `/wolfset/control`).
 * Play services starts this on every message from the phone, whatever the watch is doing,
 * so a workout started on the phone starts the heart-rate stream here without a tap.
 *
 * "start" goes straight to the foreground service when the sensor permissions are already
 * granted (the common case after the first run). If they are not — or the OS refuses a
 * service start from the background, which some Wear OS versions do — the watch screen
 * opens instead and asks, then starts (MainActivity's auto-start extra). "stop" always
 * stops; the session is over.
 */
class ControlListenerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        if (event.path != HrProtocol.PATH_CONTROL) return
        when (val command = String(event.data)) {
            HrProtocol.COMMAND_START -> start()
            HrProtocol.COMMAND_STOP -> {
                Log.i(TAG, "phone asked to stop the stream")
                HrStreamService.stop(this)
            }
            else -> Log.w(TAG, "unknown control command: $command")
        }
    }

    private fun start() {
        if (WatchState.snapshot.value.streaming) {
            Log.i(TAG, "phone asked to start; already streaming")
            return
        }
        val granted = REQUIRED.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
        if (granted) {
            val direct = runCatching { HrStreamService.start(this) }
            if (direct.isSuccess) {
                Log.i(TAG, "phone started the stream")
                return
            }
            Log.w(TAG, "background service start refused; opening the watch screen", direct.exceptionOrNull())
        } else {
            Log.i(TAG, "phone asked to start; permissions missing — opening the watch screen to ask")
        }
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra(MainActivity.EXTRA_AUTO_START, true),
        )
    }

    companion object {
        private const val TAG = "WolfsetHr"
        private val REQUIRED = listOf(
            Manifest.permission.BODY_SENSORS,
            Manifest.permission.ACTIVITY_RECOGNITION,
            MainActivity.READ_HEART_RATE,
        )
    }
}
