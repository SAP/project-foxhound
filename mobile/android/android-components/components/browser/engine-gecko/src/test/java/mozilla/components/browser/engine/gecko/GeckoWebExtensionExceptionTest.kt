/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.engine.gecko.webextension.GeckoWebExtensionException
import mozilla.components.concept.engine.webextension.WebExtensionInstallException
import mozilla.components.support.test.mock
import mozilla.components.test.ReflectionUtils
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.WebExtension
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_ADMIN_INSTALL_ONLY
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_BLOCKLISTED
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_CORRUPT_FILE
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_INCOMPATIBLE
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_NETWORK_FAILURE
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_SIGNEDSTATE_REQUIRED
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_SOFT_BLOCKED
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_UNSUPPORTED_ADDON_TYPE
import org.mozilla.geckoview.WebExtension.InstallException.ErrorCodes.ERROR_USER_CANCELED
import kotlin.test.assertIs

@RunWith(AndroidJUnit4::class)
class GeckoWebExtensionExceptionTest {

    @Test
    fun `Handles an user cancelled exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(geckoException, "code", ERROR_USER_CANCELED)
        val webExtensionException =
            GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.UserCancelled>(webExtensionException)
    }

    @Test
    fun `Handles a generic exception`() {
        val geckoException = Exception()
        val webExtensionException =
            GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<GeckoWebExtensionException>(webExtensionException)
    }

    @Test
    fun `Handles a blocklisted exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(geckoException, "code", ERROR_BLOCKLISTED)
        val webExtensionException =
            GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.Blocklisted>(webExtensionException)
    }

    @Test
    fun `Handles a CorruptFile exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(geckoException, "code", ERROR_CORRUPT_FILE)
        val webExtensionException =
            GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.CorruptFile>(webExtensionException)
    }

    @Test
    fun `Handles a NetworkFailure exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(geckoException, "code", ERROR_NETWORK_FAILURE)
        val webExtensionException =
            GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.NetworkFailure>(webExtensionException)
    }

    @Test
    fun `Handles an NotSigned exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(
            geckoException,
            "code",
            ERROR_SIGNEDSTATE_REQUIRED,
        )
        val webExtensionException =
            GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.NotSigned>(webExtensionException)
    }

    @Test
    fun `Handles an Incompatible exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(
            geckoException,
            "code",
            ERROR_INCOMPATIBLE,
        )
        val webExtensionException =
            GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.Incompatible>(webExtensionException)
    }

    @Test
    fun `Handles an UnsupportedAddonType exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(
            geckoException,
            "code",
            ERROR_UNSUPPORTED_ADDON_TYPE,
        )
        val webExtensionException = GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.UnsupportedAddonType>(webExtensionException)
    }

    @Test
    fun `Handles an AdminInstallOnly exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(
            geckoException,
            "code",
            ERROR_ADMIN_INSTALL_ONLY,
        )
        val webExtensionException = GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.AdminInstallOnly>(webExtensionException)
    }

    @Test
    fun `Handles a SoftBlocked exception`() {
        val geckoException = mock<WebExtension.InstallException>()
        ReflectionUtils.setField(
            geckoException,
            "code",
            ERROR_SOFT_BLOCKED,
        )
        val webExtensionException = GeckoWebExtensionException.createWebExtensionException(geckoException)

        assertIs<WebExtensionInstallException.SoftBlocked>(webExtensionException)
    }
}
