/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.reviewprompt

import android.app.Dialog
import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.fragment.compose.content
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewModelScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import kotlinx.coroutines.launch
import mozilla.components.lib.state.helpers.StoreProvider.Companion.fragmentStore
import mozilla.components.lib.state.helpers.StoreProvider.Companion.storeProvider
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.requireComponents
import org.mozilla.fenix.reviewprompt.CustomReviewPromptAction.LeaveFeedbackButtonClicked
import org.mozilla.fenix.reviewprompt.CustomReviewPromptAction.NegativePrePromptButtonClicked
import org.mozilla.fenix.reviewprompt.CustomReviewPromptAction.PositivePrePromptButtonClicked
import org.mozilla.fenix.reviewprompt.CustomReviewPromptAction.RateButtonClicked
import org.mozilla.fenix.reviewprompt.ui.CustomReviewPrompt
import org.mozilla.fenix.theme.FirefoxTheme
import com.google.android.material.R as materialR

/**
 * A bottom sheet fragment for displaying [CustomReviewPrompt].
 */
class CustomReviewPromptBottomSheetFragment : BottomSheetDialogFragment() {
    private val store by fragmentStore(CustomReviewPromptState.PrePrompt) {
        CustomReviewPromptStore(
            initialState = it,
            middleware = listOf(
                CustomReviewPromptNavigationMiddleware(storeProvider.viewModelScope),
                CustomReviewPromptTelemetryMiddleware(),
            ),
        )
    }

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        return super.onCreateDialog(savedInstanceState).apply {
            setOnShowListener {
                val bottomSheet = findViewById<View?>(materialR.id.design_bottom_sheet)
                bottomSheet?.setBackgroundResource(android.R.color.transparent)
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ) = content {
        val state by store.stateFlow
            .collectAsState(initial = CustomReviewPromptState.PrePrompt)

        LaunchedEffect(Unit) {
            store.dispatch(CustomReviewPromptAction.Displayed)
        }

        FirefoxTheme {
            CustomReviewPrompt(
                customReviewPromptState = state,
                onDismissRequest = { dismissAllowingStateLoss() },
                onNegativePrePromptButtonClick = { store.dispatch(NegativePrePromptButtonClicked) },
                onPositivePrePromptButtonClick = { store.dispatch(PositivePrePromptButtonClicked) },
                onRateButtonClick = { store.dispatch(RateButtonClicked) },
                onLeaveFeedbackButtonClick = { store.dispatch(LeaveFeedbackButtonClicked) },
            )
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        viewLifecycleOwner.lifecycleScope.launch {
            store.navigationEvents.collect { event ->
                when (event) {
                    CustomReviewPromptNavigationEvent.Dismiss -> dismissAllowingStateLoss()

                    CustomReviewPromptNavigationEvent.OpenPlayStoreReviewPrompt -> {
                        val activity = activity ?: return@collect
                        with(requireComponents.playStoreReviewPromptController) {
                            tryPromptReview(
                                activity = activity,
                                onNotDisplayed = { tryLaunchPlayStoreReview(activity) },
                                onError = { tryLaunchPlayStoreReview(activity) },
                            )
                        }
                    }

                    is CustomReviewPromptNavigationEvent.OpenNewTab -> {
                        requireComponents.useCases.tabsUseCases.addTab(event.url)
                        findNavController().navigate(R.id.browserFragment)
                    }
                }
            }
        }
    }

    override fun onDismiss(dialog: DialogInterface) {
        super.onDismiss(dialog)
        store.dispatch(CustomReviewPromptAction.Dismissed)
    }
}
