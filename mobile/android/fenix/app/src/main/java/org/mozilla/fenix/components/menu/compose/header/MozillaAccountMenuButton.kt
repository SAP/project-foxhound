/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.compose.header

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.Icon
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import mozilla.components.service.fxa.store.Account
import org.mozilla.fenix.R
import org.mozilla.fenix.components.accounts.AccountState
import org.mozilla.fenix.components.accounts.AccountState.AUTHENTICATED
import org.mozilla.fenix.components.accounts.AccountState.NEEDS_REAUTHENTICATION
import org.mozilla.fenix.components.accounts.AccountState.NO_ACCOUNT
import org.mozilla.fenix.compose.annotation.LightDarkPreview
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

private val BUTTON_HEIGHT = 56.dp
private val BUTTON_SHAPE = RoundedCornerShape(size = 8.dp)

@Composable
internal fun MozillaAccountMenuButton(
    account: Account?,
    accountState: AccountState,
    onSignInButtonClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .background(
                color = FirefoxTheme.colors.layer3,
                shape = BUTTON_SHAPE,
            )
            .clip(shape = BUTTON_SHAPE)
            .clickable { onSignInButtonClick() }
            .defaultMinSize(minHeight = BUTTON_HEIGHT),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spacer(modifier = Modifier.width(4.dp))

        AvatarIcon()

        Column(
            modifier = Modifier
                .padding(horizontal = 8.dp)
                .weight(1f),
        ) {
            when (accountState) {
                NO_ACCOUNT -> {
                    Text(
                        text = stringResource(id = R.string.browser_menu_sign_in),
                        color = FirefoxTheme.colors.textSecondary,
                        maxLines = 1,
                        style = FirefoxTheme.typography.headline7,
                    )

                    Text(
                        text = stringResource(id = R.string.browser_menu_sign_in_caption),
                        color = FirefoxTheme.colors.textSecondary,
                        maxLines = 2,
                        style = FirefoxTheme.typography.caption,
                    )
                }

                NEEDS_REAUTHENTICATION -> {
                    Text(
                        text = stringResource(id = R.string.browser_menu_sign_back_in_to_sync),
                        color = FirefoxTheme.colors.textSecondary,
                        maxLines = 1,
                        style = FirefoxTheme.typography.headline7,
                    )

                    Text(
                        text = stringResource(id = R.string.browser_menu_syncing_paused_caption),
                        color = FirefoxTheme.colors.textWarning,
                        maxLines = 2,
                        style = FirefoxTheme.typography.caption,
                    )
                }

                AUTHENTICATED -> {
                    Text(
                        text = account?.displayName ?: account?.email
                            ?: stringResource(id = R.string.browser_menu_account_settings),
                        color = FirefoxTheme.colors.textSecondary,
                        maxLines = 1,
                        style = FirefoxTheme.typography.headline7,
                    )
                }
            }
        }

        if (accountState == NEEDS_REAUTHENTICATION) {
            Icon(
                painter = painterResource(R.drawable.mozac_ic_warning_fill_24),
                contentDescription = null,
                tint = FirefoxTheme.colors.iconWarning,
            )

            Spacer(modifier = Modifier.width(8.dp))
        }
    }
}

@Composable
private fun AvatarIcon() {
    Icon(
        painter = painterResource(id = R.drawable.mozac_ic_avatar_circle_24),
        contentDescription = null,
        modifier = Modifier
            .background(
                color = FirefoxTheme.colors.layer2,
                shape = RoundedCornerShape(size = 24.dp),
            )
            .padding(all = 4.dp),
        tint = FirefoxTheme.colors.iconSecondary,
    )
}

@Composable
private fun MenuHeaderPreviewContent() {
    Column(
        modifier = Modifier
            .background(color = FirefoxTheme.colors.layer2)
            .padding(all = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        MozillaAccountMenuButton(
            account = null,
            accountState = NO_ACCOUNT,
            onSignInButtonClick = {},
        )

        MozillaAccountMenuButton(
            account = null,
            accountState = NEEDS_REAUTHENTICATION,
            onSignInButtonClick = {},
        )

        MozillaAccountMenuButton(
            account = Account(
                uid = "testUID",
                avatar = null,
                email = "test@example.com",
                displayName = "test profile",
                currentDeviceId = null,
                sessionToken = null,
            ),
            accountState = AUTHENTICATED,
            onSignInButtonClick = {},
        )

        MozillaAccountMenuButton(
            account = Account(
                uid = "testUID",
                avatar = null,
                email = "test@example.com",
                displayName = null,
                currentDeviceId = null,
                sessionToken = null,
            ),
            accountState = AUTHENTICATED,
            onSignInButtonClick = {},
        )

        MozillaAccountMenuButton(
            account = Account(
                uid = "testUID",
                avatar = null,
                email = null,
                displayName = null,
                currentDeviceId = null,
                sessionToken = null,
            ),
            accountState = AUTHENTICATED,
            onSignInButtonClick = {},
        )
    }
}

@LightDarkPreview
@Composable
private fun MenuHeaderPreview() {
    FirefoxTheme {
        MenuHeaderPreviewContent()
    }
}

@Preview
@Composable
private fun MenuHeaderPrivatePreview() {
    FirefoxTheme(theme = Theme.Private) {
        MenuHeaderPreviewContent()
    }
}
