package org.mozilla.geckoview.test

import android.os.SystemClock
import android.view.MotionEvent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.MediumTest
import org.hamcrest.Matchers.* // ktlint-disable no-wildcard-imports
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSession.ContentDelegate
import org.mozilla.geckoview.PanZoomController
import org.mozilla.geckoview.PanZoomController.InputResultDetail
import org.mozilla.geckoview.test.rule.GeckoSessionTestRule
import org.mozilla.geckoview.test.rule.GeckoSessionTestRule.WithDisplay

@RunWith(AndroidJUnit4::class)
@MediumTest
class InputResultDetailTest : BaseSessionTest() {
    private val scrollWaitTimeout = 10000.0 // 10 seconds

    private fun setupDocument(documentPath: String) {
        mainSession.loadTestPath(documentPath)
        sessionRule.waitUntilCalled(object : ContentDelegate {
            @GeckoSessionTestRule.AssertCalled(count = 1)
            override fun onFirstContentfulPaint(session: GeckoSession) {
            }
        })
        mainSession.flushApzRepaints()
    }

    private fun sendDownEvent(x: Float, y: Float): GeckoResult<InputResultDetail> {
        val downTime = SystemClock.uptimeMillis()
        val down = MotionEvent.obtain(
            downTime,
            SystemClock.uptimeMillis(),
            MotionEvent.ACTION_DOWN,
            x,
            y,
            0
        )

        val result = mainSession.panZoomController.onTouchEventForDetailResult(down)

        val up = MotionEvent.obtain(
            downTime,
            SystemClock.uptimeMillis(),
            MotionEvent.ACTION_UP,
            x,
            y,
            0
        )

        mainSession.panZoomController.onTouchEvent(up)

        return result
    }

