/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.test

/**
 * Fails the test if this function is used.
 */
fun assertUnused(): Nothing =
    throw AssertionError("Expected unused function, but was called")
