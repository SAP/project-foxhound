/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.app.PendingIntent
import android.content.Intent
import android.content.IntentSender
import androidx.core.content.pm.ShortcutInfoCompat
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.R
import org.mozilla.fenix.home.intent.StartSearchIntentProcessor
import org.mozilla.fenix.utils.IntentUtils
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PrivateShortcutCreateManagerTest {

    private lateinit var mockShortcutManagerWrapper: ShortcutManagerCompatWrapper
    private lateinit var mockPendingIntentCreator: PendingIntentFactory

    private lateinit var privateShortcutCreateManager: PrivateShortcutCreateManager

    private lateinit var mockIntentSender: IntentSender
    private lateinit var mockPendingIntent: PendingIntent

    @Before
    fun setup() {
        mockShortcutManagerWrapper = mockk(relaxed = true)
        mockPendingIntentCreator = mockk()
        mockIntentSender = mockk()
        mockPendingIntent = mockk()

        privateShortcutCreateManager = PrivateShortcutCreateManager(
            mockShortcutManagerWrapper,
            mockPendingIntentCreator,
        )

        every { mockPendingIntent.intentSender } returns mockIntentSender
    }

    @Test
    fun `GIVEN shortcut pinning is not supported WHEN createPrivateShortcut is called THEN do not create a pinned shortcut`() {
        every { mockShortcutManagerWrapper.isRequestPinShortcutSupported(testContext) } returns false

        privateShortcutCreateManager.createPrivateShortcut(testContext)

        verify(exactly = 0) {
            mockShortcutManagerWrapper.requestPinShortcut(
                testContext,
                any(),
                any(),
            )
        }
    }

    @Test
    fun `GIVEN shortcut pinning is supported WHEN createPrivateShortcut is called THEN create a pinned shortcut`() {
        val shortcut = slot<ShortcutInfoCompat>()
        val intentSender = slot<IntentSender>()
        val intent = slot<Intent>()

        every { mockShortcutManagerWrapper.isRequestPinShortcutSupported(testContext) } returns true
        every {
            mockPendingIntentCreator.createPendingIntent(
                context = testContext,
                requestCode = 0,
                intent = capture(intent),
                flags = IntentUtils.DEFAULT_PENDING_INTENT_FLAGS or PendingIntent.FLAG_UPDATE_CURRENT,
            )
        } returns mockPendingIntent

        privateShortcutCreateManager.createPrivateShortcut(testContext)

        verify {
            mockShortcutManagerWrapper.requestPinShortcut(
                context = testContext,
                shortcut = capture(shortcut),
                intentSender = capture(intentSender),
            )
        }

        val capturedShortcut = shortcut.captured
        `assert shortcutInfoCompat is build correctly`(capturedShortcut)

        assertNotNull(intentSender.captured)
        assertEquals(mockIntentSender, intentSender.captured)

        val capturedPendingIntentActivityIntent = intent.captured
        `assert homeScreenIntent is built correctly`(capturedPendingIntentActivityIntent)
    }

    @Test
    fun `GIVEN PrivateShortcutCreateManager WHEN createPrivateHomeActivityIntent is called THEN intent is built correctly`() {
        val intent = privateShortcutCreateManager.createPrivateHomeActivityIntent(testContext)
        assertEquals("Intent action should be ACTION_VIEW", Intent.ACTION_VIEW, intent.action)
        assertEquals(
            "Intent flags should be NEW_TASK or CLEAR_TASK",
            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK,
            intent.flags,
        )
        assertNotNull("Intent component should not be null", intent.component)
        assertEquals(
            "Intent component should target HomeActivity",
            HomeActivity::class.qualifiedName,
            intent.component?.className,
        )

        assertNotNull("Intent extras should not be null", intent.extras)
        assertEquals(
            "Extra PRIVATE_BROWSING_MODE should be true",
            true,
            intent.extras?.getBoolean(HomeActivity.PRIVATE_BROWSING_MODE),
        )
        assertEquals(
            "Extra OPEN_TO_SEARCH should be PRIVATE_BROWSING_PINNED_SHORTCUT",
            StartSearchIntentProcessor.PRIVATE_BROWSING_PINNED_SHORTCUT,
            intent.extras?.getString(HomeActivity.OPEN_TO_SEARCH),
        )
    }

    private fun `assert shortcutInfoCompat is build correctly`(shortcutInfoCompat: ShortcutInfoCompat) {
        assertEquals(testContext.getString(R.string.app_name_private_5, testContext.getString(R.string.app_name)), shortcutInfoCompat.shortLabel)
        assertEquals(testContext.getString(R.string.app_name_private_5, testContext.getString(R.string.app_name)), shortcutInfoCompat.longLabel)
        assertEquals(R.mipmap.ic_launcher_private_round, shortcutInfoCompat.icon.resId)
        `assert homeActivity intent is built correctly`(shortcutInfoCompat.intent)
    }

    private fun `assert homeActivity intent is built correctly`(intent: Intent) {
        assertEquals(Intent.ACTION_VIEW, intent.action)
        assertEquals(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK, intent.flags)
        assertEquals(HomeActivity::class.qualifiedName, intent.component?.className)
        assertEquals(true, intent.extras?.getBoolean(HomeActivity.PRIVATE_BROWSING_MODE))
        assertEquals(StartSearchIntentProcessor.PRIVATE_BROWSING_PINNED_SHORTCUT, intent.extras?.getString(HomeActivity.OPEN_TO_SEARCH))
    }

    private fun `assert homeScreenIntent is built correctly`(intent: Intent) {
        assertEquals(Intent.ACTION_MAIN, intent.action)
        assert(intent.categories.contains(Intent.CATEGORY_HOME))
        assertEquals(Intent.FLAG_ACTIVITY_NEW_TASK, intent.flags)
    }
}
