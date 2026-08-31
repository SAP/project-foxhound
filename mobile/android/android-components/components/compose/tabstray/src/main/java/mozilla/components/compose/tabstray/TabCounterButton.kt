/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.tabstray

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.contentColorFor
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.compose.base.button.IconButton
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.browser.tabstray.R
import mozilla.components.lib.state.ext.observeAsComposableState

private const val MAX_VISIBLE_TABS = 99
private const val SO_MANY_TABS_OPEN = "∞"

private val PREVIEW_TAB_COUNTS = listOf(0, 1, 5, 42, MAX_VISIBLE_TABS + 1)

/**
 * A button showing the count of tabs in the [store] using the provided [tabsFilter].
 *
 * @param store The store to observe.
 * @param onClicked Gets invoked when the user clicks the button.
 * @param tabsFilter Used for filtering the list of tabs.
 */
@Composable
fun TabCounterButton(
    store: BrowserStore,
    onClicked: () -> Unit,
    tabsFilter: (TabSessionState) -> Boolean = { true },
) {
    val backgroundColor = MaterialTheme.colorScheme.primaryContainer
    val foregroundColor = contentColorFor(backgroundColor)
    val tabs = store.observeAsComposableState { state -> state.tabs.filter(tabsFilter) }
    val count = tabs.value.size

    IconButton(
        onClick = onClicked,
        contentDescription = createContentDescription(count),
    ) {
        Image(
            painter = painterResource(R.drawable.mozac_tabcounter_background),
            contentDescription = null,
            colorFilter = ColorFilter.tint(foregroundColor),
        )

        Text(
            createButtonText(count),
            fontSize = 12.sp,
            color = foregroundColor,
        )
    }
}

private fun createButtonText(count: Int): String {
    return if (count > MAX_VISIBLE_TABS) {
        SO_MANY_TABS_OPEN
    } else {
        count.toString()
    }
}

@Composable
private fun createContentDescription(count: Int): String {
    return if (count == 1) {
        stringResource(R.string.mozac_tab_counter_open_tab_tray_single)
    } else {
        String.format(
            stringResource(R.string.mozac_tab_counter_open_tab_tray_plural),
            count.toString(),
        )
    }
}

@PreviewLightDark
@Composable
private fun TabCounterButtonPreview() {
    AcornTheme {
        Surface {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PREVIEW_TAB_COUNTS.forEach { count ->
                    TabCounterButton(
                        store = BrowserStore(
                            initialState = BrowserState(
                                tabs = List(count) { index ->
                                    createTab(url = "https://example.com/$index")
                                },
                            ),
                        ),
                        onClicked = {},
                    )
                }
            }
        }
    }
}
