/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.search.storage

import android.content.Context
import android.graphics.Bitmap
import mozilla.appservices.remotesettings.RemoteSettingsClient
import mozilla.appservices.remotesettings.RemoteSettingsRecord
import mozilla.appservices.search.RefinedSearchConfig
import mozilla.appservices.search.SearchApiException
import mozilla.appservices.search.SearchEngineSelector
import mozilla.appservices.search.SearchUserEnvironment
import mozilla.components.browser.state.search.RegionState
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.feature.search.SearchApplicationName
import mozilla.components.feature.search.SearchDeviceType
import mozilla.components.feature.search.SearchUpdateChannel
import mozilla.components.feature.search.icons.SearchConfigIconsParser
import mozilla.components.feature.search.icons.SearchConfigIconsUpdateService
import mozilla.components.feature.search.into
import mozilla.components.feature.search.middleware.SearchExtraParams
import mozilla.components.feature.search.middleware.SearchMiddleware.BundleStorage.Bundle
import mozilla.components.feature.search.middleware.SearchMiddleware.SearchEngineRepository
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.remotesettings.RemoteSettingsService
import java.util.Locale
import kotlin.coroutines.CoroutineContext

/**
 * A repository implementation for loading and reading [SearchEngineDefinition]s from RemoteSettings.
 *
 * @param context [Context] used by [SearchEngineReader] to resolve the current locale.
 * @param searchEngineSelectorConfig [SearchEngineSelectorConfig] holds configuration options for
 * [SearchUserEnvironment].
 * @param defaultSearchEngineIcon The [Bitmap] to use as the fallback icon for any search engine
 * when a specific remote icon cannot be found or loaded.
 * @param client Optional [RemoteSettingsClient] for fetching search engine definitions.
 * @param selector The [SearchEngineSelector] which manages and applies search configuration
 */
class SearchEngineSelectorRepository(
    context: Context,
    private val searchEngineSelectorConfig: SearchEngineSelectorConfig,
    private val defaultSearchEngineIcon: Bitmap,
    client: RemoteSettingsClient?,
    private val selector: SearchEngineSelector = SearchEngineSelector(),
) : SearchEngineRepository {

    private val searchConfigIconsUpdateService: SearchConfigIconsUpdateService = SearchConfigIconsUpdateService(client)
    private val reader: SearchEngineReader = SearchEngineReader(context = context, type = SearchEngine.Type.BUNDLED)
    private val logger = Logger("SearchEngineSelectorRepository")
    private val parser = SearchConfigIconsParser()

    init {
        try {
            selector.useRemoteSettingsServer(
                service = searchEngineSelectorConfig.service.remoteSettingsService,
                applyEngineOverrides = false,
            )
        } catch (exception: SearchApiException) {
            logger.error("SearchEngineSelectorRepository failure SearchApiException $exception")
        }
    }

    /**
     * Load the [RefinedSearchConfig] for the given [region] and [locale].
     */
    @SuppressWarnings("TooGenericExceptionCaught")
    override suspend fun load(
        region: RegionState,
        locale: Locale,
        distribution: String?,
        searchExtraParams: SearchExtraParams?,
        coroutineContext: CoroutineContext,
    ): Bundle {
        try {
            val config = SearchUserEnvironment(
                locale = locale.languageTag,
                region = region.home,
                experiment = searchEngineSelectorConfig.experiment,
                version = searchEngineSelectorConfig.appVersion,
                updateChannel = searchEngineSelectorConfig.updateChannel.into(),
                distributionId = distribution ?: "",
                appName = searchEngineSelectorConfig.appName.into(),
                deviceType = searchEngineSelectorConfig.deviceType.into(),
            )
            val searchConfig = selector.filterEngineConfiguration(config)
            val iconsList = searchConfigIconsUpdateService.fetchIconsRecords(searchEngineSelectorConfig.service)
            val searchEngineList = buildSearchEngineList(
                searchConfig = searchConfig,
                iconsList = iconsList,
            )
            val defaultEngineId = searchConfig.appDefaultEngineId
                ?: searchConfig.engines.first().identifier

            return Bundle(
                list = searchEngineList,
                defaultSearchEngineId = defaultEngineId,
            )
        } catch (_: Exception) {
            logger.error("exception in SearchEngineSelectorRepository.load")
        }
        return Bundle(
            list = emptyList(),
            defaultSearchEngineId = "",
        )
    }

    private fun buildSearchEngineList(
        searchConfig: RefinedSearchConfig,
        iconsList: List<RemoteSettingsRecord>,
    ): List<SearchEngine> {
        val searchEngineList = mutableListOf<SearchEngine>()
        searchConfig.engines.forEach { engine ->
            val iconAttachmentModel = findMatchingIcon(engine.identifier, iconsList)
            val searchEngine = try {
                reader.loadStreamAPI(
                    engineDefinition = engine,
                    attachmentModel = searchConfigIconsUpdateService.fetchIconAttachment(iconAttachmentModel),
                    mimetype = iconAttachmentModel?.attachment?.mimetype ?: "",
                    defaultIcon = defaultSearchEngineIcon,
                )
            } catch (_: IllegalArgumentException) {
                return@forEach
            }
            searchEngineList.add(searchEngine)
        }
        return searchEngineList
    }

    private fun findMatchingIcon(
        engineIdentifier: String,
        iconsList: List<RemoteSettingsRecord>,
    ): RemoteSettingsRecord? {
        iconsList.forEach { icon ->
            val parsedIcon = parser.parseRecord(icon)
            parsedIcon?.engineIdentifier?.forEach {
                val prefix = if (it.endsWith("*", true)) {
                    it.removeSuffix("*")
                } else {
                    it
                }
                if (engineIdentifier.startsWith(prefix)) {
                    return icon
                }
            }
        }
        return null
    }
}

/**
 * Data class for passing app information to [SearchUserEnvironment].
 *
 * @param appName The [SearchApplicationName] for the app.
 * @param appVersion A [String] representing the version of the app.
 * @param deviceType [SearchDeviceType] for device running the app.
 * @param experiment A [String] ID for the experiment for the app.
 * @param updateChannel [SearchUpdateChannel] for the build variant of the app.
 */
data class SearchEngineSelectorConfig(
    val appName: SearchApplicationName,
    val appVersion: String,
    val deviceType: SearchDeviceType,
    val experiment: String,
    val updateChannel: SearchUpdateChannel,
    val service: RemoteSettingsService,
)

private val Locale.languageTag: String
    get() = "$language-$country"
