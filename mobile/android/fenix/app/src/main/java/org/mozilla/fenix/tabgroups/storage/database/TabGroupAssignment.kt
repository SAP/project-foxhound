/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.Entity
import androidx.room.PrimaryKey

internal const val TAB_GROUP_ASSIGNMENT_TABLE_NAME = "stored_tab_group_assignments"

/**
 * A data pairing linking a tab (via its ID) to its tab group's ID.
 *
 * @property id The ID of the tab.
 * @property tabGroupId The ID of the group this tab belongs to.
 */
@Entity(tableName = TAB_GROUP_ASSIGNMENT_TABLE_NAME)
internal data class TabGroupAssignment(
    @PrimaryKey val id: String, // tabId
    val tabGroupId: String,
)
