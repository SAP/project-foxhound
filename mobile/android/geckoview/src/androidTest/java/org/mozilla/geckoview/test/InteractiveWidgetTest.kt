/* -*- Mode: Java; c-basic-offset: 4; tab-width: 4; indent-tabs-mode: nil; -*-
 * Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

package org.mozilla.geckoview.test

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.view.inputmethod.InputMethodManager
import androidx.core.graphics.createBitmap
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.MediumTest
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.not
import org.hamcrest.Matchers.notNullValue
import org.json.JSONObject
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.RuleChain
import org.junit.runner.RunWith
import org.mozilla.geckoview.Autofill
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSession.ContentDelegate
import org.mozilla.geckoview.GeckoView
import org.mozilla.geckoview.PanZoomController
import org.mozilla.geckoview.ScreenLength
import org.mozilla.geckoview.test.rule.GeckoSessionTestRule
import org.mozilla.geckoview.test.rule.GeckoSessionTestRule.AssertCalled
import org.mozilla.geckoview.test.util.AssertUtils

@RunWith(AndroidJUnit4::class)
@MediumTest
class InteractiveWidgetTest : BaseSessionTest() {
    private val activityRule = ActivityScenarioRule(GeckoViewTestActivity::class.java)
    private val dynamicToolbarMaxHeight = 100
    private lateinit var imm: InputMethodManager
    private lateinit var view: GeckoView

    @get:Rule
    override val rules: RuleChain = RuleChain.outerRule(activityRule).around(sessionRule)

    @Before
    fun setup() {
        activityRule.scenario.onActivity { activity ->
            // To make OnApplyWindowInsetsListener work for `interactive-widget` features
            // we need to setSession explicitly.
            activity.view.setSession(mainSession)
            activity.view.setDynamicToolbarMaxHeight(dynamicToolbarMaxHeight)
            imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            view = activity.view as GeckoView
        }
    }

    @After
    fun cleanup() {
        try {
            activityRule.scenario.onActivity { activity ->
                activity.view.releaseSession()
            }
        } catch (e: Exception) {
            }
    }

    private fun ensureKeyboardOpen() {
        view.requestFocus()

        var promise = mainSession.evaluatePromiseJS(
            """
              new Promise(resolve => {
                visualViewport.addEventListener('resize', () => {
                  resolve(true);
                }, { once: true });
              });
            """.trimIndent(),
        )
        // Explicitly call `waitForRoundTrip()` to make sure the above event listener
        // has set up in the content.
        mainSession.waitForRoundTrip()

        // Open the software keyboard.
        imm.showSoftInput(view, 0)

        assertThat(
            "The visual viewport height should be changed in response to the the keyboard showing",
            promise.value as Boolean,
            equalTo(true),
        )
    }

    @GeckoSessionTestRule.NullDelegate(Autofill.Delegate::class)
    @Test
    fun stickyElementWithDynamicToolbarOnResizesVisual() {
        mainSession.setActive(true)

        mainSession.loadTestPath(BaseSessionTest.INTERACTIVE_WIDGET_HTML_PATH)
        mainSession.waitForPageStop()
        mainSession.promiseAllPaintsDone()
        mainSession.flushApzRepaints()

        ensureKeyboardOpen()

        // Hide the dynamic toolbar.
        view.setVerticalClipping(-dynamicToolbarMaxHeight)

        // To make sure the dynamic toolbar height has been reflected into APZ.
        mainSession.flushApzRepaints()
        // Also to make sure the dynamic toolbar height has been reflected on the main-thread.
        mainSession.promiseAllPaintsDone()

        // Scroll the visual viewport to the bottom.
        mainSession.panZoomController.scrollTo(
            ScreenLength.zero(),
            ScreenLength.bottom(),
            PanZoomController.SCROLL_BEHAVIOR_AUTO,
        )
        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        fun createReferenceImage(height: Double): Bitmap {
            val rect = Rect()
            mainSession.getSurfaceBounds(rect)

            val bitmap = createBitmap(rect.width(), height.toInt(), Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            val paint = Paint()
            paint.color = Color.rgb(255, 255, 255)
            canvas.drawRect(0f, 0f, rect.width().toFloat(), height.toFloat(), paint)

            // Draw the sticky element area.
            paint.color = Color.rgb(0, 128, 0)
            canvas.drawRect(
                0f,
                (height - dynamicToolbarMaxHeight).toFloat(),
                rect.width().toFloat(),
                height.toFloat(),
                paint,
            )
            return bitmap
        }

        val height = mainSession.evaluateJS("window.visualViewport.height") as Double
        val pixelRatio = mainSession.evaluateJS("window.devicePixelRatio") as Double
        val reference = createReferenceImage(height * pixelRatio)

        val result = sessionRule.waitForResult(view.capturePixels())
        AssertUtils.assertScreenshotResult(result, reference)

        // Close the software keyboard.
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0)
    }

    @GeckoSessionTestRule.NullDelegate(Autofill.Delegate::class)
    @Test
    fun overlaysContent() {
        mainSession.setActive(true)

        mainSession.loadTestPath(BaseSessionTest.INTERACTIVE_WIDGET_OVERLAYS_CONTENT_HTML_PATH)
        mainSession.waitForPageStop()
        mainSession.promiseAllPaintsDone()
        mainSession.flushApzRepaints()

        view.requestFocus()

        // Open the software keyboard.
        imm.showSoftInput(view, 0)

        // Hide the dynamic toolbar.
        view.setVerticalClipping(-dynamicToolbarMaxHeight)

        // To make sure the dynamic toolbar height has been reflected into APZ.
        mainSession.flushApzRepaints()
        // Also to make sure the dynamic toolbar height has been reflected on the main-thread.
        mainSession.promiseAllPaintsDone()

        // Scroll the visual viewport to the bottom once.
        mainSession.panZoomController.scrollTo(
            ScreenLength.zero(),
            ScreenLength.bottom(),
            PanZoomController.SCROLL_BEHAVIOR_AUTO,
        )
        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        // Then scroll up a bit.
        mainSession.panZoomController.scrollBy(
            ScreenLength.zero(),
            ScreenLength.fromPixels(-10.0),
            PanZoomController.SCROLL_BEHAVIOR_AUTO,
        )
        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        fun createReferenceImage(height: Double): Bitmap {
            val rect = Rect()
            mainSession.getSurfaceBounds(rect)

            val bitmap = createBitmap(rect.width(), height.toInt(), Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            val paint = Paint()
            paint.color = Color.rgb(0, 128, 0)
            canvas.drawRect(0f, 0f, rect.width().toFloat(), height.toFloat(), paint)

            return bitmap
        }

        val result = sessionRule.waitForResult(view.capturePixels())

        // On overlays-content mode neither the visual viewport nor the layout viewport is changed,
        // thus there's no way to tell the visible area while the software keyboard is shown.
        val reference = createReferenceImage(result.height.toDouble())

        AssertUtils.assertScreenshotResult(result, reference)

        // Close the software keyboard.
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0)
    }

    @GeckoSessionTestRule.NullDelegate(Autofill.Delegate::class)
    @Test
    fun hideDynamicToolbarOnResizesVisual() {
        mainSession.setActive(true)

        mainSession.loadTestPath(BaseSessionTest.HIDE_DYNAMIC_TOOLBAR_ON_RESIZES_VISUAL_HTML_PATH)
        mainSession.waitForPageStop()
        mainSession.promiseAllPaintsDone()
        mainSession.flushApzRepaints()

        ensureKeyboardOpen()

        mainSession.evaluateJS("document.getElementById('input1').focus();")
        mainSession.zoomToFocusedInput()

        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        mainSession.waitUntilCalled(object : ContentDelegate {
            @AssertCalled(count = 1)
            override fun onHideDynamicToolbar(session: GeckoSession) {
            }
        })

        // Close the software keyboard.
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0)
    }

    @GeckoSessionTestRule.NullDelegate(Autofill.Delegate::class)
    @Test
    fun bug1994311() {
        mainSession.setActive(true)
        sessionRule.display?.run { setDynamicToolbarMaxHeight(0) }

        mainSession.loadTestPath(BaseSessionTest.BUG1994311_HTML_PATH)
        mainSession.waitForPageStop()
        mainSession.promiseAllPaintsDone()
        mainSession.flushApzRepaints()

        val viewportHeight = mainSession.evaluateJS("window.visualViewport.height") as Double

        // Open the software keyboard.
        ensureKeyboardOpen()

        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        // Scroll down visually.
        mainSession.panZoomController.scrollBy(
            ScreenLength.zero(),
            ScreenLength.fromPixels(viewportHeight),
            PanZoomController.SCROLL_BEHAVIOR_AUTO,
        )

        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        var scrollY = mainSession.evaluateJS("window.scrollY") as Double

        // Now the layout scroll offset is different from the visual scroll offset.
        assertThat(
              "The layout scroll offset hasn't reached the destination",
              scrollY,
              not(equalTo(viewportHeight)),
            )

        var resizeEventPromise = mainSession.evaluatePromiseJS(
            """
              new Promise(resolve => {
                visualViewport.addEventListener('resize', () => {
                  resolve(true);
                }, { once: true });
              });
            """.trimIndent(),
        )
        // Explicitly call `waitForRoundTrip()` to make sure the above event listener
        // has set up in the content.
        mainSession.waitForRoundTrip()

        // Dismiss the software keyboard.
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0)

        assertThat(
            "The visual viewport height should be changed",
            resizeEventPromise.value as Boolean,
            equalTo(true),
        )

        val currentViewportHeight = mainSession.evaluateJS("window.visualViewport.height") as Double
        assertThat(
            "The visual viewport height is restored to the original one",
            currentViewportHeight,
            equalTo(viewportHeight),
        )

        // Dismissing the software keyboard changes the root composition size,
        // and the new composition size is propagated to APZ and the root
        // content APZC notifies to the main-thread that there's a pending visual
        // scroll offset change which needs to be reflected to the main-thread.
        // Because of this round trip of the information we need to wait for it.
        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        scrollY = mainSession.evaluateJS("window.scrollY") as Double

        assertThat(
              "Now the layout scroll offset is equal to the visual scroll destination",
              scrollY,
              equalTo(viewportHeight),
            )
    }

    @GeckoSessionTestRule.NullDelegate(Autofill.Delegate::class)
    @Test
    fun bug1993407() {
        mainSession.setActive(true)

        mainSession.loadTestPath(BaseSessionTest.BUG1993407_HTML_PATH)
        mainSession.waitForPageStop()
        mainSession.promiseAllPaintsDone()
        mainSession.flushApzRepaints()

        val caretRect = mainSession.evaluateJS(
            """
            const inputRect = document.querySelector('input').getBoundingClientRect();
            document.caretPositionFromPoint(0, inputRect.y)?.getClientRect();
        """.trimIndent(),
        )
        assertThat("The caretRect should not be null", caretRect, notNullValue())

        val caretRectObject = caretRect as JSONObject
        val caretY = caretRectObject.getDouble("y")
        val caretHeight = caretRectObject.getDouble("height")
        val caretBottom = caretRectObject.getDouble("bottom")

        // Open the software keyboard.
        ensureKeyboardOpen()

        mainSession.evaluateJS("document.querySelector('input').focus();")
        mainSession.zoomToFocusedInput()

        mainSession.flushApzRepaints()
        mainSession.promiseAllPaintsDone()

        val scrollY = mainSession.evaluateJS("window.scrollY") as Double
        val offsetTop = mainSession.evaluateJS("window.visualViewport.offsetTop") as Double
        val pageTop = mainSession.evaluateJS("window.visualViewport.pageTop") as Double
        val visualViewportHeight = mainSession.evaluateJS("window.visualViewport.height") as Double

        assertThat(
              "The offsetTop and pageTop of visual viewport is not diverged",
              offsetTop,
              equalTo(pageTop),
            )
        assertThat("The offsetTop is not 0", offsetTop, not(equalTo(0.0)))
        assertThat("The offsetTop is ", offsetTop, equalTo(caretBottom - visualViewportHeight))

        assertThat(
              "The layout scroll offset stays at 0",
              scrollY,
              equalTo(0.0),
            )

        // Close the software keyboard.
        imm.hideSoftInputFromWindow(view.getWindowToken(), 0)
    }
}
