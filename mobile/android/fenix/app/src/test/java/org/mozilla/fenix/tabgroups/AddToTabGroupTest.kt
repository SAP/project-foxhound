package org.mozilla.fenix.tabgroups

import androidx.compose.material3.Surface
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.data.createTabGroup
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme
import kotlin.test.assertEquals

@RunWith(AndroidJUnit4::class)
class AddToTabGroupTest {
    @get:Rule
    val composeTestRule = createComposeRule()
    val testGroupTitle = "Test Tab Group"

    @Test
    fun `WHEN no tab groups exist THEN the add to tab group is displayed`() {
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                Surface {
                    AddToTabGroup(
                        tabGroups = emptyList(),
                        onAddToNewTabGroup = {},
                        onAddToExistingTabGroup = {},
                    )
                }
            }
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.ADD_TO_TAB_GROUP_ROOT)
            .assertIsDisplayed()
        composeTestRule.onNodeWithTag(TabsTrayTestTag.ADD_TO_NEW_TAB_GROUP)
            .assertIsDisplayed()
    }

    @Test
    fun `WHEN one tab group exists THEN the add to tab group and one tab group options are displayed`() {
        val group = createTabGroup(title = testGroupTitle)

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                Surface {
                    AddToTabGroup(
                        tabGroups = listOf(group),
                        onAddToNewTabGroup = {},
                        onAddToExistingTabGroup = {},
                    )
                }
            }
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.ADD_TO_TAB_GROUP_ROOT)
            .assertIsDisplayed()
        composeTestRule.onNodeWithTag(TabsTrayTestTag.ADD_TO_NEW_TAB_GROUP)
            .assertIsDisplayed()
        composeTestRule.onNodeWithTag("${TabsTrayTestTag.TAB_GROUP_ROOT}.${group.id}")
            .assertIsDisplayed()
    }

    @Test
    fun `WHEN add to new tab group is clicked THEN onAddToNewTabGroup is invoked`() {
        var clicked = false
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                Surface {
                    AddToTabGroup(
                        tabGroups = emptyList(),
                        onAddToNewTabGroup = { clicked = true },
                        onAddToExistingTabGroup = {},
                    )
                }
            }
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.ADD_TO_NEW_TAB_GROUP)
            .performClick()

        assertTrue(clicked)
    }

    @Test
    fun `WHEN an existing tab group is clicked THEN onAddToExistingTabGroup is invoked`() {
        val group = createTabGroup(title = testGroupTitle)
        var clickedGroupId: String? = null

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                Surface {
                    AddToTabGroup(
                        tabGroups = listOf(group),
                        onAddToNewTabGroup = {},
                        onAddToExistingTabGroup = { clickedGroupId = it.id },
                    )
                }
            }
        }

        composeTestRule.onNodeWithTag("${TabsTrayTestTag.TAB_GROUP_ROOT}.${group.id}")
            .performClick()

        assertEquals(group.id, clickedGroupId)
    }
}
