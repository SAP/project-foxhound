/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.perf

import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Toast
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatDialogFragment
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.fragment.app.activityViewModels
import androidx.fragment.compose.content
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Dialog fragment for starting profiling sessions. Simplified with all permission handling
 * now delegated to the ProfilerService and NotificationsDelegate.
 */
class ProfilerStartDialogFragment : AppCompatDialogFragment() {

    private val profilerViewModel: ProfilerViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ) = content {
        FirefoxTheme {
            StartProfilerScreen(viewModel = profilerViewModel)
        }
    }

    override fun onDismiss(dialog: DialogInterface) {
        profilerViewModel.resetUiState()
        super.onDismiss(dialog)
    }

    @Composable
    private fun StartProfilerScreen(viewModel: ProfilerViewModel) {
        val uiState by viewModel.uiState.collectAsState()
        val context = LocalContext.current

        val toastMessage: String? = when (val state = uiState) {
            is ProfilerUiState.ShowToast -> {
                stringResource(state.messageResId) + state.extra
            }
            is ProfilerUiState.Error -> {
                stringResource(state.messageResId) + " " + state.errorDetails
            }
            else -> null
        }

        LaunchedEffect(uiState) {
            toastMessage?.let {
                Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            }
            if (uiState.shouldDismiss()) {
                dismissAllowingStateLoss()
            }
        }

        Dialog(
            onDismissRequest = {
                if (uiState is ProfilerUiState.Idle) {
                    this@ProfilerStartDialogFragment.dismiss()
                }
            },
        ) {
            when (val currentState = uiState) {
                is ProfilerUiState.Idle -> {
                    StartCard(
                        onStartProfiler = { settings ->
                            viewModel.initiateProfilerStartProcess(settings)
                        },
                        onCancel = { this@ProfilerStartDialogFragment.dismiss() },
                    )
                }
                is ProfilerUiState.Starting -> {
                    WaitForProfilerDialog(message = R.string.profiler_waiting_start)
                }
                is ProfilerUiState.Error -> {
                    ErrorCard(
                        message = "Failed to start profiler: ${currentState.errorDetails}",
                        onDismiss = { this@ProfilerStartDialogFragment.dismiss() },
                    )
                }
                else -> {
                    WaitForProfilerDialog(message = R.string.profiler_waiting_start)
                }
            }
        }
    }

    @Composable
    private fun StartCard(
        onStartProfiler: (ProfilerSettings) -> Unit,
        onCancel: () -> Unit,
    ) {
        var selectedSetting by remember { mutableStateOf(ProfilerSettings.Firefox) }

        BaseProfilerDialogContent(
            titleText = stringResource(R.string.preferences_start_profiler),
            negativeActionText = stringResource(R.string.profiler_start_cancel),
            onNegativeAction = onCancel,
            positiveActionText = stringResource(R.string.preferences_start_profiler),
            onPositiveAction = { onStartProfiler(selectedSetting) },
        ) {
            Text(
                text = stringResource(R.string.profiler_settings_title),
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                modifier = Modifier.padding(bottom = 8.dp),
            )

            Spacer(modifier = Modifier.height(8.dp))
            Column(
                modifier = Modifier.weight(1f, fill = false)
                    .verticalScroll(rememberScrollState()),
            ) {
                ProfilerSettings.entries.forEach { setting ->
                    val settingName = when (setting) {
                        ProfilerSettings.Firefox -> stringResource(R.string.profiler_filter_firefox)
                        ProfilerSettings.Graphics -> stringResource(R.string.profiler_filter_graphics)
                        ProfilerSettings.Media -> stringResource(R.string.profiler_filter_media)
                        ProfilerSettings.Networking -> stringResource(R.string.profiler_filter_networking)
                        ProfilerSettings.Debug -> stringResource(R.string.profiler_filter_debug)
                        ProfilerSettings.WebCompat -> stringResource(R.string.profiler_filter_web_compat)
                    }
                    val settingDesc = when (setting) {
                        ProfilerSettings.Firefox -> stringResource(R.string.profiler_filter_firefox_explain)
                        ProfilerSettings.Graphics -> stringResource(R.string.profiler_filter_graphics_explain)
                        ProfilerSettings.Media -> stringResource(R.string.profiler_filter_media_explain)
                        ProfilerSettings.Networking -> stringResource(R.string.profiler_filter_networking_explain)
                        ProfilerSettings.Debug -> stringResource(R.string.profiler_filter_debug_explain)
                        ProfilerSettings.WebCompat -> stringResource(R.string.profiler_filter_web_compat_explain)
                    }

                    ProfilerLabeledRadioButton(
                        text = settingName,
                        subText = settingDesc,
                        selected = selectedSetting == setting,
                        onClick = { selectedSetting = setting },
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }

    @Composable
    private fun ErrorCard(
        @StringRes messageResId: Int? = null,
        message: String? = null,
        onDismiss: () -> Unit,
    ) {
        val actualMessage = message ?: (messageResId?.let { stringResource(id = it) } ?: "An error occurred")
        ProfilerErrorDialog(
            errorMessage = actualMessage,
            onDismiss = onDismiss,
        )
    }

    @Composable
    @PreviewLightDark
    private fun StartCardPreview() {
        FirefoxTheme {
            StartCard(
                {},
                {},
            )
        }
    }
}
