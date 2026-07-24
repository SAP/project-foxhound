/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.pageextraction

/**
 * Errors from page content extraction.
 *
 * @param cause The cause of the error
 */
sealed class PageExtractionError(override val cause: Throwable?) : Throwable(cause = cause) {

    /**
     * An error that occurs when the result of the page extraction is null.
     * There should not be a case where a null result is received
     */
    class UnexpectedNull : PageExtractionError(cause = null)

    /**
     * An unknown error. For example, an error while communicating with the toolkit layer
     *
     * @param cause The cause of the error
     */
    class UnknownError(override val cause: Throwable?) : PageExtractionError(cause)

    /**
     * An error returned when the result is not as expected. This happens when we receive a result,
     * but the expected identifier is missing.
     */
    class MalformedResult : PageExtractionError(cause = null)
}
