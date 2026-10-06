/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.applinks

import android.content.DialogInterface
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AppLinksPromptFragmentTest {

    @Test
    fun `WHEN create is called THEN fragment arguments contain all provided values`() {
        val fragment = AppLinksPromptFragment.create(
            appName = "Firefox",
            title = "Open in YouTube",
            message = "Would you like to leave Firefox?",
            showCheckbox = true,
            sourceUrl = "https://www.youtube.com/watch?v=abc",
            destinationUrl = "youtube://watch?v=abc",
            firefoxUrl = "https://www.youtube.com/watch?v=abc",
            uniqueIdentifier = "YouTube",
            packageName = "com.google.android.youtube",
        )

        val args = fragment.requireArguments()
        assertEquals("Open in YouTube", args.getString("title"))
        assertEquals("Would you like to leave Firefox?", args.getString("message"))
        assertTrue(args.getBoolean("show_checkbox"))
        assertEquals("https://www.youtube.com/watch?v=abc", args.getString("source_url"))
        assertEquals("youtube://watch?v=abc", args.getString("destination_url"))
        assertEquals("https://www.youtube.com/watch?v=abc", args.getString("firefox_url"))
        assertEquals("YouTube", args.getString("unique_identifier"))
        assertEquals("com.google.android.youtube", args.getString("package_name"))
    }

    @Test
    fun `WHEN create is called with null firefoxUrl THEN firefox_url argument is null`() {
        val fragment = AppLinksPromptFragment.create(
            appName = "Firefox",
            title = "title",
            message = "message",
            showCheckbox = false,
            firefoxUrl = null,
        )

        assertNull(fragment.requireArguments().getString("firefox_url"))
    }

    @Test
    fun `WHEN create is called with showCheckbox false THEN show_checkbox argument is false`() {
        val fragment = AppLinksPromptFragment.create(
            appName = "Firefox",
            title = "title",
            message = "message",
            showCheckbox = false,
        )

        assertFalse(fragment.requireArguments().getBoolean("show_checkbox"))
    }

    @Test
    fun `WHEN dialog is cancelled THEN onDismissRedirect is invoked`() {
        val fragment = AppLinksPromptFragment.create(
            appName = "Firefox",
            title = "title",
            message = "message",
            showCheckbox = false,
        )
        var dismissCalled = false
        fragment.onDismissRedirect = { dismissCalled = true }
        fragment.onCancel(object : DialogInterface {
          override fun cancel() {}
          override fun dismiss() {}
        })

        assertTrue(dismissCalled)
    }
}
