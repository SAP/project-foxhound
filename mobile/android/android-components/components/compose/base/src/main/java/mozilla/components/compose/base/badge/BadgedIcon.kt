/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.badge

import androidx.annotation.IntDef
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement.spacedBy
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredHeight
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.material3.Badge
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.modifier.thenConditional
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.information
import mozilla.components.compose.base.utils.toLocaleString
import mozilla.components.ui.icons.R as iconsR

/**
 * Class representing a [Badge] size.
 * BADGE_SIZE_SMALL is 8x8dp.
 * BADGE_SIZE_LARGE is 16x16dp or up to 16x32dp.
 */
@Retention(AnnotationRetention.SOURCE)
@IntDef(BADGE_SIZE_SMALL, BADGE_SIZE_LARGE)
annotation class BadgeSize

/**
 * Small badge size, 8x8dp.
 */
const val BADGE_SIZE_SMALL = 0

/**
 * Large badge size, 16x16dp or up to 16x32dp.
 */
const val BADGE_SIZE_LARGE = 1

/**
 * Test tag to find the badge.
 */
const val BADGE_TEST_TAG = "badge"

private const val MAX_BADGE_COUNT = 99
private const val MAX_BADGE_COUNT_EXCEEDED = "\u221e"
private val SYMBOL_VERTICAL_OFFSET = (-0.5).dp
private val SMALL_BADGE_OFFSET = IntOffset(1, (-1))
private val LARGE_BADGE_OFFSET = IntOffset(8, (-4))

/**
 * Badged icon.
 * The badge may be small (8x8 Dp) or large (with up to two numeric digits (99)
 *
 * @param painter [Painter] representing the icon
 * @param isHighlighted whether or not the button is highlighted.  No badge will be shown
 * if highlighted is false.
 * @param modifier [Modifier]
 * @param size [BadgeSize], defaults to BADGE_SIZE_SMALL
 * @param notificationCount Int value representing count drawn inside badge.  Defaults to 0
 * @param contentDescription String content description
 * @param containerColor [Color] of the badge's container color
 * @param tint [Color] of the icon's tint
 * @param badgeContentColor [Color] of the badge's content color (text color)
 */
@Composable
fun BadgedIcon(
    painter: Painter,
    isHighlighted: Boolean,
    modifier: Modifier = Modifier,
    @BadgeSize size: Int = BADGE_SIZE_SMALL,
    notificationCount: Int = 0,
    contentDescription: String? = null,
    containerColor: Color = MaterialTheme.colorScheme.information,
    tint: Color = MaterialTheme.colorScheme.onSurface,
    badgeContentColor: Color = MaterialTheme.colorScheme.onError,
) {
    BadgedBox(
        isHighlighted = isHighlighted,
        size = size,
        modifier = modifier,
        notificationCount = notificationCount,
        containerColor = containerColor,
        badgeContentColor = badgeContentColor,
    ) {
        Icon(
            painter = painter,
            contentDescription = contentDescription,
            tint = tint,
        )
    }
}

@Composable
@PreviewLightDark
@PreviewNumericSystems
private fun BadgedIconPreview(
    @PreviewParameter(BadgeProvider::class) config: BadgeData,
) {
    AcornTheme {
        Column(
            modifier = Modifier
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
            verticalArrangement = spacedBy(16.dp),
        ) {
            BadgedIcon(
                isHighlighted = config.isHighlighted,
                painter = painterResource(config.icon),
                size = config.size,
                notificationCount = config.notificationCount,
            )
        }
    }
}

@Composable
@Preview
private fun BadgedIconPreviewPrivate(
    @PreviewParameter(BadgeProvider::class) config: BadgeData,
) {
    AcornTheme(colorScheme = acornPrivateColorScheme()) {
        Column(
            modifier = Modifier
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
            verticalArrangement = spacedBy(16.dp),
        ) {
            BadgedIcon(
                isHighlighted = config.isHighlighted,
                painter = painterResource(config.icon),
                size = config.size,
                notificationCount = config.notificationCount,
            )
        }
    }
}

/**
 * Converts a numeric count to a Locale-appropriate string, or ∞ if max count has
 * been exceeded.
 *
 * Treatment aligns with [TabCounter] and [TabCounterButton] composables.
 */
@Composable
private fun convertNotificationCountToLabel(notificationCount: Int): String {
    return if (notificationCount <= MAX_BADGE_COUNT) {
        notificationCount.toLocaleString()
    } else {
        MAX_BADGE_COUNT_EXCEEDED
    }
}

