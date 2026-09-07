/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.qr

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.commit

/**
 *
 * This [AppCompatActivity] hosts the [QrFragment] and
 * uses the [androidx.fragment.app.FragmentResultListener]
 * to send results back to the caller.
 */
class QrScanActivity : AppCompatActivity() {

    private var scanMessage: Int? = null

    private val requestPermissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestPermission(),
        ) { isGranted: Boolean ->
            if (isGranted) {
                // start scan
                launchQrFragment()
            } else {
                Toast.makeText(this, "Permission denied", Toast.LENGTH_SHORT).show()
                setResult(RESULT_CANCELED)
                finish()
            }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        if (intent.hasExtra(EXTRA_SCAN_MESSAGE)) {
            scanMessage = intent.getIntExtra(EXTRA_SCAN_MESSAGE, 0)
                .takeIf { it != 0 }
        }
        supportFragmentManager.fragmentFactory = QrFragmentFactory { scanMessage }

        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scan)

        supportFragmentManager.setFragmentResultListener(
            QrFragment.RESULT_REQUEST_KEY,
            this,
        ) { requestKey, bundle ->
            if (requestKey == QrFragment.RESULT_REQUEST_KEY) {
                val resultData = bundle.getString(QrFragment.RESULT_BUNDLE_KEY)
                if (resultData != null) {
                    val resultIntent = Intent().apply {
                        putExtra(EXTRA_SCAN_RESULT_DATA, resultData)
                    }
                    setResult(RESULT_OK, resultIntent)
                } else {
                    setResult(RESULT_CANCELED)
                }
                finish()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        checkCameraPermission()
    }

    private fun launchQrFragment() {
        supportFragmentManager.commit {
            add(
                R.id.qr_fragment_container_view,
                QrFragment::class.java,
                null,
            )
        }
    }

    private fun checkCameraPermission() {
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.CAMERA,
            ) == PackageManager.PERMISSION_GRANTED -> {
                // You can use the API that requires the permission.
                // start scanning
                launchQrFragment()
            }
            else -> {
                requestPermissionLauncher.launch(
                    Manifest.permission.CAMERA,
                )
            }
        }
    }

    /**
     * Companion object for [QrScanActivity].
     */
    companion object {
        const val EXTRA_SCAN_MESSAGE = "scanMessage"
        const val EXTRA_SCAN_RESULT_DATA = "qr_fragment_result_data"

        /**
         * Creates an [Intent] to start [QrScanActivity].
         */
        fun newIntent(context: Context, scanMessage: Int? = null): Intent {
            return Intent(context, QrScanActivity::class.java).apply {
                if (scanMessage != null) {
                    putExtra(EXTRA_SCAN_MESSAGE, scanMessage)
                }
            }
        }
    }
}
