/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.webcompat.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertNotNull

@RunWith(AndroidJUnit4::class)
class WebCompatReporterStoreTest {

    private val store: WebCompatReporterStore = WebCompatReporterStore()

    @Test
    fun `WHEN the broken URL is updated THEN the state should be updated`() {
        val expectedUrl = "https://www.mozilla.org/"

        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = expectedUrl))
        assertEquals(expectedUrl, store.state.enteredUrl)
    }

    @Test
    fun `WHEN the broken URL is updated with a valid URL that starts with https THEN the state should not have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = "https://www.mozilla.org/"))
        assertFalse(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN the broken URL is updated with a valid URL that starts with http THEN the state should not have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = "http://www.mozilla.org/"))
        assertFalse(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN the broken URL is updated with an empty URL THEN the state should have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = ""))
        assertTrue(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN the broken URL is updated with a content URL THEN the state should have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = "content://pdf.pdf"))
        assertTrue(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN the broken URL is updated with an about URI THEN the state should have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = "about:about"))
        assertTrue(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN the broken URL is updated with an extension URL THEN the state should have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = "moz-extension://test"))
        assertTrue(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN the broken URL is updated with a URL that starts with www THEN the state should have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = "www.mozilla.org"))
        assertTrue(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN the reason is not empty THEN the state should not have an input error`() {
        assertNull(store.state.reason)
        assertTrue(store.state.hasReasonDropdownError)

        store.dispatch(WebCompatReporterAction.ReasonChanged(WebCompatReporterState.BrokenSiteReason.Slow))

        assertNotNull(store.state.reason)
        assertFalse(store.state.hasReasonDropdownError)
    }

    @Test
    fun `WHEN the reason is empty THEN the state should have an input error`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                reason = null,
            ),
        )

        assertNull(store.state.reason)
        assertTrue(store.state.hasReasonDropdownError)
    }

    @Test
    fun `WHEN there is no error THEN the submit button should be enabled`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                enteredUrl = "https://www.mozilla.org/",
                reason = WebCompatReporterState.BrokenSiteReason.Slow,
            ),
        )

        assertFalse(store.state.hasUrlTextError)
        assertFalse(store.state.hasReasonDropdownError)
        assertTrue(store.state.isSubmitEnabled)
    }

    @Test
    fun `WHEN the URL has an error THEN the submit button should be disabled`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                enteredUrl = "",
                reason = WebCompatReporterState.BrokenSiteReason.Slow,
            ),
        )

        assertTrue(store.state.hasUrlTextError)
        assertFalse(store.state.hasReasonDropdownError)
        assertFalse(store.state.isSubmitEnabled)
    }

    @Test
    fun `WHEN the reason has an error THEN the submit button should be disabled`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                enteredUrl = "https://www.mozilla.org/",
                reason = null,
            ),
        )

        assertFalse(store.state.hasUrlTextError)
        assertTrue(store.state.hasReasonDropdownError)
        assertFalse(store.state.isSubmitEnabled)
    }

    @Test
    fun `WHEN the reason is updated THEN the state should be updated`() {
        val expected = WebCompatReporterState.BrokenSiteReason.Slow

        store.dispatch(WebCompatReporterAction.ReasonChanged(newReason = expected))
        assertEquals(expected, store.state.reason)
    }

    @Test
    fun `WHEN the problem description is updated THEN the state is updated`() {
        val expected = "Test description"

        store.dispatch(WebCompatReporterAction.ProblemDescriptionChanged(newProblemDescription = expected))
        assertEquals(expected, store.state.problemDescription)
    }

    @Test
    fun `WHEN the send report button is pressed THEN the state remains the same`() {
        val expected = store.state

        store.dispatch(WebCompatReporterAction.SendReportClicked)
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN the report is sent THEN the state remains the same`() {
        val expected = store.state

        store.dispatch(WebCompatReporterAction.ReportSubmitted)
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN the send more info button is clicked THEN the state remains the same`() {
        val expected = store.state

        store.dispatch(WebCompatReporterAction.AddMoreInfoClicked)
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN the send more info button is submitted THEN the state remains the same`() {
        val expected = store.state

        store.dispatch(WebCompatReporterAction.SendMoreInfoSubmitted)
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN the learn more button is clicked THEN the state remains the same`() {
        val expected = store.state

        store.dispatch(WebCompatReporterAction.LearnMoreClicked)
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN the cancel button is clicked THEN the state remains the same`() {
        val expected = store.state

        store.dispatch(WebCompatReporterAction.CancelClicked)
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN the back button is clicked THEN the state remains the same`() {
        val expected = store.state

        store.dispatch(WebCompatReporterAction.BackPressed)
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN EditUrlClicked is dispatched THEN showEditUrlDialog is true and editedUrl matches enteredUrl`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                enteredUrl = "https://www.mozilla.org/",
            ),
        )

        store.dispatch(WebCompatReporterAction.EditUrlClicked)

        assertTrue(store.state.showEditUrlDialog)
        assertEquals("https://www.mozilla.org/", store.state.editedUrl)
    }

    @Test
    fun `WHEN EditUrlChanged is dispatched THEN editedUrl is updated`() {
        val expectedUrl = "https://www.example.com/"

        store.dispatch(WebCompatReporterAction.EditUrlChanged(newUrl = expectedUrl))

        assertEquals(expectedUrl, store.state.editedUrl)
    }

    @Test
    fun `WHEN DismissEditUrlDialog is dispatched THEN showEditUrlDialog is false`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                showEditUrlDialog = true,
                editedUrl = "https://www.new.com/",
            ),
        )

        store.dispatch(WebCompatReporterAction.DismissEditUrlDialog)

        assertFalse(store.state.showEditUrlDialog)
        assertEquals("https://www.new.com/", store.state.editedUrl)
    }

    @Test
    fun `WHEN SaveEditedUrlClicked is dispatched THEN dialog is hidden and enteredUrl is updated to editedUrl`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                showEditUrlDialog = true,
                enteredUrl = "https://www.old.com/",
                editedUrl = "https://www.new.com/",
            ),
        )

        store.dispatch(WebCompatReporterAction.SaveEditedUrlClicked)

        assertFalse(store.state.showEditUrlDialog)
        assertEquals("https://www.new.com/", store.state.enteredUrl)
    }

    @Test
    fun `WHEN editedUrl is a valid network URL THEN the state should not have an input error`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                editedUrl = "https://www.mozilla.org/",
            ),
        )

        assertFalse(store.state.hasEditedUrlError)
    }

    @Test
    fun `WHEN editedUrl is an invalid network URL THEN the state should have an input error`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                editedUrl = "www.mozilla.org",
            ),
        )

        assertTrue(store.state.hasEditedUrlError)
    }

    @Test
    fun `WHEN the broken URL is updated with a URL containing a space THEN the state should have an input error`() {
        store.dispatch(WebCompatReporterAction.BrokenSiteChanged(newUrl = "https://www.moz illa.org/"))
        assertTrue(store.state.hasUrlTextError)
    }

    @Test
    fun `WHEN editedUrl contains a space THEN the state should have an input error`() {
        val store = WebCompatReporterStore(
            initialState = WebCompatReporterState(
                editedUrl = "https://www.example .com/",
            ),
        )

        assertTrue(store.state.hasEditedUrlError)
    }
}
