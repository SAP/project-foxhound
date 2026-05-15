/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings.permissions.permissionoptions

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import mozilla.components.lib.state.ext.observeAsComposableState
import mozilla.components.support.utils.ext.getParcelableCompat
import org.mozilla.focus.ext.requireComponents
import org.mozilla.focus.settings.BaseComposeFragment
import org.mozilla.focus.settings.permissions.SitePermissionOption
import org.mozilla.focus.state.AppAction

/**
 * A fragment that displays a list of options for a specific site permission (e.g., Camera,
 * Location). It allows the user to select an option, such as "Ask every time", "Allowed", or
 * "Blocked".
 *
 * This fragment receives a [SitePermission] object via its arguments, which defines the permission
 * to be configured. It uses a `SitePermissionOptionsScreenStore` to manage its state and an
 * interactor to handle user actions.
 *
 * For permissions that require a corresponding Android system permission (like Camera or
 * Location), this fragment also manages the logic to check for the system-level permission and
 * guides the user to the app's settings if it's denied.
 */
class SitePermissionOptionsFragment : BaseComposeFragment() {

    private lateinit var sitePermissionOptionsScreenStore: SitePermissionOptionsScreenStore
    private lateinit var defaultSitePermissionOptionsScreenInteractor: DefaultSitePermissionOptionsScreenInteractor
    private lateinit var hardwarePermissionCheckFeature: HardwarePermissionCheckFeature
    private lateinit var sitePermissionOptionsStorage: SitePermissionOptionsStorage

    private val sitePermission: SitePermission
        get() = requireArguments().getParcelableCompat(SITE_PERMISSION, SitePermission::class.java)
            ?: throw IllegalAccessError("Site permission is not set for fragment")

    companion object {
        const val FRAGMENT_TAG = "SitePermissionOptionsFragment"
        private const val SITE_PERMISSION = "sitePermission"

        /**
         * Creates a [Bundle] containing the provided [SitePermission]. This is useful for passing
         * the site permission data to fragments or other components.
         *
         * @param sitePermission The [SitePermission] to be added to the bundle.
         * @return A new [Bundle] instance with the site permission parcelable.
         */
        fun bundleForSitePermission(sitePermission: SitePermission): Bundle {
            return Bundle().apply {
                putParcelable(SITE_PERMISSION, sitePermission)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sitePermissionOptionsStorage = SitePermissionOptionsStorage(context = requireContext())
        sitePermissionOptionsScreenStore = SitePermissionOptionsScreenStore(
            SitePermissionOptionsScreenState(),
            listOf(
                SitePermissionOptionsStorageMiddleware(
                    sitePermission = sitePermission,
                    storage = sitePermissionOptionsStorage,
                ),
            ),
        )
        defaultSitePermissionOptionsScreenInteractor = DefaultSitePermissionOptionsScreenInteractor(
            sitePermissionOptionsScreenStore = sitePermissionOptionsScreenStore,
        )
        hardwarePermissionCheckFeature = HardwarePermissionCheckFeature(
            storage = sitePermissionOptionsStorage,
            store = sitePermissionOptionsScreenStore,
            sitePermission = sitePermission,
        )
        lifecycle.addObserver(hardwarePermissionCheckFeature)
    }

    override val titleRes: Int?
        get() = sitePermission.labelRes

    @Composable
    override fun Content() {
        val sitePermissionOptionsList = sitePermissionOptionsScreenStore.observeAsComposableState { state ->
            state.sitePermissionOptionList
        }.value
        val sitePermissionOptionSelected = sitePermissionOptionsScreenStore.observeAsComposableState { state ->
            state.selectedSitePermissionOption
        }.value
        val isAndroidPermissionGranted = sitePermissionOptionsScreenStore.observeAsComposableState { state ->
            state.isAndroidPermissionGranted
        }.value
        if (sitePermissionOptionSelected != null) {
            CreateOptionsPermissionList(
                sitePermissionOptionSelected,
                sitePermissionOptionsList,
                isAndroidPermissionGranted,
            )
        }
    }

    @Composable
    private fun CreateOptionsPermissionList(
        sitePermissionOptionSelected: SitePermissionOption,
        sitePermissionOptionsList: List<SitePermissionOption>,
        isAndroidPermissionGranted: Boolean,
    ) {
        val state = remember {
            mutableIntStateOf(sitePermissionOptionSelected.prefKeyId)
        }
        val optionsListItems = ArrayList<SitePermissionOptionListItem>()
        sitePermissionOptionsList.forEach { sitePermissionOption ->
            val sitePermissionOptionListItem = SitePermissionOptionListItem(
                sitePermissionOption = sitePermissionOption,
                onClick = {
                    state.intValue = sitePermissionOption.prefKeyId
                    defaultSitePermissionOptionsScreenInteractor.handleSitePermissionOptionSelected(
                        sitePermissionOption,
                    )
                    requireComponents.appStore.dispatch(AppAction.SitePermissionOptionChange(true))
                },
            )
            optionsListItems.add(sitePermissionOptionListItem)
        }
        OptionsPermissionList(
            optionsListItems = optionsListItems,
            state = state,
            goToPhoneSettings = { openSettings() },
            permissionLabel = sitePermissionOptionsScreenStore.state.sitePermissionLabel,
            componentPermissionBlockedByAndroidVisibility = !isAndroidPermissionGranted,
        )
    }

    private fun openSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        val uri = Uri.fromParts("package", requireContext().packageName, null)
        intent.data = uri
        startActivity(intent)
    }
}
