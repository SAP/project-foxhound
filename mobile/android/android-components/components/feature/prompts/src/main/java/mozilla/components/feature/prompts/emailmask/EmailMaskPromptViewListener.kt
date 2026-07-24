/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.prompts.emailmask

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.prompt.PromptRequest
import mozilla.components.concept.storage.Login
import mozilla.components.concept.storage.LoginHint
import mozilla.components.feature.prompts.concept.EmailMaskPromptView
import mozilla.components.feature.prompts.consumePromptFrom
import mozilla.components.support.base.log.logger.Logger

/**
 * Displays a [EmailMaskPromptBarView] for a site after receiving a [PromptRequest.EmailMaskPrompt]
 * when a user clicks into an email field on a registration form, they will see a suggestion for an email mask
 * that can be used for filling in the password field.
 *
 * @property browserStore The [BrowserStore] this feature should subscribe to.
 * @property emailMaskBar The view where the email mask prompt will be inflated.
 * @property emailMaskDelegate Delegate that handles side effects when the user interacts with the email mask prompt.
 * @property sessionId This is the id of the session which requested the prompt.
 */
internal class EmailMaskPromptViewListener(
    private val browserStore: BrowserStore,
    private val emailMaskBar: EmailMaskPromptView,
    private val emailMaskDelegate: EmailMaskDelegate,
    private var sessionId: String? = null,
) : EmailMaskPromptView.Listener {
    private val logger = Logger("EmailMaskPromptViewListener")

    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Main)
    var onEmailMaskPromptClick: () -> Unit = { }
    var logins: List<Login>? = null

    init {
        emailMaskBar.emailMaskPromptListener = this
    }

    internal fun handleEmailMaskRequest(logins: List<Login>?) {
        this.logins = logins
        emailMaskBar.showPrompt()
    }

    @Suppress("TooGenericExceptionCaught")
    fun dismissCurrentEmailMaskPrompt() {
        try {
            browserStore.consumePromptFrom<PromptRequest.SelectLoginPrompt>(sessionId) {
                it.onDismiss()
            }
        } catch (e: RuntimeException) {
            logger.error("Can't dismiss this prompt", e)
        }
        emailMaskBar.hidePrompt()
    }

    override fun shouldShowEmailMaskCfr() = emailMaskDelegate.shouldShowEmailMaskCfr()

    override fun onEmailMaskCfrDismissed() {
        emailMaskDelegate.onEmailMaskCfrDismissed()
    }

    override fun onEmailMaskPromptClick() {
        scope.launch {
            // Explicitly switch to the IO thread here to avoid blocking the main thread and causing UI slowdowns.
            val emailMask = withContext(Dispatchers.IO) {
                val selectedTabUrl = browserStore.state.selectedTab?.content?.url
                if (selectedTabUrl == null) {
                    logger.error("Selected tab URL was null")
                    null
                } else {
                    emailMaskDelegate.onEmailMaskClick(selectedTabUrl)
                }
            } ?: return@launch

            val emailMaskTemplateLogin = logins?.firstOrNull { it.hint == LoginHint.EMAIL_MASK }
                ?: run {
                    dismissCurrentEmailMaskPrompt()
                    return@launch
                }

            val emailMaskLogin = emailMaskTemplateLogin.copy(username = emailMask)

            browserStore.consumePromptFrom<PromptRequest.SelectLoginPrompt>(sessionId) {
                it.onConfirm(emailMaskLogin)
            }

            dismissCurrentEmailMaskPrompt()
        }
    }
}
