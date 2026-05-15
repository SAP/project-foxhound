/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.toolbar.internal

import android.graphics.Color
import android.net.InetAddresses
import android.text.SpannableStringBuilder
import android.text.style.ForegroundColorSpan
import android.util.Patterns
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.toolbar.Toolbar
import mozilla.components.concept.toolbar.fake.FakeToolbar
import mozilla.components.feature.toolbar.ToolbarFeature
import mozilla.components.lib.publicsuffixlist.PublicSuffixList
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements

@RunWith(AndroidJUnit4::class)
@Config(shadows = [ShadowInetAddresses::class])
class URLRendererTest {

    private val testDispatcher = StandardTestDispatcher()
    private val testScope = CoroutineScope(testDispatcher)

    @Test
    fun `Lifecycle methods start and stop job`() {
        val renderer = URLRenderer(FakeToolbar(), getConfiguration())

        assertNull(renderer.job)

        renderer.start()

        assertNotNull(renderer.job)
        assertTrue(renderer.job!!.isActive)

        renderer.stop()

        assertNotNull(renderer.job)
        assertFalse(renderer.job!!.isActive)
    }

    @Test
    fun `Render with configuration`() {
        runTest(testDispatcher) {
            val renderedUrl = getSpannedUrl("https://www.mozilla.org/")

            assertEquals("https://www.mozilla.org/", renderedUrl.toString())

            val spans = renderedUrl.getSpans(0, renderedUrl.length, ForegroundColorSpan::class.java)

            assertEquals(2, spans.size)
            assertEquals(Color.GREEN, spans[0].foregroundColor)
            assertEquals(Color.RED, spans[1].foregroundColor)

            val domain = renderedUrl.subSequence(12, 23)
            assertEquals("mozilla.org", domain.toString())

            val domainSpans = renderedUrl.getSpans(13, 23, ForegroundColorSpan::class.java)
            assertEquals(2, domainSpans.size)
            assertEquals(Color.GREEN, domainSpans[0].foregroundColor)
            assertEquals(Color.RED, domainSpans[1].foregroundColor)

            val prefix = renderedUrl.subSequence(0, 12)
            assertEquals("https://www.", prefix.toString())

            val prefixSpans = renderedUrl.getSpans(0, 12, ForegroundColorSpan::class.java)
            assertEquals(1, prefixSpans.size)
            assertEquals(Color.GREEN, prefixSpans[0].foregroundColor)

            val suffix = renderedUrl.subSequence(23, renderedUrl.length)
            assertEquals("/", suffix.toString())

            val suffixSpans = renderedUrl.getSpans(23, renderedUrl.length, ForegroundColorSpan::class.java)
            assertEquals(1, suffixSpans.size)
            assertEquals(Color.GREEN, suffixSpans[0].foregroundColor)
        }
    }

