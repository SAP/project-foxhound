/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.Embedded
import androidx.room.Relation

/**
 * Data model for reading-in the entirety of tab group data.
 *
 * @property group The group's metadata.
 * @property assignments The group's [TabGroupAssignment]s.
 */
internal data class StoredTabGroupWithAssignments(
    @Embedded val group: StoredTabGroup,
    @Relation(
        parentColumn = "id",
        entityColumn = "tabGroupId",
    )
    val assignments: List<TabGroupAssignment>,
)
