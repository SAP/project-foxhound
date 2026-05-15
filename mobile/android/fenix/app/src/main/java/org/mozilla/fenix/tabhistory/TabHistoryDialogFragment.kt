/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabhistory

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.navigation.fragment.findNavController
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.mapNotNull
import mozilla.components.browser.state.action.EngineAction
import mozilla.components.browser.state.selector.findCustomTabOrSelectedTab
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.support.ktx.android.content.getColorFromAttr
import org.mozilla.fenix.R
import org.mozilla.fenix.databinding.FragmentTabHistoryDialogBinding
import org.mozilla.fenix.ext.requireComponents
import com.google.android.material.R as materialR

class TabHistoryDialogFragment : BottomSheetDialogFragment() {

    var customTabSessionId: String? = null

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
    ): View? = inflater.inflate(R.layout.fragment_tab_history_dialog, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val binding = FragmentTabHistoryDialogBinding.bind(view)

        view.setBackgroundColor(view.context.getColorFromAttr(materialR.attr.colorSurface))

        customTabSessionId = requireArguments().getString(EXTRA_SESSION_ID)

        val controller = DefaultTabHistoryController(
            navController = findNavController(),
            goToHistoryIndexUseCase = requireComponents.useCases.sessionUseCases.goToHistoryIndex,
            customTabId = customTabSessionId,
        )
        val tabHistoryView = TabHistoryView(
            container = binding.tabHistoryLayout,
            expandDialog = ::expand,
            interactor = TabHistoryInteractor(controller),
        )

        // flush the session state for showing the most recent the engine session state of the selected tab.
        requireComponents.core.store.state.selectedTabId?.let {
            requireComponents.core.store.dispatch(
                EngineAction.FlushEngineSessionStateAction(it),
            )
        }

        // flush the session state for showing the most recent the engine session state of the custom tab.
        customTabSessionId?.let {
            requireComponents.core.store.dispatch(
                EngineAction.FlushEngineSessionStateAction(it),
            )
        }

        requireComponents.core.store.flowScoped(viewLifecycleOwner, Dispatchers.Main) { flow ->
            flow.mapNotNull { state -> state.findCustomTabOrSelectedTab(customTabSessionId)?.content?.history }
                .distinctUntilChanged()
                .collect { historyState ->
                    tabHistoryView.updateState(historyState)
                }
        }
    }

    private fun expand() {
        (dialog as BottomSheetDialog).behavior.state = BottomSheetBehavior.STATE_EXPANDED
    }

    companion object {
        const val EXTRA_SESSION_ID = "activeSessionId"
        val NAME: String = TabHistoryDialogFragment::class.java.canonicalName?.substringAfterLast('.')
            ?: TabHistoryDialogFragment::class.java.simpleName
    }
}
