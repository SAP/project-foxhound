/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Ease
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mozilla.components.compose.base.modifier.thenConditional
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import java.text.BreakIterator
import java.text.StringCharacterIterator
import kotlin.math.roundToInt
import mozilla.components.ui.icons.R as iconsR

private const val FOX_ANIMATION_DURATION = 600
private const val TYPING_DELAY_MS = 50L
private const val CURSOR_BLINK_MS = 500L
private const val DISPLAY_DURATION_MS = 3000L
private const val TYPEWRITER_REVERSE_DELAY_MS = 1200L

internal const val LONGFOX_FOX_IMAGE_TEST_TAG = "trackersBlockedCard.longfoxFox"
internal const val PROTECTION_STATUS_PILL_TEST_TAG = "trackersBlockedCard.protectionStatusPill"

/**
 * A card that displays the number of trackers blocked with an animated fox.
 *
 * When [longfoxEnabled] is true the pill launches the longfox game via [onLongfoxEntryPointClicked];
 * otherwise it opens the privacy report via [onPrivacyReportTapped]. This routing is independent of
 * [showLongfoxAnimation], which only controls the occasional fox peek animation.
 *
 * @param trackersBlockedCount The number of trackers blocked to display.
 * @param modifier Modifier to be applied to the card.
 * @param onPrivacyReportTapped Invoked when the pill is tapped while longfox is disabled. If null,
 * the pill is not clickable.
 * @param onLongfoxEntryPointClicked Invoked when the pill is tapped while longfox is enabled.
 * @param longfoxEnabled Whether the longfox game is enabled, routing pill taps to
 * [onLongfoxEntryPointClicked] instead of [onPrivacyReportTapped].
 * @param showLongfoxAnimation Whether to play the fox peek animation and typewriter text.
 */
@Composable
fun TrackersBlockedCard(
    trackersBlockedCount: Int,
    modifier: Modifier = Modifier,
    onPrivacyReportTapped: (() -> Unit)? = null,
    onLongfoxEntryPointClicked: () -> Unit = {},
    longfoxEnabled: Boolean = false,
    showLongfoxAnimation: Boolean = false,
) {
    var isPlayingAnimation by remember { mutableStateOf(false) }
    val foxOffsetY = remember { Animatable(1f) }
    var isReversing by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    // Latch the animation becoming visible into isPlayingAnimation. showLongfoxAnimation is
    // cleared as soon as the homepage consumes it, so the animation is driven off the latch below
    // to ensure it runs to completion rather than being cancelled mid-flight.
    LaunchedEffect(showLongfoxAnimation) {
        if (showLongfoxAnimation) {
            isPlayingAnimation = true
        }
    }

    // see bug 2050032.
    // animateTo is frame-driven and freezes while backgrounded, but the delays below keep running,
    // so a peek interrupted by backgrounding would otherwise play its retract transition on return.
    // Reset to the hidden state when the card leaves the foreground so it restores cleanly.
    LifecycleEventEffect(Lifecycle.Event.ON_STOP) {
        isPlayingAnimation = false
        coroutineScope.launch { foxOffsetY.snapTo(1f) }
    }

    LaunchedEffect(isPlayingAnimation) {
        if (isPlayingAnimation) {
            isReversing = false
            // make sure we always start from the beginning position.
            foxOffsetY.snapTo(1f)
            foxOffsetY.animateTo(
                targetValue = 0f,
                animationSpec = tween(durationMillis = FOX_ANIMATION_DURATION, easing = Ease),
            )
            delay(DISPLAY_DURATION_MS)
            isReversing = true
            delay(TYPEWRITER_REVERSE_DELAY_MS)
            foxOffsetY.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = FOX_ANIMATION_DURATION, easing = Ease),
            )
            isPlayingAnimation = false
        }
    }

    val peekHeight = 19.dp
    val foxHorizontalOffset = 14.dp

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            contentAlignment = Alignment.TopStart,
        ) {
            if (isPlayingAnimation) {
                Image(
                    painter = painterResource(R.drawable.expressive_firefox),
                    contentDescription = null,
                    modifier = Modifier
                        .testTag(LONGFOX_FOX_IMAGE_TEST_TAG)
                        .offset {
                            IntOffset(
                                x = foxHorizontalOffset.toPx().roundToInt(),
                                y = ((-peekHeight.toPx()) + (foxOffsetY.value * peekHeight.toPx())).roundToInt(),
                            )
                        },
                )
            }

            ProtectionStatusPill(
                trackersBlockedCount = trackersBlockedCount,
                onClick = if (longfoxEnabled) onLongfoxEntryPointClicked else onPrivacyReportTapped,
                longfoxEnabled = longfoxEnabled,
            )
        }

        if (isPlayingAnimation && foxOffsetY.value < 1f) {
            TypewriterText(
                text = stringResource(org.mozilla.fenix.longfox.R.string.tap_to_play),
                isReversing = isReversing,
            )
        }
    }
}

