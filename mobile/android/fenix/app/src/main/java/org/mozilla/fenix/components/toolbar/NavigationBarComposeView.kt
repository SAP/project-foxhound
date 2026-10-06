/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import android.annotation.SuppressLint
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.AbstractComposeView
import mozilla.components.concept.toolbar.ScrollableToolbar

/**
 * A no-op [ScrollableToolbar] [AbstractComposeView]. Implements the interface only so
 * [EngineViewClippingBehavior] tracks its translation as a clipping dependency.
 */
@SuppressLint("ViewConstructor") // This view is only instantiated in code
class NavigationBarComposeView(
    context: Context,
    private val content: @Composable () -> Unit,
) : AbstractComposeView(context), ScrollableToolbar {

    @Composable
    override fun Content() = content()

    override fun enableScrolling() = Unit
    override fun disableScrolling() = Unit
    override fun expand() = Unit
    override fun collapse() = Unit
}
