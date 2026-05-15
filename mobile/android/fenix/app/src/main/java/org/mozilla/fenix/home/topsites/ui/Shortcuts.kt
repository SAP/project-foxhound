/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.feature.top.sites.TopSite
import org.mozilla.fenix.home.fake.FakeHomepagePreview
import org.mozilla.fenix.home.topsites.TOP_SITES_ITEM_SIZE
import org.mozilla.fenix.home.topsites.TopSiteColors
import org.mozilla.fenix.home.topsites.TopSiteItem
import org.mozilla.fenix.home.topsites.getMenuItems
import org.mozilla.fenix.home.topsites.interactor.TopSiteInteractor
import org.mozilla.fenix.theme.FirefoxTheme

@Composable
internal fun Shortcuts(
    topSites: List<TopSite>,
    topSiteColors: TopSiteColors = TopSiteColors.colors(),
    interactor: TopSiteInteractor,
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = TOP_SITES_ITEM_SIZE.dp),
        verticalArrangement = Arrangement.Center,
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier.padding(16.dp),
    ) {
        topSites.forEachIndexed { position, topSite ->
            item {
                TopSiteItem(
                    topSite = topSite,
                    menuItems = getMenuItems(
                        topSite = topSite,
                        onOpenInPrivateTabClicked = interactor::onOpenInPrivateTabClicked,
                        onEditTopSiteClicked = interactor::onEditTopSiteClicked,
                        onRemoveTopSiteClicked = interactor::onRemoveTopSiteClicked,
                        onSettingsClicked = interactor::onSettingsClicked,
                        onSponsorPrivacyClicked = interactor::onSponsorPrivacyClicked,
                    ),
                    position = position,
                    topSiteColors = topSiteColors,
                    onTopSiteClick = { topSite ->
                        interactor.onSelectTopSite(
                            topSite = topSite,
                            position = topSites.indexOf(topSite),
                        )
                    },
                    onTopSiteLongClick = interactor::onTopSiteLongClicked,
                    onTopSiteImpression = interactor::onTopSiteImpression,
                    onTopSitesItemBound = {},
                )
            }
        }
    }
}

@Composable
@FlexibleWindowLightDarkPreview
private fun ShortcutsPreview() {
    FirefoxTheme {
        Surface {
            Shortcuts(
                topSites = FakeHomepagePreview.topSites(),
                interactor = FakeHomepagePreview.topSitesInteractor,
            )
        }
    }
}
