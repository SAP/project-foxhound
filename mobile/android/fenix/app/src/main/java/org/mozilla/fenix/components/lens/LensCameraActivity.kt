/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.lens

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.VisibleForTesting
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.os.BundleCompat
import androidx.fragment.app.commit
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.components.feature.qr.QrAnalyzer
import mozilla.components.feature.qr.QrScanActivity
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.R
import java.io.IOException

internal const val LENS_IMAGES_DIR = "lens_images"

/**
 * Activity that hosts [LensCameraFragment] for capturing images for Google Lens.
 * Handles camera permission and gallery picking, returning the selected image URI
 * as the activity result.
 */
class LensCameraActivity : AppCompatActivity() {

    private val logger = Logger("LensCameraActivity")

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { isGranted -> handlePermissionResult(isGranted) }

    @VisibleForTesting
    internal fun handlePermissionResult(isGranted: Boolean) {
        if (isGranted) {
            launchCameraFragment()
        } else {
            Toast.makeText(this, R.string.lens_camera_permission_denied, Toast.LENGTH_SHORT).show()
            setResult(RESULT_CANCELED)
            finish()
        }
    }

    private val galleryLauncher = registerForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null) {
            val resultIntent = Intent().apply { data = uri }
            setResult(RESULT_OK, resultIntent)
            finish()
        }
    }

    private val qrGalleryLauncher = registerForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri != null) {
            decodeQrFromUri(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_lens_camera)
        if (savedInstanceState == null) {
            lifecycleScope.launch(Dispatchers.IO) { clearLensImageCache() }
        }

        supportFragmentManager.setFragmentResultListener(
            LensCameraFragment.RESULT_REQUEST_KEY,
            this,
        ) { _, bundle ->
            // RESULT_QR_STRING must never be set to an empty string by the producer
            // (LensCameraFragment.handleQrResult). An empty value falls through to the
            // gallery/image branch below; downstream callers treat an empty extra as no scan.
            val qrString = bundle.getString(LensCameraFragment.RESULT_QR_STRING)
            if (!qrString.isNullOrEmpty()) {
                val resultIntent = Intent().apply {
                    putExtra(QrScanActivity.EXTRA_SCAN_RESULT_DATA, qrString)
                }
                setResult(RESULT_OK, resultIntent)
                finish()
                return@setFragmentResultListener
            }

            if (bundle.getBoolean(LensCameraFragment.RESULT_QR_GALLERY_REQUEST, false)) {
                launchQrGalleryPicker()
                return@setFragmentResultListener
            }

            if (bundle.getBoolean(LensCameraFragment.RESULT_GALLERY_REQUEST, false)) {
                launchGalleryPicker()
                return@setFragmentResultListener
            }

            val imageUri: Uri? = BundleCompat.getParcelable(
                bundle,
                LensCameraFragment.RESULT_IMAGE_URI,
                Uri::class.java,
            )
            if (imageUri != null) {
                val resultIntent = Intent().apply { data = imageUri }
                setResult(RESULT_OK, resultIntent)
            } else {
                setResult(RESULT_CANCELED)
            }
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        checkCameraPermission()
    }

    private fun checkCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            launchCameraFragment()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun launchCameraFragment() {
        if (supportFragmentManager.findFragmentById(R.id.lens_fragment_container_view) != null) {
            return
        }
        supportFragmentManager.commit {
            add(R.id.lens_fragment_container_view, LensCameraFragment::class.java, null)
        }
    }

    private fun launchGalleryPicker() {
        galleryLauncher.launch(
            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
        )
    }

    private fun launchQrGalleryPicker() {
        qrGalleryLauncher.launch(
            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
        )
    }

    @VisibleForTesting
    internal fun decodeQrFromUri(uri: Uri) {
        lifecycleScope.launch(Dispatchers.IO) {
            val qrString = try {
                val bitmap = loadSoftwareBitmap(uri)
                QrAnalyzer().analyze(bitmap)
            } catch (e: CancellationException) {
                throw e
            } catch (e: IOException) {
                logger.error("Failed to decode QR from picked image", e)
                null
            } catch (e: IllegalArgumentException) {
                logger.error("Failed to decode QR from picked image", e)
                null
            } catch (e: IllegalStateException) {
                logger.error("Failed to decode QR from picked image", e)
                null
            }
            withContext(Dispatchers.Main) {
                if (!isFinishing && !isDestroyed) handleQrDecodeResult(qrString)
            }
        }
    }

    @VisibleForTesting
    internal fun handleQrDecodeResult(qrString: String?) {
        if (qrString.isNullOrEmpty()) {
            Toast.makeText(this, R.string.lens_camera_qr_no_code_found, Toast.LENGTH_SHORT).show()
            return
        }
        val resultIntent = Intent().apply {
            putExtra(QrScanActivity.EXTRA_SCAN_RESULT_DATA, qrString)
        }
        setResult(RESULT_OK, resultIntent)
        finish()
    }

    private fun loadSoftwareBitmap(uri: Uri): Bitmap {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val source = ImageDecoder.createSource(contentResolver, uri)
            ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
                // QrAnalyzer.analyze(bitmap) calls Bitmap.getPixels, which throws on
                // hardware-backed bitmaps — force the software allocator.
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                val longEdge = maxOf(info.size.width, info.size.height)
                if (longEdge > QR_DECODE_MAX_DIMENSION) {
                    val scale = QR_DECODE_MAX_DIMENSION.toFloat() / longEdge
                    decoder.setTargetSize(
                        (info.size.width * scale).toInt().coerceAtLeast(1),
                        (info.size.height * scale).toInt().coerceAtLeast(1),
                    )
                }
            }
        } else {
            decodeDownsampledStream(uri)
        }
    }

    private fun decodeDownsampledStream(uri: Uri): Bitmap {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, bounds)
        } ?: throw IOException("Unable to open $uri")

        val longEdge = maxOf(bounds.outWidth, bounds.outHeight)
        var sampleSize = 1
        while (longEdge / sampleSize > QR_DECODE_MAX_DIMENSION) sampleSize *= 2

        val opts = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        return contentResolver.openInputStream(uri)?.use {
            BitmapFactory.decodeStream(it, null, opts)
        } ?: throw IOException("Unable to open $uri")
    }

    @VisibleForTesting
    internal fun clearLensImageCache() {
        val imageDir = java.io.File(cacheDir, LENS_IMAGES_DIR)
        if (imageDir.exists()) {
            imageDir.listFiles()?.forEach { it.delete() }
        }
    }

    companion object {
        // Cap the long edge of decoded gallery images before QR analysis. Modern phone photos
        // are 12 MP+ which would allocate ~50 MB as ARGB_8888 plus another ~50 MB for the
        // IntArray pixel copy inside QrAnalyzer — enough to OOM low-RAM devices. ZXing
        // detects QR codes reliably well below this resolution.
        private const val QR_DECODE_MAX_DIMENSION = 2048

        /**
         * Creates an intent to launch [LensCameraActivity].
         */
        fun newIntent(context: Context): Intent {
            return Intent(context, LensCameraActivity::class.java)
        }
    }
}
