/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.fragment.onboarding

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.activity.result.ActivityResultLauncher

/**
 * Interactor for the onboarding flow.
 */
interface OnboardingInteractor {
    /**
     * Finishes the onboarding flow.
     */
    fun onFinishOnBoarding()

    /**
     * Handles clicking the "Get Started" button.
     */
    fun onGetStartedButtonClicked()

    /**
     * Handles clicking the button to make Focus the default browser.
     */
    fun onMakeFocusDefaultBrowserButtonClicked(activityResultLauncher: ActivityResultLauncher<Intent>)

    /**
     * Handles the [activityResult] from the default browser request.
     */
    fun onActivityResultImplementation(activityResult: ActivityResult)
}

/**
 * Default implementation of the [OnboardingInteractor].
 */
class DefaultOnboardingInteractor(private val controller: OnboardingController) : OnboardingInteractor {
    override fun onFinishOnBoarding() {
        controller.handleFinishOnBoarding()
    }

    override fun onGetStartedButtonClicked() {
        controller.handleGetStartedButtonClicked()
    }

    override fun onMakeFocusDefaultBrowserButtonClicked(activityResultLauncher: ActivityResultLauncher<Intent>) {
        controller.handleMakeFocusDefaultBrowserButtonClicked(activityResultLauncher)
    }

    override fun onActivityResultImplementation(activityResult: ActivityResult) {
        controller.handleActivityResultImplementation(activityResult)
    }
}
