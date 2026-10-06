/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.repository

import android.content.Context
import androidx.room.Room
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import mozilla.components.support.utils.DateTimeProvider
import mozilla.components.support.utils.DefaultDateTimeProvider
import org.mozilla.fenix.tabgroups.storage.data.TabGroup
import org.mozilla.fenix.tabgroups.storage.data.TabGroupData
import org.mozilla.fenix.tabgroups.storage.data.toStoredTabGroup
import org.mozilla.fenix.tabgroups.storage.data.toTabGroup
import org.mozilla.fenix.tabgroups.storage.database.TabGroupAssignment
import org.mozilla.fenix.tabgroups.storage.database.TabGroupDatabase

/**
 * Abstraction for interfacing with tab group storage.
 */
interface TabGroupRepository {

    /**
     * [Flow] for observing [TabGroupData].
     */
    val tabGroupDataFlow: Flow<TabGroupData>

    /**
     * Create a new tab group with tabs.
     */
    suspend fun createTabGroupWithTabs(tabGroup: TabGroup, tabIds: List<String>)

    /**
     * Deletes all tab group data from the repository.
     */
    suspend fun deleteAllTabGroupData()

    // Tab Group operations

    /**
     * Add a new [TabGroup] to the repository.
     */
    suspend fun addNewTabGroup(tabGroup: TabGroup)

    /**
     * Update the matching [TabGroup] in the repository.
     */
    suspend fun updateTabGroup(tabGroup: TabGroup)

    /**
     * Mark the specified tab group as closed.
     */
    suspend fun closeTabGroup(tabGroupId: String)

    /**
     * Mark the specified tab group as open.
     */
    suspend fun openTabGroup(tabGroupId: String)

    /**
     * Mark all tab groups as closed.
     */
    suspend fun closeAllTabGroups()

    /**
     * Delete the tab group in the repository with the matching ID.
     */
    suspend fun deleteTabGroupById(tabGroupId: String)

    /**
     * Delete tab groups with the provided [ids] in the repository.
     */
    suspend fun deleteTabGroupsById(ids: List<String>)

    // Tab Group Assignment operations

    /**
     * Add a new tab group assignment to the repository.
     */
    suspend fun addTabGroupAssignment(tabId: String, tabGroupId: String)

    /**
     * Map all of the [tabIds] to [tabGroupId].
     */
    suspend fun addTabsToTabGroup(tabGroupId: String, tabIds: List<String>)

    /**
     * Update the group assignment for [tabId].
     */
    suspend fun updateTabGroupAssignment(tabId: String, tabGroupId: String)

    /**
     * Delete the assignment for the provided [tabId].
     */
    suspend fun deleteTabGroupAssignmentById(tabId: String)

    /**
     * Delete all the assignments for the provided [tabIds].
     */
    suspend fun deleteTabGroupAssignmentsById(tabIds: List<String>)

    /**
     * Delete the assignments for the provided [tabGroupId].
     */
    suspend fun deleteAllTabGroupAssignmentsForGroup(tabGroupId: String)
}

/**
 * The default implementation of [TabGroupRepository] built off of Room.
 */
class DefaultTabGroupRepository : TabGroupRepository {

    /**
     * The default implementation of [TabGroupRepository] built off of Room.
     *
     * @param applicationContext [Context] used to instantiate the database.
     * @param dateTimeProvider The [DateTimeProvider] used to update time-based metadata.
     */
    constructor(
        applicationContext: Context,
        dateTimeProvider: DateTimeProvider = DefaultDateTimeProvider(),
    ) {
        this.database = Room.databaseBuilder(
            context = applicationContext,
            klass = TabGroupDatabase::class.java,
            name = "tab_groups",
        ).addMigrations(TabGroupDatabase.MIGRATION_1_2)
            .build()
        this.dateTimeProvider = dateTimeProvider
    }

