package org.mozilla.fenix.tabgroups

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextReplacement
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.TabsTrayTestTag.BOTTOM_SHEET_COLOR_LIST
import org.mozilla.fenix.tabstray.TabsTrayTestTag.GROUP_NAME
import org.mozilla.fenix.tabstray.data.TabGroupTheme
import org.mozilla.fenix.tabstray.data.createTabGroup
import org.mozilla.fenix.tabstray.redux.state.TabGroupFormState
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.state.initializeTabGroupForm
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme
import kotlin.test.assertEquals

@RunWith(AndroidJUnit4::class)
class EditTabGroupTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `WHEN a color is clicked, THEN the form's state is updated`() {
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = fakeFormState(),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule
            .onNodeWithTag("$BOTTOM_SHEET_COLOR_LIST.${TabGroupTheme.Green}")
            .performClick()

        composeTestRule.runOnIdle {
            assertEquals(store.state.tabGroupState.formState?.theme, TabGroupTheme.Green)
        }
    }

    @Test
    fun `Verify all color items are placed`() {
        composeTestRule.setContent {
            ComposableUnderTest()
        }

        TabGroupTheme.entries.forEach { entry ->
            composeTestRule
                .onNodeWithTag("$BOTTOM_SHEET_COLOR_LIST.${entry.name}")
                .assertIsDisplayed()
        }
    }

    @Test
    fun `WHEN group is created GIVEN blank name, unedited state, and nextGroupNumber 1 THEN name is default name Group 1`() {
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = fakeFormState(nextGroupNumber = 1),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule.onNodeWithTag(GROUP_NAME).assert(hasText("Group 1"))
    }

    @Test
    fun `WHEN group is created GIVEN blank name, unedited state, and nextGroupNumber 99 THEN name is default name Group 99`() {
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = fakeFormState(nextGroupNumber = 99),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule.onNodeWithTag(GROUP_NAME).assert(hasText("Group 99"))
    }

    @Test
    fun `WHEN group is created GIVEN blank name and edited state THEN name is not overridden with default`() {
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = TabGroupFormState(
                        tabGroupId = "123",
                        name = "",
                        nextTabGroupNumber = 1,
                        theme = TabGroupTheme.Yellow,
                        edited = true,
                    ),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule.onNodeWithTag(GROUP_NAME).assert(hasText(""))
    }

    @Test
    fun `WHEN group is created GIVEN non-blank name and edited state THEN name is not overridden with default`() {
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = TabGroupFormState(
                        tabGroupId = "123",
                        name = "Test Group",
                        nextTabGroupNumber = 1,
                        theme = TabGroupTheme.Yellow,
                        edited = true,
                    ),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule.onNodeWithTag(GROUP_NAME).assert(hasText("Test Group"))
    }

    @Test
    fun `WHEN group is created GIVEN non-blank name and unedited state THEN name is not overridden with default`() {
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = TabGroupFormState(
                        tabGroupId = "123",
                        name = "Test Group",
                        nextTabGroupNumber = 1,
                        theme = TabGroupTheme.Yellow,
                        edited = false,
                    ),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule.onNodeWithTag(GROUP_NAME).assert(hasText("Test Group"))
    }

    @Test
    fun `WHEN the store is in create mode THEN the default name is shown and saved in form state`() {
        val expectedName = "Group 1"
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = TabGroupFormState(
                        tabGroupId = null,
                        name = "",
                        nextTabGroupNumber = 1,
                        edited = false,
                    ),
                ),
            ),
        )

        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule
            .onNodeWithText(expectedName)
            .assertIsDisplayed()

        composeTestRule.runOnIdle {
            assertEquals(expectedName, store.state.tabGroupState.formState?.name)
        }
    }

    @Test
    fun `WHEN the UI is opened to edit an existing tab group THEN the group's name is shown and saved in form state`() {
        val expectedName = "test group"
        val group = createTabGroup(title = expectedName)
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = group.initializeTabGroupForm(),
                ),
            ),
        )

        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule
            .onNodeWithText(expectedName)
            .assertIsDisplayed()

        composeTestRule.runOnIdle {
            assertEquals(expectedName, store.state.tabGroupState.formState?.name)
        }
    }

    @Test
    fun `WHEN the UI is opened to edit an existing tab group THEN the header text displays EDIT_GROUP`() {
        val expectedName = "test group"
        val group = createTabGroup(title = expectedName)
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = group.initializeTabGroupForm(),
                ),
            ),
        )

        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        composeTestRule
            .onNodeWithText("Edit group")
            .assertIsDisplayed()
    }

    @Test
    fun `WHEN group name is changed GIVEN name length exceeds MAX_TAB_GROUP_NAME_LENGTH THEN name is truncated`() {
        val initialName = "Test Group"
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = TabGroupFormState(
                        tabGroupId = "123",
                        name = initialName,
                        nextTabGroupNumber = 1,
                        theme = TabGroupTheme.Yellow,
                        edited = true,
                    ),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        val expectedTruncatedName = "a".repeat(MAX_TAB_GROUP_NAME_LENGTH)
        val longName = expectedTruncatedName + "extra"

        composeTestRule.onNodeWithTag(GROUP_NAME).performTextReplacement(longName)

        composeTestRule.onNodeWithTag(GROUP_NAME).assert(hasText(expectedTruncatedName))

        composeTestRule.runOnIdle {
            assertEquals(expectedTruncatedName, store.state.tabGroupState.formState?.name)
        }
    }

    @Test
    fun `WHEN group name is changed GIVEN name length is exactly MAX_TAB_GROUP_NAME_LENGTH THEN name is updated`() {
        val store = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = fakeFormState(),
                ),
            ),
        )
        composeTestRule.setContent {
            ComposableUnderTest(store = store)
        }

        val maxName = "a".repeat(MAX_TAB_GROUP_NAME_LENGTH)
        composeTestRule.onNodeWithTag(GROUP_NAME).performTextReplacement(maxName)

        composeTestRule.onNodeWithTag(GROUP_NAME).assert(hasText(maxName))
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    private fun ComposableUnderTest(
        store: TabsTrayStore = TabsTrayStore(
            initialState = TabsTrayState(
                tabGroupState = TabsTrayState.TabGroupState(
                    formState = fakeFormState(),
                ),
            ),
        ),
    ) {
        val tabsTrayStore = remember {
            store
        }

        FirefoxTheme(theme = Theme.Light) {
            Surface {
                EditTabGroup(
                    tabsTrayStore = tabsTrayStore,
                )
            }
        }
    }

    private fun fakeFormState(nextGroupNumber: Int = 1): TabGroupFormState {
        return TabGroupFormState(
            tabGroupId = "123",
            name = "",
            nextTabGroupNumber = nextGroupNumber,
            theme = TabGroupTheme.Yellow,
            edited = false,
        )
    }
}
