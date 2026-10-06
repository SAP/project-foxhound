/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings

import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.core.view.forEach
import androidx.lifecycle.lifecycleScope
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.components.browser.icons.IconRequest
import mozilla.components.browser.state.state.searchEngines
import mozilla.components.concept.fetch.Client
import mozilla.components.concept.fetch.Request
import mozilla.components.concept.fetch.Request.Redirect.FOLLOW
import mozilla.components.feature.search.ext.createSearchEngine
import mozilla.components.support.ktx.android.view.hideKeyboard
import mozilla.components.support.ktx.util.URLStringUtils
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.focus.GleanMetrics.SearchEngines
import org.mozilla.focus.R
import org.mozilla.focus.ext.components
import org.mozilla.focus.ext.requireComponents
import org.mozilla.focus.ext.settings
import org.mozilla.focus.ext.showToolbar
import org.mozilla.focus.search.ManualAddSearchEnginePreference
import org.mozilla.focus.settings.ManualAddSearchEngineSettingsFragment.Companion.SEARCH_QUERY_VALIDATION_TIMEOUT_MILLIS
import org.mozilla.focus.settings.ManualAddSearchEngineSettingsFragment.Companion.VALID_RESPONSE_CODE_UPPER_BOUND
import org.mozilla.focus.state.AppAction
import org.mozilla.focus.utils.SupportUtils
import org.mozilla.focus.utils.ViewUtils
import java.io.IOException
import java.net.MalformedURLException
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * A fragment that provides a user interface for manually adding a custom search engine.
 *
 * This fragment allows users to input a display name and a search query URL (using `%s` as a placeholder).
 * It performs validation on the input:
 * 1. Checks if the engine name is unique and non-empty.
 * 2. Validates the search query format.
 * 3. Asynchronously attempts to ping the provided URL to ensure it is reachable and valid.
 *
 * If validation is successful, the search engine is saved to the application's search store
 * and set as the default search engine.
 *
 * @see BaseSettingsFragment
 * @see ManualAddSearchEnginePreference
 */
class ManualAddSearchEngineSettingsFragment : BaseSettingsFragment() {
    override fun onCreatePreferences(p0: Bundle?, p1: String?) {
        addPreferencesFromResource(R.xml.manual_add_search_engine)
    }

    private var menuItemForActiveAsyncTask: MenuItem? = null
    private var job: Job? = null

    override fun onResume() {
        super.onResume()

        showToolbar(getString(R.string.action_option_add_search_engine))
    }

    override fun onPause() {
        super.onPause()
        setUiIsValidatingAsync(false, menuItemForActiveAsyncTask)
        menuItemForActiveAsyncTask = null
    }

    override fun onCreateMenu(menu: Menu, menuInflater: MenuInflater) {
        menuInflater.inflate(R.menu.menu_search_engine_manual_add, menu)
    }

