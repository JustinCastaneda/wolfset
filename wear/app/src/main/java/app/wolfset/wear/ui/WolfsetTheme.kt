package app.wolfset.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.ColorScheme
import androidx.wear.compose.material3.MaterialTheme
import app.wolfset.wear.R

/**
 * The phone's design tokens (mobile/src/theme/tokens.ts ← Figma Variables), the subset the
 * watch frames use. Open decision #9 — a watch token set of its own — is still open; until
 * it lands the watch borrows the phone's colours and type and takes shape from Wear OS
 * Material 3 (docs/figma-inventory.md §3). Change values in Figma first, then the phone,
 * then here.
 */
object WolfsetColor {
    val Brand = Color(0xFFF04245) // red/500 — Figma `Brand`
    val BrandPressed = Color(0xFF902426) // red/200 — Solid button pressed, and the "current" set
    val Background = Color(0xFF201A18) // neutral/900 — Figma `Background`
    val Raised = Color(0xFF38322F) // neutral/800 — Figma `MutedBackground`
    val Border = Color(0xFF514B48) // neutral/700 — Figma `Border`, the upcoming sets
    val TextPrimary = Color(0xFFFFFDFB) // neutral/50
    val TextSecondary = Color(0xFFC3BEBB) // neutral/200
    val Muted = Color(0xFFA5A09D) // neutral/300 — everything coloured, in ambient
    val Approaching = Color(0xFFF2CE40) // yellow/500 — timer/approaching
    val Ready = Color(0xFF3DF593) // green/500 — timer/ready
}

/** Geom (root CLAUDE.md), the statics instanced from the variable font — Android picks
 *  a weight per file, so each weight the frames use is its own resource. */
val Geom = FontFamily(
    Font(R.font.geom_regular, FontWeight.Normal),
    Font(R.font.geom_medium, FontWeight.Medium),
    Font(R.font.geom_semibold, FontWeight.SemiBold),
    Font(R.font.geom_black, FontWeight.Black),
)

/**
 * Frame units → this watch. The watch frames are drawn 456 wide (docs/figma-inventory.md
 * §3); a Pixel Watch 4 is 240 dp. Every measurement in the screens is written as it reads
 * in Figma and scaled exactly once, here, so the layout keeps its proportions on any round
 * face.
 */
/** The width the watch frames are drawn at (docs/figma-inventory.md §3). */
const val FACE = 456f

class Scale(private val factor: Float) {
    fun dp(frame: Float): Dp = (frame * factor).dp
    fun dp(frame: Int): Dp = dp(frame.toFloat())
    fun sp(frame: Float): TextUnit = (frame * factor).sp
    fun sp(frame: Int): TextUnit = sp(frame.toFloat())
}

/** The type styles the frames use, by their phone token names (tokens.ts `type`); the two
 *  24s are the watch's own (title 123:3786 and context 123:3696). Line height 100% as on
 *  the phone, except Display L's 108. */
class WatchType(s: Scale) {
    val displayL = geom(s.sp(96), FontWeight.Black, s.sp(108))
    /** The question and summary titles (164:4444, 164:4717). */
    val h1 = geom(s.sp(44), FontWeight.Black)
    val h2 = geom(s.sp(36), FontWeight.SemiBold)
    /** Session Done's numbers (164:4787). */
    val stat = geom(s.sp(32), FontWeight.Black)
    val h3Bold = geom(s.sp(28), FontWeight.SemiBold)
    val title = geom(s.sp(24), FontWeight.SemiBold)
    val context = geom(s.sp(24), FontWeight.Medium)
    val button = geom(s.sp(20), FontWeight.SemiBold, s.sp(24))
    val body = geom(s.sp(16), FontWeight.Normal)
    val caption = geom(s.sp(12), FontWeight.Medium)
}

private fun geom(size: TextUnit, weight: FontWeight, lineHeight: TextUnit = size) = TextStyle(
    fontFamily = Geom,
    fontSize = size,
    fontWeight = weight,
    lineHeight = lineHeight,
    platformStyle = PlatformTextStyle(includeFontPadding = false),
)

val LocalScale = compositionLocalOf { Scale(1f) }
val LocalType = compositionLocalOf { WatchType(Scale(1f)) }

@Composable
fun WolfsetTheme(content: @Composable () -> Unit) {
    val width = LocalConfiguration.current.screenWidthDp
    val scale = remember(width) { Scale(width / FACE) }
    val type = remember(scale) { WatchType(scale) }
    val colors = ColorScheme(
        primary = WolfsetColor.Brand,
        primaryDim = WolfsetColor.BrandPressed,
        onPrimary = WolfsetColor.TextPrimary,
        background = WolfsetColor.Background,
        onBackground = WolfsetColor.TextPrimary,
        surfaceContainerLow = WolfsetColor.Raised,
        surfaceContainer = WolfsetColor.Raised,
        surfaceContainerHigh = WolfsetColor.Border,
        onSurface = WolfsetColor.TextPrimary,
        onSurfaceVariant = WolfsetColor.TextSecondary,
        outline = WolfsetColor.Border,
    )
    CompositionLocalProvider(LocalScale provides scale, LocalType provides type) {
        MaterialTheme(colorScheme = colors, content = content)
    }
}
