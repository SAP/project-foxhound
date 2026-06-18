/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.support.utils.DateTimeProvider
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabgroups.storage.data.TabGroup
import org.mozilla.fenix.tabgroups.storage.database.TabGroupDatabase
import org.mozilla.fenix.tabgroups.storage.repository.DefaultTabGroupRepository
import java.io.IOException
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class DefaultTabGroupRepositoryTest {

    private lateinit var database: TabGroupDatabase
    private lateinit var repository: DefaultTabGroupRepository
    private val dateTimeProvider: DateTimeProvider = object : DateTimeProvider {
        override fun currentLocalDate(): LocalDate = LocalDate.of(1998, 3, 31)

        override fun currentZoneId(): ZoneId = ZoneOffset.UTC

        override fun currentTimeMillis(): Long = timeStamp
    }

    private var timeStamp: Long = 0L

    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            context = ApplicationProvider.getApplicationContext(),
            klass = TabGroupDatabase::class.java,
        ).build()
        repository = DefaultTabGroupRepository(
            database = database,
            dateTimeProvider = dateTimeProvider,
        )
    }

    @After
    @Throws(IOException::class)
    fun teardown() {
        database.close()
    }

    @Test
    fun `WHEN a tab group is created with tabs THEN add the group and group assignments to the database`() = runTest {
        val expectedTabGroup = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 10L,
        )
        val tabIds = List(size = 10) { "$it" }
        val expectedTabGroupAssignments = tabIds.associateWith { expectedTabGroup.id }

        repository.createTabGroupWithTabs(
            tabGroup = expectedTabGroup,
            tabIds = tabIds,
        )

        advanceUntilIdle()

        assertEquals(listOf(expectedTabGroup), repository.tabGroupDataFlow.first().tabGroups)
        assertEquals(expectedTabGroupAssignments, repository.tabGroupDataFlow.first().tabGroupAssignments)
    }

    @Test
    fun `WHEN a tab group is created THEN add the entry to the database`() = runTest {
        val expectedTabGroup = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 10L,
        )
        repository.addNewTabGroup(expectedTabGroup)

        advanceUntilIdle()

        assertEquals(listOf(expectedTabGroup), repository.tabGroupDataFlow.first().tabGroups)
        assertEquals(expectedTabGroup, repository.tabGroupDataFlow.first().tabGroups.find { it.id == expectedTabGroup.id })
    }

    @Test
    fun `WHEN a tab group update is received THEN update its entry in the database`() = runTest {
        val initialTabGroup = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 10L,
        )
        initializeDatabase(
            initialTabGroups = listOf(initialTabGroup),
        )
        val expectedTitle = "new title"
        val expectedTheme = "new theme"
        val expectedModified = 20L
        val updatedTabGroup = initialTabGroup.copy(
            title = expectedTitle,
            theme = expectedTheme,
            lastModified = expectedModified,
        )
        repository.addNewTabGroup(updatedTabGroup)

        advanceUntilIdle()

        val actualTabGroup = repository.tabGroupDataFlow.first().tabGroups.first()
        assertEquals(updatedTabGroup, actualTabGroup)
    }

    @Test
    fun `WHEN a user closes an open tab group THEN mark the group as closed in the database and update its timestamp`() = runTest {
        val initialTabGroup = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = false,
        )
        val expectedTimestamp = 7L
        timeStamp = expectedTimestamp
        val expectedTabGroup = initialTabGroup.copy(
            lastModified = expectedTimestamp,
            closed = true,
        )
        timeStamp = expectedTimestamp
        initializeDatabase(
            initialTabGroups = listOf(initialTabGroup),
        )

        repository.closeTabGroup(tabGroupId = initialTabGroup.id)

        advanceUntilIdle()

        val tabGroup = repository.tabGroupDataFlow.first().tabGroups.first()
        assertEquals(expectedTabGroup, tabGroup)
    }

    @Test
    fun `WHEN a user opens a closed tab group THEN mark the group as open in the database and update its timestamp`() = runTest {
        val initialTabGroup = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val expectedTimestamp = 7L
        timeStamp = expectedTimestamp
        val expectedTabGroup = initialTabGroup.copy(
            lastModified = expectedTimestamp,
            closed = false,
        )
        initializeDatabase(
            initialTabGroups = listOf(initialTabGroup),
        )

        repository.openTabGroup(tabGroupId = initialTabGroup.id)

        advanceUntilIdle()

        val tabGroup = repository.tabGroupDataFlow.first().tabGroups.first()
        assertEquals(expectedTabGroup, tabGroup)
    }

    @Test
    fun `WHEN a user closes all tab groups THEN mark all group as closed in the database and updated the affected groups' timestamps`() = runTest {
        val openTabGroups = List(size = 10) {
            TabGroup(
                title = "title",
                theme = "theme",
                lastModified = 0L,
                closed = false,
            )
        }
        val alreadyClosedTabGroups = List(size = 10) {
            TabGroup(
                title = "title",
                theme = "theme",
                lastModified = 10L,
                closed = true,
            )
        }
        val expectedTimestamp = 7L
        timeStamp = expectedTimestamp
        val expectedTabGroups = openTabGroups.map { it.copy(closed = true, lastModified = expectedTimestamp) } + alreadyClosedTabGroups
        initializeDatabase(
            initialTabGroups = openTabGroups + alreadyClosedTabGroups,
        )

        repository.closeAllTabGroups()

        advanceUntilIdle()

        assertEquals(expectedTabGroups, repository.tabGroupDataFlow.first().tabGroups)
    }

    @Test
    fun `WHEN a tab group assignment is passed-in THEN add the entry to the database and update the group's timestamp`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val tabId = "123"

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group),
        )

        repository.addTabGroupAssignment(tabId = tabId, tabGroupId = group.id)

        advanceUntilIdle()
        assertEquals(group.id, repository.tabGroupDataFlow.first().tabGroupAssignments[tabId])
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN a tab group assignment is created THEN add the entry to the database and update the group's timestamp`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val tabId = "123"

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group),
        )

        repository.addTabGroupAssignment(tabId = tabId, tabGroupId = group.id)

        advanceUntilIdle()
        assertEquals(group.id, repository.tabGroupDataFlow.first().tabGroupAssignments[tabId])
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN a tab group assignment update is received THEN update the entry in the database and update the group's timestamp`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val tabId = "123"
        val oldTabGroupId = "456"

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group),
            initialTabGroupAssignments = listOf(tabId to oldTabGroupId),
        )

        repository.updateTabGroupAssignment(tabId = tabId, group.id)

        advanceUntilIdle()
        assertEquals(group.id, repository.tabGroupDataFlow.first().tabGroupAssignments[tabId])
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN tabs are added to an existing group THEN assign those tabs to the group in the database`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val tabIds = List(size = 10) { "$it" }
        val expectedTabGroupAssignments = tabIds.associateWith { group.id }

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group),
        )

        repository.addTabsToTabGroup(
            tabGroupId = group.id,
            tabIds = tabIds,
        )

        advanceUntilIdle()
        assertEquals(expectedTabGroupAssignments, repository.tabGroupDataFlow.first().tabGroupAssignments)
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN multiple tabs are assigned to a group THEN add the assignments to the database and update the group's timestamp`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val assignments = List(size = 10) {
            "$it" to group.id
        }
        val expectedAssignments = assignments.associate { it.first to it.second }
        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group),
        )

        repository.addTabsToTabGroup(tabGroupId = group.id, tabIds = assignments.map { it.first })

        advanceUntilIdle()
        assertEquals(expectedAssignments, repository.tabGroupDataFlow.first().tabGroupAssignments)
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN a tab group assignment is deleted THEN remove the entry from the database and update the group's timestamp`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val assignment1 = "1" to group.id
        val assignment2 = "2" to group.id
        val expectedAssignments = mapOf(assignment1)

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group),
            initialTabGroupAssignments = listOf(assignment1, assignment2),
        )

        repository.deleteTabGroupAssignmentById(tabId = assignment2.first)

        advanceUntilIdle()
        assertEquals(expectedAssignments, repository.tabGroupDataFlow.first().tabGroupAssignments)
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN a tab group assignment is deleted via ID THEN remove the matching entry from the database and update the group's timestamp`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val assignment1 = "1" to group.id
        val assignment2 = "2" to group.id
        val expectedAssignments = mapOf(assignment1)

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group),
            initialTabGroupAssignments = listOf(assignment1, assignment2),
        )

        repository.deleteTabGroupAssignmentById(tabId = assignment2.first)

        advanceUntilIdle()
        assertEquals(expectedAssignments, repository.tabGroupDataFlow.first().tabGroupAssignments)
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN multiple tab group assignments are deleted THEN remove the entries from the database and update the groups' timestamps`() = runTest {
        val group1 = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val group2 = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
            closed = true,
        )
        val assignment1 = "1" to group1.id
        val assignment2 = "2" to group1.id
        val assignment3 = "3" to group2.id
        val assignment4 = "4" to group2.id
        val expectedAssignments = mapOf(assignment1, assignment4)

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group1, group2),
            initialTabGroupAssignments = listOf(assignment1, assignment2, assignment3, assignment4),
        )

        repository.deleteTabGroupAssignmentsById(listOf(assignment2.first, assignment3.first))

        advanceUntilIdle()
        assertEquals(expectedAssignments, repository.tabGroupDataFlow.first().tabGroupAssignments)
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN a tab group's tabs are all unassigned THEN remove the assignments from the database and update the group's timestamp`() = runTest {
        val group = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
        )
        val remainingGroup = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 0L,
        )
        val tabGroupAssignments = List(size = 10) { "$it" to group.id }
        val remainingAssignment = "expected" to remainingGroup.id
        val expectedAssignments = mapOf(remainingAssignment)

        timeStamp = 7L
        initializeDatabase(
            initialTabGroups = listOf(group, remainingGroup),
            initialTabGroupAssignments = tabGroupAssignments + remainingAssignment,
        )

        repository.deleteAllTabGroupAssignmentsForGroup(tabGroupId = group.id)

        advanceUntilIdle()
        assertEquals(expectedAssignments, repository.tabGroupDataFlow.first().tabGroupAssignments)
        assertEquals(timeStamp, repository.tabGroupDataFlow.first().tabGroups.first().lastModified)
    }

    @Test
    fun `WHEN a tab group is deleted via ID THEN the matching entry and its associated assignments are removed from the database`() = runTest {
        val tabGroupId = "1"
        val tabGroup1 = TabGroup(
            id = tabGroupId,
            title = "tabGroup1",
            theme = "theme",
            lastModified = 10L,
        )
        val tabGroup2 = TabGroup(
            id = "2",
            title = "tabGroup2",
            theme = "theme",
            lastModified = 10L,
        )
        val tabGroupAssignments = List(size = 10) { "$it" to tabGroupId }
        val remainingTabGroupAssignments = List(size = 10) { "$it" to "2" }
        initializeDatabase(
            initialTabGroups = listOf(tabGroup1, tabGroup2),
            initialTabGroupAssignments = tabGroupAssignments + remainingTabGroupAssignments,
        )

        repository.deleteTabGroupById(tabGroupId = tabGroup1.id)

        advanceUntilIdle()
        assertEquals(listOf(tabGroup2), repository.tabGroupDataFlow.first().tabGroups)
        assertEquals(remainingTabGroupAssignments.toMap(), repository.tabGroupDataFlow.first().tabGroupAssignments)
    }

    @Test
    fun `WHEN a subset of tab groups are deleted via ID THEN all of the matching entries and their associated assignments are removed from the database`() = runTest {
        val tabGroup1 = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 10L,
        )
        val tabGroup2 = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 10L,
        )
        val tabGroup3 = TabGroup(
            title = "title",
            theme = "theme",
            lastModified = 10L,
        )
        val expectedTabGroupAssignments = List(size = 10) { "$it-group1" to tabGroup1.id }
        val tabGroupAssignments = List(size = 10) { "$it-group2" to tabGroup2.id } +
            List(size = 10) { "$it-group3" to tabGroup3.id } +
            expectedTabGroupAssignments
        val expectedTabGroups = listOf(tabGroup1)
        initializeDatabase(
            initialTabGroups = listOf(tabGroup1, tabGroup2, tabGroup3),
            initialTabGroupAssignments = tabGroupAssignments,
        )

        repository.deleteTabGroupsById(ids = listOf(tabGroup2.id, tabGroup3.id))

        advanceUntilIdle()
        assertEquals(expectedTabGroups, repository.tabGroupDataFlow.first().tabGroups)
        assertEquals(expectedTabGroupAssignments.toMap(), repository.tabGroupDataFlow.first().tabGroupAssignments)
    }

    @Test
    fun `WHEN all tab group data is deleted THEN the database is reset`() = runTest {
        initializeDatabase(
            initialTabGroups = List(size = 20) {
                TabGroup(
                    title = "title $it",
                    theme = "theme",
                    lastModified = 10L,
                )
            },
            initialTabGroupAssignments = List(size = 20) { "$it" to "Group_1" },
        )

        repository.deleteAllTabGroupData()

        advanceUntilIdle()
        assertTrue(repository.tabGroupDataFlow.first().tabGroups.isEmpty())
        assertTrue(repository.tabGroupDataFlow.first().tabGroupAssignments.isEmpty())
    }

    private suspend fun initializeDatabase(
        initialTabGroups: List<TabGroup> = emptyList(),
        initialTabGroupAssignments: List<Pair<String, String>> = emptyList(), // tabId to tabGroupId
    ) {
        initialTabGroups.forEach { group ->
            val tabIds = initialTabGroupAssignments.filter { it.second == group.id }.map { it.first }
            repository.createTabGroupWithTabs(tabGroup = group, tabIds = tabIds)
        }
    }
}
