/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations.preferences.downloadlanguages

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.fragment.app.Fragment
import androidx.navigation.findNavController
import mozilla.components.browser.state.action.TranslationsAction
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.translate.LanguageModel
import mozilla.components.concept.engine.translate.ModelManagementOptions
import mozilla.components.concept.engine.translate.ModelOperation
import mozilla.components.concept.engine.translate.ModelState
import mozilla.components.concept.engine.translate.OperationLevel
import mozilla.components.concept.engine.translate.TranslationError
import mozilla.components.lib.state.ext.observeAsComposableState
import mozilla.components.support.base.feature.ViewBoundFeatureWrapper
import org.mozilla.fenix.BrowserDirection
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.ext.showToolbar
import org.mozilla.fenix.settings.SupportUtils
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.utils.AccessibilityUtils.moveFocusToBackNavButton
import java.util.Locale

/**
 * A fragment displaying Download Languages screen.
 */
class DownloadLanguagesPreferenceFragment : Fragment() {
    private val downloadLanguagesFeature =
        ViewBoundFeatureWrapper<DownloadLanguagesFeature>()
    private var isDataSaverEnabledAndWifiDisabled = false
    private val browserStore: BrowserStore by lazy { requireComponents.core.store }

    override fun onResume() {
        super.onResume()
        showToolbar(getString(R.string.download_languages_translations_toolbar_title_preference))
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = ComposeView(requireContext()).apply {
        setContent {
            FirefoxTheme {
                val learnMoreUrl = SupportUtils.getSumoURLForTopic(
                    requireContext(),
                    SupportUtils.SumoTopic.TRANSLATIONS,
                )
                val downloadLanguageItemsPreference = getDownloadLanguageItemsPreference()

                val engineError = browserStore.observeAsComposableState { state ->
                    state.translationEngine.engineError
                }.value

                DownloadLanguagesPreference(
                    downloadLanguageItemPreferences = downloadLanguageItemsPreference,
                    learnMoreUrl = learnMoreUrl,
                    downloadLanguagesError = engineError as? TranslationError.ModelCouldNotRetrieveError,
                    onLearnMoreClicked = { openBrowserAndLoad(learnMoreUrl) },
                    onItemClick = { downloadLanguageItemPreference ->
                        if (downloadLanguageItemPreference.languageModel.status ==
                            ModelState.DOWNLOADED ||
                            shouldShowPrefDownloadLanguageFileDialog(
                                downloadLanguageItemPreference,
                            )
                        ) {
                            var size = 0L
                            downloadLanguageItemPreference.languageModel.size?.let { size = it }

                            findNavController().navigate(
                                DownloadLanguagesPreferenceFragmentDirections
                                    .actionDownloadLanguagesPreferenceToDownloadLanguagesDialogPreference(
                                        modelState = downloadLanguageItemPreference.languageModel.status,
                                        itemType = downloadLanguageItemPreference.type,
                                        languageCode = downloadLanguageItemPreference.languageModel.language?.code,
                                        languageDisplayName =
                                        downloadLanguageItemPreference.languageModel.language?.localizedDisplayName,
                                        modelSize = size,
                                    ),
                            )
                        } else {
                            if (
                                downloadLanguageItemPreference.type ==
                                DownloadLanguageItemTypePreference.AllLanguages
                            ) {
                                val options = ModelManagementOptions(
                                    operation = if (
                                        downloadLanguageItemPreference.languageModel.status ==
                                        ModelState.NOT_DOWNLOADED
                                    ) {
                                        ModelOperation.DOWNLOAD
                                    } else {
                                        ModelOperation.DELETE
                                    },
                                    operationLevel = OperationLevel.ALL,
                                )
                                browserStore.dispatch(
                                    TranslationsAction.ManageLanguageModelsAction(
                                        options = options,
                                    ),
                                )
                            } else {
                                deleteOrDownloadModel(downloadLanguageItemPreference)
                            }

                            val activity = activity as? AppCompatActivity
                            if (activity != null) {
                                moveFocusToBackNavButton(activity)
                            }
                        }
                    },
                )
            }
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        downloadLanguagesFeature.set(
            feature = DownloadLanguagesFeature(
                context = requireContext(),
                wifiConnectionMonitor = requireContext().components.wifiConnectionMonitor,
                onDataSaverAndWifiChanged = {
                    isDataSaverEnabledAndWifiDisabled = it
                },
            ),
            owner = this,
            view = view,
        )
    }

    private fun deleteOrDownloadModel(downloadLanguageItemPreference: DownloadLanguageItemPreference) {
        val options = ModelManagementOptions(
            languageToManage = downloadLanguageItemPreference.languageModel.language?.code,
            operation = if (
                downloadLanguageItemPreference.languageModel.status ==
                ModelState.NOT_DOWNLOADED
            ) {
                ModelOperation.DOWNLOAD
            } else {
                ModelOperation.DELETE
            },
            operationLevel = OperationLevel.LANGUAGE,
        )
        browserStore.dispatch(
            TranslationsAction.ManageLanguageModelsAction(
                options = options,
            ),
        )
    }

    private fun openBrowserAndLoad(learnMoreUrl: String) {
        (requireActivity() as HomeActivity).openToBrowserAndLoad(
            searchTermOrURL = learnMoreUrl,
            newTab = true,
            from = BrowserDirection.FromDownloadLanguagesPreferenceFragment,
        )
    }

    @Composable
    private fun getDownloadLanguageItemsPreference(): List<DownloadLanguageItemPreference> {
        val languageModels = browserStore.observeAsComposableState { state ->
            state.translationEngine.languageModels
        }.value?.toMutableList()
        val languageItemPreferenceList = mutableListOf<DownloadLanguageItemPreference>()

        languageModels?.let {
            var allLanguagesSizeDownloaded = 0L

            for (languageModel in languageModels) {
                var size = 0L
                languageModel.size?.let { size = it }

                if (
                    languageModel.status == ModelState.DOWNLOADED
                ) {
                    allLanguagesSizeDownloaded += size
                }
            }

            addAllLanguagesDownloaded(
                allLanguagesSizeDownloaded,
                languageItemPreferenceList,
            )

            val iterator = languageModels.iterator()
            while (iterator.hasNext()) {
                val languageModel = iterator.next()
                if (languageModel.language?.code.equals(
                        Locale.ENGLISH.language,
                    )
                ) {
                    languageItemPreferenceList.add(
                        DownloadLanguageItemPreference(
                            languageModel = languageModel,
                            type = DownloadLanguageItemTypePreference.PivotLanguage,
                            enabled = allLanguagesSizeDownloaded == 0L,
                        ),
                    )
                    iterator.remove()
                }

                if (!languageModel.language?.code.equals(Locale.ENGLISH.language)) {
                    languageItemPreferenceList.add(
                        DownloadLanguageItemPreference(
                            languageModel = languageModel,
                            type = DownloadLanguageItemTypePreference.GeneralLanguage,
                            enabled = languageModel.status != ModelState.DELETION_IN_PROGRESS,
                        ),
                    )
                }
            }
        }
        return languageItemPreferenceList
    }

    private fun addAllLanguagesDownloaded(
        allLanguagesSizeDownloaded: Long,
        languageItemPreferenceList: MutableList<DownloadLanguageItemPreference>,
    ) {
        if (allLanguagesSizeDownloaded != 0L) {
            languageItemPreferenceList.add(
                DownloadLanguageItemPreference(
                    languageModel = LanguageModel(
                        status = ModelState.DOWNLOADED,
                        size = allLanguagesSizeDownloaded,
                    ),
                    type = DownloadLanguageItemTypePreference.AllLanguages,
                ),
            )
        }
    }

    private fun shouldShowPrefDownloadLanguageFileDialog(
        downloadLanguageItemPreference: DownloadLanguageItemPreference,
    ) =
        (
            downloadLanguageItemPreference.languageModel.status == ModelState.NOT_DOWNLOADED &&
                isDataSaverEnabledAndWifiDisabled &&
                !requireContext().settings().ignoreTranslationsDataSaverWarning
            )
}
