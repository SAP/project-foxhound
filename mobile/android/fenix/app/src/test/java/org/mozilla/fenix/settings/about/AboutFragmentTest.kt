/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.about

import android.content.Context
import android.view.View
import android.widget.Toast
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.LifecycleRegistry
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.slot
import io.mockk.verify
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.about.AboutFragment.ToastHandler
import org.mozilla.fenix.utils.Settings

class AboutFragmentTest {

    private lateinit var context: Context
    private lateinit var settings: Settings
    private lateinit var logoView: View
    private lateinit var fragment: AboutFragment
    private lateinit var lifecycle: LifecycleRegistry
    private lateinit var toastHandler: ToastHandler

    private val message = "Debug menu: 3 clicks left to enable"
    private val doneMessage = "Debug menu enabled"

    val secretDebugMenuTrigger = slot<LifecycleObserver>()

    @Before
    fun setup() {
        toastHandler = mockk(relaxUnitFun = true)
        fragment = AboutFragment(toastHandler)
        lifecycle = mockk()
        context = mockk()
        settings = mockk()
        logoView = mockk(relaxUnitFun = true)

        every { context.getString(R.string.about_debug_menu_toast_progress, 3) } returns message
        every { context.getString(R.string.about_debug_menu_toast_done) } returns doneMessage
        every { settings.showSecretDebugMenuThisSession = true } just runs
        every { lifecycle.addObserver(capture(secretDebugMenuTrigger)) } answers { }
    }

    @Test
    fun `setupDebugMenu sets proper click listener when showSecretDebugMenuThisSession is false`() {
        every { settings.showSecretDebugMenuThisSession } returns false

        fragment.setupDebugMenu(logoView, settings, lifecycle)

        verify { logoView.setOnClickListener(any()) }
    }

    @Test
    fun `setupDebugMenu doesn't set click listener when showSecretDebugMenuThisSession is true`() {
        every { settings.showSecretDebugMenuThisSession } returns true

        fragment.setupDebugMenu(logoView, settings, lifecycle)

        verify(exactly = 0) { logoView.setOnClickListener(any()) }
    }

    @Test
    fun `setupDebugMenu adds secretDebugMenuTrigger as lifecycle observer`() {
        every { settings.showSecretDebugMenuThisSession } returns false

        fragment.setupDebugMenu(logoView, settings, lifecycle)

        verify { lifecycle.addObserver(secretDebugMenuTrigger.captured) }
    }

    @Test
    fun `onDebugMenuActivated should update settings and show a Toast`() {
        fragment.onDebugMenuActivated(context, settings)

        verify { toastHandler.showToast(context, doneMessage, Toast.LENGTH_LONG) }
        verify { settings.showSecretDebugMenuThisSession = true }
    }

    @Test
    fun `onLogoClicked should update settings and show a Toast`() {
        fragment.onLogoClicked(context, 3)

        verify { toastHandler.showToast(context, message, Toast.LENGTH_SHORT) }
    }
}
