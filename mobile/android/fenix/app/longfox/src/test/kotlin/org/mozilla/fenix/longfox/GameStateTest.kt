/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * These tests set up an imaginary longfox game grid and manipulate its state.
 * The grid is 100x100 px, with a cellSize of 10. So it's a 10x10 grid in game coords.
 *
 * This is to make the maths as easy as possible :)
 *
 * For the default state in `state()`, The fox starts at 5,5. Origin is top left.
 * So it's like this:
 *
 *       0123456789
 *      0
 *      1
 *      2
 *      3     🟧
 *      4     🟧
 *      5     🦊
 *      6
 *      7
 *      8
 *      9
 */
class GameStateTest {

    @Test
    fun `fox moves down`() {
        val state = state(direction = Direction.DOWN).moveFox()
        assertEquals(GridPoint(5, 6), state.fox.first())
    }

    @Test
    fun `fox moves up`() {
        val state = state(direction = Direction.UP).moveFox()
        assertEquals(GridPoint(5, 4), state.fox.first())
    }

    @Test
    fun `fox moves left`() {
        val state = state(direction = Direction.LEFT).moveFox()
        assertEquals(GridPoint(4, 5), state.fox.first())
    }

    @Test
    fun `fox moves right`() {
        val state = state(direction = Direction.RIGHT).moveFox()
        assertEquals(GridPoint(6, 5), state.fox.first())
    }

    @Test
    fun `tail is dropped on normal move`() {
        val initial = state()
        val state = initial.moveFox()
        assertEquals(initial.fox.size, state.fox.size)
    }

    // --- moveFox: wall collisions ---

