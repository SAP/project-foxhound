/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.prompts.emailmask

import android.content.Context
import android.util.AttributeSet
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.AbstractComposeView
import androidx.core.view.isVisible
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.feature.prompts.concept.EmailMaskPromptView
import mozilla.components.feature.prompts.concept.ToggleablePrompt
import mozilla.components.feature.prompts.R as promptsR

/**
 * The top-level view holder for the Email Mask Prompt Bar.
 */
class EmailMaskPromptBarView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : AbstractComposeView(context, attrs, defStyleAttr), EmailMaskPromptView {
    private var shouldShowCfrState by mutableStateOf(false)

    override var emailMaskPromptListener: EmailMaskPromptView.Listener? = null
    override var toggleablePromptListener: ToggleablePrompt.Listener? = null

    override val isPromptDisplayed
        get() = isVisible

    override fun showPrompt() {
        shouldShowCfrState = emailMaskPromptListener?.shouldShowEmailMaskCfr() ?: false
        isVisible = true
        toggleablePromptListener?.onShown()
    }

    override fun hidePrompt() {
        isVisible = false
        toggleablePromptListener?.onHidden()
    }

    @Composable
    override fun Content() {
        AcornTheme {
            EmailMaskPromptBar(
                shouldShowCfr = shouldShowCfrState,
                cfrText = context.getString(
                    promptsR.string.mozac_feature_relay_email_masks_cfr,
                    context.getString(promptsR.string.firefox_relay),
                ),
                onCfrDismiss = {
                    emailMaskPromptListener?.onEmailMaskCfrDismissed()
                },
                onMaskEmailClicked = {
                    emailMaskPromptListener?.onEmailMaskPromptClick()
                },
            )
        }
    }
}
