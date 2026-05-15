/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.fragment.about

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.core.content.pm.PackageInfoCompat
import mozilla.components.browser.state.state.SessionState
import mozilla.components.support.utils.ext.packageManagerCompatHelper
import org.mozilla.focus.BuildConfig
import org.mozilla.focus.R
import org.mozilla.focus.ext.components
import org.mozilla.focus.settings.BaseComposeFragment
import org.mozilla.focus.state.AppAction
import org.mozilla.focus.state.Screen.Settings.Page.About
import org.mozilla.focus.ui.preferences.LearnMoreLink
import org.mozilla.focus.ui.theme.FocusTheme
import org.mozilla.focus.ui.theme.focusColors
import org.mozilla.focus.ui.theme.focusTypography
import org.mozilla.focus.utils.SupportUtils.manifestoURL
import org.mozilla.geckoview.BuildConfig as GeckoViewBuildConfig

private const val GECKO_EMOJI = " \uD83E\uDD8E "

/**
 * A [BaseComposeFragment] responsible for displaying the [About] screen.
 */
class AboutFragment : BaseComposeFragment() {

    override val titleRes: Int = R.string.menu_about

    @Composable
    override fun Content() {
        val context = LocalContext.current
        val appName = stringResource(R.string.app_name)
        val aboutContent = stringResource(R.string.about_content, appName, "")
        val servicesAbbreviation = stringResource(R.string.services_abbreviation)

        val aboutHeader = remember(servicesAbbreviation) {
            val packageInfo =
                context.packageManagerCompatHelper.getPackageInfoCompat(context.packageName, 0)

            getAboutHeader(
                versionName = packageInfo.versionName,
                versionCode = PackageInfoCompat.getLongVersionCode(packageInfo).toString(),
                servicesAbbreviation = servicesAbbreviation,
            )
        }

        val content = remember(aboutContent) {
            aboutContent
                .replace("<li>", "\u2022 \u0009 ")
                .replace("</li>", "\n")
                .replace("<ul>", "\n \n")
                .replace("</ul>", "")
                .replace("<p>", "\n")
                .replace("</p>", "")
                .replaceAfter("<br/>", "")
                .replace("<br/>", "")
        }

        val openLearnMore = remember {
            {
                val tabId = context.components.tabsUseCases.addTab(
                    url = manifestoURL,
                    source = SessionState.Source.Internal.Menu,
                    selectTab = true,
                    private = true,
                )
                context.components.appStore.dispatch(AppAction.OpenTab(tabId))
                Unit
            }
        }

        val secretSettingsUnlocker = remember {
            SecretSettingsUnlocker(
                context,
            ) {
                context.components.appStore.dispatch(
                    AppAction.SecretSettingsStateChange(
                        true,
                    ),
                )
            }
        }

        AboutPageContent(
            aboutVersion = aboutHeader,
            content = content,
            onLogoClick = secretSettingsUnlocker::increment,
            openLearnMore = openLearnMore,
        )
    }
}

@Composable
private fun AboutPageContent(
    aboutVersion: String,
    content: String,
    onLogoClick: () -> Unit,
    openLearnMore: () -> Unit,
) {
    FocusTheme {
        Column(
            modifier = Modifier
                .padding(8.dp)
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LogoIcon(onLogoClick)
            VersionInfo(aboutVersion)
            AboutContent(content)
            LearnMoreLink(openLearnMore)
        }
    }
}

@Composable
private fun LogoIcon(onLogoClick: () -> Unit) {
    Image(
        painter = painterResource(R.drawable.wordmark2),
        contentDescription = null,
        modifier = Modifier
            .padding(4.dp)
            .clickable(onClick = onLogoClick),
    )
}

@Composable
private fun VersionInfo(aboutVersion: String) {
    SelectionContainer {
        Text(
            text = aboutVersion,
            color = focusColors.aboutPageText,
            style = focusTypography.bodyLarge.copy(
                // Use LTR in all cases since the version is not translatable.
                textDirection = TextDirection.Ltr,
            ),
            modifier = Modifier
                .padding(10.dp),
        )
    }
}

@Composable
private fun AboutContent(content: String) {
    Text(
        text = content,
        color = focusColors.aboutPageText,
        style = focusTypography.bodyLarge,
        modifier = Modifier
            .padding(10.dp),
    )
}

private fun getAboutHeader(
    versionName: String?,
    versionCode: String,
    servicesAbbreviation: String,
): String {
    val servicesVersion = mozilla.components.Build.APPLICATION_SERVICES_VERSION
    val geckoVersionInfo =
        GECKO_EMOJI + GeckoViewBuildConfig.MOZ_APP_VERSION + "-" + GeckoViewBuildConfig.MOZ_APP_BUILDID
    val vcsHash = BuildConfig.VCS_HASH.takeIf { it.isNotBlank() }?.let { ", $it" } ?: ""

    return """
        ${versionName ?: ""} (Build #${versionCode}$geckoVersionInfo)$vcsHash
        $servicesAbbreviation: $servicesVersion
    """.trimIndent()
}
