/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.lens

import android.Manifest
import android.app.Activity
import android.app.Application
import android.os.Bundle
import androidx.test.core.app.ApplicationProvider
import mozilla.components.feature.qr.QrScanActivity
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows
import org.robolectric.shadows.ShadowToast
import java.io.File
import kotlin.test.assertIs
import kotlin.test.assertNotNull

@RunWith(RobolectricTestRunner::class)
class LensCameraActivityTest {

    @Test
    fun `GIVEN a context WHEN newIntent is called THEN the returned intent targets LensCameraActivity`() {
        val intent = LensCameraActivity.newIntent(testContext)
        assertEquals(
            LensCameraActivity::class.java.name,
            intent.component?.className,
        )
    }

    @Test
    fun `GIVEN cached lens images exist WHEN clearLensImageCache is called THEN cached files are deleted and the directory remains`() {
        val activity = Robolectric.buildActivity(LensCameraActivity::class.java).get()
        val imageDir = File(activity.cacheDir, "lens_images")
        imageDir.mkdirs()
        val testFile = File(imageDir, "test_image.jpg")
        testFile.writeText("test")
        assertTrue(testFile.exists())

        activity.clearLensImageCache()

        assertFalse(testFile.exists())
        assertTrue(imageDir.exists())
    }

    @Test
    fun `GIVEN the lens image cache directory does not exist WHEN clearLensImageCache is called THEN no exception is thrown`() {
        val activity = Robolectric.buildActivity(LensCameraActivity::class.java).get()
        val imageDir = File(activity.cacheDir, "lens_images")
        assertFalse(imageDir.exists())

        activity.clearLensImageCache()
    }

    @Test
    fun `WHEN handlePermissionResult is called with false THEN a permission-denied Toast is shown, RESULT_CANCELED is set, and the activity finishes`() {
        val activity = Robolectric.buildActivity(LensCameraActivity::class.java).create().get()

        activity.handlePermissionResult(isGranted = false)

        assertEquals("Permission denied", ShadowToast.getTextOfLatestToast())
        assertEquals(Activity.RESULT_CANCELED, Shadows.shadowOf(activity).resultCode)
        assertTrue(activity.isFinishing)
    }

    @Test
    fun `WHEN handlePermissionResult is called with true THEN a LensCameraFragment is added to the container`() {
        val activity = Robolectric.buildActivity(LensCameraActivity::class.java).create().get()

        activity.handlePermissionResult(isGranted = true)
        activity.supportFragmentManager.executePendingTransactions()

        val fragment = activity.supportFragmentManager
            .findFragmentById(R.id.lens_fragment_container_view)
        assertNotNull(fragment)
        assertIs<LensCameraFragment>(fragment)
    }

    @Test
    fun `GIVEN a LensCameraFragment is already in the container WHEN handlePermissionResult is called with true THEN no duplicate fragment is added`() {
        val activity = Robolectric.buildActivity(LensCameraActivity::class.java).create().get()
        activity.handlePermissionResult(isGranted = true)
        activity.supportFragmentManager.executePendingTransactions()
        val firstFragment = activity.supportFragmentManager
            .findFragmentById(R.id.lens_fragment_container_view)

        activity.handlePermissionResult(isGranted = true)
        activity.supportFragmentManager.executePendingTransactions()

        val fragments = activity.supportFragmentManager.fragments
        assertEquals(1, fragments.size)
        assertSame(firstFragment, fragments[0])
    }

    @Test
    fun `GIVEN camera permission is granted WHEN the activity reaches onResume THEN a LensCameraFragment is added`() {
        val shadowApp = Shadows.shadowOf(ApplicationProvider.getApplicationContext<Application>())
        shadowApp.grantPermissions(Manifest.permission.CAMERA)

        val controller = Robolectric.buildActivity(LensCameraActivity::class.java).setup()
        val activity = controller.get()
        activity.supportFragmentManager.executePendingTransactions()

        val fragment = activity.supportFragmentManager
            .findFragmentById(R.id.lens_fragment_container_view)
        assertNotNull(fragment)
        assertIs<LensCameraFragment>(fragment)
    }

