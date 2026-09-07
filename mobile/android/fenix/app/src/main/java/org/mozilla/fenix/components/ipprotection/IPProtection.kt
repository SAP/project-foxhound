/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.ipprotection

import android.content.Context
import androidx.lifecycle.ProcessLifecycleOwner
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.feature.ipprotection.IPProtectionFeature
import mozilla.components.feature.ipprotection.IPProtectionStorageSynchronizer
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.store.SyncStore
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.Config
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.LogMiddleware
import org.mozilla.fenix.utils.Settings

/**
 * Provides access to IP Protection related components.
 */
@Suppress("LongParameterList")
class IPProtection(
    val engine: Engine,
    val browserStore: BrowserStore,
    val syncStore: SyncStore,
    val lazyFxaAccountManager: Lazy<FxaAccountManager>,
    val lazyAppStore: Lazy<AppStore>,
    val settings: Settings,
    val context: Context,
) {
    val store by lazy {
        IPProtectionStore(
            middleware = listOf(
                LogMiddleware(
                    shouldIncludeDetailedData = { Config.channel.isDebug },
                    // tag has a max line-length; the rest of the default was unhelpful.
                    logger = Logger("IPPStore"),
                ),
                IPProtectionSnackbarMiddleware(
                    lazyAppStore = lazyAppStore,
                    messages = snackbarMessages,
                ),
                IPProtectionTelemetryMiddleware(),
            ),
        )
    }

    val eligibilityStorage by lazy {
        FenixIPProtectionEligibilityStorage(
            browserStore = browserStore,
            sharedPref = settings.preferences,
            prefKey = context.getString(R.string.pref_key_enable_ip_protection),
            lifecycleOwner = ProcessLifecycleOwner.get(),
        )
    }

    val feature by lazy {
        IPProtectionFeature(
            store = store,
            engine = engine,
            accountManager = lazyFxaAccountManager.value,
        )
    }

    val storageSynchronizer by lazy {
        IPProtectionStorageSynchronizer(
            storage = eligibilityStorage,
            store = store,
            syncStore = syncStore,
            lazyAccountManager = lazyFxaAccountManager,
        )
    }

    private val snackbarMessages by lazy {
        IPProtectionSnackbarMessages(
            connectionError = context.getString(
                R.string.ip_protection_connection_error_snackbar,
            ),
        )
    }
}