    @Test
    fun `game is not over when fox moves to a perfectly reasonable place`() {
        val state = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(2, 2), GridPoint(2, 1)),
        ).moveFox()
        assertFalse(state.isGameOver)
    }

    @Test
    fun `game over when fox hits bottom wall`() {
        val state = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(5, 9), GridPoint(5, 8)),
        )
        assertFalse(state.isGameOver)
        assertTrue(state.moveFox().isGameOver)
    }

    @Test
    fun `game over when fox hits top wall`() {
        val state = state(
            direction = Direction.UP,
            fox = listOf(GridPoint(5, 0), GridPoint(5, 1)),
        )
        assertFalse(state.isGameOver)
        assertTrue(state.moveFox().isGameOver)
    }

    @Test
    fun `game over when fox hits left wall`() {
        val state = state(
            direction = Direction.LEFT,
            fox = listOf(GridPoint(0, 5), GridPoint(1, 5)),
        )
        assertFalse(state.isGameOver)
        assertTrue(state.moveFox().isGameOver)
    }

    @Test
    fun `game over when fox hits right wall`() {
        val state = state(
            direction = Direction.RIGHT,
            fox = listOf(GridPoint(9, 5), GridPoint(8, 5)),
        )
        assertFalse(state.isGameOver)
        assertTrue(state.moveFox().isGameOver)
    }

    @Test
    fun `no game over one step before bottom wall`() {
        val state = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(5, 8), GridPoint(5, 7)),
        )
        assertFalse(state.isGameOver)
        assertFalse(state.moveFox().isGameOver)
    }

    // --- moveFox: self collision ---

    @Test
    fun `game over when fox hits itself`() {
        //  1234567
        // 1
        // 2
        // 3
        // 4  🟧🟧
        // 5  🦊🟧
        // 6
        val state = state(
            direction = Direction.RIGHT,
            fox = listOf(
                GridPoint(3, 5),
                GridPoint(4, 5),
                GridPoint(4, 4),
                GridPoint(3, 4),
                GridPoint(3, 5), // loop back — new head will land on tail
            ),
        )
        assertFalse(state.isGameOver)
        assertTrue(state.moveFox().isGameOver)
    }

    @Test
    fun `game not over when fox head moves into space where tail used to be`() {
        //before move (<- direction = left)
        //
        //⬛️1️⃣2️⃣3️⃣4️⃣5️⃣
        //1️⃣⬛️⬛️⬛️⬛️⬛️
        //2️⃣⬛️⬛️⬛️⬛️⬛️
        //3️⃣⬛️⬛️⬛️⬛️⬛️
        //4️⃣⬛️⬛️🟧🦊🟧
        //5️⃣⬛️⬛️🟧⬛️🟧
        //6️⃣⬛️⬛️🟧🟧🟧

        //after move
        //
        //⬛️1️⃣2️⃣3️⃣4️⃣5️⃣
        //1️⃣⬛️⬛️⬛️⬛️⬛️
        //2️⃣⬛️⬛️⬛️⬛️⬛️
        //3️⃣⬛️⬛️⬛️⬛️⬛️
        //4️⃣⬛️⬛️🦊🟧🟧
        //5️⃣⬛️⬛️🟧⬛️🟧
        //6️⃣⬛️⬛️🟧🟧🟧

       val initialState = state(
            direction = Direction.LEFT,
            fox = listOf(
                GridPoint(4, 4),
                GridPoint(5, 4),
                GridPoint(5, 5),
                GridPoint(5, 6),
                GridPoint(4, 6),
                GridPoint(3, 6),
                GridPoint(3, 5),
                GridPoint(3, 4),
            ),
        )
        val expectedFoxStateAfterMove = listOf(
            GridPoint(3, 4),
            GridPoint(4, 4),
            GridPoint(5, 4),
            GridPoint(5, 5),
            GridPoint(5, 6),
            GridPoint(4, 6),
            GridPoint(3, 6),
            GridPoint(3, 5),
        )
        assertFalse(initialState.isGameOver)
        val newState = initialState.moveFox()
        assertEquals(expectedFoxStateAfterMove, newState.fox)
        assertFalse(newState.isGameOver)
    }

    // --- moveFox: eating food ---

    @Test
    fun `if you eat food then immediately crash into yourself you die`() {
        // frame 1 (<- direction = left)
        //
        //⬛️1️⃣2️⃣3️⃣4️⃣5️⃣
        //1️⃣⬛️⬛️⬛️⬛️⬛️
        //2️⃣⬛️⬛️⬛️⬛️⬛️
        //3️⃣⬛️⬛️🟧⬛️⬛️
        //4️⃣⬛️⬛️🟧🍎🦊
        //5️⃣⬛️⬛️🟧⬛️🟧
        //6️⃣⬛️⬛️🟧🟧🟧
        //
        // frame 2 (<- direction = left)
        // NB tail stays where it was
        //
        //⬛️1️⃣2️⃣3️⃣4️⃣5️⃣
        //1️⃣⬛️⬛️⬛️⬛️⬛️
        //2️⃣⬛️⬛️⬛️⬛️⬛️
        //3️⃣⬛️⬛️🟧⬛️⬛️
        //4️⃣⬛️⬛️🟧🦊🟧
        //5️⃣⬛️⬛️🟧⬛️🟧
        //6️⃣⬛️⬛️🟧🟧🟧
        //
        // frame 3: tail moves but head moves into tail. game over :(
        //
        //⬛️1️⃣2️⃣3️⃣4️⃣5️⃣
        //1️⃣⬛️⬛️⬛️⬛️⬛️
        //2️⃣⬛️⬛️⬛️⬛️⬛️
        //3️⃣⬛️⬛️⬛️⬛️⬛️
        //4️⃣⬛️⬛️💥🟧🟧
        //5️⃣⬛️⬛️🟧⬛️🟧
        //6️⃣⬛️⬛️🟧🟧🟧

        val frame1state = state(
            direction = Direction.LEFT,
            fox = listOf(
                GridPoint(5, 4),
                GridPoint(5, 5),
                GridPoint(5, 6),
                GridPoint(4, 6),
                GridPoint(3, 6),
                GridPoint(3, 5),
                GridPoint(3, 4),
                GridPoint(3, 3),
            ),
            food = GridPoint(4, 4),
        )
        val expectedFrame2State = state(
            direction = Direction.LEFT,
            fox = listOf(
                GridPoint(4, 4),    // 🦊 new head added one cell left
                GridPoint(5, 4),
                GridPoint(5, 5),
                GridPoint(5, 6),
                GridPoint(4, 6),
                GridPoint(3, 6),
                GridPoint(3, 5),
                GridPoint(3, 4),
                GridPoint(3, 3),    // tail remains in the same position
            ),
        )
        // move the fox to eat the food. this is fine
        val actualFrame2state: GameState = frame1state.moveFox()
        assertFalse(actualFrame2state.isGameOver)
        assertEquals(expectedFrame2State.fox, actualFrame2state.fox)

        val expectedFrame3State = state(
            direction = Direction.LEFT,
            fox = listOf(
                GridPoint(3, 4),    // 🦊 = 💥
                GridPoint(4, 4),
                GridPoint(5, 4),
                GridPoint(5, 5),
                GridPoint(5, 6),
                GridPoint(4, 6),
                GridPoint(3, 6),
                GridPoint(3, 5),
                GridPoint(3, 4),    // 💥
            ),
        )
        // move the fox again into itself. this is game over
        val actualFrame3state: GameState = actualFrame2state.moveFox()
        assertTrue(actualFrame3state.isGameOver)
        assertEquals(expectedFrame3State.fox, actualFrame3state.fox)
    }

    @Test
    fun `fox grows when eating food`() {
        val hungryFox = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(5, 5), GridPoint(5, 4)),
            food = GridPoint(5, 6),
        )
        val fedFox = hungryFox.moveFox()
        assertEquals(hungryFox.fox.size + 1, fedFox.fox.size)
    }

    @Test
    fun `score increments when eating food`() {
        val state = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(5, 5), GridPoint(5, 4)),
            food = GridPoint(5, 6),
        ).moveFox()
        assertEquals(1, state.score)
    }

    @Test
    fun `food moves to new position after being eaten`() {
        // Placing the food at a position it would never naturally spawn at.
        // Food is not allowed to spawn right next to a wall because it's a bit annoying if it does.
        // This ensures that when it is eaten, there is no chance it will respawn in the same place.
        val food = GridPoint(0, 0)
        val state = state(
            direction = Direction.UP,
            fox = listOf(GridPoint(0, 1), GridPoint(0, 2)),
            food = food,
        ).moveFox()
        assertNotEquals(food, state.food)
    }

    @Test
    fun `food is eaten immediately if it spawns under the fox`() {
        val foodPosition = GridPoint(5, 4)
        val state = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(5, 5), foodPosition, GridPoint(5, 3)), // Head, body, tail
            food = foodPosition,
        )
        assertEquals(0, state.score)

        // The next move will be to (5,6), away from the food.
        // But the food is already under the fox, so it should be eaten.
        val nextState = state.moveFox()

        assertEquals(1, nextState.score)
        assertEquals(state.fox.size + 1, nextState.fox.size)
    }

    @Test
    fun `no game over when eating food at grid edge`() {
        val state = state(
            direction = Direction.RIGHT,
            fox = listOf(GridPoint(8, 5), GridPoint(7, 5)),
            food = GridPoint(9, 5),
        ).moveFox()
        assertFalse(state.isGameOver)
        assertEquals(1, state.score)
    }

    // --- onTap ---

    @Test
    fun `tapping left of head while moving down turns fox left`() {
        // cellSize = 10f, headX = 5 * 10 = 50
        val state =
            state(
                direction = Direction.DOWN,
                fox = listOf(GridPoint(5, 5), GridPoint(5, 4)),
            ).onTap(
                Offset(x = 25f, y = 75f),
            )
        assertEquals(Direction.LEFT, state.direction)
    }

    @Test
    fun `tapping right of head while moving down turns fox right`() {
        val state =
            state(
                direction = Direction.DOWN,
                fox = listOf(GridPoint(5, 5), GridPoint(5, 4)),
            ).onTap(
                Offset(x = 75f, y = 75f),
            )
        assertEquals(Direction.RIGHT, state.direction)
    }

    @Test
    fun `tapping above head while moving right turns fox up`() {
        // headY = 5 * 10 = 50
        val state =
            state(
                direction = Direction.RIGHT,
                fox = listOf(GridPoint(5, 5), GridPoint(4, 5))
            ).onTap(
                Offset(x = 75f, y = 25f)
            )
        assertEquals(Direction.UP, state.direction)
    }

    @Test
    fun `tapping below head while moving right turns fox down`() {
        val state =
            state(
                direction = Direction.RIGHT,
                fox = listOf(GridPoint(5, 5), GridPoint(4, 5))
            ).onTap(
                Offset(x = 75f, y = 75f)
            )
        assertEquals(Direction.DOWN, state.direction)
    }

    // --- onSwipeGesture ---

    @Test
    fun `swipe gesture mostly left while moving left stays left`() {
        val state = state(direction = Direction.LEFT).onSwipeGesture(dx = -100f, dy = 20f, minDistance = 30f)
        assertEquals(Direction.LEFT, state.direction)
    }

    @Test
    fun `swipe gesture mostly down with leftward drift while moving left turns down`() {
        val state = state(direction = Direction.LEFT).onSwipeGesture(dx = -40f, dy = 100f, minDistance = 30f)
        assertEquals(Direction.DOWN, state.direction)
    }

    @Test
    fun `swipe gesture mostly up while moving left turns up`() {
        val state = state(direction = Direction.LEFT).onSwipeGesture(dx = 0f, dy = -100f, minDistance = 30f)
        assertEquals(Direction.UP, state.direction)
    }

    @Test
    fun `swipe gesture mostly down while moving right turns down`() {
        val state = state(direction = Direction.RIGHT).onSwipeGesture(dx = 0f, dy = 100f, minDistance = 30f)
        assertEquals(Direction.DOWN, state.direction)
    }

    @Test
    fun `swipe gesture below minDistance is ignored`() {
        val state = state(direction = Direction.LEFT).onSwipeGesture(dx = 10f, dy = 10f, minDistance = 30f)
        assertEquals(Direction.LEFT, state.direction)
    }

    @Test
    fun `swipe gesture just below minDistance is ignored`() {
        val state = state(direction = Direction.RIGHT).onSwipeGesture(dx = 0f, dy = 29f, minDistance = 30f)
        assertEquals(Direction.RIGHT, state.direction)
    }

    @Test
    fun `swipe gesture exactly at minDistance is applied`() {
        val state = state(direction = Direction.RIGHT).onSwipeGesture(dx = 0f, dy = 30f, minDistance = 30f)
        assertEquals(Direction.DOWN, state.direction)
    }

    @Test
    fun `swipe gesture right while moving left is ignored`() {
        val state = state(direction = Direction.LEFT).onSwipeGesture(dx = 100f, dy = 0f, minDistance = 30f)
        assertEquals(Direction.LEFT, state.direction)
    }

    @Test
    fun `swipe gesture left while moving right is ignored`() {
        val state = state(direction = Direction.RIGHT).onSwipeGesture(dx = -100f, dy = 0f, minDistance = 30f)
        assertEquals(Direction.RIGHT, state.direction)
    }

    @Test
    fun `swipe gesture down while moving up is ignored`() {
        val state = state(direction = Direction.UP).onSwipeGesture(dx = 0f, dy = 100f, minDistance = 30f)
        assertEquals(Direction.UP, state.direction)
    }

    @Test
    fun `swipe gesture up while moving down is ignored`() {
        val state = state(direction = Direction.DOWN).onSwipeGesture(dx = 0f, dy = -100f, minDistance = 30f)
        assertEquals(Direction.DOWN, state.direction)
    }

    // --- shouldersDirection / tailDirection ---

    @Test
    fun `shouldersDirection reflects the direction from shoulder to body`() {
        val state = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(5, 5), GridPoint(5, 4), GridPoint(5, 3)),
        )
        assertEquals(Direction.DOWN, state.shouldersDirection)
    }

    @Test
    fun `tailDirection reflects the direction from tail segment outward`() {
        val state = state(
            direction = Direction.DOWN,
            fox = listOf(GridPoint(5, 5), GridPoint(5, 4), GridPoint(5, 3)),
        )
        assertEquals(Direction.UP, state.tailDirection)
    }

    private fun state(
        direction: Direction = Direction.DOWN,
        fox: List<GridPoint> = listOf(GridPoint(5, 5), GridPoint(5, 4), GridPoint(5, 3)),
        food: GridPoint = GridPoint(0, 0),
        numCells: Int = 10,
    ): GameState {
        val cellSize = 10f
        return GameState(
            size = Size(numCells * cellSize, numCells * cellSize),
            fox = fox,
            food = food,
            direction = direction,
            numCells = numCells,
        )
    }
}
