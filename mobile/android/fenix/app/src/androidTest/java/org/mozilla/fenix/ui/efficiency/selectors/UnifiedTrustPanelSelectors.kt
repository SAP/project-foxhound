package org.mozilla.fenix.ui.efficiency.selectors

import androidx.core.text.HtmlCompat
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.helpers.SelectorStrategy

object UnifiedTrustPanelSelectors {

    val CLEAR_COOKIES_AND_SITE_DATA_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.clear_site_data),
        description = "Unified trust panel clear cookies and site button",
        groups = listOf("requiredForPage"),
    )

    val CLEAR_COOKIES_AND_SITE_DATA_DIALOG_TITLE = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.clear_site_data),
        description = "Unified trust panel clear site data dialog title",
        groups = listOf("clearCookiesAndSiteDataDialog"),
    )

    @Suppress("ktlint:standard:function-naming", "FunctionName")
    fun CLEAR_COOKIES_AND_SITE_DATA_DIALOG_DESCRIPTION(webSite: String = "") = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = HtmlCompat.fromHtml(
            getStringResource(R.string.clear_site_data_dialog_description, argument = webSite),
            HtmlCompat.FROM_HTML_MODE_LEGACY,
        ).toString(),
        description = "Unified trust panel clear cookies and site data dialog description",
        groups = listOf("clearCookiesAndSiteDataDialog"),
    )

    val CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CLEAR_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.clear_site_data_dialog_positive_button_text),
        description = "Unified trust panel clear site data dialog clear button",
        groups = listOf("clearCookiesAndSiteDataDialog"),
    )

    val CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CANCEL_BUTTON = Selector(
        strategy = SelectorStrategy.COMPOSE_BY_TEXT,
        value = getStringResource(R.string.clear_site_data_dialog_negative_button_text),
        description = "Unified trust panel clear site data dialog cancel button",
        groups = listOf("clearCookiesAndSiteDataDialog"),
    )

    val all = listOf(
        CLEAR_COOKIES_AND_SITE_DATA_BUTTON,
        CLEAR_COOKIES_AND_SITE_DATA_DIALOG_TITLE,
        CLEAR_COOKIES_AND_SITE_DATA_DIALOG_DESCRIPTION(),
        CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CLEAR_BUTTON,
        CLEAR_COOKIES_AND_SITE_DATA_DIALOG_CANCEL_BUTTON,
    )
}
