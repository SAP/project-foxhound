/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.preferences

/**
 * Represents the officially declared preference type.
 */
enum class BrowserPrefType {

    /**
     * Something went wrong and an unidentified or error type was returned.
     */
    INVALID,

    /**
     * String defined preference type. Note: In some implementations, this may be a broader encompassing type.
     */
    STRING,

    /**
     * Integer defined preference type.
     */
    INT,

    /**
     * Boolean defined preference type.
     */
    BOOL,
}
