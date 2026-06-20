/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.view

import mozilla.components.support.utils.ManufacturerChecker
import org.mozilla.fenix.nimbus.CustomizationToolbarData
import org.mozilla.fenix.nimbus.MarketingData
import org.mozilla.fenix.nimbus.OnboardingCardData
import org.mozilla.fenix.nimbus.OnboardingCardType
import org.mozilla.fenix.nimbus.TermsOfServiceData
import org.mozilla.fenix.nimbus.ToolbarType

/**
 * Returns a list of all the required Nimbus 'cards' that have been converted to [OnboardingPageUiData].
 */
@Suppress("LongParameterList")
internal fun Collection<OnboardingCardData>.toPageUiData(
    showDefaultBrowserPage: Boolean,
    showNotificationPage: Boolean,
    showAddWidgetPage: Boolean,
    showToolbarPage: Boolean,
    jexlConditions: Map<String, String>,
    manufacturerChecker: ManufacturerChecker,
    func: (String) -> Boolean,
): List<OnboardingPageUiData> {
    // we are first filtering the cards based on Nimbus configuration
    return filter { it.shouldDisplayCard(func, jexlConditions) }
        // we are then filtering again based on device capabilities
        .filter { it.isCardEnabled(showDefaultBrowserPage, showNotificationPage, showAddWidgetPage, showToolbarPage) }
        // Don't show the Add Search Widget card on Xiaomi devices because the system prompt doesn't work
        // without permissions on many Xiaomi devices.
        .filterNot { it.cardType == OnboardingCardType.ADD_SEARCH_WIDGET && manufacturerChecker.isXiaomi() }
        .sortedBy { it.ordering }
        .map { it.toPageUiData() }
}

private fun OnboardingCardData.isCardEnabled(
    showDefaultBrowserPage: Boolean,
    showNotificationPage: Boolean,
    showAddWidgetPage: Boolean,
    showToolbarPage: Boolean,
): Boolean = when (cardType) {
    OnboardingCardType.DEFAULT_BROWSER -> enabled && showDefaultBrowserPage
    OnboardingCardType.NOTIFICATION_PERMISSION -> enabled && showNotificationPage
    OnboardingCardType.ADD_SEARCH_WIDGET -> enabled && showAddWidgetPage
    OnboardingCardType.TOOLBAR_PLACEMENT ->
        showToolbarPage && enabled && extraData?.customizationToolbarData?.isNotEmpty() == true
    else -> enabled
}

/**
 *  Determines whether the given [OnboardingCardData] should be displayed.
 *
 *  @param func Function that receives a condition as a [String] and returns its JEXL evaluation as a [Boolean].
 *  @param jexlConditions A <String, String> map containing the Nimbus conditions.
 *
 *  @return True if the card should be displayed, otherwise false.
 */
private fun OnboardingCardData.shouldDisplayCard(
    func: (String) -> Boolean,
    jexlConditions: Map<String, String>,
): Boolean {
    val jexlCache: MutableMap<String, Boolean> = mutableMapOf()

    // Make sure the conditions exist and have a value, and that the number
    // of valid conditions matches the number of conditions on the card's
    // respective prerequisite or disqualifier table. If these mismatch,
    // that means a card contains a condition that's not in the feature
    // conditions lookup table. JEXLs can only be evaluated on
    // supported conditions. Otherwise, consider the card invalid.
    val allPrerequisites = prerequisites.mapNotNull { jexlConditions[it] }
    val allDisqualifiers = disqualifiers.mapNotNull { jexlConditions[it] }

    val validPrerequisites = if (allPrerequisites.size == prerequisites.size) {
        allPrerequisites.all { condition ->
            jexlCache.getOrPut(condition) {
                func(condition)
            }
        }
    } else {
        false
    }

    val hasDisqualifiers =
        if (allDisqualifiers.isNotEmpty() && allDisqualifiers.size == disqualifiers.size) {
            allDisqualifiers.all { condition ->
                jexlCache.getOrPut(condition) {
                    func(condition)
                }
            }
        } else {
            false
        }

    return validPrerequisites && !hasDisqualifiers
}

