/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.helpers

import android.util.Log
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasAnySibling
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.ViewInteraction
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.pressImeActionButton
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.hasSibling
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isDisplayingAtLeast
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.isNotSelected
import androidx.test.espresso.matcher.ViewMatchers.isSelected
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiObject
import androidx.test.uiautomator.UiSelector
import org.hamcrest.CoreMatchers.not
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.NavigationStep

/**
 * Logging philosophy (why BasePage owns logging):
 *
 * - Tests should be minimal, expressing *what* is being validated.
 * - Helpers/framework code is responsible for *how* actions happen (navigation, locators, retries),
 *   and that's why I think this is the correct place to instrument structured logs and timings.
 *
 * This becomes critical as we evolve toward:
 * - test factories that generate many permutations (pages x states) at runtime,
 * - CI-configurable runs (feature flags, onboarding modes, user types),
 * - reflection-based enumeration of all pages/components,
 * - and eventually AI-assisted test planning, generation, and self-healing.
 *
 * In all of those models, the structured log stream is the human-readable source of truth
 * describing what actually executed, independent of how the test was defined (code/spec/CI).
 */
abstract class BasePage(
    protected val composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>,
) {
    abstract val pageName: String

    companion object {
        // Mirrors the minimum displayed-area Espresso's click() action requires before it will tap.
        private const val CLICKABLE_VISIBILITY_PERCENT = 90
    }

    // ------------------------------------------------------------
    // Small helpers to keep messages consistent and easy to scan
    // ------------------------------------------------------------

    private fun rep() = org.mozilla.fenix.ui.efficiency.logging.TestLogging.reporter

    private fun safeId(prefix: String, raw: String): String {
        // Helps avoid super long or illegal step ids due to punctuation/spaces
        val cleaned = raw.replace(Regex("[^A-Za-z0-9_\\-]"), "_")
        return "'$prefix'_$cleaned".take(120)
    }

    private fun found(desc: String) = "'$desc' found"
    private fun notFound(desc: String) = "'$desc' not found"

    // ------------------------------------------------------------
    // Navigation (STEP)
    // ------------------------------------------------------------

    open fun navigateToPage(url: String = "", forceNavigation: Boolean = false): BasePage {
        val rep = rep()
        rep?.startStep("nav_$pageName", "Attempting to Navigate to $pageName", 0)

        try {
            if (!forceNavigation && mozIsOnPageNow()) {
                PageStateTracker.currentPageName = pageName
                rep?.endStep(success = true, message = "'$pageName' already loaded")
                return this
            }

            val fromPage = PageStateTracker.currentPageName
            Log.i("PageNavigation", "🔍 Trying to find path from '$fromPage' to '$pageName'")

            val path = NavigationRegistry.findPath(fromPage, pageName)

            if (path == null) {
                NavigationRegistry.logGraph()
                rep?.endStep(success = false, message = "No navigation path found to '$pageName'")
                throw AssertionError("❌ No navigation path found from '$fromPage' to '$pageName'")
            } else {
                Log.i("PageNavigation", "✅ Navigation path found from '$fromPage' to '$pageName':")
                path.forEachIndexed { i, step -> Log.i("PageNavigation", "   Step ${i + 1}: $step") }
            }

            path.forEach { step ->
                when (step) {
                    is NavigationStep.Click -> mozClick(step.selector)
                    is NavigationStep.ClickIfPresent -> mozClickIfPresent(step.selector)
                    is NavigationStep.Swipe -> mozSwipeTo(step.selector, step.direction)
                    is NavigationStep.OpenNotificationsTray -> mozOpenNotificationsTray()
                    is NavigationStep.EnterText -> mozEnterText(url, step.selector)
                    is NavigationStep.PressEnter -> mozPressEnter(step.selector)
                    is NavigationStep.PressBack -> {
                        mDevice.pressBack()
                        mDevice.waitForIdle()
                    }
                }
            }

            if (!mozWaitForPageToLoad()) {
                rep?.endStep(success = false, message = "'$pageName' did not load")
                throw AssertionError("Failed to navigate to $pageName")
            }

            PageStateTracker.currentPageName = pageName
            rep?.endStep(success = true, message = "Navigation to '$pageName' completed")
            return this
        } catch (t: Throwable) {
            rep?.endStep(success = false, message = "Navigation to '$pageName' failed: ${t.message ?: "exception"}")
            throw t
        }
    }

    // ------------------------------------------------------------
    // Page readiness verification (CMD + LOC)
    // ------------------------------------------------------------

    private fun mozWaitForPageToLoad(timeout: Long = 10_000, interval: Long = 100): Boolean {
        val rep = rep()
        val requiredSelectors = mozGetSelectorsByGroup("requiredForPage")
        val deadline = System.currentTimeMillis() + timeout

        while (System.currentTimeMillis() < deadline) {
            rep?.startCmd("wait_$pageName", "Attempting to verify $pageName loads...", 1)

            val allPresent = requiredSelectors.all { sel ->
                rep?.startLoc(safeId("loc", "${pageName}_${sel.description}"), "Attempting to locate '${sel.description}'...", 2)
                val present = mozVerifyElement(sel, applyPreconditions = false)
                rep?.endLoc(success = present, message = if (present) found(sel.description) else notFound(sel.description))
                present
            }

            rep?.endCmd(
                success = allPresent,
                message = if (allPresent) "'$pageName' loaded" else "'$pageName' not ready yet",
            )

            if (allPresent) return true
            android.os.SystemClock.sleep(interval)
        }

        return false
    }

    /**
     * Fast "already here?" check.
     *
     * Why:
     * - We do NOT want to spend seconds waiting to verify a destination page before we even start navigating.
     * - This is intentionally a single-pass check (no polling / no sleeping).
     *
     * Pattern:
     * - navigateToPage() uses mozIsOnPageNow() first.
     * - After executing navigation steps, we use mozWaitForPageToLoad() to wait/poll for readiness.
     */
    private fun mozIsOnPageNow(): Boolean {
        val rep = rep()
        val requiredSelectors = mozGetSelectorsByGroup("requiredForPage")

        // This is a *fast check* — no retries, no sleeping.
        rep?.startCmd("is_on_'$pageName'", "Checking if '$pageName' is already visible...", 1)

        val allPresent = requiredSelectors.all { sel ->
            rep?.startLoc(safeId("loc", "${pageName}_${sel.description}_now"), "Attempting to locate '${sel.description}'...", 2)
            val found = mozVerifyElement(sel, applyPreconditions = false)
            rep?.endLoc(success = found, message = if (found) found(sel.description) else notFound(sel.description))
            found
        }

        rep?.endCmd(success = allPresent, message = if (allPresent) "'$pageName' already visible" else "'$pageName' not visible yet")
        return allPresent
    }

    abstract fun mozGetSelectorsByGroup(group: String = "requiredForPage"): List<Selector>

    fun mozVerifyElementsByGroup(group: String = "requiredForPage"): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("verify_group", "${pageName}_$group"), "Attempting to verify group '$group' loads...", 1)

        val selectors = mozGetSelectorsByGroup(group)
        val allPresent = selectors.all { sel ->
            rep?.startLoc(safeId("loc", "${pageName}_${group}_${sel.description}"), "Attempting to locate '${sel.description}'...", 2)
            val present = mozVerifyElement(sel, applyPreconditions = true)
            rep?.endLoc(success = present, message = if (present) found(sel.description) else notFound(sel.description))
            present
        }

        rep?.endCmd(
            success = allPresent,
            message = if (allPresent) "Group '$group' verified" else "Group '$group' missing required elements",
        )

        if (!allPresent) throw AssertionError("Not all elements in group '$group' are present")
        return this
    }

    fun mozVerifyElementAbsent(selector: Selector): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("verify_absent", selector.description), "Verifying '${selector.description}' is absent...", 1)
        rep?.startLoc(safeId("loc", selector.description), "Attempting to locate '${selector.description}'...", 2)
        val present = mozVerifyElement(selector, applyPreconditions = false)
        rep?.endLoc(success = !present, message = if (!present) notFound(selector.description) else found(selector.description))
        rep?.endCmd(success = !present, message = if (!present) "'${selector.description}' correctly absent" else "'${selector.description}' unexpectedly present")
        if (present) throw AssertionError("Element '${selector.description}' was expected to be absent but is visible")
        return this
    }

    fun mozVerify(selector: Selector, timeout: Long = 5_000, interval: Long = 500): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("verify", selector.description), "Verifying '${selector.description}' is present...", 1)
        val deadline = System.currentTimeMillis() + timeout
        while (System.currentTimeMillis() < deadline) {
            rep?.startLoc(safeId("loc", selector.description), "Attempting to locate '${selector.description}'...", 2)
            val present = mozVerifyElement(selector, applyPreconditions = false)
            rep?.endLoc(success = present, message = if (present) found(selector.description) else notFound(selector.description))
            if (present) {
                rep?.endCmd(success = true, message = "'${selector.description}' verified")
                return this
            }
            android.os.SystemClock.sleep(interval)
        }
        rep?.endCmd(success = false, message = "'${selector.description}' not found after ${timeout}ms")
        throw AssertionError("'${selector.description}' not found on screen after ${timeout}ms")
    }

    // ------------------------------------------------------------
    // Interaction helpers (CMD + LOC)
    // ------------------------------------------------------------

    fun mozClick(selector: Selector): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("click", selector.description), "Attempting to click '${selector.description}'...", 1)
        rep?.startLoc(safeId("loc", selector.description), "Attempting to locate '${selector.description}'...", 2)

        val element = mozGetElement(selector)
        if (element == null) {
            rep?.endLoc(success = false, message = notFound(selector.description))
            rep?.endCmd(success = false, message = "Click '${selector.description}' failed: element not found")
            throw AssertionError("Element not found for selector: ${selector.description} (${selector.strategy} -> ${selector.value})")
        } else {
            rep?.endLoc(success = true, message = found(selector.description))
        }

        try {
            when (element) {
                is ViewInteraction -> element.perform(click())
                is UiObject -> {
                    if (!element.exists()) throw AssertionError("UiObject does not exist for selector: ${selector.description}")
                    if (!element.click()) throw AssertionError("Failed to click UiObject for selector: ${selector.description}")
                }
                is SemanticsNodeInteraction -> {
                    composeRule.waitForIdle()
                    element.assertExists()
                    element.assertIsDisplayed()
                    element.performClick()
                }
                else -> throw AssertionError("Unsupported element type (${element::class.simpleName}) for selector: ${selector.description}")
            }

            rep?.endCmd(success = true, message = "Clicked '${selector.description}'")
            return this
        } catch (e: Throwable) {
            rep?.endCmd(success = false, message = "Click '${selector.description}' failed: ${e.message ?: "exception"}")
            throw e
        }
    }

    /**
     * Waits up to [timeout] ms for [selector] to appear, then clicks it if visible; silently
     * skips if it never appears.
     *
     * Use this exclusively for UI that is genuinely optional by design (e.g. a one-time
     * dialog that only appears on the first run). Never use it as a workaround for flaky
     * selectors or timing issues — those should be fixed at the source.
     */
    fun mozClickIfPresent(selector: Selector, timeout: Long = 3_000, interval: Long = 200): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("click_if_present", selector.description), "Attempting to click '${selector.description}' if present...", 1)

        val deadline = System.currentTimeMillis() + timeout
        var present = false
        while (System.currentTimeMillis() < deadline) {
            rep?.startLoc(safeId("loc", selector.description), "Attempting to locate '${selector.description}'...", 2)
            present = mozVerifyElement(selector, applyPreconditions = false)
            rep?.endLoc(success = present, message = if (present) found(selector.description) else notFound(selector.description))
            if (present) break
            android.os.SystemClock.sleep(interval)
        }

        if (!present) {
            rep?.endCmdSkip(message = "'${selector.description}' not present after ${timeout}ms")
            return this
        }

        val element = mozGetElement(selector) ?: run {
            rep?.endCmdSkip(message = "'${selector.description}' vanished before click")
            return this
        }

        try {
            when (element) {
                is ViewInteraction -> element.perform(click())
                is UiObject -> {
                    if (element.exists()) element.click()
                }
                is SemanticsNodeInteraction -> {
                    element.assertExists()
                    element.assertIsDisplayed()
                    element.performClick()
                }
                else -> throw AssertionError("Unsupported element type (${element::class.simpleName}) for selector: ${selector.description}")
            }

            rep?.endCmd(success = true, message = "Clicked '${selector.description}'")
            return this
        } catch (e: Throwable) {
            rep?.endCmd(success = false, message = "Click '${selector.description}' failed: ${e.message ?: "exception"}")
            throw e
        }
    }

    fun mozSwipeTo(
        selector: Selector,
        direction: SwipeDirection = SwipeDirection.DOWN,
        maxSwipes: Int = 10, // TODO (Jackie J. 10/30/2025): replace hard-coded value with self-selecting x,y boundaries
        applyPreconditions: Boolean = false, // default false to avoid recursive preconditions
    ): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("swipe_to", selector.description), "Attempting to swipe to '${selector.description}'...", 1)

        try {
            repeat(maxSwipes) { attempt ->
                // Each attempt is a LOC check for visibility.
                rep?.startLoc(safeId("loc", "${selector.description}_attempt_${attempt + 1}"), "Attempting to locate '${selector.description}'...", 2)
                val element = mozGetElement(selector, applyPreconditions = applyPreconditions)

                val isVisible = when (element) {
                    // Espresso's click() rejects views displayed under CLICKABLE_VISIBILITY_PERCENT,
                    // so stop swiping only once the element clears that bar.
                    is ViewInteraction -> try {
                        element.check(matches(isDisplayingAtLeast(CLICKABLE_VISIBILITY_PERCENT))); true
                    } catch (_: Throwable) {
                        false
                    }
                    is UiObject -> element.exists()
                    is SemanticsNodeInteraction -> try {
                        element.assertExists()
                        element.assertIsDisplayed()
                        true
                    } catch (_: AssertionError) {
                        false
                    }
                    else -> false
                }

                rep?.endLoc(success = isVisible, message = if (isVisible) found(selector.description) else notFound(selector.description))

                if (isVisible) {
                    Log.i("MozSwipeTo", "✅ Element '${selector.description}' found after $attempt swipe(s)")
                    rep?.endCmd(success = true, message = "Reached '${selector.description}' after ${attempt + 1} swipe(s)")
                    return this
                }

                // The swipe itself is an action; we keep it as part of the CMD.
                performSwipe(direction)
                Thread.sleep(500)
            }

            rep?.endCmd(success = false, message = "Swipe-to '${selector.description}' failed after $maxSwipes attempts")
            throw AssertionError("❌ Element '${selector.description}' not found after $maxSwipes swipe(s)")
        } catch (t: Throwable) {
            rep?.endCmd(success = false, message = "Swipe-to '${selector.description}' failed: ${t.message ?: "exception"}")
            throw t
        }
    }

    fun mozOpenNotificationsTray(): BasePage {
        val rep = rep()
        rep?.startCmd("open_notifications_tray", "Attempting to open Notifications tray...", 1)
        return try {
            mDevice.openNotification()
            rep?.endCmd(success = true, message = "Notifications tray opened")
            this
        } catch (t: Throwable) {
            rep?.endCmd(success = false, message = "Open Notifications tray failed: ${t.message ?: "exception"}")
            throw t
        }
    }

    private fun performSwipe(direction: SwipeDirection) {
        val rep = rep()
        rep?.startCmd(safeId("swipe", direction.name), "Attempting to swipe ${direction.name.lowercase()}...", 2)

        try {
            val height = mDevice.displayHeight
            val width = mDevice.displayWidth

            val (startX, startY, endX, endY) = when (direction) {
                SwipeDirection.UP -> listOf(width / 2, height / 2, width / 2, height / 4)
                SwipeDirection.DOWN -> listOf(width / 2, height / 2, width / 2, height * 3 / 4)
                SwipeDirection.LEFT -> listOf(width * 3 / 4, height / 2, width / 4, height / 2)
                SwipeDirection.RIGHT -> listOf(width / 4, height / 2, width * 3 / 4, height / 2)
            }

            mDevice.swipe(startX, startY, endX, endY, 20)
            rep?.endCmd(success = true, message = "Swipe ${direction.name.lowercase()} completed")
        } catch (t: Throwable) {
            rep?.endCmd(success = false, message = "Swipe ${direction.name.lowercase()} failed: ${t.message ?: "exception"}")
            throw t
        }
    }

    fun mozEnterText(text: String, selector: Selector): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("enter_text", selector.description), "Attempting to enter text into '${selector.description}'...", 1)
        rep?.startLoc(safeId("loc", selector.description), "Attempting to locate '${selector.description}'...", 2)

        val element = mozGetElement(selector)
        if (element == null) {
            rep?.endLoc(success = false, message = notFound(selector.description))
            rep?.endCmd(success = false, message = "Enter text failed: element not found ('${selector.description}')")
            throw AssertionError("Element not found for selector: ${selector.description} (${selector.strategy} -> ${selector.value})")
        } else {
            rep?.endLoc(success = true, message = found(selector.description))
        }

        try {
            when (element) {
                is ViewInteraction -> element.perform(typeText(text))
                is UiObject -> element.setText(text)
                is SemanticsNodeInteraction -> element.performTextInput(text)
                else -> throw AssertionError("Unsupported element type (${element::class.simpleName}) for selector: ${selector.description}")
            }

            rep?.endCmd(success = true, message = "Entered text into '${selector.description}'")
            return this
        } catch (e: Throwable) {
            rep?.endCmd(success = false, message = "Enter text failed for '${selector.description}': ${e.message ?: "exception"}")
            throw AssertionError("Failed to enter text for selector: ${selector.description}", e)
        }
    }

    fun mozPressEnter(selector: Selector): BasePage {
        val rep = rep()
        rep?.startCmd(safeId("press_enter", selector.description), "Attempting to press Enter on '${selector.description}'...", 1)
        rep?.startLoc(safeId("loc", selector.description), "Attempting to locate '${selector.description}'...", 2)

        val element = mozGetElement(selector)
        if (element == null) {
            rep?.endLoc(success = false, message = notFound(selector.description))
            rep?.endCmd(success = false, message = "Press Enter failed: element not found ('${selector.description}')")
            throw AssertionError("Element not found for selector: ${selector.description} (${selector.strategy} -> ${selector.value})")
        } else {
            rep?.endLoc(success = true, message = found(selector.description))
        }

        try {
            when (element) {
                is ViewInteraction -> element.perform(pressImeActionButton())
                is UiObject -> mDevice.pressEnter()
                is SemanticsNodeInteraction -> element.performImeAction()
                else -> throw AssertionError("Unsupported element type (${element::class.simpleName}) for selector: ${selector.description}")
            }

            rep?.endCmd(success = true, message = "Pressed Enter on '${selector.description}'")
            return this
        } catch (e: Throwable) {
            rep?.endCmd(success = false, message = "Press Enter failed for '${selector.description}': ${e.message ?: "exception"}")
            throw AssertionError("Failed to press Enter for selector: ${selector.description}", e)
        }
    }

    fun mozVerifyElementIsSelected(selector: Selector, applyPreconditions: Boolean = true): Boolean {
        val element = mozGetElement(selector, applyPreconditions = applyPreconditions)

        return when (element) {
            is ViewInteraction -> {
                try {
                    element.check(matches(isSelected())); true
                } catch (_: Exception) {
                    false
                }
            }
            is UiObject -> element.isSelected()
            is SemanticsNodeInteraction -> {
                try {
                    element.assertExists(); element.assertIsSelected(); true
                } catch (_: AssertionError) {
                    false
                }
            }
            else -> false
        }
    }

    fun mozVerifyElementIsNotSelected(selector: Selector, applyPreconditions: Boolean = true): Boolean {
        val element = mozGetElement(selector, applyPreconditions = applyPreconditions)

        return when (element) {
            is ViewInteraction -> {
                try {
                    element.check(matches(isNotSelected())); true
                } catch (_: Exception) {
                    false
                }
            }
            is UiObject -> element.isSelected.not()
            is SemanticsNodeInteraction -> {
                try {
                    element.assertExists(); element.assertIsNotSelected(); true
                } catch (_: AssertionError) {
                    false
                }
            }
            else -> false
        }
    }

    fun mozVerifyElementIsEnabled(selector: Selector, applyPreconditions: Boolean = true): Boolean {
        val element = mozGetElement(selector, applyPreconditions = applyPreconditions)

        return when (element) {
            is ViewInteraction -> {
                try {
                    element.check(matches(isEnabled())); true
                } catch (_: Exception) {
                    false
                }
            }
            is UiObject -> element.isEnabled
            is SemanticsNodeInteraction -> {
                try {
                    element.assertExists(); element.assertIsEnabled(); true
                } catch (_: AssertionError) {
                    false
                }
            }
            else -> false
        }
    }

    fun mozVerifyElementIsNotEnabled(selector: Selector, applyPreconditions: Boolean = true): Boolean {
        val element = mozGetElement(selector, applyPreconditions = applyPreconditions)

        return when (element) {
            is ViewInteraction -> {
                try {
                    element.check(matches(not(isEnabled()))); true
                } catch (_: Exception) {
                    false
                }
            }
            is UiObject -> element.isEnabled.not()
            is SemanticsNodeInteraction -> {
                try {
                    element.assertExists(); element.assertIsNotEnabled(); true
                } catch (_: AssertionError) {
                    false
                }
            }
            else -> false
        }
    }

    fun mozVerifyElementHasSiblingWithText(selector: Selector, siblingText: String, applyPreconditions: Boolean = true): BasePage {
        val element = mozGetElement(selector, applyPreconditions = applyPreconditions)
            ?: throw AssertionError("Element not found for selector: ${selector.description} (${selector.strategy} -> ${selector.value})")

        when (element) {
            is ViewInteraction -> element.check(matches(hasSibling(withText(siblingText))))
            is UiObject -> {
                val sibling = element.getFromParent(UiSelector().text(siblingText))
                if (!sibling.exists()) {
                    throw AssertionError("'${selector.description}' has no sibling with text '$siblingText'")
                }
            }
            is SemanticsNodeInteraction -> element.assert(hasAnySibling(hasText(siblingText)))
            else -> throw AssertionError("Unsupported element type for selector: ${selector.description}")
        }

        return this
    }

    // ------------------------------------------------------------
    // Element resolution + verification (LOC)
    // ------------------------------------------------------------

    private fun mozGetElement(selector: Selector, applyPreconditions: Boolean = true): Any? {
        if (selector.value.isBlank()) {
            Log.i("mozGetElement", "Empty or blank selector value: ${selector.description}")
            return null
        }

        if (applyPreconditions && requiresScroll(selector.groups)) {
            ensureReachable(selector) // may call mozSwipeTo with applyPreconditions = false
        }

        return when (selector.strategy) {
            SelectorStrategy.COMPOSE_BY_TAG -> {
                try {
                    composeRule.onNodeWithTag(selector.value)
                } catch (_: Exception) {
                    Log.i("mozGetElement", "Compose node not found for tag: ${selector.value}"); null
                }
            }
            // TODO: easier way to isolate parent/child/sibling elements, auto-selects sibilings or children on failure as a back-up
            SelectorStrategy.COMPOSE_ON_ALL_NODES_BY_TAG_ON_FIRST -> {
                try {
                    composeRule.onAllNodesWithTag(selector.value).onFirst()
                } catch (_: Exception) {
                    Log.i("mozGetElement", "Compose node not found for tag: ${selector.value}"); null
                }
            }

            SelectorStrategy.COMPOSE_BY_TEXT -> {
                try {
                    composeRule.onNodeWithText(selector.value, useUnmergedTree = true)
                } catch (_: Exception) {
                    Log.i("mozGetElement", "Compose node not found for text: ${selector.value}"); null
                }
            }

            SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION -> {
                try {
                    composeRule.onNodeWithContentDescription(selector.value)
                } catch (_: Exception) {
                    Log.i("mozGetElement", "Compose node not found for content description: ${selector.value}"); null
                }
            }

            SelectorStrategy.COMPOSE_BY_CONTENT_DESCRIPTION_SUBSTRING -> {
                try {
                    composeRule.onNodeWithContentDescription(selector.value, substring = true)
                } catch (_: Exception) {
                    Log.i("mozGetElement", "Compose node not found for content description: ${selector.value}"); null
                }
            }

            SelectorStrategy.ESPRESSO_BY_ID -> {
                val resId = selector.toResourceId()
                if (resId == 0) {
                    Log.i("mozGetElement", "Invalid resource ID for: ${selector.value}")
                    null
                } else {
                    onView(withId(resId))
                }
            }

            SelectorStrategy.ESPRESSO_BY_TEXT -> onView(withText(selector.value))
            SelectorStrategy.ESPRESSO_BY_CONTENT_DESC -> onView(withContentDescription(selector.value))
            SelectorStrategy.ESPRESSO_BY_RES_NAME -> onView(androidx.test.espresso.matcher.ViewMatchers.withResourceName(org.hamcrest.Matchers.containsString(selector.value)))

            SelectorStrategy.UIAUTOMATOR2_BY_CLASS -> {
                val obj = mDevice.findObject(By.clazz(selector.value))
                if (obj == null) {
                    Log.i("mozGetElement", "UIObject2 not found for res: ${selector.value}")
                    null
                } else {
                    obj
                }
            }

            SelectorStrategy.UIAUTOMATOR2_BY_TEXT -> {
                val obj = mDevice.findObject(By.text(selector.value))
                if (obj == null) {
                    Log.i("mozGetElement", "UIObject2 not found for res: ${selector.value}")
                    null
                } else {
                    obj
                }
            }

            SelectorStrategy.UIAUTOMATOR2_BY_RES -> {
                val obj = mDevice.findObject(By.res(selector.value))
                if (obj == null) {
                    Log.i("mozGetElement", "UIObject2 not found for res: ${selector.value}")
                    null
                } else {
                    obj
                }
            }

            SelectorStrategy.UIAUTOMATOR_WITH_RES_ID -> {
                val obj = mDevice.findObject(UiSelector().resourceId(packageName + ":id/" + selector.value))
                if (!obj.exists()) null else obj
            }

            SelectorStrategy.UIAUTOMATOR_WITH_COMPOSE_TAG -> {
                val obj = mDevice.findObject(UiSelector().resourceId(selector.value))
                if (!obj.exists()) null else obj
            }

            SelectorStrategy.UIAUTOMATOR_WITH_TEXT -> {
                val obj = mDevice.findObject(UiSelector().text(selector.value))
                if (!obj.exists()) null else obj
            }

            SelectorStrategy.UIAUTOMATOR_WITH_TEXT_CONTAINS -> {
                val obj = mDevice.findObject(UiSelector().textContains(selector.value))
                if (!obj.exists()) null else obj
            }

            SelectorStrategy.UIAUTOMATOR_WITH_DESCRIPTION_CONTAINS -> {
                val obj = mDevice.findObject(UiSelector().descriptionContains(selector.value))
                if (!obj.exists()) null else obj
            }

            SelectorStrategy.UIAUTOMATOR_WITH_RES_ID_AND_TEXT -> {
                val textToMatch = selector.secondaryValue ?: ""

                val fullResId = packageName + ":id/" + selector.value

                val obj = mDevice.findObject(UiSelector().resourceId(fullResId).text(textToMatch))

                if (!obj.exists()) null else obj
            }
        }
    }

    private fun mozVerifyElement(selector: Selector, applyPreconditions: Boolean = true): Boolean {
        val element = mozGetElement(selector, applyPreconditions = applyPreconditions)

        return when (element) {
            is ViewInteraction -> {
                try {
                    element.check(matches(isDisplayed())); true
                } catch (_: Exception) {
                    false
                }
            }
            is UiObject -> element.exists()
            is SemanticsNodeInteraction -> {
                try {
                    element.assertExists(); element.assertIsDisplayed(); true
                } catch (_: AssertionError) {
                    false
                }
            }
            else -> false
        }
    }

    // ------------------------------------------------------------
    // Preconditions (CMD)
    // ------------------------------------------------------------

    private fun requiresScroll(groups: List<String>): Boolean {
        return groups.any {
            it.equals("requiresScroll", ignoreCase = true) || it.equals("needsSwipeNavStep", ignoreCase = true)
        }
    }

    private fun desiredSwipeDirection(groups: List<String>): SwipeDirection {
        return when {
            groups.any { it.equals("swipeDown", true) } -> SwipeDirection.DOWN
            groups.any { it.equals("swipeLeft", true) } -> SwipeDirection.LEFT
            groups.any { it.equals("swipeRight", true) } -> SwipeDirection.RIGHT
            else -> SwipeDirection.UP
        }
    }

    fun mozClear(selector: Selector): BasePage {
        // TODO (I. RIOS 3/20/2026): pull out boiler plate setup in separate method
        val rep = rep()
        rep?.startCmd(safeId("clear_text", selector.description), "Attempting to clear text from '${selector.description}'...", 1)
        rep?.startLoc(safeId("loc", selector.description), "Attempting to locate '${selector.description}'...", 2)

        val element = mozGetElement(selector)
        if (element == null) {
            rep?.endLoc(success = false, message = notFound(selector.description))
            rep?.endCmd(success = false, message = "Clear text failed: element not found ('${selector.description}')")
            throw AssertionError("Element not found for selector: ${selector.description} (${selector.strategy} -> ${selector.value})")
        } else {
            rep?.endLoc(success = true, message = found(selector.description))
        }

        try {
            when (element) {
                is SemanticsNodeInteraction -> element.performTextClearance()
                is ViewInteraction -> element.perform(androidx.test.espresso.action.ViewActions.clearText())
                is UiObject -> element.clearTextField()
                else -> throw AssertionError("Unsupported element type (${element::class.simpleName}) for selector: ${selector.description}")
            }

            rep?.endCmd(success = true, message = "Cleared text from '${selector.description}'")
            return this
        } catch (e: Throwable) {
            rep?.endCmd(success = false, message = "Clear text failed for '${selector.description}': ${e.message ?: "exception"}")
            throw AssertionError("Failed to clear text for selector: ${selector.description}", e)
        }
    }

    fun mozClearAndEnterText(text: String, selector: Selector): BasePage {
        mozClear(selector)
        return mozEnterText(text, selector)
    }

    private fun ensureReachable(selector: Selector) {
        val rep = rep()

        if (requiresScroll(selector.groups)) {
            val dir = desiredSwipeDirection(selector.groups)

            rep?.startCmd(safeId("precondition_scroll", selector.description), "Attempting to bring '${selector.description}' into view (swipe ${dir.name.lowercase()})...", 1)
            Log.i("Preconditions", "🧭 '${selector.description}' requires scroll. Swiping $dir to bring into view.")

            // IMPORTANT: do not allow nested preconditions during swipe-to lookup
            try {
                mozSwipeTo(selector, direction = dir, maxSwipes = 10, applyPreconditions = false)
                rep?.endCmd(success = true, message = "Precondition satisfied for '${selector.description}'")
            } catch (t: Throwable) {
                rep?.endCmd(success = false, message = "Precondition failed for '${selector.description}': ${t.message ?: "exception"}")
                throw t
            }
        }
    }
}