    @Test
    fun `GIVEN a simple domain WHEN getting registrable domain span in host THEN span is returned`() {
        runTest(testDispatcher) {
            val domainSpan = getRegistrableDomainSpanInHost(
                host = "www.mozilla.org",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(4 to 15, domainSpan)
        }
    }

    @Test
    fun `GIVEN a host with a trailing period in the domain WHEN getting registrable domain span in host THEN span is returned`() {
        runTest(testDispatcher) {
            val domainSpan = getRegistrableDomainSpanInHost(
                host = "www.mozilla.org.",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(4 to 15, domainSpan)
        }
    }

    @Test
    fun `GIVEN a host with a repeated domain WHEN getting registrable domain span in host THEN the span of the last occurrence of domain is returned`() {
        runTest(testDispatcher) {
            val domainSpan = getRegistrableDomainSpanInHost(
                host = "mozilla.org.mozilla.org",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(12 to 23, domainSpan)
        }
    }

    @Test
    fun `GIVEN an IPv4 address as host WHEN getting registrable domain span in host THEN null is returned`() {
        runTest(testDispatcher) {
            val domainSpan = getRegistrableDomainSpanInHost(
                host = "127.0.0.1",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertNull(domainSpan)
        }
    }

    @Test
    fun `GIVEN an IPv6 address as host WHEN getting registrable domain span in host THEN null is returned`() {
        runTest(testDispatcher) {
            val domainSpan = getRegistrableDomainSpanInHost(
                host = "[::1]",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertNull(domainSpan)
        }
    }

    @Test
    fun `GIVEN a non PSL domain as host WHEN getting registrable domain span in host THEN null is returned`() {
        runTest(testDispatcher) {
            val domainSpan = getRegistrableDomainSpanInHost(
                host = "localhost",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertNull(domainSpan)
        }
    }

    @Test
    fun `GIVEN a simple URL WHEN getting registrable domain or host span THEN span is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "https://www.mozilla.org/",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(12 to 23, span)
        }
    }

    @Test
    fun `GIVEN a URL with a trailing period in the domain WHEN getting registrable domain or host span THEN span is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "https://www.mozilla.org./",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(12 to 23, span)
        }
    }

    @Test
    fun `GIVEN a URL with a repeated domain WHEN getting registrable domain or host span THEN the span of the last occurrence of domain is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "https://mozilla.org.mozilla.org/",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(20 to 31, span)
        }
    }

    @Test
    fun `GIVEN a URL with an IPv4 address WHEN getting registrable domain or host span THEN the span of the IP part is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "http://127.0.0.1/",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(7 to 16, span)
        }
    }

    @Test
    fun `GIVEN a URL with an IPv6 address WHEN getting registrable domain or host span THEN the span of the IP part is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "http://[::1]/",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(7 to 12, span)
        }
    }

    @Test
    fun `GIVEN a URL with a non PSL domain WHEN getting registrable domain or host span THEN the span of the host part is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "http://localhost/",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(7 to 16, span)
        }
    }

