/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize

import mozilla.components.lib.state.State

/**
 * The [State] of the [SummarizationStore]
 */
internal data class SummarizationState(
    val pageSummarizationState: PageSummarizationState,
    val summarizedText: String = "",
    val productName: String = "",
) : State

/**
 * State of the summarization process
 */
internal sealed class PageSummarizationState {
    data object Inert : PageSummarizationState()
    data object ShakeConsentRequired : PageSummarizationState()
    data object ShakeConsentWithDownloadRequired : PageSummarizationState()
    data object DownloadConsentRequired : PageSummarizationState()
    data class Downloading(val bytesToDownload: Float, val bytesDownloaded: Float) : PageSummarizationState() {
        val downloadProgress: Float get() = bytesToDownload / bytesToDownload
    }
    data object Summarizing : PageSummarizationState()
    data class Summarized(val text: String) : PageSummarizationState()
    data class Error(val error: SummarizationError) : PageSummarizationState()
}

internal sealed class SummarizationError {
    data object ConsentDenied : SummarizationError()
    data object ContentUnavailable : SummarizationError()
    data object ContentTooShort : SummarizationError()
    data object ContentTooLong : SummarizationError()
    data object DownloadDenied : SummarizationError()
    data object DownloadFailed : SummarizationError()
    data object DownloadCancelled : SummarizationError()
    data object SummarizationFailed : SummarizationError()
    data object InvalidSummary : SummarizationError()
    data object NetworkError : SummarizationError()
}
