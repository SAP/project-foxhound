/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

/**
 * The [Dao] operations for modifying the Tab Groups database.
 *
 * This contains operations from [StoredTabGroupDao] and [TabGroupAssignmentDao] and some combined Transactions between
 * the two.
 */
@Dao
internal interface TabGroupOperationsDao : StoredTabGroupDao, TabGroupAssignmentDao {

    @Transaction
    @Query("SELECT * FROM $TAB_GROUP_TABLE_NAME")
    fun getAllTabGroupsWithAssignments(): Flow<List<StoredTabGroupWithAssignments>>

    /**
     * Creates a new [tabGroup] instance in the database with a list of [assignments].
     */
    @Transaction
    suspend fun createTabGroup(tabGroup: StoredTabGroup, assignments: List<TabGroupAssignment>) {
        upsertTabGroup(tabGroup = tabGroup)
        upsertTabGroupAssignments(assignments = assignments)
    }

    /**
     * Updates or inserts the provided [TabGroupAssignment] and updates the group's timestamp..
     */
    @Transaction
    suspend fun upsertTabGroupAssignment(assignment: TabGroupAssignment, currentTime: Long) {
        upsertTabGroupAssignment(assignment = assignment)
        touchGroupsForTabs(tabIds = listOf(assignment.id), currentTime = currentTime)
    }

    /**
     * Updates or inserts the provided [TabGroupAssignment]s and updates the group's timestamp.
     */
    @Transaction
    suspend fun upsertTabGroupAssignments(assignments: List<TabGroupAssignment>, currentTime: Long) {
        upsertTabGroupAssignments(assignments = assignments)
        touchGroupsForTabs(tabIds = assignments.map { it.id }, currentTime = currentTime)
    }

    /**
     * Deletes the specified [TabGroupAssignment] and updates the group's timestamp.
     */
    @Transaction
    suspend fun deleteTabGroupAssignment(assignment: TabGroupAssignment, currentTime: Long) {
        deleteTabGroupAssignmentById(tabId = assignment.id, currentTime = currentTime)
    }

    /**
     * Deletes all of the [TabGroupAssignment]s who are tied to [tabGroupId].
     */
    @Transaction
    suspend fun deleteTabGroupAssignmentsByTabGroupId(tabGroupId: String, currentTime: Long) {
        deleteTabGroupAssignmentsByTabGroupId(tabGroupId = tabGroupId)
        updateTabGroupLastModified(id = tabGroupId, currentTime = currentTime)
    }

    /**
     * Deletes the [TabGroupAssignment] corresponding to [tabId] and updates the group's timestamp.
     */
    @Transaction
    suspend fun deleteTabGroupAssignmentById(tabId: String, currentTime: Long) {
        touchGroupForTab(tabId = tabId, currentTime = currentTime)
        deleteTabGroupAssignmentById(tabId = tabId)
    }

    /**
     * Deletes all of the [TabGroupAssignment]s whose ID is contained in [tabIds] and update their group's timestamp.
     */
    @Transaction
    suspend fun deleteAllAssignmentsById(tabIds: List<String>, currentTime: Long) {
        touchGroupsForTabs(tabIds = tabIds, currentTime = currentTime)
        deleteAllAssignmentsById(tabIds = tabIds)
    }
}
