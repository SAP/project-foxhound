/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.store

import androidx.annotation.ColorInt
import mozilla.components.lib.state.State
import org.mozilla.fenix.browser.PageTranslationStatus
import org.mozilla.fenix.browser.ReaderModeStatus

/**
 * State of the browser screen.
 *
 * @property cancelPrivateDownloadsAccepted Whether the user has accepted to cancel private downloads.
 * @property readerModeStatus Reader mode status of the current page.
 * @property pageTranslationStatus Translation status of the current page.
 * @property customTabColors Custom colors configuration when browsing in custom tab.
 */
data class BrowserScreenState(
    val cancelPrivateDownloadsAccepted: Boolean = false,
    val readerModeStatus: ReaderModeStatus = ReaderModeStatus.UNKNOWN,
    val pageTranslationStatus: PageTranslationStatus = PageTranslationStatus.NOT_POSSIBLE,
    val customTabColors: CustomTabColors? = null,
) : State

/**
 * Custom colors configuration when browsing in custom tab.
 *
 * @property toolbarColor Background color for the toolbar.
 * @property statusBarColor Background color for the system's status bar.
 * @property navigationBarColor Background color for the system's navigation bar.
 * @property navigationBarDividerColor Color for the thin line separating the
 * system navigation bar from the application's UI.
 * @property readableColor Color for text or icons shown in the toolbar with enough contrast to be easily readable.
 * @property secondaryReadableColor Color for less important text or icons to have enough contrast
 * to be easily readable. Typically, this will be a slightly more faded color than [readableColor].
 */
data class CustomTabColors(
    @param:ColorInt val toolbarColor: Int? = null,
    @param:ColorInt val statusBarColor: Int? = null,
    @param:ColorInt val navigationBarColor: Int? = null,
    @param:ColorInt val navigationBarDividerColor: Int? = null,
    @param:ColorInt val readableColor: Int? = null,
    @param:ColorInt val secondaryReadableColor: Int? = null,
)
