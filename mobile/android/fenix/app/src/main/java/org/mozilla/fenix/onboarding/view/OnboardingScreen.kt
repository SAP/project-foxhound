/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.view

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import mozilla.components.lib.state.ext.observeAsComposableState
import org.mozilla.fenix.R
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.setup.checklist.ChecklistItem
import org.mozilla.fenix.components.components
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.compose.PagerIndicator
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.onboarding.WidgetPinnedReceiver.WidgetPinnedState
import org.mozilla.fenix.onboarding.store.OnboardingAction.OnboardingThemeAction
import org.mozilla.fenix.onboarding.store.OnboardingAction.OnboardingToolbarAction
import org.mozilla.fenix.onboarding.store.OnboardingStore
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * A screen for displaying onboarding.
 *
 * @param pagesToDisplay List of pages to be displayed in onboarding pager ui.
 * @param onMakeFirefoxDefaultClick Invoked when positive button on default browser page is clicked.
 * @param onSkipDefaultClick Invoked when negative button on default browser page is clicked.
 * @param onSignInButtonClick Invoked when the positive button on the sign in page is clicked.
 * @param onSkipSignInClick Invoked when the negative button on the sign in page is clicked.
 * @param onNotificationPermissionButtonClick Invoked when positive button on notification page is
 * clicked.
 * @param onSkipNotificationClick Invoked when negative button on notification page is clicked.
 * @param onAddFirefoxWidgetClick Invoked when positive button on add search widget page is clicked.
 * @param onSkipFirefoxWidgetClick Invoked when negative button on add search widget page is clicked.
 * @param onboardingStore The store which contains all the state related to the add-ons onboarding screen.
 * @param termsOfServiceEventHandler Invoked when the primary button on the terms of service page is clicked.
 * @param onCustomizeToolbarClick Invoked when positive button customize toolbar page is clicked.
 * @param onCustomizeThemeClick Invoked when the primary button on the theme selection page is clicked.
 * @param onMarketingDataLearnMoreClick callback for when the user clicks the learn more text link
 * @param onMarketingOptInToggle callback for when the user toggles the opt-in checkbox
 * @param onMarketingDataContinueClick callback for when the user clicks the continue button on the
 * marketing data opt out screen.
 * @param onFinish Invoked when the onboarding is completed.
 * @param onImpression Invoked when a page in the pager is displayed.
 * @param currentIndex callback for when the current horizontal pager page changes
 * @param onNavigateToNextPage callback for when the user navigates to the next page in onboarding.
 */
