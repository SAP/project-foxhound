/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredHeight
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.feature.summarize.ui.DownloadConsent
import mozilla.components.feature.summarize.ui.DownloadError
import mozilla.components.feature.summarize.ui.DownloadProgress
import mozilla.components.feature.summarize.ui.InfoError
import mozilla.components.feature.summarize.ui.OffDeviceSummarizationConsent
import mozilla.components.feature.summarize.ui.OnDeviceSummarizationConsent

/**
 * The corner ration of the handle shape
 */
private const val DRAG_HANDLE_CORNER_RATIO = 50

/**
 * Composable function that renders the summarized text of a webpage.
 **/
@Composable
fun SummarizationUi(
    productName: String,
) {
    SummarizationScreen(
        modifier = Modifier.fillMaxWidth(),
        store = SummarizationStore(
            initialState = SummarizationState(
                pageSummarizationState = PageSummarizationState.Inert,
                productName = productName,
            ),
            reducer = ::summarizationReducer,
            middleware = listOf(SummarizationMiddleware()),
        ),
    )
}

@Composable
private fun SummarizationScreen(
    modifier: Modifier = Modifier,
    store: SummarizationStore,
) {
    val state by store.stateFlow.collectAsStateWithLifecycle()

    SummarizationScreenScaffold(modifier = modifier) {
        when (val pageState = state.pageSummarizationState) {
            is PageSummarizationState.Inert, // TODO remove once we wire middleware
            is PageSummarizationState.ShakeConsentRequired,
            -> {
                OffDeviceSummarizationConsent(
                    dispatchAction = {
                        store.dispatch(it)
                    },
                )
            }
            is PageSummarizationState.ShakeConsentWithDownloadRequired -> {
                OnDeviceSummarizationConsent(
                    productName = state.productName,
                    dispatchAction = {
                        store.dispatch(it)
                    },
                )
            }
            is PageSummarizationState.DownloadConsentRequired -> {
                DownloadConsent(
                    productName = state.productName,
                    dispatchAction = {
                        store.dispatch(it)
                    },
                )
            }
            is PageSummarizationState.Downloading -> DownloadProgress(
                downloadState = pageState,
            )
            is PageSummarizationState.Error -> {
                if (pageState.error is SummarizationError.DownloadFailed) {
                    DownloadError()
                } else {
                    InfoError()
                }
            }

            else -> Unit
        }
    }
}

@Composable
private fun SummarizationScreenScaffold(
    modifier: Modifier,
    content: @Composable (() -> Unit),
) {
    Surface(
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = modifier
            .widthIn(max = AcornTheme.layout.size.containerMaxWidth)
            .fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = AcornTheme.layout.space.static200)
                .fillMaxWidth(),
        ) {
            DragHandle(modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(AcornTheme.layout.space.static200))
            content()
            Spacer(Modifier.height(AcornTheme.layout.space.static400))
        }
    }
}

@Composable
private fun DragHandle(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.requiredHeight(36.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .requiredSize(width = 32.dp, height = 4.dp)
                .background(
                    color = MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(DRAG_HANDLE_CORNER_RATIO),
                ),
        )
    }
}

private class SummarizationStatePreviewProvider : PreviewParameterProvider<SummarizationState> {
    override val values: Sequence<SummarizationState> = sequenceOf(
        SummarizationState(
            PageSummarizationState.Summarizing,
            summarizedText = "Lorem Ipsum",
        ),
        SummarizationState(
            PageSummarizationState.Error(SummarizationError.ContentTooLong),
        ),
        SummarizationState(
            PageSummarizationState.ShakeConsentRequired,
        ),
        SummarizationState(
            PageSummarizationState.ShakeConsentWithDownloadRequired,
        ),
        SummarizationState(
            PageSummarizationState.DownloadConsentRequired,
        ),
        SummarizationState(
            PageSummarizationState.Downloading(12.13f, 9.04f),
        ),
        SummarizationState(
            PageSummarizationState.Error(SummarizationError.NetworkError),
        ),
    )
}

@Preview
@Composable
private fun SummarizationScreenPreview(
    @PreviewParameter(SummarizationStatePreviewProvider::class) state: SummarizationState,
) {
    SummarizationScreen(
        store = SummarizationStore(
            initialState = state.copy(productName = "Firefox"),
            reducer = ::summarizationReducer,
            middleware = listOf(SummarizationMiddleware()),
        ),
    )
}
