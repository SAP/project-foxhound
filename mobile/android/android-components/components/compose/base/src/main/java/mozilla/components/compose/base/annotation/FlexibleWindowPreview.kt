/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.annotation

import androidx.compose.ui.tooling.preview.Devices
import androidx.compose.ui.tooling.preview.Preview
import mozilla.components.compose.base.theme.layout.AcornWindowSize

/**
 * A wrapper annotation for creating a preview that renders a preview for each value of [AcornWindowSize].
 */
// The device parameter is needed in order to force the `LocalConfiguration.current.screenWidth`
// to work properly. See: https://issuetracker.google.com/issues/300116108#comment1
@Preview(
    name = "Extra Small Window",
    widthDp = SMALL_WINDOW_WIDTH,
    heightDp = EXTRA_SMALL_WINDOW_HEIGHT,
)
@Preview(
    name = "Extra Small Window Landscape",
    widthDp = SMALL_WINDOW_WIDTH * 2,
    heightDp = EXTRA_SMALL_WINDOW_HEIGHT,
)
@Preview(
    name = "Small Window",
    widthDp = SMALL_WINDOW_WIDTH,
)
@Preview(
    name = "Small Window Landscape",
    heightDp = SMALL_WINDOW_WIDTH,
    widthDp = SMALL_WINDOW_WIDTH * 2,
)
@Preview(
    name = "Medium Window",
    widthDp = MEDIUM_WINDOW_WIDTH,
    device = Devices.NEXUS_7,
)
@Preview(
    name = "Large Window",
    widthDp = LARGE_WINDOW_WIDTH,
    device = Devices.PIXEL_TABLET,
)
annotation class FlexibleWindowPreview
