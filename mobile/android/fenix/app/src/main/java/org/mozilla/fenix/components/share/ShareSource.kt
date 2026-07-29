/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.share

/**
 * Enum representing the different surfaces from which the native share sheet can be opened, used for
 * telemetry purposes.
 */
enum class ShareSource(val value: String) {
    BROWSER_MENU("browser_menu"),
    CUSTOM_TAB_MENU("custom_tab_menu"),
    BROWSER_TOOLBAR("browser_toolbar"),
    TABS_TRAY("tabs_tray"),
    HOME("home"),
    BOOKMARKS("bookmarks"),
    HISTORY("history"),
    HISTORY_METADATA_GROUP("history_metadata_group"),
    RECENTLY_CLOSED("recently_closed"),
    DEEP_LINK("deep_link"),
    WEB_SHARE("web_share"),
}