@Composable
private fun ProtectionStatusPill(
    trackersBlockedCount: Int,
    onClick: (() -> Unit)? = null,
    longfoxEnabled: Boolean,
) {
    val shape = MaterialTheme.shapes.extraLarge
    Row(
        modifier = Modifier
            .testTag(PROTECTION_STATUS_PILL_TEST_TAG)
            .background(
                color = MaterialTheme.colorScheme.surfaceBright,
                shape = shape,
            )
            .clip(shape)
            .thenConditional(
                Modifier.clickable { onClick?.invoke() },
                { onClick != null },
            )
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            painter = painterResource(iconsR.drawable.mozac_ic_shield_checkmark_20),
            contentDescription = null,
            modifier = Modifier.size(20.dp),
            tint = MaterialTheme.colorScheme.tertiary,
        )

        Text(
            text =
            if (longfoxEnabled) {
                stringResource(R.string.help_catch_trackers)
            } else if (trackersBlockedCount > 0) {
                pluralStringResource(
                    R.plurals.trackers_blocked_count_2,
                    trackersBlockedCount,
                    trackersBlockedCount,
                )
            } else {
                stringResource(R.string.trackers_blocked_empty)
            },
            style = FirefoxTheme.typography.body2,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun TypewriterText(
    modifier: Modifier = Modifier,
    text: String,
    isReversing: Boolean = false,
) {
    val breakIterator = remember(text) { BreakIterator.getCharacterInstance() }
    var substringText by remember { mutableStateOf("") }
    var showCursor by remember { mutableStateOf(true) }
    var isTypingComplete by remember { mutableStateOf(false) }

    LaunchedEffect(text) {
        breakIterator.text = StringCharacterIterator(text)
        var nextIndex = breakIterator.next()
        while (nextIndex != BreakIterator.DONE) {
            substringText = text.subSequence(0, nextIndex).toString()
            nextIndex = breakIterator.next()
            delay(TYPING_DELAY_MS)
        }
        isTypingComplete = true
    }

    LaunchedEffect(isReversing) {
        if (isReversing && isTypingComplete) {
            breakIterator.text = StringCharacterIterator(text)
            breakIterator.last()
            var prevIndex = breakIterator.previous()
            while (prevIndex != BreakIterator.DONE) {
                substringText = text.subSequence(0, prevIndex).toString()
                prevIndex = breakIterator.previous()
                delay(TYPING_DELAY_MS)
            }
            substringText = ""
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(CURSOR_BLINK_MS)
            showCursor = !showCursor
        }
    }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = substringText,
            color = MaterialTheme.colorScheme.primary,
            fontFamily = FontFamily.Default,
            fontSize = 14.sp,
            lineHeight = 24.sp,
            letterSpacing = 0.1.sp,
        )
        if (showCursor && !isTypingComplete) {
            Spacer(modifier = Modifier.width(1.dp))
            Box(
                modifier = Modifier
                    .size(width = 6.dp, height = 12.dp)
                    .background(MaterialTheme.colorScheme.primary),
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun TrackersBlockedCardPreview() {
    FirefoxTheme {
        Surface {
            TrackersBlockedCard(
                trackersBlockedCount = 754,
                onPrivacyReportTapped = {},
                longfoxEnabled = true,
                showLongfoxAnimation = true,
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun TrackersBlockedCardEmptyPreview() {
    FirefoxTheme {
        Surface {
            TrackersBlockedCard(
                trackersBlockedCount = 0,
                onPrivacyReportTapped = {},
                showLongfoxAnimation = false,
            )
        }
    }
}

@Preview
@Composable
private fun TrackersBlockedCardInteractivePreview() {
    var animationProgress by remember { mutableFloatStateOf(0f) }
    var peekHeight by remember { mutableFloatStateOf(19f) }

    FirefoxTheme {
        Surface {
            Column(
                modifier = Modifier.padding(FirefoxTheme.layout.space.static400),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(contentAlignment = Alignment.TopStart) {
                    Image(
                        painter = painterResource(R.drawable.expressive_firefox),
                        contentDescription = null,
                        modifier = Modifier.offset {
                            IntOffset(
                                x = 14.dp.toPx().roundToInt(),
                                y = ((-peekHeight.dp.toPx()) + (animationProgress * peekHeight.dp.toPx())).roundToInt(),
                            )
                        },
                    )

                    TrackersBlockedCard(
                        trackersBlockedCount = 754,
                        onPrivacyReportTapped = {},
                        longfoxEnabled = true,
                        showLongfoxAnimation = true,
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text("animationProgress: $animationProgress (0=peek, 1=hidden)")
                Slider(
                    value = animationProgress,
                    onValueChange = { animationProgress = it },
                    valueRange = 0f..1f,
                    modifier = Modifier.fillMaxWidth(),
                )

                Text("peekHeight: ${peekHeight.toInt()}dp")
                Slider(
                    value = peekHeight,
                    onValueChange = { peekHeight = it },
                    valueRange = 0f..40f,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}
