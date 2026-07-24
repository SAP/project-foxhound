/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.llm.gemini.nano

import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import mozilla.components.concept.llm.LocalLlmProvider
import mozilla.components.concept.llm.LocalLlmProvider.State

/**
 * A [LocalLlmProvider] implementation backed by Gemini Nano.
 *
 * This provider is responsible for:
 * - Checking whether the on-device Gemini Nano model is available.
 * - Managing model download when required.
 * - Exposing availability and download progress via a [StateFlow].
 *
 * State transitions:
 * - [State.Unavailable] when the feature is not supported on the device.
 * - [State.ReadyToDownload] when the model can be downloaded.
 * - [State.Downloading] while the model is being downloaded.
 * - [State.Ready] when the model is available for inference.
 * - [State.Failed] if a download error occurs.
 *
 * @param buildModel A factory used to obtain a [GenerativeModel]. Defaults to
 * [Generation.getClient]. The model is instantiated lazily on first access.
 */
class GeminiNanoLlmProvider(
    private val buildModel: () -> GenerativeModel = { Generation.getClient() },
) : LocalLlmProvider {
    private val _state = MutableStateFlow<State>(State.Idle)

    /**
     * A [StateFlow] holding the current [State] of the provider.
     */
    override val state: StateFlow<State> = _state

    private val model by lazy {
        buildModel()
    }

    /**
     * Checks the current availability of the Gemini Nano feature on the device
     * and updates [state] accordingly.
     *
     * This method does not trigger a download.
     */
    suspend fun checkAvailability() {
        when (model.checkStatus()) {
            FeatureStatus.UNAVAILABLE -> _state.value = State.Unavailable
            FeatureStatus.DOWNLOADABLE -> _state.value = State.ReadyToDownload
            FeatureStatus.DOWNLOADING -> if (_state.value !is State.Downloading) {
                _state.value = State.Downloading(0L, 0L)
            }
            FeatureStatus.AVAILABLE -> _state.value = State.Ready(GeminiNanoLlm({ model }))
        }
    }

    /**
     * Starts downloading the Gemini Nano model if it is in the
     * [State.ReadyToDownload] state.
     *
     * If the provider is not currently [State.ReadyToDownload], this method
     * returns immediately without performing any work.
     *
     * This function is suspend and will not return until the download flow
     * completes or fails.
     */
    override suspend fun downloadIfNeeded() {
        if (_state.value is State.Idle) {
            checkAvailability()
        }

        if (_state.value != State.ReadyToDownload) {
            return
        }

        model.download().collect { downloadStatus ->
            when (downloadStatus) {
                is DownloadStatus.DownloadStarted -> {
                    _state.value = State.Downloading(
                        bytesToDownload = downloadStatus.bytesToDownload,
                        bytesDownloaded = 0L,
                    )
                }
                is DownloadStatus.DownloadProgress -> _state.value = State.Downloading(
                    bytesToDownload = _state.value.bytesToDownload,
                    bytesDownloaded = downloadStatus.totalBytesDownloaded,
                )
                is DownloadStatus.DownloadFailed -> _state.value = State.Failed
                DownloadStatus.DownloadCompleted -> _state.value = State.Ready(GeminiNanoLlm({ model }))
            }
        }
    }
}

private val State.bytesToDownload: Long
    get() = when (this) {
        is State.Downloading -> this.bytesToDownload
        else -> 0L
    }
