/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.logins.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class LoginsReducerTest {
    @Test
    fun `WHEN logins are loaded THEN they are added to state`() {
        val state = LoginsState.default
        val items = List(5) {
            LoginItem(
                guid = "$it",
                url = "url",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val result = loginsReducer(
            state,
            LoginsLoaded(
                loginItems = items,
            ),
        )

        val expected = state.copy(
            loginItems = items,
        )
        assertEquals(expected, result)
    }

    @Test
    fun `GIVEN we are on the list logins screen WHEN add login is clicked THEN initialize the add login state`() {
        val state = LoginsState.default.copy(
            loginsAddLoginState = LoginsAddLoginState(
                host = "",
                username = "",
                password = "",
            ),
        )

        val result = loginsReducer(state, AddLoginAction.InitAdd)

        assertEquals(
            LoginsAddLoginState(
                host = "",
                username = "",
                password = "",
            ),
            result.loginsAddLoginState,
        )
    }

    @Test
    fun `GIVEN there is no substate screen present WHEN back is clicked THEN state is unchanged`() {
        val state = LoginsState.default

        val result = loginsReducer(state, LoginsListBackClicked)

        assertEquals(LoginsState.default, result)
    }

    @Test
    fun `GIVEN a logins list WHEN the alphabetical sort menu item is clicked THEN sort the logins list`() {
        val items = List(3) {
            LoginItem(
                guid = "$it",
                url = "$it url",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = 0L + it,
            )
        }

        val state = LoginsState.default.copy(loginItems = items)

        val alphabetical = loginsReducer(state, LoginsListSortMenuAction.OrderByNameClicked)
        assertEquals(listOf(items[0], items[1], items[2]), alphabetical.loginItems)
    }

    @Test
    fun `GIVEN a logins list WHEN the last used sort menu item is clicked THEN sort the logins list`() {
        val items = List(3) {
            LoginItem(
                guid = "$it",
                url = "$it url",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = 0L + it,
            )
        }

        val state = LoginsState.default.copy(loginItems = items)

        val newest = loginsReducer(state, LoginsListSortMenuAction.OrderByLastUsedClicked)
        assertEquals(listOf(items[2], items[1], items[0]), newest.loginItems)
    }

    @Test
    fun `GIVEN a logins list WHEN the search is used THEN filter the logins list`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }
        val itemsList = items.toMutableList()
        itemsList.add(
            LoginItem(
                guid = "7",
                url = "7 uri",
                username = "user7-url",
                password = "pass7",
                timeLastUsed = System.currentTimeMillis(),
            ),
        )

        val state = LoginsState.default.copy(loginItems = itemsList)

        val filterUrl = loginsReducer(state, SearchLogins("url", itemsList))
        assertEquals("url", filterUrl.searchText)
        assertEquals(5, filterUrl.loginItems.size)
        assertEquals(
            listOf(itemsList[0], itemsList[2], itemsList[4], itemsList[6], itemsList[7]),
            filterUrl.loginItems,
        )
    }

    @Test
    fun `GIVEN we are on the list logins screen WHEN a login is clicked THEN initialize the detail login state`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val state = LoginsState.default.copy(loginItems = items)
        val result = loginsReducer(state, LoginClicked(items[1]))
        val expectedState = state.copy(loginsLoginDetailState = LoginsLoginDetailState(items[1]))

        assertEquals(result.loginsLoginDetailState, expectedState.loginsLoginDetailState)
        assertEquals(result, expectedState)
    }

    @Test
    fun `WHEN login is clicked THEN it is added to state`() {
        val state = LoginsState.default
        val loginItem = LoginItem(
            guid = "guid123",
            url = "url123",
            username = "user123",
            password = "pass123",
            timeLastUsed = System.currentTimeMillis(),
        )

        val result = loginsReducer(
            state,
            LoginClicked(item = loginItem),
        )

        val expected = state.copy(
            loginsLoginDetailState = LoginsLoginDetailState(loginItem),
        )
        assertEquals(expected, result)
    }

    @Test
    fun `GIVEN we are on the login details screen WHEN the back button is clicked THEN go back to login list state`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val state = LoginsState.default.copy(loginItems = items)
        loginsReducer(state, LoginClicked(items[1]))

        val resultListStateAfterBackClick = loginsReducer(state, LoginsListBackClicked)
        val expectedListStateAfterBackClick = state.copy(loginsLoginDetailState = null)

        assertEquals(resultListStateAfterBackClick, expectedListStateAfterBackClick)
    }

    @Test
    fun `GIVEN we are on the login details screen WHEN the delete item from the 3 dot menu is tapped THEN show the deletion dialog`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val state = LoginsState.default.copy(
            loginItems = items,
            loginsLoginDetailState = LoginsLoginDetailState(items[1]),
        )

        val resultDeletionDialogStateAfterDeleteClick =
            loginsReducer(state, DetailLoginMenuAction.DeleteLoginMenuItemClicked(items[1]))
        val expectedDeletionDialogStateAfterDeleteClick =
            state.copy(loginDeletionDialogState = LoginDeletionDialogState.Presenting(items[1].guid))

        assertEquals(
            resultDeletionDialogStateAfterDeleteClick,
            expectedDeletionDialogStateAfterDeleteClick,
        )
    }

    @Test
    fun `GIVEN we are on the add login screen WHEN the back button is clicked THEN go back to login list state`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val state = LoginsState.default.copy(loginItems = items)
        loginsReducer(state, AddLoginAction.InitAdd)

        val resultListStateAfterBackClick = loginsReducer(state, AddLoginBackClicked)
        val expectedListStateAfterBackClick = state.copy(loginsAddLoginState = null)

        assertEquals(resultListStateAfterBackClick, expectedListStateAfterBackClick)
    }

    @Test
    fun `GIVEN we are on the add login screen WHEN the add login button is clicked THEN the new login is reflected in the state`() {
        val host = "https://www.yahoo.com"
        val username = "user1234"
        val password = "pass1234"

        val state = LoginsState.default.copy(
            loginsAddLoginState = LoginsAddLoginState(
                host = host,
                username = username,
                password = password,
            ),
        )

        val resultAddStateAfterSaveLoginClick = loginsReducer(
            state,
            AddLoginAction.AddLoginSaveClicked,
        )
        val expectedAddStateAfterSaveLoginClick = state.copy(
            loginsAddLoginState = LoginsAddLoginState(
                host = host,
                username = username,
                password = password,
            ),
        )

        assertEquals(resultAddStateAfterSaveLoginClick, expectedAddStateAfterSaveLoginClick)
    }

    @Test
    fun `GIVEN we are on the add login screen WHEN we want to add a duplicate login THEN the this is reflected in the state`() {
        val guid = "guid1234"
        val host = "https://www.yahoo.com"
        val username = "user1234"
        val password = "pass1234"

        val state = LoginsState.default.copy(
            loginItems = listOf(
                LoginItem(
                    guid = guid,
                    url = host,
                    username = username,
                    password = password,
                ),
            ),
            loginsAddLoginState = LoginsAddLoginState(
                host = "",
                username = username,
                password = password,
            ),
            newLoginState = NewLoginState.None,
        )

        val resultAddStateForDuplicateLogin =
            loginsReducer(state, AddLoginAction.HostChanged(host))
        val expectedAddStateForDuplicateLogin = state.copy(
            loginsAddLoginState = LoginsAddLoginState(
                host = host,
                username = username,
                password = password,
            ),
            newLoginState = NewLoginState.Duplicate,
        )

        assertEquals(
            resultAddStateForDuplicateLogin.newLoginState,
            expectedAddStateForDuplicateLogin.newLoginState,
        )
    }

    @Test
    fun `GIVEN we are on the edit login screen WHEN the back button is clicked THEN go back to login details screen`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val state = LoginsState.default.copy(
            loginItems = items,
            loginsLoginDetailState = LoginsLoginDetailState(items[1]),
            loginsEditLoginState = LoginsEditLoginState(
                login = items[1],
                newUsername = "newUsername",
                newPassword = "newPassword",
                isPasswordVisible = true,
            ),
        )

        val resultListStateAfterBackClick = loginsReducer(state, EditLoginBackClicked)
        val expectedListStateAfterBackClick = state.copy(loginsEditLoginState = null)

        assertEquals(resultListStateAfterBackClick, expectedListStateAfterBackClick)
    }

    @Test
    fun `GIVEN we are on the edit login screen WHEN the save button is clicked THEN go back to details login and reflect the changed state`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val loginsEditState = LoginsEditLoginState(
            login = items[1],
            newUsername = "newUsername",
            newPassword = "newPassword",
            isPasswordVisible = true,
        )
        val state = LoginsState.default.copy(
            loginItems = items,
            loginsLoginDetailState = LoginsLoginDetailState(items[1]),
            loginsEditLoginState = loginsEditState,
        )

        val resultListStateAfterBackClick =
            loginsReducer(state, EditLoginAction.SaveEditClicked(items[1]))
        val expectedListStateAfterSaveClick = state.copy(
            loginsEditLoginState = loginsEditState.copy(
                newUsername = "newUsername",
                newPassword = "newPassword",
                isPasswordVisible = true,
            ),
        )

        assertEquals(resultListStateAfterBackClick, expectedListStateAfterSaveClick)
    }

    @Test
    fun `GIVEN we are on the edit login screen and the password is visible WHEN the hide password button is clicked THEN reflect the changed state`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val loginsEditState = LoginsEditLoginState(
            login = items[1],
            newUsername = "newUsername",
            newPassword = "newPassword",
            isPasswordVisible = true,
        )
        val state = LoginsState.default.copy(
            loginItems = items,
            loginsLoginDetailState = LoginsLoginDetailState(items[1]),
            loginsEditLoginState = loginsEditState,
        )

        val resultListStateAfterBackClick =
            loginsReducer(state, EditLoginAction.PasswordVisibilityChanged(false))
        val expectedListStateAfterSaveClick = state.copy(
            loginsEditLoginState = loginsEditState.copy(
                newUsername = "newUsername",
                newPassword = "newPassword",
                isPasswordVisible = false,
            ),
        )

        assertEquals(resultListStateAfterBackClick, expectedListStateAfterSaveClick)
    }

    @Test
    fun `GIVEN we are on the edit login screen and the password is hidden WHEN the show password button is clicked THEN reflect the changed state`() {
        val items = List(7) {
            LoginItem(
                guid = "$it",
                url = if (it % 2 == 0) "$it url" else "$it uri",
                username = "user$it",
                password = "pass$it",
                timeLastUsed = System.currentTimeMillis(),
            )
        }

        val loginsEditState = LoginsEditLoginState(
            login = items[1],
            newUsername = "newUsername",
            newPassword = "newPassword",
            isPasswordVisible = false,
        )
        val state = LoginsState.default.copy(
            loginItems = items,
            loginsLoginDetailState = LoginsLoginDetailState(items[1]),
            loginsEditLoginState = loginsEditState,
        )

        val resultListStateAfterBackClick =
            loginsReducer(state, EditLoginAction.PasswordVisibilityChanged(true))
        val expectedListStateAfterSaveClick = state.copy(
            loginsEditLoginState = loginsEditState.copy(
                newUsername = "newUsername",
                newPassword = "newPassword",
                isPasswordVisible = true,
            ),
        )

        assertEquals(resultListStateAfterBackClick, expectedListStateAfterSaveClick)
    }

    @Test
    fun `GIVEN we are on the edit login screen WHEN we want to save a login without changing the username THEN this is not a duplicate`() {
        val loginItem = LoginItem(
            guid = "guid1234",
            url = "https://www.yahoo.com",
            username = "user1234",
            password = "pass1234",
        )

        val state = LoginsState.default.copy(
            loginItems = listOf(
                loginItem,
            ),
            loginsEditLoginState = LoginsEditLoginState(
                login = loginItem,
                newUsername = "user1234",
                newPassword = "password1234",
                isPasswordVisible = false,
            ),
            updateLoginState = UpdateLoginState.None,
        )

        val resultEditStateForDuplicateLogin =
            loginsReducer(state, EditLoginAction.UsernameChanged(usernameChanged = "user1234"))

        val expectedEditStateForDuplicateLogin = state.copy(
            loginsEditLoginState = LoginsEditLoginState(
                login = loginItem,
                newUsername = "user1234",
                newPassword = "password1234",
                isPasswordVisible = false,
            ),
            updateLoginState = UpdateLoginState.None,
        )

        assertEquals(
            resultEditStateForDuplicateLogin.updateLoginState,
            expectedEditStateForDuplicateLogin.updateLoginState,
        )
    }

    @Test
    fun `GIVEN we are on the edit login screen WHEN we want to save a duplicate login THEN this is reflected in the state`() {
        val loginItem1 = LoginItem(
            guid = "guid1",
            url = "https://www.yahoo.com",
            username = "user1",
            password = "pass1",
        )

        val loginItem2 = LoginItem(
            guid = "guid2",
            url = "https://www.yahoo.com",
            username = "user2",
            password = "pass2",
        )

        val state = LoginsState.default.copy(
            loginItems = listOf(loginItem1, loginItem2),
            loginsEditLoginState = LoginsEditLoginState(
                login = loginItem1,
                newUsername = "user2",
                newPassword = "password1",
                isPasswordVisible = false,
            ),
            updateLoginState = UpdateLoginState.None,
        )

        val resultEditStateForDuplicateLogin =
            loginsReducer(state, EditLoginAction.UsernameChanged(usernameChanged = "user2"))

        val expectedEditStateForDuplicateLogin = state.copy(
            loginsEditLoginState = LoginsEditLoginState(
                login = loginItem1,
                newUsername = "user2",
                newPassword = "password1",
                isPasswordVisible = false,
            ),
            updateLoginState = UpdateLoginState.Duplicate,
        )

        assertEquals(
            resultEditStateForDuplicateLogin.updateLoginState,
            expectedEditStateForDuplicateLogin.updateLoginState,
        )
    }
}
