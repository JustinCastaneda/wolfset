package app.wolfset.wear

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** The wrist's own picture of the loop while its taps wait for the phone. */
class PendingTapsTest {
    private val squat = SessionView.LiftView("Squat", 135.0, sets = 2, reps = 5, rest = 90)
    private val bench = SessionView.LiftView("Bench", 95.0, sets = 1, reps = 5, rest = 60)
    private val day = SessionView.DayView(order = 0, name = "Day 1", lifts = listOf(squat, bench))

    private fun set(setsDone: Int = 0, setNo: Int = setsDone + 1, dayDone: Int = setsDone) = SessionView(
        screen = SessionView.SCREEN_SET,
        exerciseNo = 1,
        exercise = "Squat",
        setsDone = setsDone,
        setsTotal = 2,
        setNo = setNo,
        dayDone = dayDone,
        dayTotal = 3,
        canUnskip = false,
        dayOrder = 0,
        canChange = true,
        days = listOf(day),
        weight = 135.0,
        unit = "Lbs",
        reps = 5,
        restEndsAt = 0L,
        restSeconds = 90,
        recovered = false,
        recoveredBelowBpm = 120.0,
        approachingUpToBpm = 140.0,
        durationSeconds = 0,
        volume = 0.0,
        avgBpm = 0.0,
        exercisesDone = 0,
        idleEndsAt = 0L,
        tapAck = 0L,
        startedAt = 1_000_000L,
    )

    private fun log(id: Long, at: Long) = PendingTap(id, HrProtocol.ACTION_LOG_SET, 5, -1, at)

    @Test
    fun aLogStartsTheRestFromTheTapAndMovesThePips() {
        val view = PendingTaps.project(set(), listOf(log(1, 1_010_000)), now = 1_012_000, bpm = null)!!
        assertEquals(SessionView.SCREEN_REST, view.screen)
        assertEquals(1, view.setsDone)
        assertEquals(1_100_000L, view.restEndsAt)
        assertFalse(view.synced)
        assertFalse(view.canChange)
    }

    @Test
    fun theWatchJudgesItsOwnRestFromTheThresholds() {
        val taps = listOf(log(1, 1_010_000))
        assertTrue(PendingTaps.project(set(), taps, 1_012_000, bpm = 110.0)!!.recovered)
        assertFalse(PendingTaps.project(set(), taps, 1_012_000, bpm = 130.0)!!.recovered)
    }

    @Test
    fun aRestThatRanOutMovesOnToTheNextSetByItself() {
        val view = PendingTaps.project(set(), listOf(log(1, 1_010_000)), now = 1_100_000, bpm = null)!!
        assertEquals(SessionView.SCREEN_SET, view.screen)
        assertEquals(2, view.setNo)
        assertEquals(1, view.setsDone)
    }

    @Test
    fun theLastSetOfALiftLeadsToTheNextLiftFromTheDay() {
        val taps = listOf(log(1, 1_010_000), log(2, 1_200_000))
        val view = PendingTaps.project(set(), taps, now = 1_300_000, bpm = null)!!
        assertEquals("Bench", view.exercise)
        assertEquals(2, view.exerciseNo)
        assertEquals(1, view.setNo)
        assertEquals(60, view.restSeconds)
        assertEquals(2, view.dayDone)
    }

    @Test
    fun theLastSetOfTheDayIsSessionDoneWithOnlyTheTimeKnown() {
        val taps = listOf(log(1, 1_010_000), log(2, 1_200_000), log(3, 1_400_000))
        val view = PendingTaps.project(set(), taps, now = 1_401_000, bpm = null)!!
        assertEquals(SessionView.SCREEN_DONE, view.screen)
        assertEquals(401, view.durationSeconds)
        assertFalse(view.synced)
    }

    @Test
    fun aSecondLogDuringTheRestChangesNothingSoNothingCanDouble() {
        val taps = listOf(log(1, 1_010_000), log(2, 1_020_000))
        val view = PendingTaps.project(set(), taps, now = 1_030_000, bpm = null)!!
        assertEquals(SessionView.SCREEN_REST, view.screen)
        assertEquals(1, view.setsDone)
    }

    @Test
    fun skipAndUndoSkipMoveTheCurrentPipLikeThePhone() {
        val skip = PendingTap(1, HrProtocol.ACTION_SKIP_SET, 0, -1, 1_010_000)
        val skipped = PendingTaps.project(set(), listOf(skip), 1_011_000, null)!!
        assertEquals(2, skipped.setNo)
        assertEquals(0, skipped.setsDone)
        assertTrue(skipped.canUnskip)
        val undo = PendingTap(2, HrProtocol.ACTION_UNSKIP_SET, 0, -1, 1_012_000)
        val back = PendingTaps.project(set(), listOf(skip, undo), 1_013_000, null)!!
        assertEquals(1, back.setNo)
        assertFalse(back.canUnskip)
    }

    @Test
    fun endShowsSessionDoneAndFinishClearsTheWatch() {
        val end = PendingTap(1, HrProtocol.ACTION_END_WORKOUT, 0, -1, 1_010_000)
        assertEquals(SessionView.SCREEN_DONE, PendingTaps.project(set(), listOf(end), 1_011_000, null)!!.screen)
        val finish = PendingTap(2, HrProtocol.ACTION_FINISH, 0, -1, 1_012_000)
        assertNull(PendingTaps.project(set(), listOf(end, finish), 1_013_000, null))
    }

    @Test
    fun tapsThePhoneAlreadyTookAreNotAppliedAgain() {
        val acked = set().copy(tapAck = 1L, setsDone = 1, setNo = 2)
        val view = PendingTaps.project(acked, listOf(log(1, 1_010_000)), 1_020_000, null)!!
        assertTrue(view.synced)
        assertEquals(1, view.setsDone)
    }

    @Test
    fun theQueueLetsGoOfWhatThePhoneTookAndOfEverythingWhenTheSessionCloses() {
        val taps = listOf(log(1, 1), log(2, 2), log(3, 3))
        assertEquals(listOf(log(3, 3)), PendingTaps.afterAck(taps, 2L))
        assertEquals(taps, PendingTaps.afterAck(taps, 0L))
        assertTrue(PendingTaps.afterAck(taps, null).isEmpty())
    }

    @Test
    fun idsOnlyEverGoUp() {
        assertEquals(5_000L, PendingTaps.nextId(emptyList(), 5_000L))
        assertEquals(9_001L, PendingTaps.nextId(listOf(log(9_000L, 1)), 5_000L))
    }
}