private fun OnboardingCardData.toPageUiData() = OnboardingPageUiData(
    type = cardType.toPageUiDataType(),
    imageRes = imageRes.resourceId,
    title = title,
    description = body,
    primaryButtonLabel = primaryButtonLabel,
    secondaryButtonLabel = secondaryButtonLabel.ifEmpty { null },
    toolbarOptions = extraData?.customizationToolbarData
        ?.takeIf { it.isNotEmpty() }
        ?.toOnboardingToolbarOptions(),
    termsOfService = extraData?.termOfServiceData?.toOnboardingTermsOfService(),
    marketingData = extraData?.marketingData?.toOnboardingMarketingData(),
)

private fun OnboardingCardType.toPageUiDataType() = when (this) {
    OnboardingCardType.DEFAULT_BROWSER -> OnboardingPageUiData.Type.DEFAULT_BROWSER
    OnboardingCardType.SYNC_SIGN_IN -> OnboardingPageUiData.Type.SYNC_SIGN_IN
    OnboardingCardType.NOTIFICATION_PERMISSION -> OnboardingPageUiData.Type.NOTIFICATION_PERMISSION
    OnboardingCardType.ADD_SEARCH_WIDGET -> OnboardingPageUiData.Type.ADD_SEARCH_WIDGET
    OnboardingCardType.TOOLBAR_PLACEMENT -> OnboardingPageUiData.Type.TOOLBAR_PLACEMENT
    OnboardingCardType.TERMS_OF_SERVICE -> OnboardingPageUiData.Type.TERMS_OF_SERVICE
    OnboardingCardType.MARKETING_DATA -> OnboardingPageUiData.Type.MARKETING_DATA
}

private fun List<CustomizationToolbarData>.toOnboardingToolbarOptions() = map { it.toOnboardingCustomizeToolbar() }

private fun TermsOfServiceData.toOnboardingTermsOfService() = with(this) {
    OnboardingTermsOfService(
        subheaderOneText = subheaderOneText,
        subheaderTwoText = subheaderTwoText,
        subheaderThreeText = subheaderThreeText,
        lineOneText = lineOneText,
        lineOneLinkText = lineOneLinkText,
        lineOneLinkUrl = lineOneLinkUrl,
        lineTwoText = lineTwoText,
        lineTwoLinkText = lineTwoLinkText,
        lineTwoLinkUrl = lineTwoLinkUrl,
        lineThreeText = lineThreeText,
        lineThreeLinkText = lineThreeLinkText,
    )
}

private fun MarketingData.toOnboardingMarketingData() = OnboardingMarketingData(
    marketingCardVariant = marketingCardVariant,
    bodyOneText = bodyLineOneText,
    bodyOneLinkText = bodyLineOneLinkText,
    bodyTwoText = bodyLineTwoText,
)

private fun CustomizationToolbarData.toOnboardingCustomizeToolbar() = with(this) {
    ToolbarOption(
        toolbarType = toolbarType.toToolbarOptionType(),
        imageRes = imageRes.resourceId,
        label = label,
    )
}

private fun ToolbarType.toToolbarOptionType() = when (this) {
    ToolbarType.TOOLBAR_TOP -> ToolbarOptionType.TOOLBAR_TOP
    ToolbarType.TOOLBAR_BOTTOM -> ToolbarOptionType.TOOLBAR_BOTTOM
}

/**
 * Mapper to convert [OnboardingPageUiData] to [OnboardingPageState] that is a param for
 * [OnboardingPage] composable.
 */
