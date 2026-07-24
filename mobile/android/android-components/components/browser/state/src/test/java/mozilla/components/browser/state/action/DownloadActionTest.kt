/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.content.DownloadState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class DownloadActionTest {

    @Test
    fun `AddDownloadAction adds download`() {
        var state = BrowserState()

        val download1 = DownloadState(
            "https://mozilla.org/download1",
            destinationDirectory = "",
            directoryPath = "",
        )

        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download1))

        assertEquals(download1, state.downloads[download1.id])
        assertEquals(1, state.downloads.size)

        val download2 = DownloadState(
            "https://mozilla.org/download2",
            destinationDirectory = "",
            directoryPath = "",
        )

        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download2))

        assertEquals(download2, state.downloads[download2.id])
        assertEquals(2, state.downloads.size)
    }

    @Test
    fun `WHEN DismissDownloadNotificationAction is dispatched THEN notificationId is set to null`() {
        var state = BrowserState()

        val download = DownloadState(
            "https://mozilla.org/download1",
            destinationDirectory = "",
            directoryPath = "",
            notificationId = 100,
        )
        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download))
        assertNotNull(state.downloads[download.id]!!.notificationId)

        state = BrowserStateReducer.reduce(state, DownloadAction.DismissDownloadNotificationAction(download.id))
        assertNull(state.downloads[download.id]!!.notificationId)
    }

    @Test
    fun `WHEN DismissDownloadNotificationAction is dispatched with an invalid downloadId THEN the state must not change`() {
        var state = BrowserState()

        val download = DownloadState(
            "https://mozilla.org/download1",
            destinationDirectory = "",
            directoryPath = "",
            notificationId = 100,
        )
        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download))
        assertNotNull(state.downloads[download.id]!!.notificationId)
        assertEquals(1, state.downloads.size)

        state = BrowserStateReducer.reduce(state, DownloadAction.DismissDownloadNotificationAction("-1"))
        assertNotNull(state.downloads[download.id]!!.notificationId)
        assertEquals(download, state.downloads[download.id])
    }

    @Test
    fun `RestoreDownloadStateAction adds download`() {
        var state = BrowserState()

        val download1 = DownloadState("https://mozilla.org/download1", destinationDirectory = "", directoryPath = "")
        state = BrowserStateReducer.reduce(state, DownloadAction.RestoreDownloadStateAction(download1))
        assertEquals(download1, state.downloads[download1.id])
        assertEquals(1, state.downloads.size)

        val download2 = DownloadState("https://mozilla.org/download2", destinationDirectory = "", directoryPath = "")
        state = BrowserStateReducer.reduce(state, DownloadAction.RestoreDownloadStateAction(download2))
        assertEquals(download2, state.downloads[download2.id])
        assertEquals(2, state.downloads.size)
    }

    @Test
    fun `RestoreDownloadsStateAction does nothing`() {
        var state = BrowserState()

        val oldState = state
        state = BrowserStateReducer.reduce(state, DownloadAction.RestoreDownloadsStateAction)
        assertSame(oldState, state)
    }

    @Test
    fun `RemoveDownloadAction removes download`() {
        var state = BrowserState()

        val download = DownloadState("https://mozilla.org/download1", destinationDirectory = "", directoryPath = "")
        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download))
        assertEquals(download, state.downloads[download.id])
        assertFalse(state.downloads.isEmpty())

        state = BrowserStateReducer.reduce(state, DownloadAction.RemoveDownloadAction(download.id))
        assertTrue(state.downloads.isEmpty())
    }

    @Test
    fun `RemoveAllDownloadsAction removes all downloads`() {
        var state = BrowserState()

        val download = DownloadState("https://mozilla.org/download1", destinationDirectory = "", directoryPath = "")
        val download2 = DownloadState("https://mozilla.org/download2", destinationDirectory = "", directoryPath = "")
        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download))
        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download2))

        assertFalse(state.downloads.isEmpty())
        assertEquals(2, state.downloads.size)

        state = BrowserStateReducer.reduce(state, DownloadAction.RemoveAllDownloadsAction)
        assertTrue(state.downloads.isEmpty())
    }

    @Test
    fun `UpdateDownloadAction updates the provided download`() {
        var state = BrowserState()
        val download = DownloadState("https://mozilla.org/download1", destinationDirectory = "", directoryPath = "")
        val download2 = DownloadState("https://mozilla.org/download2", destinationDirectory = "", directoryPath = "")

        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download))
        state = BrowserStateReducer.reduce(state, DownloadAction.AddDownloadAction(download2))

        val updatedDownload = download.copy(fileName = "filename.txt")

        state = BrowserStateReducer.reduce(state, DownloadAction.UpdateDownloadAction(updatedDownload))

        assertFalse(state.downloads.isEmpty())
        assertEquals(2, state.downloads.size)
        assertEquals(updatedDownload, state.downloads[updatedDownload.id])
    }
}
