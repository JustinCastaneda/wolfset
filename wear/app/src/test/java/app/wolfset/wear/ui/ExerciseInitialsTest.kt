package app.wolfset.wear.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ExerciseInitialsTest {
    @Test
    fun aMultiWordNameShortensToItsInitials() {
        assertEquals("BSS", exerciseInitials("Bulgarian Split Squat"))
        assertEquals("IDP", exerciseInitials("Incline Dumbbell Press"))
        // Initials, not the gym's shorthand: "RDL" would need a short name on the exercise.
        assertEquals("RD", exerciseInitials("Romanian Deadlift"))
        assertEquals("SCR", exerciseInitials("seated cable row"))
    }

    @Test
    fun aSingleWordHasNoInitials() {
        assertNull(exerciseInitials("Squat"))
        assertNull(exerciseInitials("Step-Ups"))
        assertNull(exerciseInitials("  Deadlift "))
    }

    @Test
    fun theTitleInsetClearsTheRing() {
        // Ring inner edge at the title's top row is ~116 frame units in; the inset adds air.
        assertEquals(124.1f, TITLE_INSET, 0.2f)
    }
}
