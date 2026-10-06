/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites

import androidx.compose.material3.Surface
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.home.fake.FakeHomepagePreview
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

@RunWith(AndroidJUnit4::class)
class TopSitesPagerComposableTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun setTopSitesContent(
        count: Int,
        isPager: Boolean,
    ) {
        val topSites = FakeHomepagePreview.topSites(providedCount = 0, pinnedCount = 0, defaultCount = count)
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                Surface {
                    TopSites(
                        topSites = topSites,
                        onTopSiteClick = {},
                        onTopSiteLongClick = {},
                        onTopSiteImpression = { _, _ -> },
                        onOpenInPrivateTabClicked = {},
                        onEditTopSiteClicked = {},
                        onRemoveTopSiteClicked = {},
                        onSettingsClicked = {},
                        onSponsorPrivacyClicked = {},
                        onTopSitesItemBound = {},
                        onAddShortcutClicked = {},
                        isPager = isPager,
                    )
                }
            }
        }
    }

    @Test
    fun `GIVEN isPager is true WHEN rendered THEN top sites container is displayed`() {
        setTopSitesContent(count = 8, isPager = true)

        composeTestRule.onNodeWithTag(TopSitesTestTag.TOP_SITES).assertIsDisplayed()
    }

    @Test
    fun `GIVEN 8 sites and isPager is true WHEN rendered THEN first page shows 4 top site items`() {
        setTopSitesContent(count = 8, isPager = true)

        // HorizontalPager only composes the visible page, so 4 items (one page) are rendered.
        composeTestRule.onAllNodesWithTag(TopSitesTestTag.TOP_SITE_ITEM_ROOT).assertCountEquals(4)
    }

    @Test
    fun `GIVEN 8 sites and isPager is true WHEN rendered THEN page indicator is shown`() {
        setTopSitesContent(count = 8, isPager = true)

        composeTestRule.onNodeWithTag(TopSitesTestTag.TOP_SITES_PAGER_INDICATOR).assertIsDisplayed()
    }

    @Test
    fun `GIVEN 4 or fewer sites and isPager is true WHEN rendered THEN no page indicator is shown`() {
        setTopSitesContent(count = 4, isPager = true)

        composeTestRule.onNodeWithTag(TopSitesTestTag.TOP_SITES_PAGER_INDICATOR).assertDoesNotExist()
    }

    @Test
    fun `GIVEN isPager is false WHEN rendered THEN top sites container is displayed`() {
        setTopSitesContent(count = 8, isPager = false)

        composeTestRule.onNodeWithTag(TopSitesTestTag.TOP_SITES).assertIsDisplayed()
    }

    @Test
    fun `GIVEN 8 sites and isPager is false WHEN rendered THEN all 8 top site items are displayed`() {
        setTopSitesContent(count = 8, isPager = false)

        composeTestRule.onAllNodesWithTag(TopSitesTestTag.TOP_SITE_ITEM_ROOT).assertCountEquals(8)
    }
}
