/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mozilla.telemetry.glean.GleanTimerId
import org.mozilla.fenix.longfox.GameState.Companion.CELL_SIZE_DP
import org.mozilla.fenix.longfox.GameState.Companion.GAME_INTERVAL_TIME_MS
import org.mozilla.fenix.longfox.GameState.Companion.MAX_JUST_EATEN_COUNTDOWN
import org.mozilla.fenix.longfox.GameState.Companion.MAX_SCORE_CELEBRATION_COUNTDOWN
import org.mozilla.fenix.longfox.GleanMetrics.Longfox

// Minimum drag distance (in dp) for a gesture to count as a swipe rather than a tap. Kept well
// above the platform touch slop so ordinary taps with a little finger movement are not misread as
// swipes (and therefore dropped) - see bug 2040618.
private const val MIN_SWIPE_DISTANCE_DP = 16

/**
 * The main composable container for the game.
 * Holds the game state and callbacks for resizing the screen, handling touch, playing sounds etc.
 */
@Composable
fun LongFoxGameScreen() {
    var celebrationShown by remember { mutableStateOf(false) }
    var celebrationSeed by remember { mutableIntStateOf(0) }
    var gleanTimerId: GleanTimerId? by remember { mutableStateOf(null) }
    GameBackground(celebrationShown, celebrationSeed) {
        // Make a square game grid that fits on the screen
        val density = LocalDensity.current.density
        val numCells = (minOf(maxWidth, maxHeight).value / CELL_SIZE_DP).toInt()
        val canvasSizePx = CELL_SIZE_DP * numCells * density
        var gameState by remember(numCells) {
            mutableStateOf(GameState(numCells = numCells, size = Size(canvasSizePx, canvasSizePx), isGameOver = true))
        }
        val startGame = {
            gleanTimerId = Longfox.gamePlayedLength.start()
            gameState = GameState(numCells = numCells, size = Size(canvasSizePx, canvasSizePx))
        }
        SideEffect {
            // this is to satisfy the IDE.
            // the warning seems to be a false positive with compose state
            // https://youtrack.jetbrains.com/projects/KT/issues/KT-78881/K2-False-positive-Assigned-value-is-never-read-in-composable-function
            @Suppress("AssignedValueIsNeverRead")
            if (gameState.shouldCelebrateScore && !celebrationShown) celebrationSeed = gameState.score
            celebrationShown = gameState.shouldCelebrateScore
        }

        // Tap and swipe events need to be passed through to the game.
        // Position should be recalculated if the screen is resized / configuration changed.
        val canvasOffsetXPx = (maxWidth.value * density - canvasSizePx) / 2f
        val canvasOffsetYPx = (maxHeight.value * density - canvasSizePx) / 2f
        val onTap by rememberUpdatedState { offset: Offset ->
            gameState = gameState.onTap(
                Offset(offset.x - canvasOffsetXPx, offset.y - canvasOffsetYPx),
            )
        }
        val onSwipe by rememberUpdatedState { dx: Float, dy: Float, minDistance: Float ->
            gameState = gameState.onSwipeGesture(dx, dy, minDistance)
        }
        val context = LocalContext.current
        val coroutineScope = rememberCoroutineScope()
        val longFoxDataStore = remember(context) { LongFoxDataStore(context) }
        val hiscore by longFoxDataStore.hiscoreFlow()
            .collectAsState(initial = null, coroutineScope.coroutineContext)
        val soundOn by longFoxDataStore.soundOnFlow()
            .collectAsState(initial = null, coroutineScope.coroutineContext)
        val soundEffectsPlayer = remember(soundOn) { SoundEffectsPlayer(context, soundOn == true) }

        DisposableEffect(soundEffectsPlayer) {
            onDispose { soundEffectsPlayer.release() }
        }
        LaunchedEffect(gameState.isGameOver) {
            gleanTimerId?.also {
                if (gameState.isGameOver) {
                    soundEffectsPlayer.playSound(R.raw.sadwobble)
                    Longfox.gamePlayedLength.stopAndAccumulate(it)
                }
            }
        }
        // This is the main game loop:
        // While the game is not over, wait a clock tick, move the fox and check for collisions.
        // Play a sound effect if that seems appropriate.
        LaunchedEffect(gameState) {
            while (!gameState.isGameOver) {
                delay(GAME_INTERVAL_TIME_MS)
                val moved = gameState.moveFox()
                if (moved.scoreCelebrationCountdown == MAX_SCORE_CELEBRATION_COUNTDOWN) {
                    soundEffectsPlayer.playSound(R.raw.happyvibes)
                } else if (moved.justEatenCountdown == MAX_JUST_EATEN_COUNTDOWN) {
                    soundEffectsPlayer.playSound(R.raw.eatfood)
                } else if (!moved.shouldCelebrateScore) {
                    if (moved.beepNext) {
                        soundEffectsPlayer.playSound(R.raw.beep)
                    } else {
                        soundEffectsPlayer.playSound(R.raw.boop)
                    }
                }
                gameState = moved.toggleBeepNext()
            }
            coroutineScope.launch { longFoxDataStore.saveIfHiscore(gameState.score) }
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    val minSwipeDistance = MIN_SWIPE_DISTANCE_DP.dp.toPx()
                    awaitEachGesture {
                        val down = awaitFirstDown()
                        var totalDrag = Offset.Zero
                        var lifted = false
                        while (!lifted) {
                            val event = awaitPointerEvent()
                            // Only track the pointer that started the gesture, so a second finger
                            // can't inflate the drag distance and turn a tap into a swipe.
                            val change = event.changes.firstOrNull { it.id == down.id } ?: continue
                            totalDrag += change.positionChange()
                            if (!change.pressed) lifted = true
                            change.consume()
                        }
                        if (totalDrag.getDistance() < minSwipeDistance) {
                            onTap(down.position)
                        } else {
                            onSwipe(totalDrag.x, totalDrag.y, minSwipeDistance)
                        }
                    }
                },
            contentAlignment = Alignment.Center,
        ) {
            if (gameState.isGameOver) {
                NewGameScreen(
                    initialGameState = gameState,
                    hiscore = hiscore,
                    soundOn = soundOn,
                    onToggleSoundOn = { coroutineScope.launch { longFoxDataStore.toggleSoundOn() } },
                    startGame = startGame,
                    shareHiscore = { coroutineScope.launch { longFoxDataStore.shareHiscore(it) }}
                )
            } else {
                GameCanvas(gameState)
            }
            Sparkles(
                headCentre = Offset(
                    (gameState.fox.first().x + 0.5f) * gameState.cellSize,
                    (gameState.fox.first().y + 0.5f) * gameState.cellSize,
                ),
                numCells = gameState.numCells,
                active = gameState.justEaten,
            )
        }
        Row(modifier = Modifier
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(12.dp)
            .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val onBackPressedDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher
            IconButton(onClick = { onBackPressedDispatcher?.onBackPressed() }) {
                Icon(
                    painter = painterResource(id = R.drawable.outline_arrow_back_24),
                    contentDescription = stringResource(R.string.back),
                    tint = Color.White
                )
            }
            if (gameState.score > 0) {
                ScoreContainer(gameState.score)
            }
        }
    }
}

@Preview
@Composable
fun LongFoxGameScreenPreview() {
    MaterialTheme {
        LongFoxGameScreen()
    }
}
