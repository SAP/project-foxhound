/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

internal const val TAB_GROUP_TABLE_NAME = "stored_tab_groups"

/**
 * The data model of a Tab Group saved to disk.
 *
 * @property id The ID of the tab group.
 * @property title The display title of the tab group.
 * @property theme The theme of the tab group. The string maps to a theme value in the UI.
 * @property closed Whether the group has been closed by the user.
 * @property lastModified Timestamp indicating the last time this entry was updated.
 */
@Entity(tableName = TAB_GROUP_TABLE_NAME)
internal data class StoredTabGroup(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val theme: String,
    val closed: Boolean = false,
    val lastModified: Long,
)
