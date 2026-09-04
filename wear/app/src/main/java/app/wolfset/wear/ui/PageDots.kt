package app.wolfset.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip

/** The page dots along the bottom of the Actions panel (Frame 73, 164:4114): 8 wide,
 *  12 apart, at y 424; the current page in brand, the rest the border gray. */
@Composable
fun BoxScope.PageDots(count: Int, current: Int, ambient: Boolean) {
    val s = LocalScale.current
    Row(
        modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = s.dp(456 - 424 - 8)),
        horizontalArrangement = Arrangement.spacedBy(s.dp(12)),
    ) {
        repeat(count) { i ->
            val colour = when {
                i != current -> WolfsetColor.Border
                ambient -> WolfsetColor.Muted
                else -> WolfsetColor.Brand
            }
            Box(Modifier.size(s.dp(8)).clip(CircleShape).background(colour))
        }
    }
}
