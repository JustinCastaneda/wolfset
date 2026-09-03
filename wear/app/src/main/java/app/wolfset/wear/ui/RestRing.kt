package app.wolfset.wear.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke

/**
 * The rest ring, as on the phone's TimerRing: a full track in the raised gray, the
 * remaining time sweeping counter-clockwise from 12 o'clock in the heart-rate zone's
 * colour, round caps (Spinner 123:3737).
 */
@Composable
fun RestRing(fractionLeft: Float, colour: Color, modifier: Modifier = Modifier.fillMaxSize()) {
    val s = LocalScale.current
    val stroke = s.dp(RING_STROKE)
    val inset = s.dp(RING_INSET + RING_STROKE / 2)
    val clamped = fractionLeft.coerceIn(0f, 1f)
    Canvas(modifier) {
        val strokePx = stroke.toPx()
        val radius = size.minDimension / 2 - inset.toPx()
        val rect = Size(radius * 2, radius * 2)
        val topLeft = Offset(center.x - radius, center.y - radius)
        drawCircle(WolfsetColor.Raised, radius = radius, style = Stroke(strokePx))
        if (clamped > 0f) {
            drawArc(
                color = colour,
                startAngle = -90f,
                sweepAngle = -360f * clamped,
                useCenter = false,
                topLeft = topLeft,
                size = rect,
                style = Stroke(width = strokePx, cap = StrokeCap.Round),
            )
        }
    }
}
