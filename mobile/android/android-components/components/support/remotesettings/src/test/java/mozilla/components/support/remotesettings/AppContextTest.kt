package mozilla.components.support.remotesettings

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
class AppContextTest {
    @Test
    fun `GIVEN a context THEN generateAppContext() produces correct locale strings`() {
        val codesToCheck = listOf(
            "en-US",
            "pt-BR",
            "en-US-boont", // https://en.wikipedia.org/wiki/Boontling
        )
        for (code in codesToCheck) {
            val locale = Locale.forLanguageTag(code)
            assertEquals(code, generateAppContext(testContext, "release", true, locale).locale)
        }
    }
}