/**
 * Content to be shown inside the badge.
 * Content is only rendered for the large [BadgeSize].
 * @param size [BadgeSize]
 * @param notificationCount Int representing count displayed in badge.  Defaults to 0.
 * @return string content, or null if no content is to be drawn.
 */
@Composable
private fun badgeContent(
    @BadgeSize size: Int,
    notificationCount: Int = 0,
): @Composable (RowScope.() -> Unit)? {
    val notificationLabel = convertNotificationCountToLabel(notificationCount)
    return when (size) {
        BADGE_SIZE_LARGE -> {
            {
                Text(
                    // Adds a small offset to center the ∞ symbol
                    modifier = Modifier
                        .thenConditional(
                            Modifier.offset(y = SYMBOL_VERTICAL_OFFSET),
                            predicate = { notificationLabel == MAX_BADGE_COUNT_EXCEEDED },
                        ),
                    text = notificationLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onError,
                    maxLines = 1,
                )
            }
        }
        else -> {
            null
        }
    }
}

/**
 * Box to house the badged icon.  The [BadgedBox] provided by Material 3 does not work for our
 * purposes because the Mozilla badge sizing is different.
 *
 * @param isHighlighted Boolean value representing whether or not the icon is highlighted.  The badge
 * is only drawn if the icon is highlighted.
 * @param size [BadgeSize]
 * @param modifier [Modifier]
 * @param notificationCount Int representing the count shown in the badge content
 * @param containerColor [Color] of the badge's container color
 * @param badgeContentColor [Color] of the badge's content color (text color)
 * @param content The content rendered inside the badge
 */
@Composable
private fun BadgedBox(
    isHighlighted: Boolean,
    @BadgeSize size: Int,
    modifier: Modifier,
    notificationCount: Int = 0,
    containerColor: Color = MaterialTheme.colorScheme.information,
    badgeContentColor: Color = MaterialTheme.colorScheme.onError,
    content: @Composable BoxScope.() -> Unit,
) {
    val offset: IntOffset by remember(size) {
        derivedStateOf {
            if (size == BADGE_SIZE_SMALL) {
                SMALL_BADGE_OFFSET
            } else {
                LARGE_BADGE_OFFSET
            }
        }
    }

    Box(modifier = modifier) {
        content()
        if (isHighlighted) {
            Badge(
                modifier = Modifier
                    .thenConditional(Modifier.requiredSize(8.dp), { size == BADGE_SIZE_SMALL })
                    .thenConditional(Modifier.requiredHeight(16.dp), predicate = { size == BADGE_SIZE_LARGE })
                    .align(alignment = Alignment.TopEnd)
                    .offset { IntOffset(x = offset.x.dp.roundToPx(), y = offset.y.dp.roundToPx()) }
                    .testTag(BADGE_TEST_TAG),
                containerColor = containerColor,
                contentColor = badgeContentColor,
                content = badgeContent(size = size, notificationCount = notificationCount),
            )
        }
    }
}

private data class BadgeData(
    val isHighlighted: Boolean = false,
    val icon: Int = iconsR.drawable.mozac_ic_download_24,
    val size: Int = BADGE_SIZE_SMALL,
    val notificationCount: Int = 0,
)
private class BadgeProvider : PreviewParameterProvider<BadgeData> {
    override val values = sequenceOf(
        // small, not highlighted
        BadgeData(
            isHighlighted = false,
            size = BADGE_SIZE_SMALL,
        ),
       // large, not highlighted
       BadgeData(
            isHighlighted = false,
            size = BADGE_SIZE_LARGE,
       ),
        // small, highlighted
        BadgeData(
            isHighlighted = true,
            size = BADGE_SIZE_SMALL,
        ),
        // large, highlighted single digit
        BadgeData(
            isHighlighted = true,
            size = BADGE_SIZE_LARGE,
            notificationCount = 3,
        ),
        // large, highlighted double digit
        BadgeData(
            isHighlighted = true,
            size = BADGE_SIZE_LARGE,
            notificationCount = 99,
        ),
        // large, highlighted triple digit
        BadgeData(
            isHighlighted = true,
            size = BADGE_SIZE_LARGE,
            notificationCount = 999,
        ),
    )
}

/**
 * An annotation class representing Locales that represent different
 * numeric systems.  If this is useful in other contexts it may be
 * extracted from the Badge class.
 */
@Preview(name = "Western Arabic", locale = "en")
@Preview(name = "Eastern Arabic", locale = "ar")
@Preview(name = "Bengali", locale = "bn")
@Preview(name = "Burmese", locale = "mr")
@Preview(name = "Nepali", locale = "ne")
annotation class PreviewNumericSystems
