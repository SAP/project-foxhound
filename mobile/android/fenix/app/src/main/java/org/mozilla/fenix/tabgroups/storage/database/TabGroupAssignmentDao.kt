/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * [Dao] to interact with the table containing [TabGroupAssignment].
 */
@Dao
internal interface TabGroupAssignmentDao {

    /**
     * Updates or inserts the provided [TabGroupAssignment]s.
     */
    @Upsert
    suspend fun upsertTabGroupAssignments(assignments: List<TabGroupAssignment>)

    /**
     * Updates or inserts the provided [TabGroupAssignment].
     */
    @Upsert
    suspend fun upsertTabGroupAssignment(assignment: TabGroupAssignment)

    /**
     * Fetches all of the [TabGroupAssignment]s.
     */
    @Query("SELECT * FROM $TAB_GROUP_ASSIGNMENT_TABLE_NAME")
    fun getAllTabGroupAssignments(): Flow<List<TabGroupAssignment>>

    /**
     * Deletes the specified [TabGroupAssignment].
     */
    @Delete
    suspend fun deleteTabGroupAssignment(tabGroupAssignment: TabGroupAssignment)

    /**
     * Deletes the [TabGroupAssignment] corresponding to [tabId].
     */
    @Query("DELETE FROM $TAB_GROUP_ASSIGNMENT_TABLE_NAME WHERE id = :tabId")
    suspend fun deleteTabGroupAssignmentById(tabId: String)

    /**
     * Deletes all of the [TabGroupAssignment]s who are tied to [tabGroupId].
     */
    @Query("DELETE FROM $TAB_GROUP_ASSIGNMENT_TABLE_NAME WHERE tabGroupId = :tabGroupId")
    suspend fun deleteTabGroupAssignmentsByTabGroupId(tabGroupId: String)

    /**
     * Deletes all of the [TabGroupAssignment]s in the database.
     */
    @Query("DELETE FROM $TAB_GROUP_ASSIGNMENT_TABLE_NAME")
    suspend fun deleteAllTabGroupAssignments()

    /**
     * Updates the tab group timestamp which contain [tabId].
     */
    @Query(
        """
        UPDATE $TAB_GROUP_TABLE_NAME
        SET lastModified = :currentTime
        WHERE id IN (
            SELECT DISTINCT tabGroupId
            FROM $TAB_GROUP_ASSIGNMENT_TABLE_NAME
            WHERE id IN (:tabId)
        )
    """,
    )
    suspend fun touchGroupForTab(tabId: String, currentTime: Long): Int

    /**
     * Updates the tab groups' timestamps which contain [tabIds].
     */
    @Query(
        """
        UPDATE $TAB_GROUP_TABLE_NAME
        SET lastModified = :currentTime
        WHERE id IN (
            SELECT DISTINCT tabGroupId
            FROM $TAB_GROUP_ASSIGNMENT_TABLE_NAME
            WHERE id IN (:tabIds)
        )
    """,
    )
    suspend fun touchGroupsForTabs(tabIds: List<String>, currentTime: Long): Int

    /**
     * Deletes all of the [TabGroupAssignment]s whose ID is contained in [tabIds].
     */
    @Query(
        """
        DELETE FROM $TAB_GROUP_ASSIGNMENT_TABLE_NAME
        WHERE id IN (:tabIds)
    """,
    )
    suspend fun deleteAllAssignmentsById(tabIds: List<String>): Int
}
