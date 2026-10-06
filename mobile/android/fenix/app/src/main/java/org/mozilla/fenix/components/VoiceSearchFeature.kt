/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.Fragment
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.map
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.support.base.feature.LifecycleAwareFeature
import mozilla.components.support.base.feature.ViewBoundFeatureWrapper
import org.mozilla.fenix.R
import org.mozilla.fenix.components.appstate.VoiceSearchAction.VoiceInputRequestCleared
import org.mozilla.fenix.components.appstate.VoiceSearchAction.VoiceInputResultReceived
import org.mozilla.fenix.ext.components

/**
 * A generic feature for handling voice search requests and results.
 * - Observes voice search requests from the AppStore.
 * - Launches voice recognition and updates AppStore with the result.
 * - Does NOT update any UI or toolbar state directly.
 *
 * Other features (such as toolbar middleware) should observe AppStore for
 * voice search results and update their own state accordingly.
 */
class VoiceSearchFeature(
    private val context: Context,
    private val appStore: AppStore,
    private val voiceSearchLauncher: ActivityResultLauncher<Intent>,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : LifecycleAwareFeature {

    private var scope: CoroutineScope? = null

    override fun start() {
        observeVoiceSearchRequests()
    }

    override fun stop() {
        scope?.cancel()
        scope = null
    }

    private fun observeVoiceSearchRequests() {
        scope = appStore.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.map { state -> state.voiceSearchState }
                .distinctUntilChangedBy { it.isRequestingVoiceInput }
                .collect { voiceSearchState ->
                    if (voiceSearchState.isRequestingVoiceInput) {
                        appStore.dispatch(VoiceInputRequestCleared)
                        launchVoiceSearch()
                    }
                }
        }
    }

    private fun launchVoiceSearch() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PROMPT, context.getString(R.string.voice_search_explainer))
        }

        try {
            voiceSearchLauncher.launch(intent)
        } catch (e: ActivityNotFoundException) {
            appStore.dispatch(VoiceInputResultReceived(null))
        } catch (e: SecurityException) {
            appStore.dispatch(VoiceInputResultReceived(null))
        }
    }

    /**
     * Handles the voice search result. This should be called from the ActivityResultLauncher callback.
     */
    fun handleVoiceSearchResult(resultCode: Int, data: Intent?) {
        val searchTerms = if (resultCode == Activity.RESULT_OK && data != null) {
            data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        } else {
            null
        }

        appStore.dispatch(VoiceInputResultReceived(searchTerms))
    }

    /**
     * Static binding for [VoiceSearchFeature].
     */
    companion object {

        /**
         * Convenient method to register [VoiceSearchFeature] with a [Fragment].
         * Upon destruction of the fragment's view, the binding will be unregistered and all
         * references cleared.
         *
         * @param fragment the [Fragment] to register with.
         * @param activityResultLauncher the [ActivityResultLauncher] to use for the result.
         */
        fun register(
            fragment: Fragment,
            activityResultLauncher: ActivityResultLauncher<Intent>,
        ): ViewBoundFeatureWrapper<VoiceSearchFeature>? {
            var voiceSearchBinding: ViewBoundFeatureWrapper<VoiceSearchFeature>? =
                ViewBoundFeatureWrapper()

            voiceSearchBinding?.set(
                feature = VoiceSearchFeature(
                    context = fragment.requireContext(),
                    appStore = fragment.requireContext().components.appStore,
                    voiceSearchLauncher = activityResultLauncher,
                ),
                owner = fragment.viewLifecycleOwner,
                view = fragment.requireView(),
            )

            fragment.viewLifecycleOwner.lifecycle.addObserver(
                object : androidx.lifecycle.DefaultLifecycleObserver {
                    override fun onDestroy(owner: LifecycleOwner) {
                        voiceSearchBinding = null
                    }
                },
            )

            return voiceSearchBinding
        }
    }
}
