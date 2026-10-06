package org.mozilla.fenix.downloads.listscreen

import androidx.navigation.NavController
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.verify
import junit.framework.TestCase.assertEquals
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIAction
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIStore
import org.mozilla.fenix.downloads.listscreen.store.FileItem
import org.mozilla.fenix.downloads.listscreen.store.fileItem
import org.mozilla.fenix.settings.settingssearch.PreferenceFileInformation

class DownloadNavigationMiddlewareTest {
    private val navController: NavController = mockk(relaxed = true) {
        every { navigate(any<NavDirections>(), any<NavOptions>()) } just runs
        every { currentDestination?.id } returns R.id.downloadsFragment
    }

    @Test
    fun `GIVEN normal mode WHEN OnBackPressed dispatched THEN navigate back`() {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )

        val store = DownloadUIStore(
            initialState = initialState,
            middleware = listOf(
                DownloadNavigationMiddleware(navController),
            ),
        )

        store.dispatch(DownloadUIAction.NavigationIconClicked)

        verify { navController.popBackStack() }
    }

    @Test
    fun `GIVEN editing mode WHEN OnBackPressed dispatched THEN exits edit mode without navigating`() {
        val fileItems = listOf(
            fileItem(id = "1", status = FileItem.Status.Completed),
            fileItem(id = "2", status = FileItem.Status.Completed),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Editing(selectedItems = setOf(fileItems[0])),
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )

        val store = DownloadUIStore(
            initialState = initialState,
            middleware = listOf(
                DownloadNavigationMiddleware(navController),
            ),
        )

        store.dispatch(DownloadUIAction.NavigationIconClicked)

        verify(exactly = 0) { navController.popBackStack() }
        assertEquals(DownloadUIState.Mode.Normal, store.state.mode)
    }

    @Test
    fun `WHEN NavigateToSettings dispatched THEN navigate to settings`() {
        val fileItems = listOf(
            fileItem(id = "1", status = FileItem.Status.Completed),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )

        val store = DownloadUIStore(
            initialState = initialState,
            middleware = listOf(
                DownloadNavigationMiddleware(navController),
            ),
        )

        store.dispatch(DownloadUIAction.SettingsIconClicked)

        verify {
            navController.navigate(
                resId = PreferenceFileInformation.DownloadsSettingsPreferences.fragmentId,
            )
        }
    }

    @Test
    fun `WHEN other actions dispatched THEN no navigation occurs`() {
        val item = fileItem(id = "1", fileName = "test.pdf", status = FileItem.Status.Completed)

        val initialState = DownloadUIState(
            items = listOf(item),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )

        val store = DownloadUIStore(
            initialState = initialState,
            middleware = listOf(
                DownloadNavigationMiddleware(navController),
            ),
        )

        store.dispatch(DownloadUIAction.RemoveItemForRemoval(item))

        verify(exactly = 0) {
            navController.popBackStack()
            navController.navigate(any<Int>())
            navController.navigate(any<NavDirections>())
        }
    }
}
