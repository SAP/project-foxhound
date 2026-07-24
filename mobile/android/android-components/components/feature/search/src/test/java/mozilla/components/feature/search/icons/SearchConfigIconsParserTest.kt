package mozilla.components.feature.search.icons

import mozilla.appservices.remotesettings.Attachment
import mozilla.appservices.remotesettings.RemoteSettingsRecord
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SearchConfigIconsParserTest {

    private lateinit var parser: SearchConfigIconsParser

    @Before
    fun setUp() {
        parser = SearchConfigIconsParser()
    }

    @Test
    fun `Given record with all fields and attachment When parseRecord is called Then valid model is returned`() {
        val fields = JSONObject()
            .put("schema", 1L)
            .put("imageSize", 64)
            .put("engineIdentifiers", JSONArray().put("google").put("bing"))
            .put("filter_expression", "test-filter")

        val attachment = Attachment(
            filename = "icon.png",
            mimetype = "image/png",
            location = "location/path",
            hash = "abc123hash",
            size = 1024u,
        )

        val record = RemoteSettingsRecord(
            id = "test-id",
            lastModified = 123u,
            deleted = false,
            attachment = attachment,
            fields = fields,
        )

        val result = parser.parseRecord(record)

        assertNotNull(result)
        assertEquals(1L, result!!.schema)
        assertEquals(64, result.imageSize)
        assertEquals(listOf("google", "bing"), result.engineIdentifier)
        assertEquals("test-filter", result.filterExpression)

        assertNotNull(result.attachment)
        assertEquals("icon.png", result.attachment!!.filename)
        assertEquals("image/png", result.attachment.mimetype)
        assertEquals("location/path", result.attachment.location)
        assertEquals("abc123hash", result.attachment.hash)
        assertEquals(1024u, result.attachment.size)
    }

    @Test
    fun `Given record with missing optional fields When parseRecord is called Then valid model with null attachment is returned`() {
        val fields = JSONObject()
            .put("schema", 2L)
            .put("imageSize", 32)
            .put("engineIdentifiers", JSONArray().put("duckduckgo"))
            .put("filter_expression", "")

        val record = RemoteSettingsRecord(
            id = "test-id",
            lastModified = 123u,
            deleted = false,
            attachment = null,
            fields = fields,
        )

        val result = parser.parseRecord(record)

        assertNotNull(result)
        assertEquals(2L, result!!.schema)
        assertEquals(32, result.imageSize)
        assertEquals(listOf("duckduckgo"), result.engineIdentifier)
        assertEquals("", result.filterExpression)
        assertNull(result.attachment)
    }

    @Test
    fun `Given record that causes JSONException during field parsing When parseRecord is called Then null is returned`() {
        val fields = JSONObject()
            .put("schema", "NOT_AN_INTEGER")
            .put("imageSize", "NOT_AN_INTEGER")

        val record = RemoteSettingsRecord(
            id = "test-id",
            lastModified = 123u,
            deleted = false,
            attachment = null,
            fields = fields,
        )

        val result = parser.parseRecord(record)

        assertNull(result)
    }
}
