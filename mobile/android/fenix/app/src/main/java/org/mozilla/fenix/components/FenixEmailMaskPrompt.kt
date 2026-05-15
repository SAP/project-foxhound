/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.view.View
import mozilla.components.feature.prompts.concept.EmailMaskPromptView
import mozilla.components.feature.prompts.concept.ToggleablePrompt
import org.mozilla.fenix.browser.AutofillSelectBarBehavior
import org.mozilla.fenix.components.toolbar.ToolbarPosition
import org.mozilla.fenix.ext.behavior

/**
 * Fenix specific implementation of [EmailMaskPromptView].
 *
 * @param viewProvider Closure to provide a view of type V where V is a [View] and [EmailMaskPromptView].
 * @param toolbarPositionProvider Closure to provide the current [ToolbarPosition].
 * @param onShow callback that is called when the prompt is presented.
 * @param onHide callback that is called when the prompt is dismissed.
 */
class FenixEmailMaskPrompt<V>(
    private val viewProvider: () -> V,
    private val toolbarPositionProvider: () -> ToolbarPosition,
    private val onShow: () -> Unit,
    private val onHide: () -> Unit,
) : EmailMaskPromptView where V : View, V : EmailMaskPromptView {

    private val view: V by lazy { viewProvider() }
    private var isVisible: Boolean = false

    override var emailMaskPromptListener: EmailMaskPromptView.Listener? = null
    override var toggleablePromptListener: ToggleablePrompt.Listener? = null

    override val isPromptDisplayed: Boolean
        get() = isVisible

    override fun showPrompt() = with(view) {
        emailMaskPromptListener = this@FenixEmailMaskPrompt.emailMaskPromptListener
        toggleablePromptListener = this@FenixEmailMaskPrompt.toggleablePromptListener
        showPrompt()
        behavior = createCustomAutofillBarBehavior()
        isVisible = true
        this@FenixEmailMaskPrompt.onShow()
    }

    override fun hidePrompt() = with(view) {
        hidePrompt()
        emailMaskPromptListener = null
        toggleablePromptListener = null
        behavior = null
        isVisible = false
        this@FenixEmailMaskPrompt.onHide()
    }

    private fun <T : View> T.createCustomAutofillBarBehavior() = AutofillSelectBarBehavior<T>(
        context = context,
        toolbarPosition = toolbarPositionProvider(),
    )
}