@Composable
@Suppress("LongParameterList", "LongMethod")
fun OnboardingScreen(
    pagesToDisplay: MutableList<OnboardingPageUiData>,
    onMakeFirefoxDefaultClick: () -> Unit,
    onSkipDefaultClick: () -> Unit,
    onSignInButtonClick: () -> Unit,
    onSkipSignInClick: () -> Unit,
    onNotificationPermissionButtonClick: () -> Unit,
    onSkipNotificationClick: () -> Unit,
    onAddFirefoxWidgetClick: () -> Unit,
    onSkipFirefoxWidgetClick: () -> Unit,
    onboardingStore: OnboardingStore? = null,
    termsOfServiceEventHandler: OnboardingTermsOfServiceEventHandler,
    onCustomizeToolbarClick: () -> Unit,
    onCustomizeThemeClick: () -> Unit,
    onMarketingDataLearnMoreClick: () -> Unit,
    onMarketingOptInToggle: (optIn: Boolean) -> Unit,
    onMarketingDataContinueClick: (allowMarketingDataCollection: Boolean) -> Unit,
    onFinish: (pageType: OnboardingPageUiData) -> Unit,
    onImpression: (pageType: OnboardingPageUiData) -> Unit,
    currentIndex: (index: Int) -> Unit,
    onNavigateToNextPage: () -> Unit,
) {
    val coroutineScope = rememberCoroutineScope()
    val pagerState = rememberPagerState(pageCount = { pagesToDisplay.size })
    val isSignedIn: State<Boolean?> = components.backgroundServices.syncStore
        .observeAsComposableState { it.account != null }
    val widgetPinnedFlow: StateFlow<Boolean> = WidgetPinnedState.isPinned
    val isWidgetPinnedState by widgetPinnedFlow.collectAsState()
    var lastSettledPage by remember { mutableIntStateOf(pagerState.settledPage) }

    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.currentPage }
            .distinctUntilChanged()
            .collect { page ->
                if (page > lastSettledPage) {
                    onNavigateToNextPage()
                }
                currentIndex(page)
                lastSettledPage = page
            }
    }

    BackHandler(enabled = pagerState.currentPage > 0) {
        coroutineScope.launch {
            pagerState.animateScrollToPage(pagerState.currentPage - 1)
        }
    }

    val scrollToNextPageOrDismiss: () -> Unit = {
        if (pagerState.currentPage >= pagesToDisplay.lastIndex) {
            onFinish(pagesToDisplay[pagesToDisplay.lastIndex])
        } else {
            coroutineScope.launch {
                pagerState.animateScrollToPage(pagerState.currentPage + 1)
            }
        }
    }

    val hasScrolledToNextPage = remember { mutableStateOf(false) }

    LaunchedEffect(isSignedIn.value, isWidgetPinnedState) {
        val scrollToNextCardFromSignIn = isSignedIn.value?.let {
            scrollToNextCardFromSignIn(
                pagesToDisplay,
                pagerState.currentPage,
                it,
            )
        } ?: false

        val scrollToNextCardFromAddWidget = scrollToNextCardFromAddWidget(
            pagesToDisplay,
            pagerState.currentPage,
            isWidgetPinnedState,
        )

        val scrollToNextCard = scrollToNextCardFromSignIn || scrollToNextCardFromAddWidget

        if (scrollToNextCard && !hasScrolledToNextPage.value) {
            scrollToNextPageOrDismiss()
            hasScrolledToNextPage.value = true
        }
    }

    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.currentPage }.collect { page ->
            onImpression(pagesToDisplay[page])
        }
    }

    OnboardingContent(
        pagesToDisplay = pagesToDisplay,
        pagerState = pagerState,
        onMakeFirefoxDefaultClick = {
            onMakeFirefoxDefaultClick()
            scrollToNextPageOrDismiss()
        },
        onMakeFirefoxDefaultSkipClick = {
            onSkipDefaultClick()
            scrollToNextPageOrDismiss()
        },
        onSignInButtonClick = {
            onSignInButtonClick()
            scrollToNextPageOrDismiss()
        },
        onSignInSkipClick = {
            onSkipSignInClick()
            scrollToNextPageOrDismiss()
        },
        onNotificationPermissionButtonClick = {
            onNotificationPermissionButtonClick()
            scrollToNextPageOrDismiss()
        },
        onNotificationPermissionSkipClick = {
            onSkipNotificationClick()
            scrollToNextPageOrDismiss()
        },
        onAddFirefoxWidgetClick = {
            if (isWidgetPinnedState) {
                scrollToNextPageOrDismiss()
            } else {
                onAddFirefoxWidgetClick()
            }
        },
        onSkipFirefoxWidgetClick = {
            onSkipFirefoxWidgetClick()
            scrollToNextPageOrDismiss()
        },
        onCustomizeToolbarButtonClick = {
            onCustomizeToolbarClick()
            scrollToNextPageOrDismiss()
        },
        onCustomizeThemeButtonClick = {
            onCustomizeThemeClick()
            scrollToNextPageOrDismiss()
        },
        termsOfServiceEventHandler = termsOfServiceEventHandler,
        onAgreeAndConfirmTermsOfService = {
            termsOfServiceEventHandler.onAcceptTermsButtonClicked()
            scrollToNextPageOrDismiss()
        },
        onMarketingDataLearnMoreClick = onMarketingDataLearnMoreClick,
        onMarketingOptInToggle = onMarketingOptInToggle,
        onMarketingDataContinueClick = { allowMarketingDataCollection ->
            onMarketingDataContinueClick(allowMarketingDataCollection)
            scrollToNextPageOrDismiss()
        },
        onboardingStore = onboardingStore,
    )
}

