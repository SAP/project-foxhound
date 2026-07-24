/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.logging

/**
 * ConsoleLogger
 *
 * Purpose:
 * - Produce a human-optimized, structured log stream for local dev and CI artifacts.
 *
 * Why this exists (vs. plain logcat):
 * - logcat is powerful but noisy, and its signal-to-noise is especially poor when debugging
 *   complex automation harnesses and dynamic test factories.
 * - This logger produces a single, consistent "story" of what the test is doing at each layer:
 *      STEP  -> high-level intent (e.g., navigate to BookmarksPage)
 *      CMD   -> custom command / helper (e.g., click menu item)
 *      LOC   -> element lookup / verification (e.g., locate toolbar title)
 *
 * Accessibility + usability:
 * - Colors + indentation encode meaning. This is helpful for everyone, and particularly useful
 *   for developers with dyslexia or color blindness (like me, I have both) where unstructured
 *   logs are hard to scan.
 * - Using distinct shades per category (including per-type OK/ERR colors) makes it easy to spot:
 *     - where a failure happened (LOC vs CMD vs STEP),
 *     - where time was spent (slow warnings),
 *     - and potential ordering issues (e.g., adjacent lines of the same category can hint at
 *       unexpected async execution or missing boundaries).
 *
 * Current consumption model (intentionally simple):
 * - We print to stdout so it can be captured by instrumentation and surfaced via logcat:
 *
 *     adb logcat | grep --line-buffered "System.out" | awk -F'System.out: ' '{print $2}'
 *
 * This keeps the solution lightweight while we validate value and iterate quickly.
 * Later, we can add a dedicated artifact sink or integrate directly into the existing factory sinks.
 */
object ConsoleLogger {
    private const val RESET = "\u001B[0m"
    private const val BOLD = "\u001B[1m"

    // Base palette (tuned for readability; further tuning is expected as usage grows).
    private const val PURPLE = "\u001B[38;5;141m" // STEP
    private const val DARK_ORANGE = "\u001B[38;5;208m" // CMD
    private const val YELLOW = "\u001B[33m" // LOC
    private const val GREEN = "\u001B[32m" // SEL (reserved)
    private const val DARK_GREEN = "\u001B[38;5;22m" // legacy OK / also STEP OK
    private const val RED = "\u001B[31m" // legacy ERR
    private const val CYAN = "\u001B[36m" // INFO

    /**
     * Toggle colors (useful for CI logs that strip ANSI codes).
     * Usage: -DtestLogColors=false
     */
    var colorsEnabled: Boolean = System.getProperty("testLogColors", "true") != "false"

    private fun indent(level: Int): String = "    ".repeat(level.coerceAtLeast(0))

    private fun colorize(color: String, s: String): String =
        if (colorsEnabled) "$color$BOLD$s$RESET" else s

    /**
     * Low-level emission primitive.
     *
     * NOTE:
     * - Keep this function dumb. The "meaning" lives in TimedReporter.
     * - This makes it easier to replace output transport later (stdout, file sink, JSON, etc.)
     *   without changing call sites.
     */
    fun line(color: String, tag: String, icon: String, level: Int, msg: String) {
        val base = "${indent(level)}[$tag] $icon $msg"
        println(colorize(color, base))
    }

    // Start-of-scope messages: these are intentionally "Attempting..." and typically end with "...".
    fun step(level: Int, msg: String) = line(PURPLE, "STEP", "★", level, msg)
    fun cmd(level: Int, msg: String) = line(DARK_ORANGE, "CMD", "➤", level, msg)
    fun loc(level: Int, msg: String) = line(YELLOW, "LOC", "🔎", level, msg)

    /**
     * SEL is reserved for "selector strategy / parsing" messages once we decide to surface them.
     * (e.g. COMPOSE_BY_TAG vs ESPRESSO_BY_ID, resource-id parsing failures, etc.)
     */
    fun sel(level: Int, msg: String) = line(GREEN, "SEL", "→", level, msg)

    /**
     * Completion messages.
     *
     * Design rule:
     * - OK/ERR messages should contain *only* the outcome (confirmation/error), not a repeat of
     *   the start message. The start message is already logged when the scope begins.
     *
     * Additional design rule:
     * - Use distinct shades per completion type (LOC vs CMD vs STEP). This provides a fast
     *   "sanity check" for ordering and grouping and supports scanning at-a-glance.
     */
    fun ok(type: TimedReporter.Type, level: Int, msg: String) {
        val color = when (type) {
            TimedReporter.Type.LOC -> "\u001B[38;5;82m" // bright green
            TimedReporter.Type.CMD -> "\u001B[38;5;34m" // medium green
            TimedReporter.Type.STEP -> "\u001B[38;5;22m" // dark green
        }
        line(color, "OK", "✔", level, msg)
    }

    fun err(type: TimedReporter.Type, level: Int, msg: String) {
        val color = when (type) {
            TimedReporter.Type.LOC -> "\u001B[38;5;203m" // high-contrast pink/red
            TimedReporter.Type.CMD -> "\u001B[31m" // red
            TimedReporter.Type.STEP -> "\u001B[38;5;124m" // dark red
        }
        line(color, "ERR", "✖", level, msg)
    }

    fun info(level: Int, msg: String) = line(CYAN, "INFO", "•", level, msg)
}
