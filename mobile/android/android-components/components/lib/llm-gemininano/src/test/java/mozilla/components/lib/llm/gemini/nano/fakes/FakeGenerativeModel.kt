/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.llm.gemini.nano.fakes

import com.google.common.util.concurrent.ListenableFuture
import com.google.mlkit.genai.common.DownloadCallback
import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.GenAiException
import com.google.mlkit.genai.common.StreamingCallback
import com.google.mlkit.genai.prompt.Candidate
import com.google.mlkit.genai.prompt.CountTokensResponse
import com.google.mlkit.genai.prompt.GenerateContentRequest
import com.google.mlkit.genai.prompt.GenerateContentResponse
import com.google.mlkit.genai.prompt.GenerativeModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.flowOf
import mozilla.components.support.test.mock
import org.mockito.Mockito.`when`
import java.util.concurrent.ExecutorService

internal class FakeGenerativeModel(
    status: Sequence<Int>,
    private val downloadFlow: Flow<DownloadStatus> = flowOf(DownloadStatus.DownloadCompleted),
    private val responseMap: Map<String, List<String>> = emptyMap(),
    private val exception: GenAiException? = null,
) : GenerativeModel {
    var lastPromptProcessed: String? = null
    val prompts = mutableListOf<String>()
    private val statusIterator = status.iterator()

    override suspend fun checkStatus(): Int = statusIterator.next()

    override fun generateContentStream(prompt: String): Flow<GenerateContentResponse> {
        lastPromptProcessed = prompt
        prompts.add(prompt)
        if (exception != null) {
            throw exception
        }

        val responseTextParts = responseMap[prompt]!!
        return responseTextParts.mapIndexed { idx, text ->
            val mockCandidate: Candidate = mock()
            `when`(mockCandidate.text).thenReturn(text)
            if (idx == responseTextParts.size - 1) {
                `when`(mockCandidate.finishReason).thenReturn(Candidate.FinishReason.STOP)
            }
            val mockResponse = mock<GenerateContentResponse>()
            `when`(mockResponse.candidates).thenReturn(listOf(mockCandidate))
            mockResponse
        }.asFlow()
    }

    override suspend fun generateContent(prompt: String): GenerateContentResponse {
        TODO("Not yet implemented")
    }

    override suspend fun getBaseModelName(): String {
        TODO("Not yet implemented")
    }

    override fun download(): Flow<DownloadStatus> = downloadFlow

    override fun downloadForFutures(callback: DownloadCallback): ListenableFuture<Void> {
        TODO("Not yet implemented")
    }

    override suspend fun warmup() {
        TODO("Not yet implemented")
    }

    override fun warmupForFutures(): ListenableFuture<Void> {
        TODO("Not yet implemented")
    }

    override suspend fun countTokens(request: GenerateContentRequest): CountTokensResponse {
        TODO("Not yet implemented")
    }

    override fun countTokensForFutures(request: GenerateContentRequest): ListenableFuture<CountTokensResponse> {
        TODO("Not yet implemented")
    }

    override suspend fun getTokenLimit(): Int {
        TODO("Not yet implemented")
    }

    override fun getTokenLimitForFutures(): ListenableFuture<Int> {
        TODO("Not yet implemented")
    }

    override suspend fun generateContent(request: GenerateContentRequest): GenerateContentResponse {
        TODO("Not yet implemented")
    }

    override suspend fun generateContent(
        request: GenerateContentRequest,
        streamingCallback: StreamingCallback,
    ): GenerateContentResponse {
        TODO("Not yet implemented")
    }

    override fun generateContentStream(request: GenerateContentRequest): Flow<GenerateContentResponse> {
        TODO("Not yet implemented")
    }

    override suspend fun clearCaches() {
        TODO("Not yet implemented")
    }

    override fun clearCachesForFutures(): ListenableFuture<Void> {
        TODO("Not yet implemented")
    }

    override fun close() {
        TODO("Not yet implemented")
    }

    override fun getWorkerExecutor(): ExecutorService {
        TODO("Not yet implemented")
    }
}