private fun scrollToNextCardFromAddWidget(
    pagesToDisplay: List<OnboardingPageUiData>,
    currentPageIndex: Int,
    isWidgetPinnedState: Boolean,
): Boolean {
    val indexOfWidgetPage =
        pagesToDisplay.indexOfFirst { it.type == OnboardingPageUiData.Type.ADD_SEARCH_WIDGET }
    val currentPageIsWidgetPage = currentPageIndex == indexOfWidgetPage
    return isWidgetPinnedState && currentPageIsWidgetPage
}

private fun scrollToNextCardFromSignIn(
    pagesToDisplay: List<OnboardingPageUiData>,
    currentPageIndex: Int,
    isSignedIn: Boolean,
): Boolean {
    val indexOfSignInPage =
        pagesToDisplay.indexOfFirst { it.type == OnboardingPageUiData.Type.SYNC_SIGN_IN }
    val currentPageIsSignInPage = currentPageIndex == indexOfSignInPage
    return isSignedIn && currentPageIsSignInPage
}

@Composable
@Suppress("LongParameterList")
private fun OnboardingContent(
    pagesToDisplay: List<OnboardingPageUiData>,
    pagerState: PagerState,
    onMakeFirefoxDefaultClick: () -> Unit,
    onMakeFirefoxDefaultSkipClick: () -> Unit,
    onSignInButtonClick: () -> Unit,
    onSignInSkipClick: () -> Unit,
    onNotificationPermissionButtonClick: () -> Unit,
    onNotificationPermissionSkipClick: () -> Unit,
    onAddFirefoxWidgetClick: () -> Unit,
    onSkipFirefoxWidgetClick: () -> Unit,
    onboardingStore: OnboardingStore? = null,
    onCustomizeToolbarButtonClick: () -> Unit,
    onCustomizeThemeButtonClick: () -> Unit,
    termsOfServiceEventHandler: OnboardingTermsOfServiceEventHandler,
    onAgreeAndConfirmTermsOfService: () -> Unit,
    onMarketingOptInToggle: (optIn: Boolean) -> Unit,
    onMarketingDataLearnMoreClick: () -> Unit,
    onMarketingDataContinueClick: (allowMarketingDataCollection: Boolean) -> Unit,
) {
    val nestedScrollConnection = remember { DisableForwardSwipeNestedScrollConnection(pagerState) }

    Surface {
        Column(
            modifier = Modifier
                .statusBarsPadding(),
        ) {
            HorizontalPager(
                state = pagerState,
                key = { pagesToDisplay[it].type },
                modifier = Modifier
                    .weight(1f)
                    .nestedScroll(nestedScrollConnection),
            ) { pageIndex ->
                // protect against a rare case where the user goes to the marketing screen at the same
                // moment it gets removed by [MarketingPageRemovalSupport]
                val pageUiState = pagesToDisplay.getOrElse(pageIndex) { pagesToDisplay[it.dec()] }
                val onboardingPageState = mapToOnboardingPageState(
                    onboardingPageUiData = pageUiState,
                    onMakeFirefoxDefaultClick = onMakeFirefoxDefaultClick,
                    onMakeFirefoxDefaultSkipClick = onMakeFirefoxDefaultSkipClick,
                    onSignInButtonClick = onSignInButtonClick,
                    onSignInSkipClick = onSignInSkipClick,
                    onNotificationPermissionButtonClick = onNotificationPermissionButtonClick,
                    onNotificationPermissionSkipClick = onNotificationPermissionSkipClick,
                    onAddFirefoxWidgetClick = onAddFirefoxWidgetClick,
                    onAddFirefoxWidgetSkipClick = onSkipFirefoxWidgetClick,
                    onCustomizeToolbarButtonClick = onCustomizeToolbarButtonClick,
                    onCustomizeThemeClick = onCustomizeThemeButtonClick,
                    onTermsOfServiceButtonClick = onAgreeAndConfirmTermsOfService,
                    shouldShowElevation = false,
                )
                OnboardingPageForType(
                    type = pageUiState.type,
                    state = onboardingPageState,
                    onboardingStore = onboardingStore,
                    termsOfServiceEventHandler = termsOfServiceEventHandler,
                    onMarketingDataLearnMoreClick = onMarketingDataLearnMoreClick,
                    onMarketingOptInToggle = onMarketingOptInToggle,
                    onMarketingDataContinueClick = onMarketingDataContinueClick,
                )
            }

            PagerIndicator(
                pagerState = pagerState,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .padding(bottom = 16.dp),
                inactiveColor = MaterialTheme.colorScheme.outlineVariant,
                leaveTrail = true,
            )
        }
    }
}

