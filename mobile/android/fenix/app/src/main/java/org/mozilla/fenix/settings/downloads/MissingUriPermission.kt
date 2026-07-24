/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import java.io.IOException

/**
 *  Thrown to indicate that the application doesn't have permission
 *  to access a given content URI.
 */
class MissingUriPermission(message: String) : IOException(message)
