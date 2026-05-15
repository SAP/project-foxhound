/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Toast
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import androidx.fragment.compose.content
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Dialog fragment for stopping profiling sessions. The dialog uses the [ProfilerViewModel]
 * to manage the state of the profiler.
 */
class ProfilerStopDialogFragment : DialogFragment() {

    private val profilerViewModel: ProfilerViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ) = content {
        StopProfilerScreen(profilerViewModel)
    }

    override fun onDismiss(dialog: DialogInterface) {
        profilerViewModel.resetUiState()
        super.onDismiss(dialog)
        if (activity is StopProfilerActivity) {
            activity?.finish()
        }
    }

    @Composable
    private fun StopProfilerScreen(viewModel: ProfilerViewModel) {
        val uiState by viewModel.uiState.collectAsState()
        val context = LocalContext.current

        val toastMessage: String? = when (val state = uiState) {
            is ProfilerUiState.ShowToast ->
                stringResource(state.messageResId) + state.extra
            is ProfilerUiState.Error ->
                stringResource(state.messageResId) + state.errorDetails
            else -> null
        }

        LaunchedEffect(uiState) {
            when (uiState) {
                is ProfilerUiState.ShowToast -> {
                    Toast.makeText(context, toastMessage.orEmpty(), Toast.LENGTH_LONG).show()
                }
                is ProfilerUiState.Finished -> {
                    dismissAllowingStateLoss()
                }
                is ProfilerUiState.Error -> {
                    Toast.makeText(context, toastMessage.orEmpty(), Toast.LENGTH_LONG).show()
                    dismissAllowingStateLoss()
                }
                else -> {}
            }
        }

        Dialog(
            onDismissRequest = {
                // Prevent dismissal while gathering or stopping
                if (uiState !is ProfilerUiState.Gathering && uiState !is ProfilerUiState.Stopping) {
                    this@ProfilerStopDialogFragment.dismiss()
                }
            },
        ) {
            when (uiState) {
                is ProfilerUiState.Idle, is ProfilerUiState.Running -> {
                    UrlWarningCard(
                        onStopAndSave = { viewModel.stopProfilerAndSave() },
                        onStopWithoutSaving = { viewModel.stopProfilerWithoutSaving() },
                    )
                }
                is ProfilerUiState.Gathering -> {
                    WaitForProfilerDialog(R.string.profiler_gathering)
                }
                is ProfilerUiState.Stopping -> {
                    WaitForProfilerDialog(R.string.profiler_stopping)
                }
                else -> {
                    WaitForProfilerDialog(R.string.profiler_stopping)
                }
            }
        }
    }
}

@Composable
private fun UrlWarningCard(
    onStopAndSave: () -> Unit,
    onStopWithoutSaving: () -> Unit,
) {
    BaseProfilerDialogContent(
        titleText = stringResource(R.string.profiler_url_warning),
        negativeActionText = stringResource(R.string.profiler_start_cancel),
        onNegativeAction = onStopWithoutSaving,
        positiveActionText = stringResource(R.string.profiler_as_url),
        onPositiveAction = onStopAndSave,
    ) {
        Text(
            text = stringResource(R.string.profiler_url_warning_explained),
            fontWeight = FontWeight.Medium,
            fontSize = 15.sp,
        )
    }
}

@Composable
@PreviewLightDark
private fun UrlWarningCardPreview() {
    FirefoxTheme {
        UrlWarningCard(
            onStopAndSave = {},
            onStopWithoutSaving = {},
        )
    }
}