    @Test
    fun `GIVEN an internal page name WHEN getting registrable domain or host span THEN null is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "about:mozilla",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertNull(span)
        }
    }

    @Test
    fun `GIVEN a content URI WHEN getting registrable domain or host span THEN null is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "content://media/external/file/1000000000",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertNull(span)
        }
    }

    @Test
    fun `GIVEN a blob URI WHEN getting registrable domain or host span THEN domain span is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "blob:https://www.mozilla.org/69a29afb-938c-4b9e-9fca-b2f79755047a",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertEquals(17 to 28, span)
        }
    }

    @Test
    fun `GIVEN a blob URI with duplicated blob prefix WHEN getting registrable domain or host span THEN null is returned`() {
        runTest(testDispatcher) {
            val span = getRegistrableDomainOrHostSpan(
                url = "blob:blob:https://www.mozilla.org/69a29afb-938c-4b9e-9fca-b2f79755047a",
                publicSuffixList = PublicSuffixList(testContext, scope = testScope),
            )

            assertNull(span)
        }
    }

    @Test
    fun `GIVEN a simple URL WHEN rendering it THEN registrable domain is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredUrl(
                testUrl = "https://www.mozilla.org/",
                expectedRegistrableDomainSpan = 12 to 23,
            )
        }
    }

    @Test
    fun `GIVEN a URL with a trailing period in the domain WHEN rendering it THEN registrable domain is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredUrl(
                testUrl = "https://www.mozilla.org./",
                expectedRegistrableDomainSpan = 12 to 23,
            )
        }
    }

    @Test
    fun `GIVEN a URL with a repeated domain WHEN rendering it THEN the last occurrence of domain is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredUrl(
                testUrl = "https://mozilla.org.mozilla.org/",
                expectedRegistrableDomainSpan = 20 to 31,
            )
        }
    }

    @Test
    fun `GIVEN a URL with an IPv4 address WHEN rendering it THEN the IP part is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredUrl(
                testUrl = "http://127.0.0.1/",
                expectedRegistrableDomainSpan = 7 to 16,
            )
        }
    }

    @Test
    fun `GIVEN a URL with an IPv6 address WHEN rendering it THEN the IP part is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredUrl(
                testUrl = "http://[::1]/",
                expectedRegistrableDomainSpan = 7 to 12,
            )
        }
    }

    @Test
    fun `GIVEN a URL with a non PSL domain WHEN rendering it THEN host colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredUrl(
                testUrl = "http://localhost/",
                expectedRegistrableDomainSpan = 7 to 16,
            )
        }
    }

    @Test
    fun `GIVEN an internal page name WHEN rendering it THEN nothing is colored`() {
        runTest(testDispatcher) {
            testRenderWithUncoloredUrl("about:mozilla")
        }
    }

    @Test
    fun `GIVEN a content URI WHEN rendering it THEN nothing is colored`() {
        runTest(testDispatcher) {
            testRenderWithUncoloredUrl("content://media/external/file/1000000000")
        }
    }

    @Test
    fun `GIVEN a simple URL WHEN rendering it THEN registrable domain is set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "https://www.mozilla.org/",
                expectedUrl = "mozilla.org",
            )
        }
    }

    @Test
    fun `GIVEN a URL with a trailing period in the domain WHEN rendering it THEN registrable domain is set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "https://www.mozilla.org./",
                expectedUrl = "mozilla.org",
            )
        }
    }

    @Test
    fun `GIVEN a URL with a repeated domain WHEN rendering it THEN the last occurrence of domain is set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "https://mozilla.org.mozilla.org/",
                expectedUrl = "mozilla.org",
            )
        }
    }

    @Test
    fun `GIVEN a URL with an IPv4 address WHEN rendering it THEN the IP part is set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "http://127.0.0.1/",
                expectedUrl = "127.0.0.1",
            )
        }
    }

    @Test
    fun `GIVEN a URL with an IPv6 address WHEN rendering it THEN the IP part is set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "http://[::1]/",
                expectedUrl = "[::1]",
            )
        }
    }

    @Test
    fun `GIVEN a URL with a non PSL domain WHEN rendering it THEN host set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "http://localhost/",
                expectedUrl = "localhost",
            )
        }
    }

    @Test
    fun `GIVEN an internal page name WHEN rendering it THEN it is set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "about:mozilla",
                expectedUrl = "about:mozilla",
            )
        }
    }

    @Test
    fun `GIVEN a content URI WHEN rendering it THEN it is set`() {
        runTest(testDispatcher) {
            testRenderWithRegistrableDomain(
                testUrl = "content://media/external/file/1000000000",
                expectedUrl = "content://media/external/file/1000000000",
            )
        }
    }

    @Test
    fun `GIVEN a simple URL WHEN rendering it THEN domain set and registrable domain is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "https://www.mozilla.org/",
                expectedUrl = "www.mozilla.org",
                expectedRegistrableDomainSpan = 4 to 15,
            )
        }
    }

    @Test
    fun `GIVEN a URL with a trailing period in the domain WHEN rendering it THEN domain is set and registrable domain is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "https://www.mozilla.org./",
                expectedUrl = "www.mozilla.org.",
                expectedRegistrableDomainSpan = 4 to 15,
            )
        }
    }

    @Test
    fun `GIVEN a URL with a repeated domain WHEN rendering it THEN domain is set and the last occurrence of domain is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "https://mozilla.org.mozilla.org/",
                expectedUrl = "mozilla.org.mozilla.org",
                expectedRegistrableDomainSpan = 12 to 23,
            )
        }
    }

    @Test
    fun `GIVEN a URL with an IPv4 address WHEN rendering it THEN the IP part is set and colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "http://127.0.0.1/",
                expectedUrl = "127.0.0.1",
                expectedRegistrableDomainSpan = 0 to 9,
            )
        }
    }

    @Test
    fun `GIVEN a URL with an IPv6 address WHEN rendering it THEN the IP part is set and colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "http://[::1]/",
                expectedUrl = "[::1]",
                expectedRegistrableDomainSpan = 0 to 5,
            )
        }
    }

    @Test
    fun `GIVEN a URL with a non PSL domain WHEN rendering it THEN host set and colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "http://localhost/",
                expectedUrl = "localhost",
                expectedRegistrableDomainSpan = 0 to 9,
            )
        }
    }

    @Test
    fun `GIVEN an internal page name WHEN rendering it THEN it is set and not colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "about:mozilla",
                expectedUrl = "about:mozilla",
                expectedRegistrableDomainSpan = null,
            )
        }
    }

    @Test
    fun `GIVEN a content URI WHEN rendering it THEN it is set and not colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "content://media/external/file/1000000000",
                expectedUrl = "content://media/external/file/1000000000",
                expectedRegistrableDomainSpan = null,
            )
        }
    }

    @Test
    fun `GIVEN a blob URI WHEN rendering it THEN domain set and registrable domain is colored`() {
        runTest(testDispatcher) {
            testRenderWithColoredDomain(
                testUrl = "blob:https://www.mozilla.org/69a29afb-938c-4b9e-9fca-b2f79755047a",
                expectedUrl = "www.mozilla.org",
                expectedRegistrableDomainSpan = 4 to 15,
            )
        }
    }

    private suspend fun getSpannedUrl(
        url: String,
        renderStyle: ToolbarFeature.RenderStyle = ToolbarFeature.RenderStyle.ColoredUrl,
    ): SpannableStringBuilder {
        val toolbar: Toolbar = FakeToolbar(url = "")

        val renderer = URLRenderer(toolbar, getConfiguration(renderStyle))

        renderer.updateUrl(url)

        return requireNotNull(toolbar.url as? SpannableStringBuilder) { "Toolbar URL should not be null" }
    }

    private fun getConfiguration(
        renderStyle: ToolbarFeature.RenderStyle = ToolbarFeature.RenderStyle.ColoredUrl,
    ) = ToolbarFeature.UrlRenderConfiguration(
        publicSuffixList = PublicSuffixList(testContext, scope = testScope),
        registrableDomainColor = Color.RED,
        urlColor = Color.GREEN,
        renderStyle = renderStyle,
    )

    private fun assertUrlColorSpans(
        url: SpannableStringBuilder,
        expectedRegistrableDomainSpan: Pair<Int, Int>,
    ) {
        val spans = url.getSpans(0, url.length, ForegroundColorSpan::class.java)

        assertEquals(2, spans.size)
        assertEquals(Color.GREEN, spans[0].foregroundColor)
        assertEquals(Color.RED, spans[1].foregroundColor)

        assertEquals(0, url.getSpanStart(spans[0]))
        assertEquals(url.length, url.getSpanEnd(spans[0]))

        assertEquals(expectedRegistrableDomainSpan.first, url.getSpanStart(spans[1]))
        assertEquals(expectedRegistrableDomainSpan.second, url.getSpanEnd(spans[1]))
    }

    private suspend fun testRenderWithColoredUrl(
        testUrl: String,
        expectedRegistrableDomainSpan: Pair<Int, Int>,
    ) {
        val url = getSpannedUrl(testUrl)

        assertEquals(testUrl, url.toString())

        assertUrlColorSpans(url, expectedRegistrableDomainSpan)
    }

    private suspend fun testRenderWithUncoloredUrl(testUrl: String) {
        val url = getSpannedUrl(testUrl)
        assertEquals(testUrl, url.toString())

        val spans = url.getSpans(0, url.length, ForegroundColorSpan::class.java)
        assertEquals(0, spans.size)
    }

    private suspend fun testRenderWithRegistrableDomain(
        testUrl: String,
        expectedUrl: String,
    ) {
        val toolbar: Toolbar = FakeToolbar(url = testUrl)

        val renderer = URLRenderer(
            toolbar,
            getConfiguration(renderStyle = ToolbarFeature.RenderStyle.RegistrableDomain),
        )

        renderer.updateUrl(testUrl)
        assertEquals(expectedUrl, toolbar.url)
    }

    private suspend fun testRenderWithColoredDomain(
        testUrl: String,
        expectedUrl: String,
        expectedRegistrableDomainSpan: Pair<Int, Int>?,
    ) {
        val url = getSpannedUrl(testUrl, ToolbarFeature.RenderStyle.ColoredDomain)

        assertEquals(expectedUrl, url.toString())

        if (expectedRegistrableDomainSpan != null) {
            assertUrlColorSpans(url, expectedRegistrableDomainSpan)
        } else {
            val spans = url.getSpans(0, url.length, ForegroundColorSpan::class.java)
            assertEquals(0, spans.size)
        }
    }
}

/**
 * Robolectric default implementation of [InetAddresses] returns false for any address.
 * This shadow is used to override that behavior and return true for any IP address.
 */
@Implements(InetAddresses::class)
class ShadowInetAddresses {
    companion object {
        @Implementation
        @JvmStatic
        @Suppress("DEPRECATION")
        fun isNumericAddress(address: String): Boolean {
            return Patterns.IP_ADDRESS.matcher(address).matches() || address.contains(":")
        }
    }
}
