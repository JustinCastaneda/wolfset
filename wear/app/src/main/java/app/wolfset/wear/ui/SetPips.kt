package app.wolfset.wear.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import kotlin.math.PI

/**
 * The set pips — the phone's Sets bar bent around the top of the round face ("Progress
 * Arc Option", 123:3923): one pip per prescribed set across the top 90°, on the same
 * ring the timer draws. Colours follow the phone's rule (SegmentedProgress): done brand
 * red, the current set the pressed red, upcoming the border gray.
 */
@Composable
fun SetPips(done: Int, total: Int, ambient: Boolean, modifier: Modifier = Modifier.fillMaxSize()) {
    val s = LocalScale.current
    val stroke = s.dp(RING_STROKE)
    val inset = s.dp(RING_INSET + RING_STROKE / 2)
    val count = total.coerceAtLeast(1)
    Canvas(modifier) {
        val strokePx = stroke.toPx()
        val radius = size.minDimension / 2 - inset.toPx()
        val rect = Size(radius * 2, radius * 2)
        val topLeft = Offset(center.x - radius, center.y - radius)
        // Round caps extend each pip by half a stroke, so shorten the sweep to keep the gap.
        val capDegrees = ((strokePx / 2) / radius * 180 / PI).toFloat()
        val sweep = (PIPS_SPAN - PIPS_GAP * (count - 1)) / count
        for (i in 0 until count) {
            val start = -90f - PIPS_SPAN / 2 + i * (sweep + PIPS_GAP) + capDegrees / 2
            val colour = when {
                ambient -> WolfsetColor.Muted
                i < done -> WolfsetColor.Brand
                i == done -> WolfsetColor.BrandPressed
                else -> WolfsetColor.Border
            }
            drawArc(
                color = colour,
                startAngle = start,
                sweepAngle = (sweep - capDegrees).coerceAtLeast(0.5f),
                useCenter = false,
                topLeft = topLeft,
                size = rect,
                style = Stroke(width = strokePx, cap = StrokeCap.Round),
            )
        }
    }
}

/** The ring the pips and the timer share (Spinner 123:3737): 432 wide inside the 456
 *  face, 10.8 thick. */
const val RING_INSET = 12f
const val RING_STROKE = 10.8f
private const val PIPS_SPAN = 90f
private const val PIPS_GAP = 5f
