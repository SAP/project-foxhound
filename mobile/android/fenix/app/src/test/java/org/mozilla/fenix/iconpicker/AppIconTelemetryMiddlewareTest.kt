package org.mozilla.fenix.iconpicker

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.AppIconSelection
import org.mozilla.fenix.helpers.FenixGleanTestRule

@RunWith(AndroidJUnit4::class)
class AppIconTelemetryMiddlewareTest {

    @get:Rule
    val gleanRule = FenixGleanTestRule(testContext)

    @Test
    fun `GIVEN user action Confirmed WHEN telemetry middleware gets invoked THEN record selection confirmed event`() {
        val currentIcon = AppIcon.AppDefault
        val newIcon = AppIcon.AppRetro2004
        val store = buildStore(currentIcon, newIcon)

        assertNull(AppIconSelection.appIconSelectionConfirmed.testGetValue())

        store.dispatch(UserAction.Confirmed(newIcon = newIcon, oldIcon = currentIcon))

        assertNotNull(AppIconSelection.appIconSelectionConfirmed.testGetValue())
        assertEventExtraData(
            oldIcon = currentIcon,
            newIcon = newIcon,
            eventExtraData = AppIconSelection.appIconSelectionConfirmed.testGetValue()!!.last().extra!!,
        )
    }

    @Test
    fun `GIVEN system action SnackbarShown WHEN telemetry middleware gets invoked THEN record selection confirmed event`() {
        val currentIcon = AppIcon.AppDefault
        val newIcon = AppIcon.AppRetro2004
        val store = buildStore(currentIcon, newIcon)

        assertNull(AppIconSelection.errorSnackbarShown.testGetValue())

        store.dispatch(SystemAction.SnackbarShown(newIcon = newIcon, oldIcon = currentIcon))

        assertNotNull(AppIconSelection.errorSnackbarShown.testGetValue())
        assertEventExtraData(
            oldIcon = currentIcon,
            newIcon = newIcon,
            eventExtraData = AppIconSelection.errorSnackbarShown.testGetValue()!!.last().extra!!,
        )
    }

    private fun assertEventExtraData(
        oldIcon: AppIcon,
        newIcon: AppIcon,
        eventExtraData: Map<String, String>,
    ) {
        assertEquals(oldIcon.aliasSuffix, eventExtraData["old_icon"])
        assertEquals(newIcon.aliasSuffix, eventExtraData["new_icon"])
    }

    private fun buildStore(
        currentAppIcon: AppIcon = AppIcon.AppDefault,
        userSelectedAppIcon: AppIcon? = AppIcon.AppRetro2004,
    ) = AppIconStore(
        initialState = AppIconState(
            currentAppIcon = currentAppIcon,
            userSelectedAppIcon = userSelectedAppIcon,
            groupedIconOptions = mapOf(),
        ),
        middleware = listOf(AppIconTelemetryMiddleware()),
    )
}