    override fun onMenuItemSelected(menuItem: MenuItem): Boolean {
        val openLearnMore = {
            val learnMoreUrl = SupportUtils.getSumoURLForTopic(
                SupportUtils.getAppVersion(requireContext()),
                SupportUtils.SumoTopic.ADD_SEARCH_ENGINE,
            )
            SupportUtils.openUrlInCustomTab(requireActivity(), learnMoreUrl)
            SearchEngines.learnMoreTapped.record(NoExtras())

            true
        }

        val saveSearchEngine = {
            val engineName = requireView().findViewById<EditText>(R.id.edit_engine_name).text.toString()
            val searchQuery = requireView().findViewById<EditText>(R.id.edit_search_string).text.toString()

            val pref = findManualAddSearchEnginePreference(R.string.pref_key_manual_add_search_engine)

            val existingEngines = requireContext().components.store.state.search.searchEngines
            val engineValid = pref?.validateEngineNameAndShowError(engineName, existingEngines) == true
            val searchValid = pref?.validateSearchQueryAndShowError(searchQuery) == true
            val isPartialSuccess = engineValid && searchValid

            if (isPartialSuccess) {
                view?.hideKeyboard()
                setUiIsValidatingAsync(true, menuItem)

                menuItemForActiveAsyncTask = menuItem

                viewLifecycleOwner.lifecycleScope.launch {
                    validateSearchEngine(engineName, searchQuery, requireComponents.client)
                }
            } else {
                SearchEngines.saveEngineTapped.record(SearchEngines.SaveEngineTappedExtra(false))
            }

            true
        }

        return when (menuItem.itemId) {
            R.id.learn_more -> openLearnMore()
            R.id.menu_save_search_engine -> saveSearchEngine()
            else -> false
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        return super.onCreateView(inflater, container, savedInstanceState)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        view?.hideKeyboard()
    }

    private fun setUiIsValidatingAsync(isValidating: Boolean, saveMenuItem: MenuItem?) {
        val pref = findManualAddSearchEnginePreference(R.string.pref_key_manual_add_search_engine)
        val updateViews = {
            // Disable text entry until done validating
            val viewGroup = view as ViewGroup
            enableAllSubviews(!isValidating, viewGroup)

            saveMenuItem?.isEnabled = !isValidating
        }

        if (isValidating) {
            view?.alpha = DISABLED_ALPHA
            // Delay showing the loading indicator to prevent it flashing on the screen
            job = viewLifecycleOwner.lifecycleScope.launch {
                delay(LOADING_INDICATOR_DELAY)
                pref?.setProgressViewShown(isValidating)
                updateViews()
            }
        } else {
            view?.alpha = 1f
            job?.cancel()
            pref?.setProgressViewShown(false)
            updateViews()
        }
    }

    private fun enableAllSubviews(shouldEnable: Boolean, viewGroup: ViewGroup) {
        viewGroup.forEach { child ->
            if (child is ViewGroup) {
                enableAllSubviews(shouldEnable, child)
            } else {
                child.isEnabled = shouldEnable
            }
        }
    }

    private fun findManualAddSearchEnginePreference(id: Int): ManualAddSearchEnginePreference? {
        return findPreference(getString(id)) as? ManualAddSearchEnginePreference
    }

    companion object {
        private const val LOGTAG = "ManualAddSearchEngine"
        private const val SEARCH_QUERY_VALIDATION_TIMEOUT_MILLIS = 4000
        private const val VALID_RESPONSE_CODE_UPPER_BOUND = 300
        private const val DISABLED_ALPHA = 0.5f
        private const val LOADING_INDICATOR_DELAY: Long = 1000

        /**
         * Checks if a given search query URL is valid.
         *
         * A URL is considered valid if the network request is successful and returns a status code
         * less than [VALID_RESPONSE_CODE_UPPER_BOUND] (typically meaning a success or redirect, but not an error).
         *
         * @param client The [Client] to use for making the network request.
         * @param query The search query URL string to validate.
         *              This string should contain "%s" as a placeholder for the search term.
         * @param ioDispatcher The [CoroutineDispatcher] on which to perform the network operation.
         *        Defaults to [Dispatchers.IO].
         * @return `true` if the search query URL is valid, `false` otherwise (e.g., malformed URL, network error, etc).
         *
         * @see URLStringUtils.toNormalizedURL
         * @see SEARCH_QUERY_VALIDATION_TIMEOUT_MILLIS
         * @see VALID_RESPONSE_CODE_UPPER_BOUND
         */
        suspend fun isValidSearchQueryURL(
            client: Client,
            query: String,
            ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
        ): Boolean =
            withContext(ioDispatcher) {
                // we should share the code to substitute and normalize the search string
                // (see SearchEngine.buildSearchUrl).
                val encodedTestQuery = Uri.encode("testSearchEngineValidation")

                val normalizedHttpsSearchURLStr = URLStringUtils.toNormalizedURL(query)
                val searchURLStr = normalizedHttpsSearchURLStr.replace("%s".toRegex(), encodedTestQuery)

                try {
                    URL(searchURLStr)
                } catch (e: MalformedURLException) {
                    // Don't log exception to avoid leaking URL.
                    Log.d(LOGTAG, "Failure to get response code from server: returning invalid search query")
                    return@withContext false
                }

                val request = Request(
                    url = searchURLStr,
                    connectTimeout = SEARCH_QUERY_VALIDATION_TIMEOUT_MILLIS.toLong() to TimeUnit.MILLISECONDS,
                    readTimeout = SEARCH_QUERY_VALIDATION_TIMEOUT_MILLIS.toLong() to TimeUnit.MILLISECONDS,
                    redirect = FOLLOW,
                    private = true,
                )

                return@withContext try {
                    val response = client.fetch(request)
                    // Close the response stream to ensure the body is closed correctly. See https://bugzilla.mozilla.org/show_bug.cgi?id=1603114.
                    response.close()

                    response.status < VALID_RESPONSE_CODE_UPPER_BOUND
                } catch (e: IOException) {
                    Log.d(LOGTAG, "Failure to get response code from server: returning invalid search query")
                    false
                }
            }
    }

    private suspend fun validateSearchEngine(engineName: String, query: String, client: Client) {
        val isValidSearchQuery = isValidSearchQueryURL(client, query)

        if (!currentCoroutineContext().isActive) return

        if (isValidSearchQuery) {
            requireComponents.searchUseCases.addSearchEngine(
                createSearchEngine(
                    engineName,
                    query.toSearchUrl(),
                    requireComponents.icons.loadIcon(IconRequest(query, isPrivate = true))
                        .await().bitmap,
                ),
            )

            ViewUtils.showBrandedSnackbar(
                requireView(),
                R.string.search_add_confirmation,
                Snackbar.LENGTH_SHORT,
            )
            requireActivity().settings.setDefaultSearchEngineByName(engineName)
            SearchEngines.saveEngineTapped.record(SearchEngines.SaveEngineTappedExtra(true))

            requireComponents.appStore.dispatch(
                AppAction.NavigateUp(requireComponents.store.state.selectedTabId),
            )
        } else {
            showServerError()
            SearchEngines.saveEngineTapped.record(SearchEngines.SaveEngineTappedExtra(false))
        }

        setUiIsValidatingAsync(false, menuItemForActiveAsyncTask)
        menuItemForActiveAsyncTask = null
    }

    private fun showServerError() {
        val pref = findManualAddSearchEnginePreference(R.string.pref_key_manual_add_search_engine)
        pref?.setSearchQueryErrorText(getString(R.string.error_hostLookup_title))
    }
}

private fun String.toSearchUrl(): String {
    return replace("%s", "{searchTerms}")
}