@Composable
private fun OnboardingPageForType(
    type: OnboardingPageUiData.Type,
    state: OnboardingPageState,
    onboardingStore: OnboardingStore? = null,
    termsOfServiceEventHandler: OnboardingTermsOfServiceEventHandler,
    onMarketingDataLearnMoreClick: () -> Unit,
    onMarketingOptInToggle: (optIn: Boolean) -> Unit,
    onMarketingDataContinueClick: (allowMarketingDataCollection: Boolean) -> Unit,
) {
    when (type) {
        OnboardingPageUiData.Type.DEFAULT_BROWSER,
        OnboardingPageUiData.Type.SYNC_SIGN_IN,
        OnboardingPageUiData.Type.ADD_SEARCH_WIDGET,
        OnboardingPageUiData.Type.NOTIFICATION_PERMISSION,
        -> OnboardingPage(state)

        OnboardingPageUiData.Type.TOOLBAR_PLACEMENT -> {
            val context = LocalContext.current
            onboardingStore?.let { store ->
                ToolbarOnboardingPage(
                    onboardingStore = store,
                    pageState = state,
                    onToolbarSelectionClicked = {
                        store.dispatch(OnboardingToolbarAction.UpdateSelected(it))
                        context.components.appStore.dispatch(
                            AppAction.SetupChecklistAction.TaskPreferenceUpdated(
                                ChecklistItem.Task.Type.CHANGE_TOOLBAR_PLACEMENT,
                                true,
                            ),
                        )
                    },
                )
            }
        }

        OnboardingPageUiData.Type.THEME_SELECTION -> {
            val context = LocalContext.current
            onboardingStore?.let { store ->
                ThemeOnboardingPage(
                    onboardingStore = store,
                    pageState = state,
                    onThemeSelectionClicked = {
                        store.dispatch(OnboardingThemeAction.UpdateSelected(it))
                        context.components.appStore.dispatch(
                            AppAction.SetupChecklistAction.TaskPreferenceUpdated(
                                ChecklistItem.Task.Type.SELECT_THEME,
                                true,
                            ),
                        )
                    },
                )
            }
        }

        OnboardingPageUiData.Type.MARKETING_DATA -> MarketingDataOnboardingPage(
            state = state,
            onMarketingDataLearnMoreClick = onMarketingDataLearnMoreClick,
            onMarketingOptInToggle = onMarketingOptInToggle,
            onMarketingDataContinueClick = onMarketingDataContinueClick,
        )

        OnboardingPageUiData.Type.TERMS_OF_SERVICE -> TermsOfServiceOnboardingPage(
            state,
            termsOfServiceEventHandler,
        )
    }
}

private class DisableForwardSwipeNestedScrollConnection(
    private val pagerState: PagerState,
) : NestedScrollConnection {

    override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset =
        if (available.x > 0) {
            // Allow going back on swipe
            Offset.Zero
        } else {
            // For forward swipe, only allow if the visible item offset is less than 0,
            // this would be a result of a slow back fling, and we should allow snapper to
            // snap to the appropriate item.
            // Else consume the whole offset and disable going forward.
            if (pagerState.currentPageOffsetFraction < 0) {
                Offset.Zero
            } else {
                Offset(available.x, 0f)
            }
        }
}

