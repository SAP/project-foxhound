/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.fakes

import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import org.mozilla.fenix.tabgroups.storage.data.TabGroup
import org.mozilla.fenix.tabgroups.storage.data.TabGroupData
import org.mozilla.fenix.tabgroups.storage.repository.TabGroupRepository

/**
 * Important Note: This is used for TESTING and COMPOSE PREVIEWS only.
 *
 * This is a fake implementation of [TabGroupRepository] designed exclusively
 * for unit tests and Compose previews. Do NOT use this in production UI code.
 */
@VisibleForTesting
@Suppress("EmptyFunctionBlock")
class FakeTabGroupRepository(
    initialTabGroupData: TabGroupData = TabGroupData(),
    private val closeAllTabGroups: () -> Unit = {},
    private val deleteTabGroupAssignmentById: (String) -> Unit = {},
    private val deleteTabGroupAssignmentsById: (List<String>) -> Unit = {},
) : TabGroupRepository {

    private val mutableTabGroupFlow: MutableStateFlow<TabGroupData> = MutableStateFlow(initialTabGroupData)

    override val tabGroupDataFlow: Flow<TabGroupData>
        get() = mutableTabGroupFlow

    override suspend fun createTabGroupWithTabs(
        tabGroup: TabGroup,
        tabIds: List<String>,
    ) {
        val updatedAssignments = HashMap(mutableTabGroupFlow.value.tabGroupAssignments)
        tabIds.forEach { id ->
            updatedAssignments[id] = tabGroup.id
        }
        mutableTabGroupFlow.emit(
            mutableTabGroupFlow.value.copy(
                tabGroups = mutableTabGroupFlow.value.tabGroups + tabGroup,
                tabGroupAssignments = updatedAssignments,
            ),
        )
    }

    override suspend fun addNewTabGroup(tabGroup: TabGroup) {
        mutableTabGroupFlow.emit(
            mutableTabGroupFlow.value.copy(
                tabGroups = mutableTabGroupFlow.value.tabGroups + tabGroup,
            ),
        )
    }

    override suspend fun updateTabGroup(tabGroup: TabGroup) {
        val updatedList = mutableTabGroupFlow.value.tabGroups.map {
            if (it.id == tabGroup.id) {
                tabGroup
            } else {
                it
            }
        }
        mutableTabGroupFlow.emit(mutableTabGroupFlow.value.copy(tabGroups = updatedList))
    }

    override suspend fun closeTabGroup(tabGroupId: String) {
        mutableTabGroupFlow.emit(
            mutableTabGroupFlow.value.copy(
                tabGroups = mutableTabGroupFlow.value.tabGroups.map { group ->
                    if (group.id == tabGroupId) {
                        group.copy(closed = true)
                    } else {
                        group
                    }
                },
            ),
        )
    }

    override suspend fun openTabGroup(tabGroupId: String) {
        mutableTabGroupFlow.emit(
            mutableTabGroupFlow.value.copy(
                tabGroups = mutableTabGroupFlow.value.tabGroups.map { group ->
                    if (group.id == tabGroupId) {
                        group.copy(closed = false)
                    } else {
                        group
                    }
                },
            ),
        )
    }

    override suspend fun closeAllTabGroups() {
        closeAllTabGroups.invoke()
    }

    override suspend fun deleteTabGroupById(tabGroupId: String) {
        deleteTabGroupsById(ids = listOf(tabGroupId))
    }

    override suspend fun deleteTabGroupsById(ids: List<String>) {
        val prunedAssignments = HashMap(mutableTabGroupFlow.value.tabGroupAssignments)
        ids.forEach {
            prunedAssignments.remove(it)
        }
        mutableTabGroupFlow.emit(
            mutableTabGroupFlow.value.copy(
                tabGroups = mutableTabGroupFlow.value.tabGroups.filterNot { it.id in ids },
                tabGroupAssignments = prunedAssignments,
            ),
        )
    }

    override suspend fun addTabGroupAssignment(
        tabId: String,
        tabGroupId: String,
    ) {
        val updatedAssignments = mutableTabGroupFlow.value.tabGroupAssignments + (tabId to tabGroupId)
        mutableTabGroupFlow.emit(mutableTabGroupFlow.value.copy(tabGroupAssignments = updatedAssignments))
    }

    override suspend fun addTabsToTabGroup(
        tabGroupId: String,
        tabIds: List<String>,
    ) {
        val updatedAssignments = HashMap(mutableTabGroupFlow.value.tabGroupAssignments)
        tabIds.forEach { id ->
            updatedAssignments[id] = tabGroupId
        }
        mutableTabGroupFlow.emit(mutableTabGroupFlow.value.copy(tabGroupAssignments = updatedAssignments))
    }

    override suspend fun updateTabGroupAssignment(
        tabId: String,
        tabGroupId: String,
    ) {
        val updatedAssignments = HashMap(mutableTabGroupFlow.value.tabGroupAssignments)
        updatedAssignments[tabId] = tabGroupId
        mutableTabGroupFlow.emit(mutableTabGroupFlow.value.copy(tabGroupAssignments = updatedAssignments))
    }

    override suspend fun deleteTabGroupAssignmentById(tabId: String) {
        deleteTabGroupAssignmentById.invoke(tabId)
    }

    override suspend fun deleteTabGroupAssignmentsById(tabIds: List<String>) {
        deleteTabGroupAssignmentsById.invoke(tabIds)
    }

    override suspend fun deleteAllTabGroupAssignmentsForGroup(tabGroupId: String) {}

    override suspend fun deleteAllTabGroupData() {
        mutableTabGroupFlow.emit(TabGroupData())
    }
}