@Suppress("LongParameterList")
internal fun mapToOnboardingPageState(
    onboardingPageUiData: OnboardingPageUiData,
    shouldShowElevation: Boolean,
    isSmallDevice: Boolean = false,
    onMakeFirefoxDefaultClick: () -> Unit,
    onMakeFirefoxDefaultSkipClick: () -> Unit,
    onSignInButtonClick: () -> Unit,
    onSignInSkipClick: () -> Unit,
    onNotificationPermissionButtonClick: () -> Unit = {},
    onNotificationPermissionSkipClick: () -> Unit = {},
    onAddFirefoxWidgetClick: () -> Unit,
    onAddFirefoxWidgetSkipClick: () -> Unit,
    onCustomizeToolbarButtonClick: () -> Unit,
    onTermsOfServiceButtonClick: () -> Unit,
    onMarketingDataContinueClick: () -> Unit = {},
): OnboardingPageState = when (onboardingPageUiData.type) {
    OnboardingPageUiData.Type.DEFAULT_BROWSER -> createOnboardingPageState(
        onboardingPageUiData = onboardingPageUiData,
        onPositiveButtonClick = onMakeFirefoxDefaultClick,
        onNegativeButtonClick = onMakeFirefoxDefaultSkipClick,
        shouldShowElevation = shouldShowElevation,
        isSmallDevice = isSmallDevice,
    )

    OnboardingPageUiData.Type.ADD_SEARCH_WIDGET -> createOnboardingPageState(
        onboardingPageUiData = onboardingPageUiData,
        onPositiveButtonClick = onAddFirefoxWidgetClick,
        onNegativeButtonClick = onAddFirefoxWidgetSkipClick,
        shouldShowElevation = shouldShowElevation,
        isSmallDevice = isSmallDevice,
    )

    OnboardingPageUiData.Type.SYNC_SIGN_IN -> createOnboardingPageState(
        onboardingPageUiData = onboardingPageUiData,
        onPositiveButtonClick = onSignInButtonClick,
        onNegativeButtonClick = onSignInSkipClick,
        shouldShowElevation = shouldShowElevation,
        isSmallDevice = isSmallDevice,
    )

    OnboardingPageUiData.Type.NOTIFICATION_PERMISSION -> createOnboardingPageState(
        onboardingPageUiData = onboardingPageUiData,
        onPositiveButtonClick = onNotificationPermissionButtonClick,
        onNegativeButtonClick = onNotificationPermissionSkipClick,
        shouldShowElevation = shouldShowElevation,
        isSmallDevice = isSmallDevice,
    )

    OnboardingPageUiData.Type.TOOLBAR_PLACEMENT -> createOnboardingPageState(
        onboardingPageUiData = onboardingPageUiData,
        onPositiveButtonClick = onCustomizeToolbarButtonClick,
        onNegativeButtonClick = {}, // No negative button option for toolbar placement.
        shouldShowElevation = shouldShowElevation,
        isSmallDevice = isSmallDevice,
    )

    OnboardingPageUiData.Type.TERMS_OF_SERVICE -> createOnboardingPageState(
        onboardingPageUiData = onboardingPageUiData,
        onPositiveButtonClick = onTermsOfServiceButtonClick,
        onNegativeButtonClick = {}, // No negative button option for terms of service.
        shouldShowElevation = shouldShowElevation,
        isSmallDevice = isSmallDevice,
    )

    OnboardingPageUiData.Type.MARKETING_DATA -> createOnboardingPageState(
        onboardingPageUiData = onboardingPageUiData,
        onPositiveButtonClick = onMarketingDataContinueClick,
        onNegativeButtonClick = {}, // No negative button option for marketing data.
        shouldShowElevation = shouldShowElevation,
        isSmallDevice = isSmallDevice,
    )
}

private fun createOnboardingPageState(
    onboardingPageUiData: OnboardingPageUiData,
    shouldShowElevation: Boolean,
    isSmallDevice: Boolean,
    onPositiveButtonClick: () -> Unit,
    onNegativeButtonClick: () -> Unit,
): OnboardingPageState = OnboardingPageState(
    imageRes = onboardingPageUiData.imageRes,
    title = onboardingPageUiData.title,
    description = onboardingPageUiData.description,
    primaryButton = Action(onboardingPageUiData.primaryButtonLabel, onPositiveButtonClick),
    secondaryButton = onboardingPageUiData.secondaryButtonLabel?.let {
        Action(it, onNegativeButtonClick)
    },
    toolbarOptions = onboardingPageUiData.toolbarOptions,
    termsOfService = onboardingPageUiData.termsOfService,
    marketingData = onboardingPageUiData.marketingData,
    shouldShowElevation = shouldShowElevation,
    isSmallDevice = isSmallDevice,
)
