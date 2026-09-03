package app.wolfset.wear

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/**
 * Everything the phone sends enters here (docs/hr-protocol.md). Play services starts this
 * on every message or data change from the phone, whatever the watch is doing.
 *
 * Control (`/wolfset/control`): "start" starts the heart-rate stream and brings the watch
 * screen up, so a workout started on the phone is on the wrist without a tap. When the
 * sensor permissions are missing — or the OS refuses a service start from the background,
 * which some Wear OS versions do — the screen asks for them first (MainActivity's
 * auto-start extra). "stop" always stops; the session is over.
 *
 * Session (`/wolfset/session`): the phone's view of the loop — which set, which rest —
 * lands in WatchState and the screen redraws. A deleted or "none" item clears it.
 */
class PhoneListenerService : WearableListenerService() {

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

    override fun onDataChanged(events: DataEventBuffer) {
        for (event in events) {
            if (event.dataItem.uri.path != HrProtocol.PATH_SESSION) continue
            val view = if (event.type == DataEvent.TYPE_DELETED) {
                null
            } else {
                SessionView.fromJson(DataMapItem.fromDataItem(event.dataItem).dataMap.getString(HrProtocol.KEY_VIEW))
            }
            Log.i(TAG, "session view: ${view?.screen ?: "none"}")
            WatchState.update { it.copy(session = view) }
        }
    }

    private fun start() {
        val granted = REQUIRED.all {
            ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
        }
        if (WatchState.snapshot.value.streaming) {
            Log.i(TAG, "phone asked to start; already streaming")
            openScreen(askFirst = false)
            return
        }
        if (granted) {
            val direct = runCatching { HrStreamService.start(this) }
            if (direct.isSuccess) {
                Log.i(TAG, "phone started the stream")
                openScreen(askFirst = false)
                return
            }
            Log.w(TAG, "background service start refused; opening the watch screen", direct.exceptionOrNull())
        } else {
            Log.i(TAG, "phone asked to start; permissions missing — opening the watch screen to ask")
        }
        openScreen(askFirst = true)
    }

    private fun openScreen(askFirst: Boolean) {
        startActivity(
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra(MainActivity.EXTRA_AUTO_START, askFirst),
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
