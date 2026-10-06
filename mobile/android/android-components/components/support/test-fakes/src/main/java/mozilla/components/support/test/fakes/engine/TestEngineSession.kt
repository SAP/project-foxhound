/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.test.fakes.engine

import mozilla.components.concept.engine.DefaultSettings
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineSessionState
import mozilla.components.concept.engine.Settings
import mozilla.components.concept.engine.translate.TranslationOptions
import org.json.JSONObject

/**
 * An [EngineSession] implementation for use in tests.
 *
 * The class is open, so that consumers can override specific functions to customize that behavior.
 */
open class TestEngineSession(override val settings: Settings = DefaultSettings()) :
    EngineSession() {

    override fun loadUrl(
        url: String,
        parent: EngineSession?,
        flags: LoadUrlFlags,
        additionalHeaders: Map<String, String>?,
        originalInput: String?,
        textDirectiveUserActivation: Boolean,
    ) = Unit

    override fun loadData(data: String, mimeType: String, encoding: String) = Unit

    override fun requestPdfToDownload() = Unit

    override fun requestPrintContent() = Unit

    override fun stopLoading() = Unit

    override fun reload(flags: LoadUrlFlags) = Unit

    override fun goBack(userInteraction: Boolean) = Unit

    override fun goForward(userInteraction: Boolean) = Unit

    override fun goToHistoryIndex(index: Int) = Unit

    override fun restoreState(state: EngineSessionState): Boolean = false

    override fun flushSessionState() = Unit

    override fun updateTrackingProtection(policy: TrackingProtectionPolicy) = Unit

    override fun toggleDesktopMode(enable: Boolean, reload: Boolean) = Unit

    override fun hasCookieBannerRuleForSession(
        onResult: (Boolean) -> Unit,
        onException: (Throwable) -> Unit,
    ) = Unit

    override fun checkForPdfViewer(
        onResult: (Boolean) -> Unit,
        onException: (Throwable) -> Unit,
    ) = Unit

    override fun getWebCompatInfo(
        onResult: (JSONObject) -> Unit,
        onException: (Throwable) -> Unit,
    ) = Unit

    override fun sendMoreWebCompatInfo(
        info: JSONObject,
        onResult: () -> Unit,
        onException: (Throwable) -> Unit,
    ) = Unit

    override fun requestTranslate(
        fromLanguage: String,
        toLanguage: String,
        options: TranslationOptions?,
    ) = Unit

    override fun requestTranslationRestore() = Unit

    override fun getNeverTranslateSiteSetting(
        onResult: (Boolean) -> Unit,
        onException: (Throwable) -> Unit,
    ) = Unit

    override fun setNeverTranslateSiteSetting(
        setting: Boolean,
        onResult: () -> Unit,
        onException: (Throwable) -> Unit,
    ) = Unit

    override fun findAll(text: String) = Unit

    override fun findNext(forward: Boolean) = Unit

    override fun clearFindMatches() = Unit

    override fun exitFullScreenMode() = Unit

    override fun purgeHistory() = Unit

    override fun processBackPressed(onResult: (Boolean) -> Unit) = Unit
}