    @Test
    fun `WHEN the fragment result bundle carries RESULT_QR_STRING THEN the activity returns RESULT_OK with EXTRA_SCAN_RESULT_DATA and finishes`() {
        val controller = Robolectric.buildActivity(LensCameraActivity::class.java).setup()
        val activity = controller.get()
        val qrString = "https://example.com"

        activity.supportFragmentManager.setFragmentResult(
            LensCameraFragment.RESULT_REQUEST_KEY,
            Bundle().apply { putString(LensCameraFragment.RESULT_QR_STRING, qrString) },
        )
        activity.supportFragmentManager.executePendingTransactions()

        val shadow = Shadows.shadowOf(activity)
        assertEquals(Activity.RESULT_OK, shadow.resultCode)
        assertEquals(qrString, shadow.resultIntent.getStringExtra(QrScanActivity.EXTRA_SCAN_RESULT_DATA))
        assertTrue(activity.isFinishing)
    }

    @Test
    fun `GIVEN both QR string and image URI are present WHEN the fragment result fires THEN the QR string takes priority`() {
        val controller = Robolectric.buildActivity(LensCameraActivity::class.java).setup()
        val activity = controller.get()
        val qrString = "https://example.com"

        activity.supportFragmentManager.setFragmentResult(
            LensCameraFragment.RESULT_REQUEST_KEY,
            Bundle().apply {
                putString(LensCameraFragment.RESULT_QR_STRING, qrString)
                putBoolean(LensCameraFragment.RESULT_GALLERY_REQUEST, true)
            },
        )
        activity.supportFragmentManager.executePendingTransactions()

        val shadow = Shadows.shadowOf(activity)
        assertEquals(Activity.RESULT_OK, shadow.resultCode)
        assertEquals(qrString, shadow.resultIntent.getStringExtra(QrScanActivity.EXTRA_SCAN_RESULT_DATA))
        assertTrue(activity.isFinishing)
    }

    @Test
    fun `GIVEN a decoded QR string WHEN handleQrDecodeResult is called THEN the activity finishes with EXTRA_SCAN_RESULT_DATA`() {
        val controller = Robolectric.buildActivity(LensCameraActivity::class.java).setup()
        val activity = controller.get()
        val qrString = "https://example.com/from-gallery"

        activity.handleQrDecodeResult(qrString)

        val shadow = Shadows.shadowOf(activity)
        assertEquals(Activity.RESULT_OK, shadow.resultCode)
        assertEquals(qrString, shadow.resultIntent.getStringExtra(QrScanActivity.EXTRA_SCAN_RESULT_DATA))
        assertTrue(activity.isFinishing)
    }

    @Test
    fun `GIVEN no QR decoded from the picked image WHEN handleQrDecodeResult is called with null THEN a toast is shown and the activity stays open`() {
        val controller = Robolectric.buildActivity(LensCameraActivity::class.java).setup()
        val activity = controller.get()

        activity.handleQrDecodeResult(null)

        assertEquals(
            activity.getString(R.string.lens_camera_qr_no_code_found),
            ShadowToast.getTextOfLatestToast(),
        )
        assertFalse(activity.isFinishing)
    }

    @Test
    fun `GIVEN an empty QR result WHEN handleQrDecodeResult is called THEN a toast is shown and the activity stays open`() {
        val controller = Robolectric.buildActivity(LensCameraActivity::class.java).setup()
        val activity = controller.get()

        activity.handleQrDecodeResult("")

        assertEquals(
            activity.getString(R.string.lens_camera_qr_no_code_found),
            ShadowToast.getTextOfLatestToast(),
        )
        assertFalse(activity.isFinishing)
    }

    @Test
    fun `WHEN the fragment result bundle has an empty QR string THEN the QR branch is ignored`() {
        val controller = Robolectric.buildActivity(LensCameraActivity::class.java).setup()
        val activity = controller.get()

        activity.supportFragmentManager.setFragmentResult(
            LensCameraFragment.RESULT_REQUEST_KEY,
            Bundle().apply { putString(LensCameraFragment.RESULT_QR_STRING, "") },
        )
        activity.supportFragmentManager.executePendingTransactions()

        // No QR result means we fall through; empty bundle (no image URI, no gallery flag)
        // sets RESULT_CANCELED and finishes.
        val shadow = Shadows.shadowOf(activity)
        assertEquals(Activity.RESULT_CANCELED, shadow.resultCode)
        assertTrue(activity.isFinishing)
    }
}
