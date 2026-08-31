/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.continuous

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.view.ViewGroup
import androidx.activity.result.ActivityResultLauncher
import androidx.annotation.RequiresApi
import androidx.annotation.VisibleForTesting
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.utils.DateTimeProvider
import mozilla.components.support.utils.DefaultDateTimeProvider
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.onboarding.DismissedMethod
import org.mozilla.fenix.onboarding.OnboardingTelemetryRecorder
import org.mozilla.fenix.onboarding.OnboardingTelemetryRecorder.Companion.ET_CARD_CLOSE_BUTTON
import org.mozilla.fenix.onboarding.view.Action
import org.mozilla.fenix.onboarding.view.OnboardingPageState
import org.mozilla.fenix.onboarding.view.OnboardingPageUiData
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.utils.Settings

/**
 * Manages the continuous onboarding flow shown after initial onboarding.
 *
 * Based on the user's current onboarding stage and device capabilities, this feature may:
 * - request the default browser role on day 2 or day 3,
 * - show a notification-permission onboarding card once the default-browser step is satisfied, or
 * - show a Firefox Sync sign-in card on day 7.
 */
interface ContinuousOnboardingFeature {
    /**
     * Evaluates whether continuous onboarding should run and triggers the appropriate onboarding
     * action for the current stage.
     *
     * @param activity The [Activity] used for launching UI and system interactions.
     * @param launcher The [ActivityResultLauncher] used to request system roles.
     */
    fun maybeRunContinuousOnboarding(activity: Activity, launcher: ActivityResultLauncher<Intent>)

    /**
     * Continues the onboarding flow after the default-browser role request has returned.
     *
     * Invoked with the result of the system role request. Depending on the result code and device
     * capabilities, this may show the notification-permission onboarding card or mark the stage
     * as completed.
     *
     * @param activity The [Activity] used for launching UI and system interactions.
     * @param resultCode The result code returned by the system role request.
     */
    fun onDefaultBrowserStepCompleted(activity: Activity, resultCode: Int)
}

/**
 * Default implementation of [ContinuousOnboardingFeature].
 */
