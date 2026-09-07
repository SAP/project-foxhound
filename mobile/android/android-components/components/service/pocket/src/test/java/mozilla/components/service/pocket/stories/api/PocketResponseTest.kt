/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.pocket.stories.api

import org.junit.Assert.assertSame
import org.junit.Test
import kotlin.test.assertIs

class PocketResponseTest {
    @Test
    fun `GIVEN a null argument WHEN wrap is called THEN a Failure is returned`() {
        assertIs<PocketResponse.Failure<*>>(PocketResponse.wrap(null))
    }

    @Test
    fun `GIVEN an empty Collection argument WHEN wrap is called THEN a Failure is returned`() {
        assertIs<PocketResponse.Failure<*>>(PocketResponse.wrap(emptyList<Any>()))
    }

    @Test
    fun `GIVEN a not empty Collection argument WHEN wrap is called THEN a Success wrapping that argument is returned`() {
        val argument = listOf(1)

        val result = PocketResponse.wrap(argument)

        assertIs<PocketResponse.Success<*>>(result)
        assertSame(argument, result.data)
    }

    @Test
    fun `GIVEN an empty String argument WHEN wrap is called THEN a Failure is returned`() {
        assertIs<PocketResponse.Failure<*>>(PocketResponse.wrap(""))
    }

    @Test
    fun `GIVEN a not empty String argument WHEN wrap is called THEN a Success wrapping that argument is returned`() {
        val argument = "not empty"

        val result = PocketResponse.wrap(argument)

        assertIs<PocketResponse.Success<*>>(result)
        assertSame(argument, result.data)
    }

    @Test
    fun `GIVEN a random argument WHEN wrap is called THEN a Success wrapping that argument is returned`() {
        val argument = 42

        val result = PocketResponse.wrap(argument)

        assertIs<PocketResponse.Success<*>>(result)
        assertSame(argument, result.data)
    }
}
