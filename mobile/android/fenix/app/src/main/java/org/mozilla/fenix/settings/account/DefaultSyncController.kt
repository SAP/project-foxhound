/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.account

import android.content.DialogInterface
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.text.SpannableString
import androidx.annotation.VisibleForTesting
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import mozilla.components.ui.widgets.withCenterAlignedButtons
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.R

interface SyncController {
    fun handleCameraPermissionsNeeded()
}

/**
 * Controller for handling [DefaultSyncInteractor] requests.
 */
class DefaultSyncController(
    private val activity: HomeActivity,
) : SyncController {

    /**
     * Creates and shows an [AlertDialog] when camera permissions are needed.
     *
     * In versions above M, [AlertDialog.BUTTON_POSITIVE] takes the user to the app settings. This
     * intent only exists in M and above. Below M, [AlertDialog.BUTTON_POSITIVE] routes to a SUMO
     * help page to find the app settings.
     *
     * [AlertDialog.BUTTON_NEGATIVE] dismisses the dialog.
     */
    override fun handleCameraPermissionsNeeded() {
        val dialog = buildDialog()
        dialog.show()
    }

    /**
     * Builds a [MaterialAlertDialogBuilder] to inform the user that camera permissions are needed.
    */
    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    fun buildDialog(): MaterialAlertDialogBuilder {
        return MaterialAlertDialogBuilder(activity).apply {
            val spannableText = SpannableString(
                activity.resources.getString(R.string.camera_permissions_needed_message),
            )
            setMessage(spannableText)
            setNegativeButton(R.string.camera_permissions_needed_negative_button_text) { dialog: DialogInterface, _ ->
                dialog.cancel()
            }
            setPositiveButton(R.string.camera_permissions_needed_positive_button_text) { dialog: DialogInterface, _ ->
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                val uri = Uri.fromParts("package", activity.packageName, null)
                intent.data = uri
                dialog.cancel()
                activity.startActivity(intent)
            }
            create().withCenterAlignedButtons()
        }
    }
}
