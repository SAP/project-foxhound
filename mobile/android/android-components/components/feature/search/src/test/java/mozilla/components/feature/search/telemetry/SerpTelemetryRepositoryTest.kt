/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.search.telemetry

import kotlinx.coroutines.runBlocking
import mozilla.appservices.remotesettings.RemoteSettingsClient
import mozilla.appservices.remotesettings.RemoteSettingsRecord
import mozilla.appservices.remotesettings.RemoteSettingsService
import mozilla.components.support.test.mock
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner
import kotlin.test.assertIs
import mozilla.components.support.remotesettings.RemoteSettingsService as MozillaRemoteSettingsService

@RunWith(RobolectricTestRunner::class)
class SerpTelemetryRepositoryTest {

    private val rawJson = """
        {
  "data": [
    {
      "schema": 1,
      "taggedCodes": [],
      "telemetryId": "0",
      "organicCodes": [],
      "codeParamName": "bar",
      "queryParamNames": [],
      "searchPageRegexp": "^https://(?:m|www)\\.foo\\.baz",
      "followOnParamNames": [],
      "extraAdServersRegexps": [],
      "last_modified": 40
    }],
  "timestamp": 40
}
    """.trimIndent()

    private lateinit var mockMozillaService: MozillaRemoteSettingsService
    private lateinit var mockRemoteSettingsService: RemoteSettingsService
    private lateinit var mockRemoteSettingsClient: RemoteSettingsClient
    private lateinit var serpTelemetryRepository: SerpTelemetryRepository
    private val mockReadJson: () -> JSONObject = mock()

    @Before
    fun setup() {
        mockMozillaService = mock()
        mockRemoteSettingsService = mock()
        mockRemoteSettingsClient = mock()

        `when`(mockMozillaService.remoteSettingsService).thenReturn(mockRemoteSettingsService)
        `when`(mockRemoteSettingsService.makeClient("test")).thenReturn(mockRemoteSettingsClient)
        doAnswer {
            JSONObject(rawJson)
        }.`when`(mockReadJson)()

        serpTelemetryRepository = SerpTelemetryRepository(
            readJson = mockReadJson,
            collectionName = "test",
            remoteSettingsService = mockMozillaService,
        )
    }

    @Test
    fun `GIVEN empty response WHEN getRecords is called THEN the preinstalled data is used`() =
        runBlocking {
            `when`(mockRemoteSettingsClient.getRecords())
                .thenReturn(emptyList<RemoteSettingsRecord>())
            `when`(mockRemoteSettingsClient.getLastModifiedTimestamp())
                .thenReturn(null)

            val result = serpTelemetryRepository.updateProviderList()

            assertEquals(1, result.size)
            assertEquals("0", result[0].telemetryId)
        }

    @Test
    fun `GIVEN older response than cache WHEN getRecords is called THEN the preinstalled data is used`() =
        runBlocking {
            `when`(mockRemoteSettingsClient.getRecords())
                .thenReturn(
                    listOf(
                        RemoteSettingsRecord("1", 40u, false, null, JSONObject()),
                        RemoteSettingsRecord("2", 41u, true, null, JSONObject()),
                    ),
                )
            `when`(mockRemoteSettingsClient.getLastModifiedTimestamp())
                .thenReturn(39u)

            val result = serpTelemetryRepository.updateProviderList()

            assertEquals(1, result.size)
            assertEquals("0", result[0].telemetryId)
        }

    @Test
    fun `GIVEN newer response WHEN getRecords is called THEN the updated data is used`() =
        runBlocking {
            `when`(mockRemoteSettingsClient.getRecords())
                .thenReturn(
                    listOf(
                        RemoteSettingsRecord(
                            "1",
                            40u,
                            false,
                            null,
                            JSONObject(
                                """{
      "schema": 2,
      "taggedCodes": [],
      "telemetryId": "1",
      "organicCodes": [],
      "codeParamName": "bar",
      "queryParamNames": [],
      "searchPageRegexp": "^https://(?:m|www)\\.foo\\.baz",
      "followOnParamNames": [],
      "extraAdServersRegexps": [],
      "last_modified": 40
    }""",
                            ),
                        ),
                        RemoteSettingsRecord(
                            "2",
                            41u,
                            true,
                            null,
                            JSONObject(
                                """{
      "schema": 1,
      "taggedCodes": [],
      "telemetryId": "2",
      "organicCodes": [],
      "codeParamName": "bar",
      "queryParamNames": [],
      "searchPageRegexp": "^https://(?:m|www)\\.foo\\.baz",
      "followOnParamNames": [],
      "extraAdServersRegexps": [],
      "last_modified": 40
    }""",
                            ),
                        ),
                    ),
                )
            `when`(mockRemoteSettingsClient.getLastModifiedTimestamp())
                .thenReturn(41u)

            val result = serpTelemetryRepository.updateProviderList()

            assertEquals(2, result.size)
            assertEquals("1", result[0].telemetryId)
        }
}
