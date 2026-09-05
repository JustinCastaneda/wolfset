package app.wolfset.hr

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The bridge face of the native seam: heart-rate samples and watch taps arrive in JS as
 *  events, the session starts and stops the watch's stream and shows itself on the wrist
 *  through it (WatchControl), and it holds the workout's foreground service — which is
 *  also the doze-proof rest timer (WorkoutService). */
class WolfsetHrModule : Module() {

    private val busListener = HrBus.Listener { name, payload -> sendEvent(name, payload) }

    override fun definition() = ModuleDefinition {
        Name("WolfsetHr")

        Events(HrBus.EVENT_SAMPLE, HrBus.EVENT_REST_ENDED, HrBus.EVENT_WATCH_ACTION)

        OnCreate { HrBus.addListener(busListener) }

        OnDestroy { HrBus.removeListener(busListener) }

        Function("getLatestSample") {
            HrBus.latest?.let { toMap(it) }
        }

        // Phone → watch. Resolve with the number of watches reached (0 = none connected).
        AsyncFunction("startWatchStream") { promise: Promise ->
            WatchControl.send(context, WatchControl.COMMAND_START, promise)
        }

        AsyncFunction("stopWatchStream") { promise: Promise ->
            WatchControl.send(context, WatchControl.COMMAND_STOP, promise)
        }

        // What the watch shows: the session's view as JSON (features/set-loop/watch-view.ts).
        Function("publishWatchView") { viewJson: String ->
            WatchControl.publishView(context, viewJson)
        }

        // The rest timer. Android 14+ lets a health-type foreground service run only with a
        // runtime sensor permission granted (activity recognition is the lightest), and
        // Android 13+ shows its notifications only with notification permission. Ask once
        // at the start of a workout; a refusal leaves the on-screen JS timer, nothing worse.
        Function("hasRestPermissions") { hasRestPermissions() }

        AsyncFunction("requestRestPermissions") { promise: Promise ->
            val permissions = appContext.permissions
            if (permissions == null || REST_PERMISSIONS.isEmpty()) {
                promise.resolve(hasRestPermissions())
                return@AsyncFunction
            }
            permissions.askForPermissions(
                { result -> promise.resolve(result.values.all { it.status == PermissionsStatus.GRANTED }) },
                *REST_PERMISSIONS.toTypedArray(),
            )
        }

        // The workout's foreground service: held from the session's start to its close so
        // the workout keeps running with the app off screen (WorkoutService).
        Function("startWorkout") { title: String ->
            WorkoutService.start(context, title)
        }

        Function("endWorkout") {
            WorkoutService.stop(context)
        }

        Function("startRest") { endsAtMs: Double ->
            WorkoutService.startRest(context, endsAtMs.toLong())
        }

        Function("endRest") {
            WorkoutService.endRest(context)
        }

        // Dev only: the same path a watch message takes, so the JS layer can be exercised
        // on an emulator with no watch attached.
        Function("debugInjectSample") { bpm: Double ->
            HrBus.onSample(
                seq = System.currentTimeMillis(),
                bpm = bpm,
                acc = "ACCURACY_HIGH",
                watchWallMs = System.currentTimeMillis(),
                phoneRecvMs = System.currentTimeMillis(),
                ambient = 0,
                batching = 1,
            )
        }
    }

    private val context
        get() = appContext.reactContext ?: throw IllegalStateException("React context is gone")

    private fun hasRestPermissions(): Boolean = REST_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }

    private val REST_PERMISSIONS: List<String> = buildList {
        if (Build.VERSION.SDK_INT >= 34) add(Manifest.permission.ACTIVITY_RECOGNITION)
        if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun toMap(b: Bundle): Map<String, Any?> = mapOf(
        "seq" to b.getLong("seq"),
        "bpm" to b.getDouble("bpm"),
        "acc" to b.getString("acc"),
        "watchWallMs" to b.getLong("watchWallMs"),
        "phoneRecvMs" to b.getLong("phoneRecvMs"),
        "amb" to b.getInt("amb"),
        "bm" to b.getInt("bm"),
    )
}