class ContinuousOnboardingFeatureDefault(
    private val settings: Settings,
    private val telemetryRecorder: OnboardingTelemetryRecorder,
    private val stageProvider: ContinuousOnboardingStageProvider,
    private val navigateToSyncSignIn: () -> Unit,
    private val dateTimeProvider: DateTimeProvider = DefaultDateTimeProvider(),
) : ContinuousOnboardingFeature {
    private val logger = Logger("ContinuousOnboardingFeatureDefault")

    @VisibleForTesting
    internal var pendingStage: ContinuousOnboardingStage = ContinuousOnboardingStage.NONE

    override fun maybeRunContinuousOnboarding(
        activity: Activity,
        launcher: ActivityResultLauncher<Intent>,
    ) {
        if (!shouldShowContinuousOnboarding()) return

        when (val stage = stageProvider.getContinuousOnboardingStage()) {
            ContinuousOnboardingStage.DAY_2,
            ContinuousOnboardingStage.DAY_3,
                -> maybeRequestDefaultBrowserRole(
                activity = activity,
                launcher = launcher,
                stage = stage,
            )

            ContinuousOnboardingStage.DAY_7 -> if (!settings.signedInFxaAccount) {
                showSyncCardDialog(activity)
            } else {
                telemetryRecorder.onOnboardingComplete(
                    sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                    sequencePosition = "0",
                )
                markStageCompleted(stage)
            }

            ContinuousOnboardingStage.NONE -> {
                logger.info("No continuous onboarding stage to show.")
            }
        }
    }

    @VisibleForTesting
    internal fun shouldShowContinuousOnboarding(): Boolean {
        val continuousOnboardingCompleted = settings.seventhDayOnboardingCompletedTimestamp != -1L
        logger.info("continuousOnboardingCompleted: $continuousOnboardingCompleted")
        logger.info("continuousOnboardingFeatureEnabled: ${settings.continuousOnboardingFeatureEnabled}")
        return settings.continuousOnboardingFeatureEnabled && !continuousOnboardingCompleted
    }

    private fun maybeRequestDefaultBrowserRole(
        activity: Activity,
        launcher: ActivityResultLauncher<Intent>,
        stage: ContinuousOnboardingStage,
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = activity.getSystemService(RoleManager::class.java)
            if (roleManager == null) {
                logger.warn("Role manager was null.")
                markStageCompleted(stage)
                return
            }

            if (roleManager.isRoleAvailable(RoleManager.ROLE_BROWSER) &&
                !roleManager.isRoleHeld(RoleManager.ROLE_BROWSER)
            ) {
                logger.info("Showing default-browser role request dialog.")
                pendingStage = stage
                launcher.launch(
                    roleManager.createRequestRoleIntent(RoleManager.ROLE_BROWSER),
                )
            } else {
                logger.info("Default-browser role is already held or is unavailable.")
                maybeShowNotificationCardDialog(activity, stage)
            }
        } else {
            logger.warn("Unable to show default-browser role request dialog.")
            markStageCompleted(stage)
        }
    }

    private fun showSyncCardDialog(activity: Activity) {
        logger.info("Showing sync card dialog.")

        val stage = ContinuousOnboardingStage.DAY_7
        val onDismissCard = {
            telemetryRecorder.onSkipSignInClick(
                sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                sequencePosition = "0",
                elementType = ET_CARD_CLOSE_BUTTON,
            )
            telemetryRecorder.onOnboardingComplete(
                sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                sequencePosition = "0",
                dismissedMethod = DismissedMethod.SKIPPED,
            )
        }

        showDialog(
            activity = activity,
            pageState = getSyncOnboardingPageState(activity),
            stage = stage,
            onDismissCard = onDismissCard,
        )
    }

    @VisibleForTesting
    internal fun getSyncOnboardingPageState(activity: Activity) = OnboardingPageState(
        imageRes = R.drawable.nova_onboarding_sync,
        title = activity.getString(R.string.nova_onboarding_sync_title),
        description = activity.getString(R.string.nova_onboarding_sync_subtitle),
        primaryButton = Action(
            text = activity.getString(R.string.nova_onboarding_sync_button),
            onClick = {
                navigateToSyncSignIn()

                telemetryRecorder.onSyncSignInClick(
                    sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                    sequencePosition = "0",
                )
                telemetryRecorder.onOnboardingComplete(
                    sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                    sequencePosition = "0",
                )
            },
        ),
        secondaryButton = Action(
            text = activity.getString(R.string.nova_onboarding_continue_button),
            onClick = {
                telemetryRecorder.onSkipSignInClick(
                    sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                    sequencePosition = "0",
                )
                telemetryRecorder.onOnboardingComplete(
                    sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                    sequencePosition = "0",
                    dismissedMethod = DismissedMethod.SKIPPED,
                )
            },
        ),
        onRecordImpressionEvent = {
            telemetryRecorder.onImpression(
                sequenceId = OnboardingPageUiData.Type.SYNC_SIGN_IN.telemetryId,
                pageType = OnboardingPageUiData.Type.SYNC_SIGN_IN,
                sequencePosition = "0",
            )
        },
    )

    override fun onDefaultBrowserStepCompleted(
        activity: Activity,
        resultCode: Int,
    ) {
        if (resultCode == Activity.RESULT_OK) {
            telemetryRecorder.onSetToDefaultClick(
                sequenceId = OnboardingPageUiData.Type.DEFAULT_BROWSER.telemetryId,
                sequencePosition = "0",
            )
        }

        maybeShowNotificationCardDialog(activity, pendingStage)

        // Reset the pending stage
        pendingStage = ContinuousOnboardingStage.NONE
    }

    private fun maybeShowNotificationCardDialog(
        activity: Activity,
        stage: ContinuousOnboardingStage,
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !activity.components.notificationsDelegate.hasPostNotificationsPermission()
        ) {
            logger.info("Showing notification-permission card dialog.")

            val onDismissCard = {
                telemetryRecorder.onSkipTurnOnNotificationsClick(
                    sequenceId = OnboardingPageUiData.Type.NOTIFICATION_PERMISSION.telemetryId,
                    sequencePosition = "0",
                    elementType = ET_CARD_CLOSE_BUTTON,
                )
            }

            showDialog(
                activity = activity,
                pageState = getNotificationOnboardingPageState(activity),
                stage = stage,
                onDismissCard = onDismissCard,
            )
        } else {
            logger.warn("Unable to show notification-permission card dialog.")
            markStageCompleted(stage)
        }
    }

    @VisibleForTesting
    @RequiresApi(Build.VERSION_CODES.TIRAMISU)
    internal fun getNotificationOnboardingPageState(
        activity: Activity,
    ) = OnboardingPageState(
        imageRes = R.drawable.nova_onboarding_notifications,
        title = activity.getString(R.string.nova_onboarding_notifications_title),
        description = activity.getString(R.string.nova_onboarding_notifications_subtitle),
        primaryButton = Action(
            text = activity.getString(R.string.nova_onboarding_notifications_button),
            onClick = {
                telemetryRecorder.onNotificationPermissionClick(
                    sequenceId = OnboardingPageUiData.Type.NOTIFICATION_PERMISSION.telemetryId,
                    sequencePosition = "0",
                )
                activity.components.notificationsDelegate.requestNotificationPermission()
            },
        ),
        secondaryButton = Action(
            text = activity.getString(R.string.nova_onboarding_negative_button),
            onClick = {
                telemetryRecorder.onSkipTurnOnNotificationsClick(
                    sequenceId = OnboardingPageUiData.Type.NOTIFICATION_PERMISSION.telemetryId,
                    sequencePosition = "0",
                )
            },
        ),
        onRecordImpressionEvent = {
            telemetryRecorder.onImpression(
                sequenceId = OnboardingPageUiData.Type.NOTIFICATION_PERMISSION.telemetryId,
                pageType = OnboardingPageUiData.Type.NOTIFICATION_PERMISSION,
                sequencePosition = "0",
            )
        },
    )

    private fun showDialog(
        activity: Activity,
        pageState: OnboardingPageState,
        stage: ContinuousOnboardingStage,
        onDismissCard: () -> Unit = {},
    ) {
        val decorView = activity.window.decorView as? ViewGroup
        if (decorView == null) {
            logger.error("decorView was null.")
            return
        }

        if (decorView.findViewWithTag<ComposeView>(CONTINUOUS_ONBOARDING_DIALOG_TAG) != null) {
            logger.error("Continuous onboarding dialog is already shown.")
            return
        }

        val composeView = ComposeView(activity).apply {
            tag = CONTINUOUS_ONBOARDING_DIALOG_TAG
        }
        val onDismissRequest = {
            logger.info("Dismissing continuous onboarding dialog.")
            markStageCompleted(stage)
            // Protect against repeated dismiss calls or odd lifecycle timing.
            if (composeView.parent === decorView) {
                logger.info("Removing continuous onboarding dialog.")
                decorView.removeView(composeView)
            }
        }

        composeView.apply {
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
            setContent {
                FirefoxTheme {
                    ContinuousOnboardingScreen(
                        pageState = pageState,
                        onDismissRequest = onDismissRequest,
                        onCloseButtonClicked = onDismissCard,
                    )
                }
            }
        }

        decorView.addView(composeView)
    }

    @VisibleForTesting
    internal fun markStageCompleted(stage: ContinuousOnboardingStage) {
        logger.info("Marking stage as completed: $stage")
        val now = dateTimeProvider.currentTimeMillis()
        when (stage) {
            ContinuousOnboardingStage.DAY_2 -> settings.secondDayOnboardingCompletedTimestamp = now
            ContinuousOnboardingStage.DAY_3 -> settings.thirdDayOnboardingCompletedTimestamp = now
            ContinuousOnboardingStage.DAY_7 -> settings.seventhDayOnboardingCompletedTimestamp = now
            ContinuousOnboardingStage.NONE -> Unit
        }
    }

    private companion object {
        const val CONTINUOUS_ONBOARDING_DIALOG_TAG = "continuous_onboarding_dialog"
    }
}
