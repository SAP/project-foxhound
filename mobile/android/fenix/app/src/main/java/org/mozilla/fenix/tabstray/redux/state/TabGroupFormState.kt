/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.state

import org.mozilla.fenix.tabgroups.EditTabGroup
import org.mozilla.fenix.tabstray.data.TabGroupTheme
import org.mozilla.fenix.tabstray.data.TabsTrayItem.TabGroup

/**
 * Value type that represents the form state when creating or editing a Tab Group.
 *
 * @property tabGroupId The id of the tab group or null if creating a new Tab Group.
 * @property name The text for the tab group name in the form's text field.
 * @property nextTabGroupNumber Number used to derive a default tab group name.
 * Example: if a user has zero tab groups, the default name will have "1" appended to it.
 * If a user has 5 tab groups, the default tab group name will have "6" appended to it.
 * @property theme The tab group's theme.  If creating a new tab group, a default color
 * will be selected based on the last theme used.
 * @property edited Whether the user has modified the form fields.
 */
data class TabGroupFormState(
    val tabGroupId: String?,
    val name: String,
    val nextTabGroupNumber: Int = 1,
    val theme: TabGroupTheme = TabGroupTheme.default,
    val edited: Boolean = false,
) {
    /**
     * Returns true when editing an existing tab group.
     */
    val inEditState: Boolean get() = tabGroupId != null

    /**
     * Returns the text that should be shown initially in the name field.
     *
     * If the user has edited the field or the current name is not blank,
     * display the current name. Otherwise, display the defaultName.
     */
    fun getInitialName(defaultName: String?): String =
        if (edited || name.isNotBlank()) name else (defaultName ?: "")
}

/**
 * Returns an initial [TabGroupFormState] derived from [TabsTrayState].
 *
 * Note: Because we need a localized string for the initial name, this is constructed at render time in [EditTabGroup].
 */
fun TabsTrayState.initializeTabGroupForm() = TabGroupFormState(
    tabGroupId = null,
    name = "",
    nextTabGroupNumber = tabGroupState.groups.size + 1,
    theme = tabGroupState.groups
        .maxByOrNull { it.lastModified }
        ?.theme
        ?.next()
        ?: TabGroupTheme.default,
    edited = false,
)

/**
 * Returns an initial [TabGroupFormState] derived from a [TabGroup].
 */
fun TabGroup.initializeTabGroupForm() = TabGroupFormState(
    tabGroupId = id,
    name = title,
    theme = theme,
)
