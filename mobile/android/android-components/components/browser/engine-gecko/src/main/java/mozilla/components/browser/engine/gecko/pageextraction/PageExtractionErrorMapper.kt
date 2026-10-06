/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.pageextraction

import androidx.annotation.OptIn
import mozilla.components.concept.engine.pageextraction.PageExtractionError
import org.mozilla.geckoview.ExperimentalGeckoViewApi
import org.mozilla.geckoview.PageExtractionController
import org.mozilla.geckoview.PageExtractionController.PageExtractionException.ERROR_MALFORMED_RESULT
import org.mozilla.geckoview.PageExtractionController.PageExtractionException.ERROR_NULL_RESULT

/**
 * Bridge function to map from GeckoSession's [PageExtractionController.PageExtractionException]
 * into [PageExtractionError]
 */
@OptIn(ExperimentalGeckoViewApi::class)
fun Throwable.intoPageExtractionError(): PageExtractionError {
    return if (this is PageExtractionController.PageExtractionException) {
        this.toPageExtractionError()
    } else {
        PageExtractionError.UnknownError(cause = this)
    }
}

@OptIn(ExperimentalGeckoViewApi::class)
private fun PageExtractionController.PageExtractionException.toPageExtractionError(): PageExtractionError {
    return when (this.errorType) {
        ERROR_MALFORMED_RESULT -> PageExtractionError.MalformedResult()
        ERROR_NULL_RESULT -> PageExtractionError.UnexpectedNull()
        else -> PageExtractionError.UnknownError(this)
    }
}
