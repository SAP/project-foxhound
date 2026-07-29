/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import org.mozilla.fenix.longfox.Direction.DOWN
import org.mozilla.fenix.longfox.Direction.LEFT
import org.mozilla.fenix.longfox.Direction.RIGHT
import org.mozilla.fenix.longfox.Direction.UP
import kotlin.random.Random

/**
 * This class encapsulates the state of the longfox game
 * 🦊🟧🟧🟧🟧🟧
 *
 * It uses the min width of the container and a fixed cell size to determine the best size
 * for a square game grid.
 * Then it allocates some space for a fox and the food it is planning to eat.
 * It moves the fox around and decides whether it lives or dies.
 *
 * @param size The size of the container for the game.
 * @param fox The list of grid points that make up the fox's body.
 * @param food The grid point where the food is located.
 * @param direction The current direction of the fox's movement.
 * @param isGameOver A boolean indicating if the game is over.
 * @param score The player's current score.
 * @param beepNext This is a flag for the audio state machine
 * @param numCells The number of cells in the grid.
 */
data class GameState(
    val size: Size = Size(0f, 0f),
    val fox: List<GridPoint> = listOf(
        GridPoint(5, 5), GridPoint(5, 4), GridPoint(5, 3), GridPoint(5, 2)
    ),
    val food: GridPoint? = GridPoint(8, 8),
    val direction: Direction = DOWN,
    val isGameOver: Boolean = false,
    val score: Int = 0,
    val beepNext: Boolean = true,
    val numCells: Int = 12,
    val justEatenCountdown: Int = 0,
    val scoreCelebrationCountdown: Int = 0,
) {

    companion object {
        const val CELL_SIZE_DP = 20f
        const val GAME_INTERVAL_TIME_MS = 100L
        const val MAX_SCORE_CELEBRATION_COUNTDOWN = 10
        const val MAX_JUST_EATEN_COUNTDOWN = 5
        const val HOW_MUCH_FOOD_IS_WORTH_CELEBRATING = 20
    }

    val cellSize = (size.minDimension / numCells).toInt().toFloat()
    val justEaten: Boolean = justEatenCountdown > 0
    val shouldCelebrateScore: Boolean = scoreCelebrationCountdown > 0

    /** this is the direction the fox's shoulders are facing */
    val shouldersDirection: Direction = when {
        fox.size < 3 -> direction
        else -> fox[1].directionTo(fox[2])
    }

    /** this is the direction from the fox to its tail */
    val tailDirection: Direction = when {
        fox.size < 3 -> direction
        else -> fox[fox.size - 2].directionTo(fox[fox.size - 3])
    }

    /**
     * Audio state machine: beep boop beep boop....
     */
    fun toggleBeepNext(): GameState = copy(beepNext = !beepNext)

    /**
     * This function moves the fox in its current direction.
     * It determines the new state of the fox after it has moved: is it longer? is it dead?
     * or has it just shifted along a space?
     */
    fun moveFox(): GameState {
        val newHead = makeNewHead(direction, fox.first())

        val collidedWithSelf = newHead in fox.dropLast(1)
        val collidedWithEdge = !withinBounds(newHead)
        val collidedWithFood = newHead == food || food in fox
        val isGameOver = collidedWithSelf || collidedWithEdge

        return if (collidedWithFood && !isGameOver) {
            val newScore: Int = score + 1
            val newScoreCelebrationCountdown: Int =
                if (newScore % HOW_MUCH_FOOD_IS_WORTH_CELEBRATING == 0) MAX_SCORE_CELEBRATION_COUNTDOWN else scoreCelebrationCountdown
            copy(
                food = randomGridPoint(),
                fox = listOf(newHead) + fox,
                isGameOver = false,
                score = newScore,
                justEatenCountdown = MAX_JUST_EATEN_COUNTDOWN,
                scoreCelebrationCountdown = newScoreCelebrationCountdown,
            )
        } else {
            copy(
                fox = listOf(newHead) + fox.dropLast(1),
                isGameOver = isGameOver,
                justEatenCountdown = if (justEatenCountdown > 0) justEatenCountdown - 1 else 0,
                scoreCelebrationCountdown = if (scoreCelebrationCountdown > 0) scoreCelebrationCountdown - 1 else 0,
            )
        }
    }

    fun foxAnimationDemo(): GameState {
        val head = fox.first()

        val newDirection = when {
            head.y >= numCells - 2 -> {
                if (head.x < numCells - 2) RIGHT else UP
            }
            head.y < 2 -> {
                if (head.x >= 2) LEFT else DOWN
            }
            else -> direction
        }

        val newFox = listOf(makeNewHead(newDirection, head)) + fox.dropLast(1)
        return copy(fox = newFox, direction = newDirection)
    }

    private fun makeNewHead(
        newDirection: Direction,
        head: GridPoint,
    ): GridPoint = when (newDirection) {
        UP -> head.copy(y = head.y - 1)
        DOWN -> head.copy(y = head.y + 1)
        LEFT -> head.copy(x = head.x - 1)
        RIGHT -> head.copy(x = head.x + 1)
    }

    /**
     * Handles the player's tap input.
     * The tap is processed as a direction orthogonal to the current movement - the fox can't
     * reverse its direction so will always seek to turn 90 degrees.
     * @param offset The tap location on the screen in px
     */
    fun onTap(offset: Offset): GameState {
        val (x, y) = offset
        // the tap offset is in px,
        // so we need to multiply by cellSize to get pixel coordinates from grid position
        val headX = fox.first().x * cellSize
        val headY = fox.first().y * cellSize
        val newDirection = when (direction) {
            UP, DOWN -> if (x < headX) LEFT else RIGHT
            LEFT, RIGHT -> if (y < headY) UP else DOWN
        }
        return copy(direction = newDirection)
    }

    /**
     * Handles a swipe gesture vector by picking the dominant axis. Swipes shorter than
     * minDistance along both axes are ignored, as are swipes that would reverse direction
     * (the fox cannot reverse).
     */
    fun onSwipeGesture(dx: Float, dy: Float, minDistance: Float): GameState {
        val absDx = kotlin.math.abs(dx)
        val absDy = kotlin.math.abs(dy)
        if (maxOf(absDx, absDy) < minDistance) return this
        val swipeDirection = if (absDx > absDy) {
            if (dx > 0) RIGHT else LEFT
        } else {
            if (dy > 0) DOWN else UP
        }
        val canChange = when (swipeDirection) {
            UP -> direction != DOWN
            DOWN -> direction != UP
            LEFT -> direction != RIGHT
            RIGHT -> direction != LEFT
        }
        return if (canChange) copy(direction = swipeDirection) else this
    }

    /**
     * Food can spawn anywhere except right next to the walls, because that's quite annoying
     */
    private fun randomGridPoint(): GridPoint = GridPoint(
        Random.nextInt(from = 1, until = numCells - 1),
        Random.nextInt(from = 1, until = numCells - 1),
    )

    private fun withinBounds(point: GridPoint): Boolean =
        point.x in 0 until numCells && point.y in 0 until numCells

}
