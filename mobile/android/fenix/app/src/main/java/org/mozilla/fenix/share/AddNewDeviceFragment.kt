/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.share

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import mozilla.components.ui.widgets.withCenterAlignedButtons
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.FragmentAddNewDeviceBinding
import org.mozilla.fenix.e2e.SystemInsetsPaddedFragment
import org.mozilla.fenix.ext.openToBrowser
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.settings.SupportUtils

/**
 * Fragment to add a new device. Tabs can be shared to devices after they are added.
 */
class AddNewDeviceFragment : Fragment(R.layout.fragment_add_new_device), SystemInsetsPaddedFragment {

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.sync_add_new_device_title))
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val binding = FragmentAddNewDeviceBinding.bind(view)
        binding.learnButton.setOnClickListener {
            findNavController().openToBrowser()
            requireComponents.useCases.fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = SupportUtils.getSumoURLForTopic(
                    requireContext(),
                    SupportUtils.SumoTopic.SEND_TABS,
                ),
                newTab = true,
            )
        }

        binding.connectButton.setOnClickListener {
            MaterialAlertDialogBuilder(requireContext()).apply {
                setMessage(R.string.sync_connect_device_dialog)
                setPositiveButton(R.string.sync_confirmation_button) { dialog, _ -> dialog.cancel() }
                create().withCenterAlignedButtons()
            }.show()
        }
    }
}
