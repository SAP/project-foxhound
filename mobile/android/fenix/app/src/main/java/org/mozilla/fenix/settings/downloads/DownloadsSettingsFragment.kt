/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import androidx.activity.result.contract.ActivityResultContracts
import androidx.navigation.fragment.navArgs
import androidx.preference.Preference
import androidx.preference.PreferenceCategory
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.SwitchPreference
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.ktx.kotlin.ifNullOrEmpty
import org.mozilla.fenix.FeatureFlags
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.settings.requirePreference

/**
 * A [androidx.preference.PreferenceFragmentCompat] that displays settings related to downloads.
 */
class DownloadsSettingsFragment : PreferenceFragmentCompat() {
    private val logger = Logger("DownloadsSettingsFragment")
    private val args by navArgs<DownloadsSettingsFragmentArgs>()
    private lateinit var downloadLocationFormatter: DownloadLocationFormatter

    private var launcher =
        registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
            handleSelectedDownloadDirectory(uri)
        }

    /**
     * Processes the URI returned from the SAF folder picker, takes persistable permission,
     * and updates the relevant setting.
     *
     * @param uri The URI of the directory selected by the user. Can be null if the user cancelled.
     */
    private fun handleSelectedDownloadDirectory(uri: Uri?) {
        val safeUri = uri ?: return

        val flags =
            Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        try {
            context?.contentResolver?.takePersistableUriPermission(safeUri, flags)
        } catch (e: SecurityException) {
            logger.error(
                "Failed to take persistable URI permission for the selected downloads directory.",
                e,
            )
        }

        context?.settings()?.downloadsDefaultLocation = safeUri.toString()
        updateDownloadsLocationSummary()
    }

    override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
        downloadLocationFormatter = DefaultDownloadLocationFormatter(
            DefaultAndroidFileUtils(requireContext()),
        )
        setPreferencesFromResource(R.xml.downloads_settings_preferences, rootKey)
        requirePreference<SwitchPreference>(R.string.pref_key_downloads_clean_up_files_automatically).apply {
            title = getString(
                R.string.preferences_downloads_settings_clean_up_files_title,
                getString(R.string.app_name),
            )
        }
        findPreference<Preference>(getString(R.string.pref_key_downloads_default_location))?.apply {
            onPreferenceClickListener = Preference.OnPreferenceClickListener {
                launcher.launch(null)
                true
            }
        }
        val fileStorageCategory =
            findPreference<PreferenceCategory>(getString(R.string.pref_key_downloads_storage_category))
        fileStorageCategory?.isVisible = FeatureFlags.downloadsDefaultLocation
    }

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.preferences_downloads))
        updateDownloadsLocationSummary()
        args.preferenceToScrollTo?.let {
            scrollToPreference(it)
        }
    }

    private fun updateDownloadsLocationSummary() {
        val preference =
            findPreference<Preference>(getString(R.string.pref_key_downloads_default_location))

        val storedLocation = context?.settings()?.downloadsDefaultLocation
        val defaultLocation = Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS,
        ).path
        val locationToFormat = storedLocation.ifNullOrEmpty { defaultLocation }

        preference?.summary = try {
            downloadLocationFormatter.getFriendlyPath(locationToFormat)
        } catch (e: MissingUriPermission) {
            logger.warn("Could not format download location path due to lost permissions.", e)
            getString(R.string.preference_downloads_folder_permission_lost)
        }
    }
}
