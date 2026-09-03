package app.wolfset.hr

import android.os.Bundle
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The bridge face of the native seam: heart-rate samples arrive in JS as events, and the
 *  session starts and stops the watch's stream through it (WatchControl). */
class WolfsetHrModule : Module() {

    private val busListener = HrBus.Listener { name, payload -> sendEvent(name, payload) }

    override fun definition() = ModuleDefinition {
        Name("WolfsetHr")

        Events(HrBus.EVENT_SAMPLE)

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
