/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mozilla.components.compose.base.snackbar.Snackbar
import mozilla.components.compose.base.snackbar.displaySnackbar
import mozilla.components.compose.base.utils.inComposePreview
import mozilla.components.support.ktx.android.content.appName
import mozilla.components.support.ktx.android.content.appVersionName
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.TextListItem
import org.mozilla.fenix.debugsettings.navigation.DebugDrawerDestination
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme

/**
 * The navigation route for [DebugDrawerHome].
 */
const val DEBUG_DRAWER_HOME_ROUTE = "debug_drawer_home"

/**
 * The home screen of the [DebugDrawer].
 *
 * @param destinations The list of [DebugDrawerDestination]s to display.
 */
@Composable
fun DebugDrawerHome(
    destinations: List<DebugDrawerDestination>,
) {
    val lazyListState = rememberLazyListState()

    val appName: String
    val appVersion: String
    if (inComposePreview) {
        appName = "App Name Preview"
        appVersion = "100.00.000"
    } else {
        appName = LocalContext.current.appName
        appVersion = LocalContext.current.appVersionName
    }

    Surface {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            state = lazyListState,
        ) {
            item(key = "home_header") {
                Row(
                    modifier = Modifier
                        .padding(all = 16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = appName,
                        style = FirefoxTheme.typography.headline5,
                    )

                    Text(
                        text = appVersion,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = FirefoxTheme.typography.headline5,
                    )
                }

                HorizontalDivider()
            }

            items(
                items = destinations,
                key = { destination ->
                    destination.route
                },
            ) { destination ->
                TextListItem(
                    label = stringResource(id = destination.title),
                    onClick = destination.onClick,
                )

                HorizontalDivider()
            }
        }
    }
}

@Preview
@Composable
private fun DebugDrawerHomePreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    val scope = rememberCoroutineScope()
    val snackbarState = remember { SnackbarHostState() }

    FirefoxTheme(theme) {
        Box {
            DebugDrawerHome(
                destinations = List(size = 30) {
                    DebugDrawerDestination(
                        route = "screen_$it",
                        title = R.string.debug_drawer_title,
                        onClick = {
                            scope.launch {
                                snackbarState.displaySnackbar(message = "item $it clicked")
                            }
                        },
                        content = {},
                    )
                },
            )

            SnackbarHost(
                hostState = snackbarState,
                modifier = Modifier.align(Alignment.BottomCenter),
            ) {
                Snackbar(snackbarData = it)
            }
        }
    }
}