    private fun assertResultDetail(
        testName: String,
        actual: InputResultDetail,
        expectedHandledResult: Int,
        expectedScrollableDirections: Int,
        expectedOverscrollDirections: Int
    ) {
        assertThat(
            testName + ": The handled result",
            actual.handledResult(),
            equalTo(expectedHandledResult)
        )
        assertThat(
            testName + ": The scrollable directions",
            actual.scrollableDirections(),
            equalTo(expectedScrollableDirections)
        )
        assertThat(
            testName + ": The overscroll directions",
            actual.overscrollDirections(),
            equalTo(expectedOverscrollDirections)
        )
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testTouchAction() {
        sessionRule.display?.run { setDynamicToolbarMaxHeight(20) }

        for (subframe in arrayOf(true, false)) {
            for (scrollable in arrayOf(true, false)) {
                for (event in arrayOf(true, false)) {
                    for (touchAction in arrayOf("auto", "none", "pan-x", "pan-y")) {
                        var url = TOUCH_ACTION_HTML_PATH + "?"
                        if (subframe) {
                            url += "subframe&"
                        }
                        if (scrollable) {
                            url += "scrollable&"
                        }
                        if (event) {
                            url += "event&"
                        }
                        url += ("touch-action=" + touchAction)

                        setupDocument(url)

                        // Since sendDownEvent() just sends a touch-down, APZ doesn't
                        // yet know the direction, hence it allows scrolling in both
                        // the pan-x and pan-y cases.
                        var expectedPlace = if (touchAction == "none" || (subframe && scrollable)) {
                            PanZoomController.INPUT_RESULT_HANDLED_CONTENT
                        } else if (scrollable) {
                            PanZoomController.INPUT_RESULT_HANDLED
                        } else {
                            PanZoomController.INPUT_RESULT_UNHANDLED
                        }

                        var expectedScrollableDirections = if (scrollable) {
                            PanZoomController.SCROLLABLE_FLAG_BOTTOM
                        } else {
                            PanZoomController.SCROLLABLE_FLAG_NONE
                        }

                        // FIXME: There are a couple of bugs here:
                        //  1. In the case where touch-action allows the scrolling, the
                        //     overscroll directions shouldn't depend on the presence of
                        //     an event handler, but they do.
                        //  2. In the case where touch-action doesn't allow the scrolling,
                        //     the overscroll directions should probably be NONE.
                        var expectedOverscrollDirections = if (touchAction != "none" && !scrollable && event) {
                            PanZoomController.OVERSCROLL_FLAG_NONE
                        } else {
                            (PanZoomController.OVERSCROLL_FLAG_HORIZONTAL or PanZoomController.OVERSCROLL_FLAG_VERTICAL)
                        }

                        var value = sessionRule.waitForResult(sendDownEvent(50f, 20f))
                        assertResultDetail(
                            "`subframe=$subframe, scrollable=$scrollable, event=$event, touch-action=$touchAction`",
                            value,
                            expectedPlace,
                            expectedScrollableDirections,
                            expectedOverscrollDirections
                        )
                    }
                }
            }
        }
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testScrollableWithDynamicToolbar() {
        sessionRule.display?.run { setDynamicToolbarMaxHeight(20) }

        // Set active since setVerticalClipping call affects only for forground tab.
        mainSession.setActive(true)

        setupDocument(ROOT_100VH_HTML_PATH + "?event")

        var value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

        assertResultDetail(
            ROOT_100VH_HTML_PATH,
            value,
            PanZoomController.INPUT_RESULT_HANDLED,
            PanZoomController.SCROLLABLE_FLAG_BOTTOM,
            (PanZoomController.OVERSCROLL_FLAG_HORIZONTAL or PanZoomController.OVERSCROLL_FLAG_VERTICAL)
        )

        // Prepare a resize event listener.
        val resizePromise = mainSession.evaluatePromiseJS(
            """
            new Promise(resolve => {
                window.visualViewport.addEventListener('resize', () => {
                    resolve(true);
                }, { once: true });
            });
            """.trimIndent()
        )

        // Hide the dynamic toolbar.
        sessionRule.display?.run { setVerticalClipping(-20) }

        // Wait a visualViewport resize event to make sure the toolbar change has been reflected.
        assertThat("resize", resizePromise.value as Boolean, equalTo(true))

        value = sessionRule.waitForResult(sendDownEvent(50f, 50f))
        assertResultDetail(
            ROOT_100VH_HTML_PATH,
            value,
            PanZoomController.INPUT_RESULT_HANDLED,
            PanZoomController.SCROLLABLE_FLAG_TOP,
            (PanZoomController.OVERSCROLL_FLAG_HORIZONTAL or PanZoomController.OVERSCROLL_FLAG_VERTICAL)
        )
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testOverscrollBehaviorAuto() {
        sessionRule.display?.run { setDynamicToolbarMaxHeight(20) }
        setupDocument(OVERSCROLL_BEHAVIOR_AUTO_HTML_PATH)

        var value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

        assertResultDetail(
            "`overscroll-behavior: auto`",
            value,
            PanZoomController.INPUT_RESULT_HANDLED,
            PanZoomController.SCROLLABLE_FLAG_BOTTOM,
            (PanZoomController.OVERSCROLL_FLAG_HORIZONTAL or PanZoomController.OVERSCROLL_FLAG_VERTICAL)
        )
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testOverscrollBehaviorAutoNone() {
        sessionRule.display?.run { setDynamicToolbarMaxHeight(20) }
        setupDocument(OVERSCROLL_BEHAVIOR_AUTO_NONE_HTML_PATH)

        var value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

        assertResultDetail(
            "`overscroll-behavior: auto, none`",
            value,
            PanZoomController.INPUT_RESULT_HANDLED,
            PanZoomController.SCROLLABLE_FLAG_BOTTOM,
            PanZoomController.OVERSCROLL_FLAG_HORIZONTAL
        )
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testOverscrollBehaviorNoneAuto() {
        sessionRule.display?.run { setDynamicToolbarMaxHeight(20) }
        setupDocument(OVERSCROLL_BEHAVIOR_NONE_AUTO_HTML_PATH)

        var value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

        assertResultDetail(
            "`overscroll-behavior: none, auto`",
            value,
            PanZoomController.INPUT_RESULT_HANDLED,
            PanZoomController.SCROLLABLE_FLAG_BOTTOM,
            PanZoomController.OVERSCROLL_FLAG_VERTICAL
        )
    }

    // NOTE: This function requires #scroll element in the target document.
    private fun scrollToBottom() {
        // Prepare a scroll event listener.
        val scrollPromise = mainSession.evaluatePromiseJS(
            """
            new Promise(resolve => {
                const scroll = document.getElementById('scroll');
                scroll.addEventListener('scroll', () => {
                    resolve(true);
                }, { once: true });
            });
            """.trimIndent()
        )

        // Scroll to the bottom edge of the scroll container.
        mainSession.evaluateJS(
            """
            const scroll = document.getElementById('scroll');
            scroll.scrollTo(0, scroll.scrollHeight);
            """.trimIndent()
        )
        assertThat("scroll", scrollPromise.value as Boolean, equalTo(true))
        mainSession.flushApzRepaints()
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testScrollHandoff() {
        sessionRule.display?.run { setDynamicToolbarMaxHeight(20) }
        setupDocument(SCROLL_HANDOFF_HTML_PATH)

        var value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

        // There is a child scroll container and its overscroll-behavior is `contain auto`
        assertResultDetail(
            "handoff",
            value,
            PanZoomController.INPUT_RESULT_HANDLED_CONTENT,
            PanZoomController.SCROLLABLE_FLAG_BOTTOM,
            PanZoomController.OVERSCROLL_FLAG_VERTICAL
        )

        // Scroll to the bottom edge
        scrollToBottom()

        value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

        // Now the touch event should be handed to the root scroller.
        assertResultDetail(
            "handoff",
            value,
            PanZoomController.INPUT_RESULT_HANDLED,
            PanZoomController.SCROLLABLE_FLAG_BOTTOM,
            (PanZoomController.OVERSCROLL_FLAG_HORIZONTAL or PanZoomController.OVERSCROLL_FLAG_VERTICAL)
        )
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testOverscrollBehaviorNoneOnNonRoot() {
        var files = arrayOf(
            OVERSCROLL_BEHAVIOR_NONE_NON_ROOT_HTML_PATH
        )

        for (file in files) {
            setupDocument(file)

            var value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

            assertResultDetail(
                "`overscroll-behavior: none` on non root scroll container",
                value,
                PanZoomController.INPUT_RESULT_HANDLED_CONTENT,
                PanZoomController.SCROLLABLE_FLAG_BOTTOM,
                PanZoomController.OVERSCROLL_FLAG_NONE
            )

            // Scroll to the bottom edge so that the container is no longer scrollable downwards.
            scrollToBottom()

            value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

            // The touch event should be handled in the scroll container content.
            assertResultDetail(
                "`overscroll-behavior: none` on non root scroll container",
                value,
                PanZoomController.INPUT_RESULT_HANDLED_CONTENT,
                PanZoomController.SCROLLABLE_FLAG_TOP,
                PanZoomController.OVERSCROLL_FLAG_NONE
            )
        }
    }

    @WithDisplay(width = 100, height = 100)
    @Test
    fun testOverscrollBehaviorNoneOnNonRootWithDynamicToolbar() {
        sessionRule.display?.run { setDynamicToolbarMaxHeight(20) }

        var files = arrayOf(
            OVERSCROLL_BEHAVIOR_NONE_NON_ROOT_HTML_PATH
        )

        for (file in files) {
            setupDocument(file)

            var value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

            assertResultDetail(
                "`overscroll-behavior: none` on non root scroll container",
                value,
                PanZoomController.INPUT_RESULT_HANDLED_CONTENT,
                PanZoomController.SCROLLABLE_FLAG_BOTTOM,
                PanZoomController.OVERSCROLL_FLAG_NONE
            )

            // Scroll to the bottom edge so that the container is no longer scrollable downwards.
            scrollToBottom()

            value = sessionRule.waitForResult(sendDownEvent(50f, 50f))

            // Now the touch event should be handed to the root scroller even if
            // the scroll container's `overscroll-behavior` is none to move
            // the dynamic toolbar.
            assertResultDetail(
                "`overscroll-behavior: none, none`",
                value,
                PanZoomController.INPUT_RESULT_HANDLED,
                PanZoomController.SCROLLABLE_FLAG_BOTTOM,
                (PanZoomController.OVERSCROLL_FLAG_HORIZONTAL or PanZoomController.OVERSCROLL_FLAG_VERTICAL)
            )
        }
    }
}
