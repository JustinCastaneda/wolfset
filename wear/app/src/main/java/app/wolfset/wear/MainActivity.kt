package app.wolfset.wear

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import androidx.wear.ambient.AmbientLifecycleObserver
import app.wolfset.wear.ui.WatchApp
import app.wolfset.wear.ui.WolfsetTheme
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * The watch app's one activity: the designed screens (Figma 123:3945) over the phone's
 * session, drawn by WatchApp. Opened by the phone when a workout starts
 * (PhoneListenerService) or from the ongoing-activity chip; stays visible in ambient
 * (dimmed) like a workout app. Taps go straight to the phone (PhoneActions); the phone
 * answers by publishing the next view.
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
        setContent {
            WolfsetTheme {
                WatchApp(
                    onStartWorkout = { PhoneActions.startWorkout(this) },
                    onLog = { reps -> PhoneActions.logSet(this, reps) },
                    onContinue = { PhoneActions.continueRest(this) },
                    onSkipSet = { PhoneActions.skipSet(this) },
                    onUndoSkip = { PhoneActions.unskipSet(this) },
                    onChangeDay = { order -> PhoneActions.changeDay(this, order) },
                    onEndWorkout = { PhoneActions.endWorkout(this) },
                    onFinish = { PhoneActions.finish(this) },
                )
            }
        }
        if (!applyDebugView(intent)) loadSessionView()
        autoStartIfAsked(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        applyDebugView(intent)
        autoStartIfAsked(intent)
    }

    /** The phone's session may have been published while this process was dead, or before
     *  the listener ran: read the item as it stands now, once, on open. */
    private fun loadSessionView() {
        lifecycleScope.launch {
            val items = runCatching { Wearable.getDataClient(this@MainActivity).dataItems.await() }
                .getOrElse {
                    Log.w(TAG, "could not read the session item", it)
                    return@launch
                }
            try {
                val item = items.firstOrNull { it.uri.path == HrProtocol.PATH_SESSION }
                val view = item?.let {
                    SessionView.fromJson(DataMapItem.fromDataItem(it.freeze()).dataMap.getString(HrProtocol.KEY_VIEW))
                }
                WatchState.update { it.copy(session = view) }
            } finally {
                items.release()
            }
        }
    }

    /** Dev only: a session view pushed over ADB, for screenshots without a phone. */
    private fun applyDebugView(intent: Intent?): Boolean {
        val json = intent?.getStringExtra(EXTRA_DEBUG_VIEW) ?: return false
        intent.removeExtra(EXTRA_DEBUG_VIEW)
        WatchState.update { it.copy(session = SessionView.fromJson(json)) }
        return true
    }

    /** The phone asked for the stream but the service could not start silently
     *  (PhoneListenerService): ask for the permissions here, then start. */
    private fun autoStartIfAsked(intent: Intent?) {
        if (intent?.getBooleanExtra(EXTRA_AUTO_START, false) != true) return
        intent.removeExtra(EXTRA_AUTO_START)
        if (!WatchState.snapshot.value.streaming) startStream()
    }

    /** Ask for the stream's permissions, then start it (the launcher's result does). */
    private fun startStream() {
        val wanted = buildList {
            add(Manifest.permission.BODY_SENSORS)
            add(Manifest.permission.ACTIVITY_RECOGNITION)
            // Wear OS 6 heart-rate permission (see the manifest); older watches ignore it.
            add(READ_HEART_RATE)
            if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(wanted.toTypedArray())
    }

    companion object {
        private const val TAG = "WolfsetHr"
        const val READ_HEART_RATE = "android.permission.health.READ_HEART_RATE"
        /** Set by PhoneListenerService: the phone wants the stream — ask, then start. */
        const val EXTRA_AUTO_START = "app.wolfset.wear.AUTO_START"
        /** Dev only: `adb shell am start ... --es app.wolfset.wear.DEBUG_VIEW '<json>'`. */
        const val EXTRA_DEBUG_VIEW = "app.wolfset.wear.DEBUG_VIEW"
    }
}
