/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.annotation.VisibleForTesting
import androidx.core.net.toUri
import com.google.android.play.core.review.ReviewException
import com.google.android.play.core.review.ReviewInfo
import com.google.android.play.core.review.ReviewManager
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.GleanMetrics.ReviewPrompt
import org.mozilla.fenix.components.ReviewPromptAttemptResult.Displayed
import org.mozilla.fenix.components.ReviewPromptAttemptResult.Error
import org.mozilla.fenix.components.ReviewPromptAttemptResult.NotDisplayed
import org.mozilla.fenix.components.ReviewPromptAttemptResult.Unknown
import org.mozilla.fenix.settings.SupportUtils
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

val logger = Logger("PlayStoreReviewPromptController")

/**
 * Wraps the Play Store In-App Review API.
 */
class PlayStoreReviewPromptController(
    private val manager: ReviewManager,
    private val numberOfAppLaunches: () -> Int,
) {

    /**
     * Launch the in-app review flow, unless we've hit the quota.
     */
    @Suppress("TooGenericExceptionCaught")
    suspend fun tryPromptReview(activity: Activity): ReviewPromptAttemptResult {
        logger.info("tryPromptReview in progress...")
        val reviewInfoTask = withContext(Dispatchers.IO) { manager.requestReviewFlow() }

        val result = try {
            val reviewInfo = reviewInfoTask.await()

            logger.info("Review flow launched.")
            // Launch the in-app flow.
            manager.launchReviewFlow(activity, reviewInfo)

            ReviewPromptAttemptResult.from(reviewInfo.toString())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Error(e)
        }

        when (result) {
            NotDisplayed -> {
                logger.warn("In-app review flow reported as not displayed, even though there was no error.")
            }

            is Error -> {
                val reviewErrorCode =
                    (result.exception as? ReviewException)?.errorCode ?: ERROR_CODE_UNEXPECTED
                logger.warn("Failed to launch in-app review flow due to: $reviewErrorCode.")
            }

            Displayed, Unknown -> {}
        }

        recordReviewPromptEvent(
            promptAttemptResult = result,
            numberOfAppLaunches = numberOfAppLaunches(),
            now = Date(),
        )

        logger.info("tryPromptReview completed.")

        return result
    }

    /**
     * Try to launch the play store review flow.
     */
    fun tryLaunchPlayStoreReview(
        activity: Activity,
        openInNewTab: (url: String) -> Unit,
    ) {
        logger.info("tryLaunchPlayStoreReview in progress...")

        try {
            logger.info("Navigating to Play store listing.")
            activity.startActivity(
                Intent(Intent.ACTION_VIEW, SupportUtils.RATE_APP_URL.toUri()),
            )
        } catch (e: ActivityNotFoundException) {
            // Device without the play store installed.
            // Opening the play store website.
            openInNewTab(SupportUtils.FENIX_PLAY_STORE_URL)

            logger.warn("Failed to launch play store review flow due to: $e.")
        }

        logger.info("tryLaunchPlayStoreReview completed.")
    }

    companion object {
        /**
         * Placeholder for unexpected exception type.
         */
        private const val ERROR_CODE_UNEXPECTED: Int = -42
    }
}

/**
 * Result of an attempt to show a Play Store In-App Review Prompt.
 */
sealed interface ReviewPromptAttemptResult {
    /**
     * Attempted completed without error, but the API didn't allow to display the prompt.
     */
    data object NotDisplayed : ReviewPromptAttemptResult

    /**
     * Prompt has been shown.
     */
    data object Displayed : ReviewPromptAttemptResult

    /**
     * There was an error, for example this is a device without Play Store.
     */
    data class Error(val exception: Exception) : ReviewPromptAttemptResult

    /**
     * Attempt completed without error, but we weren't able to determine if prompt has been shown or not.
     */
    data object Unknown : ReviewPromptAttemptResult

    companion object {
        /**
         * The docs for [ReviewManager.launchReviewFlow] state 'In some circumstances the review
         * flow will not be shown to the user, e.g. they have already seen it recently, so do not assume that
         * calling this method will always display the review dialog.'
         * However, investigation has shown that a [ReviewInfo] instance with the flag:
         * - 'isNoOp=true' indicates that the prompt has NOT been displayed.
         * - 'isNoOp=false' indicates that a prompt has been displayed.
         * [ReviewManager.launchReviewFlow] will modify the ReviewInfo instance which can be used to determine
         * which of these flags is present.
         *
         * The internals of ReviewInfo cannot be accessed directly or cast nicely, so let's simply use
         * the object as a string.
         */
        fun from(reviewInfoAsString: String): ReviewPromptAttemptResult {
            return when {
                reviewInfoAsString.contains("isNoOp=true") -> NotDisplayed
                reviewInfoAsString.contains("isNoOp=false") -> Displayed
                // ReviewInfo is susceptible to changes outside of our control hence the catch-all 'else' statement.
                else -> Unknown
            }
        }
    }
}

/**
 * Records a [ReviewPrompt] with the required data.
 */
@VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
fun recordReviewPromptEvent(
    promptAttemptResult: ReviewPromptAttemptResult,
    numberOfAppLaunches: Int,
    now: Date,
) {
    val formattedLocalDatetime =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()).format(now)

    val promptWasDisplayed = when (promptAttemptResult) {
        NotDisplayed -> "false"
        Displayed -> "true"
        is Error, Unknown -> "error"
    }

    ReviewPrompt.promptAttempt.record(
        ReviewPrompt.PromptAttemptExtra(
            promptWasDisplayed = promptWasDisplayed,
            localDatetime = formattedLocalDatetime,
            numberOfAppLaunches = numberOfAppLaunches,
        ),
    )
}
