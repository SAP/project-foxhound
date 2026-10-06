package org.mozilla.fenix.ui.efficiency.navigation.pairs

import android.util.Log
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.ui.efficiency.helpers.PageContext
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.planning.PageCatalog
import androidx.compose.ui.test.junit4.v2.AndroidComposeTestRule as AndroidComposeTestRuleV2

object NavigationPairGraphBootstrap {

    private var initialized = false

    fun ensureInitialized() {
        if (initialized) {
            return
        }

        val composeRule = AndroidComposeTestRuleV2(
            HomeActivityIntentTestRule(
                skipOnboarding = true,
                isMenuRedesignCFREnabled = false,
                isPageLoadTranslationsPromptEnabled = false,
            ),
        ) { it.activity }

        val pageContext = PageContext(composeRule)

        PageCatalog.discoverPages().forEach { pageRef ->
            val page = pageRef.getter(pageContext)
            Log.i(
                "NavigationPairGraphBootstrap",
                "Initialized page ${page.pageName} from property ${pageRef.propertyName}",
            )
        }

        NavigationRegistry.logPathSummary()
        initialized = true
    }
}
