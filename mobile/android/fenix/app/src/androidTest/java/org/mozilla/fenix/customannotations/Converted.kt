/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.customannotations

/**
 * Marks a legacy UI test as converted to one or more replacement tests in the
 * TAE efficiency framework. The legacy test continues to run alongside the
 * replacement for safety; once the replacement has been green on main for the
 * configured cadence, the legacy test becomes a deletion candidate.
 *
 * The annotation is documentation-only at runtime.
 *
 * @param replacedBy Fully-qualified pointers to the TAE tests that cover this
 *                   test, in `package.ClassName#methodName` form. Every entry
 *                   must resolve to a real, non-`@Ignore`d `@Test` method —
 *                   validated at build time by the conversion lint check.
 * @param bug Optional. Bugzilla bug ID tracking the conversion (e.g. 1234567).
 * @param since Optional. Annotation date in `YYYY-MM` form.
 * @param notes Optional. Use to call out coverage that intentionally did not
 *              carry over (edge cases, partial replacements) and the bug
 *              tracking the gap.
 */
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class Converted(
    val replacedBy: Array<String>,
    val bug: Int = 0,
    val since: String = "",
    val notes: String = "",
)
