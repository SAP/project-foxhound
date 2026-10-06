/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.summarize.content

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import kotlin.test.assertIs

class ContentProviderTest {
    @Test
    fun `that we can provide the page content`() = runTest {
        val title = "title"
        val content = ContentProvider.fromPage(
            pageTitle = title,
            { Result.success("This is the page content") },
            { Result.success(PageMetadata(wordCount = 500)) },
        ).getContent().getOrThrow()

        assertEquals("This is the page content", content.body)
        assertEquals(PageMetadata(wordCount = 500, pageTitle = title), content.metadata)
    }

    @Test
    fun `that if extracting page metadata fails we recover with default metadata`() = runTest {
        val content = ContentProvider.fromPage(
            "",
            { Result.success("This is the page content") },
            { Result.failure(IllegalStateException()) },
        ).getContent().getOrThrow()

        assertEquals("This is the page content", content.body)
        assertEquals(PageMetadata(), content.metadata)
    }

    @Test
    fun `when the content extractor fails, the raw throwable is forwarded`() = runTest {
        val title = "title"
        val result = ContentProvider.fromPage(
            pageTitle = title,
            { Result.failure(NullPointerException("boom")) },
            { Result.success(PageMetadata(wordCount = 500)) },
        ).getContent().exceptionOrNull()

        assertIs<NullPointerException>(result)
        assertEquals("boom", result.message)
    }
}