@PreviewLightDark
@Composable
private fun OnboardingScreenPreview() {
    val pageCount = defaultPreviewPages().size
    FirefoxTheme {
        OnboardingContent(
            pagesToDisplay = defaultPreviewPages(),
            pagerState = rememberPagerState(initialPage = 0) {
                pageCount
            },
            onMakeFirefoxDefaultClick = {},
            onMakeFirefoxDefaultSkipClick = {},
            onSignInButtonClick = {},
            onSignInSkipClick = {},
            onNotificationPermissionButtonClick = {},
            onNotificationPermissionSkipClick = {},
            onAddFirefoxWidgetClick = {},
            onSkipFirefoxWidgetClick = {},
            onCustomizeToolbarButtonClick = {},
            onCustomizeThemeButtonClick = {},
            onAgreeAndConfirmTermsOfService = {},
            termsOfServiceEventHandler = object : OnboardingTermsOfServiceEventHandler {},
            onMarketingDataLearnMoreClick = {},
            onMarketingOptInToggle = {},
            onMarketingDataContinueClick = {},
        )
    }
}

@Composable
private fun defaultPreviewPages() = listOf(
    OnboardingPageUiData(
        type = OnboardingPageUiData.Type.DEFAULT_BROWSER,
        imageRes = R.drawable.ic_onboarding_welcome,
        title = stringResource(R.string.juno_onboarding_default_browser_title_nimbus_2),
        description = stringResource(R.string.juno_onboarding_default_browser_description_nimbus_3),
        primaryButtonLabel = stringResource(R.string.juno_onboarding_default_browser_positive_button),
        secondaryButtonLabel = stringResource(R.string.juno_onboarding_default_browser_negative_button),
        privacyCaption = Caption(
            text = stringResource(R.string.juno_onboarding_privacy_notice_text),
            linkTextState = LinkTextState(
                text = stringResource(R.string.juno_onboarding_privacy_notice_text),
                url = "",
                onClick = {},
            ),
        ),
    ),
    OnboardingPageUiData(
        type = OnboardingPageUiData.Type.SYNC_SIGN_IN,
        imageRes = R.drawable.ic_onboarding_sync,
        title = stringResource(R.string.juno_onboarding_sign_in_title_2),
        description = stringResource(R.string.juno_onboarding_sign_in_description_3),
        primaryButtonLabel = stringResource(R.string.juno_onboarding_sign_in_positive_button),
        secondaryButtonLabel = stringResource(R.string.juno_onboarding_sign_in_negative_button),
        privacyCaption = Caption(
            text = stringResource(R.string.juno_onboarding_privacy_notice_text),
            linkTextState = LinkTextState(
                text = stringResource(R.string.juno_onboarding_privacy_notice_text),
                url = "",
                onClick = {},
            ),
        ),
    ),
    OnboardingPageUiData(
        type = OnboardingPageUiData.Type.NOTIFICATION_PERMISSION,
        imageRes = R.drawable.ic_notification_permission,
        title = stringResource(R.string.juno_onboarding_enable_notifications_title_nimbus_2),
        description = stringResource(R.string.juno_onboarding_enable_notifications_description_nimbus_2),
        primaryButtonLabel = stringResource(R.string.juno_onboarding_enable_notifications_positive_button),
        secondaryButtonLabel = stringResource(R.string.juno_onboarding_enable_notifications_negative_button),
        privacyCaption = Caption(
            text = stringResource(R.string.juno_onboarding_privacy_notice_text),
            linkTextState = LinkTextState(
                text = stringResource(R.string.juno_onboarding_privacy_notice_text),
                url = "",
                onClick = {},
            ),
        ),
    ),
)
