/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.ui

import android.app.Dialog
import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.ui.platform.ComposeView
import androidx.navigation.fragment.navArgs
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import mozilla.components.lib.state.helpers.StoreProvider.Companion.fragmentStore
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.settings.SupportUtils
import org.mozilla.fenix.termsofuse.experimentation.getTermsOfUsePromptContent
import org.mozilla.fenix.termsofuse.store.TermsOfUsePromptAction
import org.mozilla.fenix.termsofuse.store.TermsOfUsePromptPreferencesMiddleware
import org.mozilla.fenix.termsofuse.store.TermsOfUsePromptState
import org.mozilla.fenix.termsofuse.store.TermsOfUsePromptStore
import org.mozilla.fenix.termsofuse.store.TermsOfUsePromptTelemetryMiddleware
import org.mozilla.fenix.theme.FirefoxTheme
import com.google.android.material.R as materialR

/**
 * [BottomSheetDialogFragment] wrapper for the compose [TermsOfUseBottomSheet].
 */
class TermsOfUseBottomSheetFragment : BottomSheetDialogFragment() {

    private val args by navArgs<TermsOfUseBottomSheetFragmentArgs>()

    private var isAlreadyShowing: Boolean = false

    private val termsOfUsePromptStore by fragmentStore(TermsOfUsePromptState) {
        TermsOfUsePromptStore(
            initialState = it,
            middleware = listOf(
                TermsOfUsePromptPreferencesMiddleware(
                    repository = requireComponents.termsOfUsePromptRepository,
                ),
                TermsOfUsePromptTelemetryMiddleware(),
            ),
        )
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog =
        super.onCreateDialog(savedInstanceState).apply {
            setOnShowListener {
                val bottomSheet = findViewById<View?>(materialR.id.design_bottom_sheet)
                bottomSheet?.setBackgroundResource(android.R.color.transparent)

                if (!isAlreadyShowing) {
                    termsOfUsePromptStore.dispatch(TermsOfUsePromptAction.OnImpression(args.surface))
                    isAlreadyShowing = true
                }
            }
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = ComposeView(requireContext()).apply {
        isAlreadyShowing = savedInstanceState?.getBoolean(IS_ALREADY_SHOW_KEY) ?: false
        termsOfUsePromptStore.dispatch(TermsOfUsePromptAction.OnPromptCreated)
        setContent {
            FirefoxTheme {
                val termsOfUsePromptContent = getTermsOfUsePromptContent(
                    context = requireActivity().applicationContext,
                    id = settings().termsOfUsePromptContentOptionId,
                    onLearnMoreClicked = {
                        termsOfUsePromptStore.dispatch(
                            TermsOfUsePromptAction.OnLearnMoreClicked(args.surface),
                        )
                        SupportUtils.launchSandboxCustomTab(
                            context,
                            SupportUtils.getSumoURLForTopic(
                                context,
                                SupportUtils.SumoTopic.TERMS_OF_USE,
                                useMobilePage = false,
                            ),
                        )
                    },
                )

                TermsOfUseBottomSheet(
                    showDragHandle = settings().shouldShowTermsOfUsePromptDragHandle,
                    termsOfUsePromptContent = termsOfUsePromptContent,
                    onDismiss = { dismiss() },
                    onDismissRequest = {
                        termsOfUsePromptStore.dispatch(
                            TermsOfUsePromptAction.OnPromptManuallyDismissed(args.surface),
                        )

                        dismiss()
                    },
                    onAcceptClicked = {
                        termsOfUsePromptStore.dispatch(TermsOfUsePromptAction.OnAcceptClicked(args.surface))
                    },
                    onRemindMeLaterClicked = {
                        termsOfUsePromptStore.dispatch(
                            TermsOfUsePromptAction.OnRemindMeLaterClicked(args.surface),
                        )
                    },
                    onTermsOfUseClicked = {
                        termsOfUsePromptStore.dispatch(
                            TermsOfUsePromptAction.OnTermsOfUseClicked(args.surface),
                        )
                        SupportUtils.launchSandboxCustomTab(
                            context,
                            SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.TERMS_OF_SERVICE),
                        )
                    },
                    onPrivacyNoticeClicked = {
                        termsOfUsePromptStore.dispatch(
                            TermsOfUsePromptAction.OnPrivacyNoticeClicked(args.surface),
                        )
                        SupportUtils.launchSandboxCustomTab(
                            context,
                            SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.PRIVACY_NOTICE),
                        )
                    },
                )
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(IS_ALREADY_SHOW_KEY, isAlreadyShowing)
    }

    override fun onDismiss(dialog: DialogInterface) {
        super.onDismiss(dialog)
        termsOfUsePromptStore.dispatch(TermsOfUsePromptAction.OnPromptDismissed)
    }

    companion object {
        private const val IS_ALREADY_SHOW_KEY = "is_already_showing"
    }
}
