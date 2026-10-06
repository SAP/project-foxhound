package org.mozilla.fenix.emailmasks

import androidx.test.core.app.ApplicationProvider
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.settings.emailmasks.middleware.DefaultEmailMasksRepository
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DefaultEmailMasksRepositoryTest {
    private lateinit var settings: Settings
    private lateinit var repository: DefaultEmailMasksRepository

    @Before
    fun setup() {
        settings = Settings(testContext)
        repository = DefaultEmailMasksRepository(settings)
    }

    @Test
    fun `GIVEN suggestion is enabled in settings WHEN isSuggestionEnabled is called THEN return true`() {
        settings.isEmailMaskSuggestionEnabled = true

        val result = repository.isSuggestionEnabled()

        assertTrue(result)
    }

    @Test
    fun `GIVEN suggestion is disabled in settings WHEN isSuggestionEnabled is called THEN return false`() {
        settings.isEmailMaskSuggestionEnabled = false

        val result = repository.isSuggestionEnabled()

        assertFalse(result)
    }

    @Test
    fun `WHEN setSuggestionEnabled is called THEN update settings`() {
        repository.setSuggestionEnabled(true)
        assertTrue(settings.isEmailMaskSuggestionEnabled)

        repository.setSuggestionEnabled(false)
        assertFalse(settings.isEmailMaskSuggestionEnabled)
    }

    @Test
    fun `WHEN dismissCfr is called THEN update settings`() {
        settings.shouldShowEmailMaskCfr = true

        repository.dismissCfr()

        assertFalse(settings.shouldShowEmailMaskCfr)
        assertTrue(settings.isEmailMaskSuggestionEnabled)
    }
}