    /**
     * The test implementation of [TabGroupRepository].
     *
     * @param database The test instance of [TabGroupDatabase].
     * @param dateTimeProvider The [DateTimeProvider] used to update time-based metadata.
     *
     */
    internal constructor(
        database: TabGroupDatabase,
        dateTimeProvider: DateTimeProvider,
    ) {
        this.database = database
        this.dateTimeProvider = dateTimeProvider
    }

    private val database: TabGroupDatabase

    private val dateTimeProvider: DateTimeProvider

    override val tabGroupDataFlow: Flow<TabGroupData>
        get() = database.tabGroupOperationsDao.getAllTabGroupsWithAssignments()
            .map { tabGroupData ->
                val groups = tabGroupData.map {
                    it.group.toTabGroup()
                }
                val assignments = tabGroupData
                    .flatMap { it.assignments }
                    .associate { assignment ->
                        assignment.id to assignment.tabGroupId
                    }

                TabGroupData(
                    tabGroups = groups,
                    tabGroupAssignments = assignments,
                )
            }

    override suspend fun createTabGroupWithTabs(
        tabGroup: TabGroup,
        tabIds: List<String>,
    ) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.createTabGroup(
            tabGroup = tabGroup.toStoredTabGroup(),
            assignments = tabIds.map { TabGroupAssignment(id = it, tabGroupId = tabGroup.id) },
        )
    }

    override suspend fun deleteAllTabGroupData() = withContext(Dispatchers.IO) {
        database.clearAllTables()
    }

    // Tab Group Metadata operations
    override suspend fun addNewTabGroup(tabGroup: TabGroup) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.upsertTabGroup(tabGroup = tabGroup.toStoredTabGroup())
    }

    override suspend fun updateTabGroup(tabGroup: TabGroup) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.upsertTabGroup(tabGroup = tabGroup.toStoredTabGroup())
    }

    override suspend fun closeTabGroup(tabGroupId: String) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.updateTabGroupCloseState(
            id = tabGroupId,
            closed = true,
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun openTabGroup(tabGroupId: String) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.updateTabGroupCloseState(
            id = tabGroupId,
            closed = false,
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun closeAllTabGroups() = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.closeAllTabGroups(
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun deleteTabGroupById(tabGroupId: String) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.deleteTabGroupById(id = tabGroupId)
    }

    override suspend fun deleteTabGroupsById(ids: List<String>) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.deleteTabGroupsById(ids = ids)
    }

    // Tab Group Assignment operations
    override suspend fun addTabGroupAssignment(tabId: String, tabGroupId: String) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.upsertTabGroupAssignment(
            assignment = TabGroupAssignment(
                id = tabId,
                tabGroupId = tabGroupId,
            ),
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun updateTabGroupAssignment(tabId: String, tabGroupId: String) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.upsertTabGroupAssignment(
            assignment = TabGroupAssignment(
                id = tabId,
                tabGroupId = tabGroupId,
            ),
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun addTabsToTabGroup(tabGroupId: String, tabIds: List<String>) = withContext(Dispatchers.IO) {
        val assignments = tabIds.map { TabGroupAssignment(id = it, tabGroupId = tabGroupId) }
        database.tabGroupOperationsDao.upsertTabGroupAssignments(
            assignments = assignments,
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun deleteTabGroupAssignmentById(tabId: String) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.deleteTabGroupAssignmentById(
            tabId = tabId,
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun deleteAllTabGroupAssignmentsForGroup(tabGroupId: String) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.deleteTabGroupAssignmentsByTabGroupId(
            tabGroupId = tabGroupId,
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }

    override suspend fun deleteTabGroupAssignmentsById(tabIds: List<String>) = withContext(Dispatchers.IO) {
        database.tabGroupOperationsDao.deleteAllAssignmentsById(
            tabIds = tabIds,
            currentTime = dateTimeProvider.currentTimeMillis(),
        )
    }
}
