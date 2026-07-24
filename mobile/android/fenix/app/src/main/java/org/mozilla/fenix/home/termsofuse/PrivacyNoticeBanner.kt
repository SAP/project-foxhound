/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.termsofuse

import androidx.compose.foundation.BorderStroke
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.Banner
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.LinkText
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.settings.SupportUtils
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Privacy Notice banner on the homepage.
 *
 * @param interactor interaction interface for the banner.
 * @param modifier the [Modifier] for the composable
 */
@Composable
fun PrivacyNoticeBanner(
    interactor: PrivacyNoticeBannerInteractor,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    LaunchedEffect(Unit) {
        interactor.onPrivacyNoticeBannerDisplayed()
    }

    Banner(
        modifier = modifier,
        message = {
            LinkText(
                text = stringResource(
                    R.string.privacy_notice_updated_homepage_message,
                    stringResource(R.string.privacy_notice_updated_homepage_message_privacy_notice),
                    stringResource(R.string.privacy_notice_updated_homepage_message_learn_more),
                ),
                linkTextStates = listOf(
                    LinkTextState(
                        text = stringResource(R.string.privacy_notice_updated_homepage_message_privacy_notice),
                        url = SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.PRIVACY_NOTICE_NEXT),
                        onClick = { url ->
                            interactor.onPrivacyNoticeBannerPrivacyNoticeClicked()
                            SupportUtils.launchSandboxCustomTab(
                                context = context,
                                url = url,
                            )
                        },
                    ),
                    LinkTextState(
                        text = stringResource(R.string.privacy_notice_updated_homepage_message_learn_more),
                        url = SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.PRIVACY_NOTICE_UPDATE),
                        onClick = { url ->
                            interactor.onPrivacyNoticeBannerLearnMoreClicked()
                            SupportUtils.launchSandboxCustomTab(
                                context = context,
                                url = url,
                            )
                        },
                    ),
                ),
                textAlign = TextAlign.Start,
                linkTextDecoration = TextDecoration.Underline,
            )
        },
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        onCloseButtonClick = interactor::onPrivacyNoticeBannerCloseClicked,
    )
}

@Composable
@PreviewLightDark
private fun PrivacyNoticeBannerPreview() {
    FirefoxTheme {
        PrivacyNoticeBanner(
            interactor = PrivacyNoticeBannerInteractorNoOp,
        )
    }
}
