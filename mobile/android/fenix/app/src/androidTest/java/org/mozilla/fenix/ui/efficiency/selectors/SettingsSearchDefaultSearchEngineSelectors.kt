package org.mozilla.fenix.ui.efficiency.selectors

import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object SettingsSearchDefaultSearchEngineSelectors {

    val DEFAULT_SEARCH_ENGINE_TITLE = Selector(
        strategy = SelectorStrategy.ESPRESSO_BY_TEXT,
        value = "Default search engine",
        description = "Default search engine title",
        groups = listOf("requiredForPage"),
    )

    @Suppress("ktlint:standard:function-naming")
    fun DEFAULT_SEARCH_ENGINE_OPTION(engineName: String = "") = Selector(
        strategy = SelectorStrategy.UIAUTOMATOR_WITH_RES_ID_AND_TEXT,
        value = "engine_text",
        secondaryValue = engineName,
        description = "Default search engine option: $engineName",
        groups = listOf("defaultSearchEngines"),
    )

    val all = listOf(
        DEFAULT_SEARCH_ENGINE_TITLE,
        DEFAULT_SEARCH_ENGINE_OPTION(),
    )
}
