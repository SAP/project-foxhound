/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.search.telemetry

import androidx.annotation.VisibleForTesting
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.ktx.android.org.json.asSequence
import mozilla.components.support.ktx.android.org.json.toList
import mozilla.components.support.remotesettings.RemoteSettingsService
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * Parse SERP Telemetry json from remote config.
 */
class SerpTelemetryRepository(
    private val readJson: () -> JSONObject,
    collectionName: String,
    remoteSettingsService: RemoteSettingsService,
) {
    val logger = Logger("SerpTelemetryRepository")
    private var providerList: List<SearchProviderModel> = emptyList()

    @VisibleForTesting
    internal var remoteSettingsClient =
        remoteSettingsService.remoteSettingsService.makeClient(collectionName)

    /**
     * Provides list of search providers from remote server, cache or dump.
     */
    suspend fun updateProviderList(): List<SearchProviderModel> {
        val cacheLastModified = remoteSettingsClient.getLastModifiedTimestamp()
        val cachedRecords = remoteSettingsClient.getRecords()
        val localResponse = readJson()
        if (cachedRecords.isNullOrEmpty() || cacheLastModified == null ||
            cacheLastModified <= localResponse.getString("timestamp").toULong()
        ) {
            providerList = parseLocalPreinstalledData(localResponse)
        } else if (cacheLastModified > localResponse.getString("timestamp").toULong()) {
            providerList = cachedRecords.mapNotNull {
                it.fields.toSearchProviderModel()
            }
        }
        return providerList
    }

    /**
     * Parses local json response.
     */
    @VisibleForTesting
    internal fun parseLocalPreinstalledData(jsonObject: JSONObject): List<SearchProviderModel> {
        return jsonObject.getJSONArray("data")
            .asSequence()
            .mapNotNull {
                (it as JSONObject).toSearchProviderModel()
            }
            .toList()
    }
}

@VisibleForTesting
internal fun JSONObject.toSearchProviderModel(): SearchProviderModel? =
    try {
        SearchProviderModel(
            schema = getLong("schema"),
            taggedCodes = getJSONArray("taggedCodes").toList(),
            telemetryId = optString("telemetryId"),
            organicCodes = getJSONArray("organicCodes").toList(),
            codeParamName = optString("codeParamName"),
            followOnCookies = optJSONArray("followOnCookies")?.toListOfCookies(),
            queryParamNames = optJSONArray("queryParamNames").toList(),
            searchPageRegexp = optString("searchPageRegexp"),
            adServerAttributes = optJSONArray("adServerAttributes").toList(),
            followOnParamNames = optJSONArray("followOnParamNames")?.toList(),
            extraAdServersRegexps = getJSONArray("extraAdServersRegexps").toList(),
            expectedOrganicCodes = optJSONArray("expectedOrganicCodes")?.toList(),
        )
    } catch (e: JSONException) {
        Logger("SerpTelemetryRepository").error(
            "JSONException while trying to parse remote config",
            e,
        )
        null
    }

private fun JSONArray.toListOfCookies(): List<SearchProviderCookie> =
    toList<JSONObject>().mapNotNull { jsonObject -> jsonObject.toSearchProviderCookie() }

private fun JSONObject.toSearchProviderCookie(): SearchProviderCookie? =
    try {
        SearchProviderCookie(
            extraCodeParamName = optString("extraCodeParamName"),
            extraCodePrefixes = getJSONArray("extraCodePrefixes").toList(),
            host = optString("host"),
            name = optString("name"),
            codeParamName = optString("codeParamName"),
        )
    } catch (e: JSONException) {
        Logger("SerpTelemetryRepository").error(
            "JSONException while trying to parse remote config",
            e,
        )
        null
    }
