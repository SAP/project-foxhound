/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Tests for the new game screen rendering.
 */
@RunWith(AndroidJUnit4::class)
class NewGameScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val context = ApplicationProvider.getApplicationContext<Context>()
    private val soundOnText = context.getString(R.string.sound_on)
    private val soundOffText = context.getString(R.string.sound_off)
    private fun hiscoreText(value: Int? = null) = context.getString(R.string.hiscore, value)

    private val initialGameState =
        GameState(numCells = 20, size = Size(400f, 400f), isGameOver = true)

    @Test
    fun `if you don't have a hiscore yet, no hiscore is shown`() {
        composeTestRule.setContent {
            NewGameScreen(
                initialGameState = initialGameState,
                hiscore = null,
                soundOn = false,
                onToggleSoundOn = {},
                startGame = {},
                shareHiscore = {},
            )
        }

        composeTestRule.onNodeWithText(hiscoreText()).assertIsNotDisplayed()
    }

    @Test
    fun `if you do have a hiscore, it is shown`() {
        composeTestRule.setContent {
            NewGameScreen(
                initialGameState = initialGameState,
                hiscore = 42,
                soundOn = false,
                onToggleSoundOn = {},
                startGame = {},
                shareHiscore = {},
            )
        }

        composeTestRule.onNodeWithText(hiscoreText(42)).assertIsDisplayed()
    }

    @Test
    fun `when sound is switched on, sound on label is shown`() {
        composeTestRule.setContent {
            NewGameScreen(
                initialGameState = initialGameState,
                hiscore = 0,
                soundOn = true,
                onToggleSoundOn = {},
                startGame = {},
                shareHiscore = {},
            )
        }
        composeTestRule.onNodeWithText(soundOnText).assertIsDisplayed()
    }

    @Test
    fun `when sound is switched off, sound off label is shown`() {
        composeTestRule.setContent {
            NewGameScreen(
                initialGameState = initialGameState,
                hiscore = 0,
                soundOn = false,
                onToggleSoundOn = {},
                startGame = {},
                shareHiscore = {},
            )
        }
        composeTestRule.onNodeWithText(soundOffText).assertIsDisplayed()
    }

    @Test
    fun `clicking sound off button toggles sound on`() {
        var toggleCount = 0
        composeTestRule.setContent {
            NewGameScreen(
                initialGameState = initialGameState,
                hiscore = 0,
                soundOn = false,
                onToggleSoundOn = { toggleCount++ },
                startGame = {},
                shareHiscore = {},
            )
        }
        composeTestRule.onNodeWithText(soundOffText).performClick()

        assertEquals(1, toggleCount)
    }

    @Test
    fun `clicking sound off button changes text to sound on`() {
        composeTestRule.setContent {
            var soundOn by remember { mutableStateOf(false) }
            NewGameScreen(
                initialGameState = initialGameState,
                hiscore = 0,
                soundOn = soundOn,
                onToggleSoundOn = { soundOn = !soundOn },
                startGame = {},
                shareHiscore = {},
            )
        }
        composeTestRule.onNodeWithText(soundOffText).performClick()

        composeTestRule.onNodeWithText(soundOnText).assertIsDisplayed()
    }
}
