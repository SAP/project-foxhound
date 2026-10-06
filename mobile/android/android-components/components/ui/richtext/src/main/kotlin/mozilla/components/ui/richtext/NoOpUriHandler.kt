/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext

import androidx.compose.ui.platform.UriHandler

/**
 * A no-op URI handler to be the default handler in [RichText] to ensure that we don't handle
 * URIs unless a handler is specified
 */
internal class NoOpUriHandler : UriHandler {
    override fun openUri(uri: String) = Unit
}
