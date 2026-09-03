package app.wolfset.hr

import android.os.Bundle
import java.util.concurrent.CopyOnWriteArrayList

/**
 * In-process bus between the Data Layer listener service (which Android starts on its
 * own) and the Expo module (which exists only while React is up). Keeps the latest sample
 * so a JS listener that attaches late can catch up.
 */
object HrBus {
    const val EVENT_SAMPLE = "onHrSample"
    /** The native rest timer ran out: `{ at, endsAt }` — endsAt identifies which rest. */
    const val EVENT_REST_ENDED = "onRestEnded"

    fun interface Listener {
        fun onEvent(name: String, payload: Bundle)
    }

    private val listeners = CopyOnWriteArrayList<Listener>()

    @Volatile
    var latest: Bundle? = null
        private set

    fun addListener(l: Listener) = listeners.add(l)
    fun removeListener(l: Listener) = listeners.remove(l)

    fun onSample(seq: Long, bpm: Double, acc: String, watchWallMs: Long, phoneRecvMs: Long, ambient: Int, batching: Int) {
        val sample = Bundle().apply {
            putLong("seq", seq)
            putDouble("bpm", bpm)
            putString("acc", acc)
            putLong("watchWallMs", watchWallMs)
            putLong("phoneRecvMs", phoneRecvMs)
            putInt("amb", ambient)
            putInt("bm", batching)
        }
        latest = sample
        listeners.forEach { it.onEvent(EVENT_SAMPLE, Bundle(sample)) }
    }

    fun restEnded(at: Long, endsAt: Long) {
        val payload = Bundle().apply {
            putLong("at", at)
            putLong("endsAt", endsAt)
        }
        listeners.forEach { it.onEvent(EVENT_REST_ENDED, Bundle(payload)) }
    }
}
