/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import org.mozilla.fenix.longfox.GameState.Companion.CELL_SIZE_DP
import org.mozilla.fenix.longfox.GameState.Companion.GAME_INTERVAL_TIME_MS

/**
 * A little intro screen to launch the game and provide high score and sound on/off switch.
 * @param initialGameState the current game state.
 * @param hiscore the persisted high score, or `null` while the data store is still loading.
 * @param soundOn the persisted sound setting, or `null` while the data store is still loading.
 * @param onToggleSoundOn invoked when the user taps the sound toggle.
 * @param startGame a callback to start the game.
 * @param shareHiscore a callback to share the hiscore with other apps.
 */
@Composable
fun NewGameScreen(
    initialGameState: GameState,
    hiscore: Int?,
    soundOn: Boolean?,
    onToggleSoundOn: () -> Unit,
    startGame: () -> Unit,
    shareHiscore: (Int) -> Unit,
) {
    var gameState by remember(initialGameState.numCells) {
        mutableStateOf(
            initialGameState.copy(
                fox = listOf(
                    GridPoint(1, 5),
                    GridPoint(1, 4),
                    GridPoint(1, 3),
                    GridPoint(1, 2)
                ),
                direction = Direction.DOWN,
                food = null,
            )
        )
    }

    LaunchedEffect(gameState) {
        while (true) {
            delay(GAME_INTERVAL_TIME_MS)
            gameState = gameState.foxAnimationDemo()
        }
    }

    Box(
        modifier = Modifier
            .size((CELL_SIZE_DP * gameState.numCells).dp)
            .border(1.dp, LongFoxColors.mortarColor)
            .clickable { startGame() },
    ) {
        GameCanvas(
            state = gameState,
        )
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                fontSize = 30.sp,
                fontFamily = LongFoxText.zx,
                letterSpacing = 4.sp,
                color = Color(0xffff5500),
                text = stringResource(R.string.longfox)
            )
            Text(
                modifier = Modifier.padding(top = 8.dp),
                fontSize = 12.sp,
                fontFamily = LongFoxText.zx,
                color = Color.Yellow,
                text = stringResource(R.string.likes_cookies)
            )
            Text(
                modifier = Modifier.padding(top = 10.dp),
                fontSize = 14.sp,
                fontFamily = LongFoxText.zx,
                fontStyle = FontStyle.Italic,
                color = Color.Green,
                text = stringResource(R.string.tap_to_play)
            )
            TextButton(
                modifier = Modifier
                    .padding(top = 36.dp, bottom = 36.dp)
                    .alpha(if (hiscore == null) 0f else 1f),
                onClick = { if (hiscore != null) shareHiscore(hiscore) },
            ) {
                Text(
                    modifier = Modifier
                        .alpha(if (hiscore == null) 0f else 1f),
                    fontSize = 18.sp,
                    fontFamily = LongFoxText.zx,
                    color = Color.Cyan,
                    text = stringResource(R.string.hiscore, hiscore ?: 0)
                )
                Spacer(Modifier.width(12.dp))
                Icon(
                    painter = painterResource(R.drawable.share_24),
                    tint = Color.Cyan,
                    contentDescription = stringResource(R.string.share_hiscore)
                )
            }
            Text(
                modifier = Modifier
                    .clickable { onToggleSoundOn() }
                    .border(width = 2.dp, color = if (soundOn == true) Color.White else Color.Gray)
                    .padding(8.dp)
                    .alpha(if (soundOn == null) 0f else 1f),
                fontFamily = LongFoxText.zx,
                fontSize = 16.sp,
                color = if (soundOn == true) Color.White else Color.Gray,
                text = if (soundOn == true) stringResource(R.string.sound_on) else stringResource(R.string.sound_off)
            )
        }
    }
}

@Preview
@Composable
fun NewGameScreenPreview() {
    val numCells = 18
    val canvasSizePx = CELL_SIZE_DP * numCells * LocalDensity.current.density
    NewGameScreen(
        initialGameState = GameState(
            numCells = numCells,
            size = Size(canvasSizePx, canvasSizePx),
            isGameOver = true
        ),
        hiscore = 0,
        soundOn = false,
        onToggleSoundOn = {},
        startGame = {},
        shareHiscore = {},
    )
}
