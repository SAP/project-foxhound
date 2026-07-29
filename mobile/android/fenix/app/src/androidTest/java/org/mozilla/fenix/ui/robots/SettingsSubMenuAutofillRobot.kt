/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.robots

import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityWindowInfo
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.click
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isNotDisplayed
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTouchInput
import androidx.test.espresso.Espresso.closeSoftKeyboard
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.RootMatchers
import androidx.test.espresso.matcher.ViewMatchers.isChecked
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isNotChecked
import androidx.test.espresso.matcher.ViewMatchers.withChild
import androidx.test.espresso.matcher.ViewMatchers.withClassName
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiSelector
import org.hamcrest.CoreMatchers.allOf
import org.hamcrest.CoreMatchers.endsWith
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.helpers.MatcherHelper.assertUIObjectExists
import org.mozilla.fenix.helpers.MatcherHelper.itemContainingText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithDescription
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTime
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeLong
import org.mozilla.fenix.helpers.TestHelper.hasCousin
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.click
import org.mozilla.fenix.helpers.ext.clearAndSetText
import org.mozilla.fenix.helpers.waitUntilDisplayed
import org.mozilla.fenix.settings.address.ui.edit.EditAddressTestTag
import org.mozilla.fenix.settings.creditcards.ui.CreditCardEditorTestTags

class SettingsSubMenuAutofillRobot(private val composeTestRule: ComposeTestRule) {

    fun verifyAutofillToolbarTitle() {
        assertUIObjectExists(autofillToolbarTitle())
    }
    fun verifyManageAddressesToolbarTitle() {
        Log.i(TAG, "verifyManageAddressesToolbarTitle: Trying to verify that the \"Manage addresses\" toolbar title is displayed")
        onView(
            allOf(
                withId(R.id.navigationToolbar),
                withChild(
                    withText(R.string.preferences_addresses_manage_addresses),
                ),
            ),
        ).check(matches(isDisplayed()))
        Log.i(TAG, "verifyManageAddressesToolbarTitle: Verified that the \"Manage addresses\" toolbar title is displayed")
    }

    fun verifyAddressAutofillSection(isAddressAutofillEnabled: Boolean, userHasSavedAddress: Boolean) {
        assertUIObjectExists(
            autofillToolbarTitle(),
            addressesSectionTitle(),
            saveAndAutofillAddressesOption(),
            saveAndAutofillAddressesSummary(),
        )

        if (userHasSavedAddress) {
            assertUIObjectExists(manageAddressesButton())
        } else {
            assertUIObjectExists(addAddressButton())
        }

        verifyAddressesAutofillToggle(isAddressAutofillEnabled)
    }

    fun verifyCreditCardsAutofillSection(isAddressAutofillEnabled: Boolean, userHasSavedCreditCard: Boolean) {
        assertUIObjectExists(
            autofillToolbarTitle(),
            creditCardsSectionTitle(),
            saveAndAutofillCreditCardsOption(),
            saveAndAutofillCreditCardsSummary(),
            syncCreditCardsAcrossDevicesButton(),
        )

        if (userHasSavedCreditCard) {
            assertUIObjectExists(manageSavedCreditCardsButton())
        } else {
            assertUIObjectExists(addCreditCardButton())
        }

        verifySaveAndAutofillCreditCardsToggle(isAddressAutofillEnabled)
    }

    fun verifyManageAddressesSection(vararg savedAddressDetails: String) {
        assertUIObjectExists(
            navigateBackButton(),
            manageAddressesToolbarTitle(),
            addAddressButton(),
        )
        for (savedAddressDetail in savedAddressDetails) {
            Log.i(TAG, "verifyManageAddressesSection: Trying to verify that: $savedAddressDetail detail is displayed")
            composeTestRule.onNodeWithText(savedAddressDetail).assertIsDisplayed()
            Log.i(TAG, "verifyManageAddressesSection: Verified that: $savedAddressDetail detail is displayed")
        }
    }

    fun verifySavedCreditCardsSection(creditCardLastDigits: String, creditCardExpiryDate: String) {
        assertUIObjectExists(
            navigateBackButton(),
            savedCreditCardsToolbarTitle(),
            addCreditCardButton(),
            itemContainingText(creditCardLastDigits),
            itemContainingText(creditCardExpiryDate),
        )
    }

    fun verifyAddressesAutofillToggle(enabled: Boolean) {
        Log.i(TAG, "verifyAddressesAutofillToggle: Trying to verify that the \"Save and autofill addresses\" toggle is checked: $enabled")
        onView(withText(R.string.preferences_addresses_save_and_autofill_addresses_2))
            .check(
                matches(
                    hasCousin(
                        allOf(
                            withClassName(endsWith("Switch")),
                            if (enabled) {
                                isChecked()
                            } else {
                                isNotChecked()
                            },
                        ),
                    ),
                ),
            )
        Log.i(TAG, "verifyAddressesAutofillToggle: Verified that the \"Save and autofill addresses\" toggle is checked: $enabled")
    }

    fun verifySaveAndAutofillCreditCardsToggle(enabled: Boolean) {
        Log.i(TAG, "verifySaveAndAutofillCreditCardsToggle: Trying to verify that the \"Save and autofill cards\" toggle is checked: $enabled")
        onView(withText(R.string.preferences_credit_cards_save_and_autofill_cards_2))
            .check(
                matches(
                    hasCousin(
                        allOf(
                            withClassName(endsWith("Switch")),
                            if (enabled) {
                                isChecked()
                            } else {
                                isNotChecked()
                            },
                        ),
                    ),
                ),
            )
        Log.i(TAG, "verifySaveAndAutofillCreditCardsToggle: Verified that the \"Save and autofill cards\" toggle is checked: $enabled")
    }

    @OptIn(ExperimentalTestApi::class)
    fun verifyAddAddressView() {
        Log.i(TAG, "verifyAddAddressView: Trying to perform \"Close soft keyboard\" action")
        // Closing the keyboard to ensure full visibility of the "Add address" view
        waitForKeyboardDismiss()
        Log.i(TAG, "verifyAddAddressView: Performed \"Close soft keyboard\" action")
        listOf(
            composeTestRule.navigateBackButton(),
            composeTestRule.addAddressToolbarTitle(),
            composeTestRule.toolbarCheckmarkButton(),
            composeTestRule.nameTextInput(),
            composeTestRule.streetAddressTextInput(),
            composeTestRule.cityTextInput(),
            composeTestRule.subRegionDropDown(),
            composeTestRule.zipCodeTextInput(),
            composeTestRule.countryDropDown(),
            composeTestRule.phoneTextInput(),
        ).forEach { it.assertIsDisplayed() }
        composeTestRule.addressForm().performScrollToNode(hasTestTag(EditAddressTestTag.EMAIL_FIELD))
        composeTestRule.waitUntilDisplayed(composeTestRule.emailTextInput())
        composeTestRule.emailTextInput().assertIsDisplayed()

        // Use performScrollToNode on the form container to handle lazy-list off-screen items.
        composeTestRule.addressForm().performScrollToNode(hasTestTag(EditAddressTestTag.SAVE_BUTTON))
        composeTestRule.waitForIdle()
        composeTestRule.addressForm().performScrollToNode(hasTestTag(EditAddressTestTag.CANCEL_BUTTON))
        composeTestRule.waitForIdle()
        Log.i(TAG, "verifyAddAddressView: Verified the \"Add address\" view items")
    }

    fun verifyCountryOption(country: String) {
        Log.i(TAG, "verifyCountryOption: Trying to perform \"Close soft keyboard\" action")
        // Closing the keyboard to ensure full visibility of the "Add address" view
        waitForKeyboardDismiss()
        composeTestRule.waitForIdle()
        Log.i(TAG, "verifyCountryOption: Performed \"Close soft keyboard\" action")
        assertUIObjectExists(itemContainingText(country))
    }

    fun verifyStateOption(state: String) {
        Log.i(TAG, "verifyStateOption: Trying to verify that state: $state is displayed")
        composeTestRule.subRegionDropDown().assert(hasText(state))
        Log.i(TAG, "verifyStateOption: Verified that state: $state is displayed")
    }

    fun verifyCountryOptions(vararg countries: String) {
        Log.i(TAG, "verifyCountryOptions: Trying to click the \"Country or region\" dropdown")
        composeTestRule.countryDropDown().performClick()
        Log.i(TAG, "verifyCountryOptions: Clicked the \"Country or region\" dropdown")
        for (country in countries) {
            assertUIObjectExists(itemContainingText(country))
        }
    }

    @OptIn(ExperimentalTestApi::class)
    fun selectCountry(country: String) {
        Log.i(TAG, "selectCountry: Trying to select $country dropdown option")
        clickCountryOption(country)
        Log.i(TAG, "selectCountry: Selected $country dropdown option")
    }

    @OptIn(ExperimentalTestApi::class)
    fun verifyEditAddressView() {
        Log.i(TAG, "verifyEditAddressView: Trying to verify that the \"Edit address\" items are displayed")
        listOf(
            composeTestRule.navigateBackButton(),
            composeTestRule.editAddressToolbarTitle(),
            composeTestRule.toolbarCheckmarkButton(),
            composeTestRule.toolbarDeleteAddressButton(),
            composeTestRule.nameTextInput(),
            composeTestRule.streetAddressTextInput(),
            composeTestRule.cityTextInput(),
            composeTestRule.subRegionDropDown(),
        ).forEach { it.assertIsDisplayed() }

        Log.i(TAG, "verifyEditAddressView: Trying to click device back button to dismiss keyboard using device back button")
        mDevice.pressBack()
        Log.i(TAG, "verifyEditAddressView: Clicked device back button to dismiss keyboard using device back button")
        waitForAppWindowToBeUpdated()

        listOf(
            composeTestRule.zipCodeTextInput(),
            composeTestRule.countryDropDown(),
            composeTestRule.phoneTextInput(),
        ).forEach { it.assertIsDisplayed() }
        composeTestRule.addressForm().performScrollToNode(hasTestTag(EditAddressTestTag.EMAIL_FIELD))
        composeTestRule.waitUntilDisplayed(composeTestRule.emailTextInput())
        composeTestRule.emailTextInput().assertIsDisplayed()

        if (composeTestRule.saveButton().isNotDisplayed()) {
            composeTestRule.saveButton().performScrollTo()
            composeTestRule.waitForIdle()
            mDevice.waitForIdle()
        }

        listOf(
            composeTestRule.saveButton(),
            composeTestRule.cancelButton(),
        ).forEach { it.assertIsDisplayed() }
        Log.i(TAG, "verifyEditAddressView: Verified that the \"Edit address\" items are displayed")
    }

    fun clickSaveAndAutofillAddressesOption() {
        Log.i(TAG, "clickSaveAndAutofillAddressesOption: Trying to click the \"Save and fill addresses\" button")
        saveAndAutofillAddressesOption().click()
        Log.i(TAG, "clickSaveAndAutofillAddressesOption: Clicked the \"Save and fill addresses\" button")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickAddAddressButton() {
        Log.i(TAG, "clickAddAddressButton: Waiting for $waitingTime ms for \"Add address\" button to exist")
        addAddressButton().waitForExists(waitingTime)
        Log.i(TAG, "clickAddAddressButton: Verified \"Add address\" button exists")
        Log.i(TAG, "clickAddAddressButton: Trying to click the \"Add address\" button")
        addAddressButton().click()
        Log.i(TAG, "clickAddAddressButton: Clicked the \"Add address\" button")
        waitForAppWindowToBeUpdated()
    }
    fun clickManageAddressesButton() {
        Log.i(TAG, "clickManageAddressesButton: Trying to click the \"Manage addresses\" button")
        manageAddressesButton().click()
        Log.i(TAG, "clickManageAddressesButton: Clicked the \"Manage addresses\" button")
    }
    fun clickSavedAddress(composeTestRule: ComposeTestRule, name: String) {
        Log.i(TAG, "clickSavedAddress: Trying to click the $name saved address and and wait for $waitingTime ms for a new window")
        composeTestRule.onNodeWithText(name, useUnmergedTree = true).performClick()
        Log.i(TAG, "clickSavedAddress: Clicked the $name saved address and and waited for $waitingTime ms for a new window")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickDeleteAddressButton() {
        Log.i(TAG, "clickDeleteAddressButton: Waiting for $waitingTime ms for the delete address toolbar button to exist")
        composeTestRule.waitUntilAtLeastOneExists(hasTestTag(EditAddressTestTag.TOPBAR_DELETE_BUTTON), waitingTime)
        Log.i(TAG, "clickDeleteAddressButton: Waited for $waitingTime ms for the delete address toolbar button to exist")
        Log.i(TAG, "clickDeleteAddressButton: Trying to click the delete address toolbar button")
        composeTestRule.toolbarDeleteAddressButton().performClick()
        Log.i(TAG, "clickDeleteAddressButton: Clicked the delete address toolbar button")
    }
    fun clickCancelDeleteAddressButton() {
        Log.i(TAG, "clickCancelDeleteAddressButton: Trying to click the \"CANCEL\" button from the delete address dialog")
        composeTestRule.cancelDeleteAddressButton().performClick()
        Log.i(TAG, "clickCancelDeleteAddressButton: Clicked the \"CANCEL\" button from the delete address dialog")
    }

    fun clickConfirmDeleteAddressButton() {
        Log.i(TAG, "clickConfirmDeleteAddressButton: Trying to click the \"DELETE\" button from the delete address dialog")
        composeTestRule.confirmDeleteAddressButton().performClick()
        Log.i(TAG, "clickConfirmDeleteAddressButton: Clicked \"DELETE\" button from the delete address dialog")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickSubRegionOption(subRegion: String) {
        clickDropdownOption(
            composeTestRule = composeTestRule,
            dropDown = { composeTestRule.subRegionDropDown() },
            optionText = subRegion,
            logTag = "clickSubRegionOption",
            errorMessage = "Sub-region option \"$subRegion\" not found after 3 attempts",
        )
    }

    @OptIn(ExperimentalTestApi::class)
    fun waitForAddressFormReady() {
        Log.i(TAG, "waitForAddressFormReady: Waiting for $waitingTime ms for the address form to be ready")
        composeTestRule.waitUntilAtLeastOneExists(hasTestTag(EditAddressTestTag.COUNTRY_FIELD), waitingTime)
        Log.i(TAG, "waitForAddressFormReady: Address form is ready")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickCountryOption(country: String) {
        clickDropdownOption(
            composeTestRule = composeTestRule,
            dropDown = { composeTestRule.countryDropDown() },
            optionText = country,
            logTag = "clickCountryOption",
            errorMessage = "Country option \"$country\" not found after 3 attempts",
        )
    }

    fun verifyAddAddressButton() = assertUIObjectExists(addAddressButton())

    @OptIn(ExperimentalTestApi::class)
    fun fillAndSaveAddress(
        composeTestRule: ComposeTestRule,
        navigateToAutofillSettings: Boolean,
        isAddressAutofillEnabled: Boolean = true,
        userHasSavedAddress: Boolean = false,
        name: String,
        streetAddress: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        phoneNumber: String,
        emailAddress: String,
    ) {
        if (navigateToAutofillSettings) {
            homeScreen(composeTestRule) {
            }.openThreeDotMenu {
            }.clickSettingsButton {
            }.openAutofillSubMenu(composeTestRule) {
                verifyAddressAutofillSection(isAddressAutofillEnabled, userHasSavedAddress)
                clickAddAddressButton()
            }
        }
        Log.i(TAG, "fillAndSaveAddress: Waiting for $waitingTimeLong ms for \"Name\" text field to exist")
        composeTestRule.waitUntilAtLeastOneExists(hasTestTag(EditAddressTestTag.NAME_FIELD), waitingTimeLong)
        Log.i(TAG, "fillAndSaveAddress: Waited for $waitingTimeLong ms for \"Name\" text field to exist")
        Log.i(TAG, "fillAndSaveAddress: Trying to set \"Name\" to $name")
        composeTestRule.nameTextInput().performTextInput(name)
        Log.i(TAG, "fillAndSaveAddress: \"Name\" was set to $name")
        Log.i(TAG, "fillAndSaveAddress: Trying to set \"Street Address\" to $streetAddress")
        composeTestRule.streetAddressTextInput().performTextInput(streetAddress)
        Log.i(TAG, "fillAndSaveAddress: \"Street Address\" was set to $streetAddress")
        Log.i(TAG, "fillAndSaveAddress: Trying to set \"City\" to $city")
        composeTestRule.cityTextInput().performTextInput(city)
        Log.i(TAG, "fillAndSaveAddress: \"City\" was set to $city")
        Log.i(TAG, "fillAndSaveAddress: Trying to click $country dropdown option")
        clickCountryOption(country)
        Log.i(TAG, "fillAndSaveAddress: Clicked $country dropdown option")
        Log.i(TAG, "fillAndSaveAddress: Trying to click the $state dropdown option")
        clickSubRegionOption(state)
        Log.i(TAG, "fillAndSaveAddress: Clicked $state dropdown option")
        composeTestRule.waitForIdle()
        Log.i(TAG, "fillAndSaveAddress: Trying to set \"Zip\" to $zipCode")
        composeTestRule.zipCodeTextInput().performTextInput(zipCode)
        Log.i(TAG, "fillAndSaveAddress: \"Zip\" was set to $zipCode")
        waitForKeyboardDismiss()
        composeTestRule.waitForIdle()
        Log.i(TAG, "fillAndSaveAddress: Trying to set \"Phone\" to $phoneNumber")
        composeTestRule.phoneTextInput().performTextInput(phoneNumber)
        Log.i(TAG, "fillAndSaveAddress: \"Phone\" was set to $phoneNumber")
        composeTestRule.waitForIdle()
        Log.i(TAG, "fillAndSaveAddress: Trying to close the keyboard.")
        waitForKeyboardDismiss()
        composeTestRule.waitForIdle()
        Log.i(TAG, "fillAndSaveAddress: Closed the keyboard.")
        Log.i(TAG, "fillAndSaveAddress: Trying to set \"Email\" to $emailAddress")
        composeTestRule.emailTextInput().performTextInput(emailAddress)
        Log.i(TAG, "fillAndSaveAddress: \"Email\" was set to $emailAddress")
        Log.i(TAG, "fillAndSaveAddress: Trying to close the keyboard.")
        waitForKeyboardDismiss()
        composeTestRule.waitForIdle()
        Log.i(TAG, "fillAndSaveAddress: Closed the keyboard.")
        Log.i(TAG, "fillAndSaveAddress: Trying to click the \"Save\" button")
        if (composeTestRule.saveButton().isNotDisplayed()) {
            composeTestRule.saveButton().performScrollTo()
        }
        composeTestRule.saveButton().performClick()
        Log.i(TAG, "fillAndSaveAddress: Clicked the \"Save\" button")
        Log.i(TAG, "fillAndSaveAddress: Waiting for $waitingTime ms for for \"Manage addresses\" button to exist")
        manageAddressesButton().waitForExists(waitingTime)
        Log.i(TAG, "fillAndSaveAddress: Waited for $waitingTime ms for for \"Manage addresses\" button to exist")
    }

    fun clickAddCreditCardButton() {
        Log.i(TAG, "clickAddCreditCardButton: Trying to click the \"Add credit card\" button")
        addCreditCardButton().click()
        Log.i(TAG, "clickAddCreditCardButton: Clicked the \"Add credit card\" button")
    }
    fun clickManageSavedCreditCardsButton() {
        Log.i(TAG, "clickManageSavedCreditCardsButton: Trying to click the \"Manage saved cards\" button")
        manageSavedCreditCardsButton().click()
        Log.i(TAG, "clickManageSavedCreditCardsButton: Clicked the \"Manage saved cards\" button")
    }
    fun clickSecuredCreditCardsLaterButton() {
        Log.i(TAG, "clickSecuredCreditCardsLaterButton: Trying to click the \"Later\" button")
        securedCreditCardsLaterButton().click()
        Log.i(TAG, "clickSecuredCreditCardsLaterButton: Clicked the \"Later\" button")
    }
    fun clickSavedCreditCard() {
        Log.i(TAG, "clickSavedCreditCard: Trying to click the saved credit card and and wait for $waitingTime ms for a new window")
        savedCreditCardNumber().clickAndWaitForNewWindow(waitingTime)
        Log.i(TAG, "clickSavedCreditCard: Clicked the saved credit card and and waited for $waitingTime ms for a new window")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickDeleteCreditCardToolbarButton() {
        Log.i(TAG, "clickDeleteCreditCardToolbarButton: Waiting for $waitingTime ms for the delete credit card toolbar button to exist")
        composeTestRule.waitUntilAtLeastOneExists(
            hasTestTag(CreditCardEditorTestTags.TOPBAR_DELETE_BUTTON),
            waitingTime,
        )
        Log.i(TAG, "clickDeleteCreditCardToolbarButton: Waited for $waitingTime ms for the delete credit card toolbar button to exist")
        Log.i(TAG, "clickDeleteCreditCardToolbarButton: Trying to click the delete credit card toolbar button")
        composeTestRule.deleteCreditCardToolbarButton().performClick()
        Log.i(TAG, "clickDeleteCreditCardToolbarButton: Clicked the delete credit card toolbar button")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickDeleteCreditCardMenuButton() {
        Log.i(TAG, "clickDeleteCreditCardMenuButton: Waiting for $waitingTime ms for the delete credit card menu button to exist")
        composeTestRule.waitUntilAtLeastOneExists(
            hasTestTag(CreditCardEditorTestTags.DELETE_BUTTON),
            waitingTime,
        )
        Log.i(TAG, "clickDeleteCreditCardMenuButton: Waited for $waitingTime ms for the delete credit card menu button to exist")
        Log.i(TAG, "clickDeleteCreditCardMenuButton: Trying to click the delete credit card menu button")
        composeTestRule.deleteFormButton().performClick()
        Log.i(TAG, "clickDeleteCreditCardMenuButton: Clicked the delete credit card menu button")
    }
    fun clickSaveAndAutofillCreditCardsOption() {
        Log.i(TAG, "clickSaveAndAutofillCreditCardsOption: Trying to click the \"Save and autofill cards\" option")
        saveAndAutofillCreditCardsOption().click()
        Log.i(TAG, "clickSaveAndAutofillCreditCardsOption: Clicked the \"Save and autofill cards\" option")
    }

    fun clickConfirmDeleteCreditCardButton() {
        Log.i(TAG, "clickConfirmDeleteCreditCardButton: Trying to click the \"Delete\" credit card dialog button")
        composeTestRule.confirmDeleteCreditCardButton().performClick()
        Log.i(TAG, "clickConfirmDeleteCreditCardButton: Clicked the \"Delete\" credit card dialog button")
    }

    fun clickCancelDeleteCreditCardButton() {
        Log.i(TAG, "clickCancelDeleteCreditCardButton: Trying to click the \"Cancel\" credit card dialog button")
        composeTestRule.cancelDeleteCreditCardButton().performClick()
        Log.i(TAG, "clickCancelDeleteCreditCardButton: Clicked the \"Cancel\" credit card dialog button")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickExpiryMonthOption(expiryMonth: String) {
        Log.i(TAG, "clickExpiryMonthOption: Waiting for $waitingTime ms for the $expiryMonth expiry month option to exist")
        composeTestRule.waitUntilAtLeastOneExists(
            hasText(expiryMonth, substring = true, ignoreCase = true),
            waitingTime,
        )
        Log.i(TAG, "clickExpiryMonthOption: Waited for $waitingTime ms for the $expiryMonth expiry month option to exist")
        Log.i(TAG, "clickExpiryMonthOption: Trying to click $expiryMonth expiry month option")
        composeTestRule.expiryMonthOption(expiryMonth).performClick()
        Log.i(TAG, "clickExpiryMonthOption: Clicked $expiryMonth expiry month option")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clickExpiryYearOption(expiryYear: String) {
        Log.i(TAG, "clickExpiryYearOption: Waiting for $waitingTime ms for the $expiryYear expiry year option to exist")
        composeTestRule.waitUntilAtLeastOneExists(
            hasText(expiryYear, substring = true, ignoreCase = true),
            waitingTime,
        )
        Log.i(TAG, "clickExpiryYearOption: Waited for $waitingTime ms for the $expiryYear expiry year option to exist")

        Log.i(TAG, "clickExpiryYearOption: Trying to click $expiryYear expiry year option")
        composeTestRule.expiryYearOption(expiryYear).performClick()
        Log.i(TAG, "clickExpiryYearOption: Clicked $expiryYear expiry year option")
    }

    fun verifyAddCreditCardsButton() = assertUIObjectExists(addCreditCardButton())

    @OptIn(ExperimentalTestApi::class)
    fun fillAndSaveCreditCard(cardNumber: String, cardName: String, expiryMonth: String, expiryYear: String) {
        Log.i(TAG, "fillAndSaveCreditCard: Waiting for $waitingTime ms for the credit card number text field to exist")
        composeTestRule.waitUntilAtLeastOneExists(
            hasTestTag(CreditCardEditorTestTags.CARD_NUMBER_FIELD),
            waitingTime,
        )
        Log.i(TAG, "fillAndSaveCreditCard: Waited for $waitingTime ms for the credit card number text field to exist")
        Log.i(TAG, "fillAndSaveCreditCard: Trying to set the credit card number to: $cardNumber")
        composeTestRule.creditCardNumberTextInput().clearAndSetText(cardNumber)
        Log.i(TAG, "fillAndSaveCreditCard: The credit card number was set to: $cardNumber")
        Log.i(TAG, "fillAndSaveCreditCard: Trying to set the name on card to: $cardName")
        composeTestRule.nameOnCreditCardTextInput().clearAndSetText(cardName)
        Log.i(TAG, "fillAndSaveCreditCard: The credit card name was set to: $cardName")
        Log.i(TAG, "fillAndSaveCreditCard: Trying to click the expiry month dropdown")
        composeTestRule.expiryMonthDropDown().performClick()

        Log.i(TAG, "fillAndSaveCreditCard: Clicked the expiry month dropdown")
        Log.i(TAG, "fillAndSaveCreditCard: Trying to click $expiryMonth expiry month option")
        clickExpiryMonthOption(expiryMonth)
        Log.i(TAG, "fillAndSaveCreditCard: Clicked $expiryMonth expiry month option")
        Log.i(TAG, "fillAndSaveCreditCard: Trying to click the expiry year dropdown")
        composeTestRule.expiryYearDropDown().performClick()
        Log.i(TAG, "fillAndSaveCreditCard: Clicked the expiry year dropdown")
        Log.i(TAG, "fillAndSaveCreditCard: Trying to click $expiryYear expiry year option")
        clickExpiryYearOption(expiryYear)
        Log.i(TAG, "fillAndSaveCreditCard: Clicked $expiryYear expiry year option")
        Log.i(TAG, "fillAndSaveCreditCard: Trying to click the \"Save\" button")
        composeTestRule.saveFormButton().performClick()
        Log.i(TAG, "fillAndSaveCreditCard: Clicked the \"Save\" button")
        Log.i(TAG, "fillAndSaveCreditCard: Waiting for $waitingTime ms for the \"Manage saved cards\" button to exist")
        manageSavedCreditCardsButton().waitForExists(waitingTime)
        Log.i(TAG, "fillAndSaveCreditCard: Waited for $waitingTime ms for the \"Manage saved cards\" button to exist")
    }

    @OptIn(ExperimentalTestApi::class)
    fun clearCreditCardNumber() =
        composeTestRule.creditCardNumberTextInput().also {
            Log.i(TAG, "clearCreditCardNumber: Waiting for $waitingTime ms for the credit card number text field to exist")
            composeTestRule.waitUntilAtLeastOneExists(
                hasTestTag(CreditCardEditorTestTags.CARD_NUMBER_FIELD),
                waitingTime,
            )
            Log.i(TAG, "clearCreditCardNumber: Waited for $waitingTime ms for the credit card number text field to exist")

            Log.i(TAG, "clearCreditCardNumber: Trying to clear the credit card number text field")
            it.performTextClearance()
            Log.i(TAG, "clearCreditCardNumber: Cleared the credit card number text field")
        }

    @OptIn(ExperimentalTestApi::class)
    fun clearNameOnCreditCard() =
        composeTestRule.nameOnCreditCardTextInput().also {
            Log.i(TAG, "clearNameOnCreditCard: Waiting for $waitingTime ms for name on card text field to exist")
            composeTestRule.waitUntilAtLeastOneExists(
                hasTestTag(CreditCardEditorTestTags.NAME_ON_CARD_FIELD),
                waitingTime,
            )
            Log.i(TAG, "clearNameOnCreditCard: Waited for $waitingTime ms for name on card text field to exist")
            Log.i(TAG, "clearNameOnCreditCard: Trying to clear the name on card text field")
            it.performTextClearance()
            Log.i(TAG, "clearNameOnCreditCard: Cleared the name on card text field")
        }

    fun clickSaveCreditCardToolbarButton() {
        Log.i(TAG, "clickSaveCreditCardToolbarButton: Trying to click the save credit card toolbar button")
        composeTestRule.saveCreditCardToolbarButton().performClick()
        Log.i(TAG, "clickSaveCreditCardToolbarButton: Clicked the save credit card toolbar button")
    }

    fun verifyEditCreditCardView(
        cardNumber: String,
        cardName: String,
        expiryMonth: String,
        expiryYear: String,
    ) = with(composeTestRule) {
        Log.i(TAG, "verifyEditCreditCardView: Waiting for compose rule to be idle")
        composeTestRule.waitForIdle()
        Log.i(TAG, "verifyEditCreditCardView: Waited for compose rule to be idle")

        editCreditCardToolbarTitle()
            .assertExists("Unable to assert that the edit credit card toolbar title exists")
        deleteCreditCardToolbarButton()
            .assertExists("Unable to assert that the delete credit card toolbar button exists")
        saveCreditCardToolbarButton()
            .assertExists("Unable to assert that the save credit card toolbar button exists")

        Log.i(TAG, "verifyEditCreditCardView: Trying to verify that the card number text field is set to: $cardNumber")
        creditCardNumberTextInput()
            .assertTextContains(cardNumber)
        Log.i(TAG, "verifyEditCreditCardView: Verified that the card number text field was set to: $cardNumber")
        Log.i(TAG, "verifyEditCreditCardView: Trying to verify that the card name text field is set to: $cardName")
        nameOnCreditCardTextInput().assertTextContains(cardName)
        Log.i(TAG, "verifyEditCreditCardView: Verified that the card card name text field was set to: $cardName")

        // Can't get the text from the drop-down items, need to verify them individually
        expiryMonthDropDown()
            .assertExists("Unable to assert that the expiry month dropdown exists")
        expiryYearDropDown()
            .assertExists("Unable to assert that the expiry year dropdown exists")

        onNodeWithText(expiryMonth, substring = true)
            .assertExists("Unable to assert that the $expiryMonth expiry month is shown")
        onNodeWithText(expiryYear, substring = true)
            .assertExists("Unable to assert that the $expiryYear expiry year is shown")

        saveFormButton().assertExists("Unable to assert that the save button exists")
        cancelFormButton().assertExists("Unable to assert that the cancel button exists")
        deleteFormButton().assertExists("Unable to assert that the delete button exists")
    }

    fun verifyEditCreditCardToolbarTitle() = composeTestRule.editCreditCardToolbarTitle()
        .assertExists("Unable to assert that the edit credit card toolbar title exists")

    fun verifyCreditCardNumberErrorMessage() {
        val errorMessage =
            getStringResource(R.string.credit_cards_number_validation_error_message_2)

        composeTestRule.creditCardNumberTextInput()
            .assertTextContains(errorMessage)
    }

    fun verifyNameOnCreditCardErrorMessage() {
        val errorMessage =
            getStringResource(R.string.credit_cards_name_on_card_validation_error_message_2)
        composeTestRule.nameOnCreditCardTextInput()
            .assertTextContains(errorMessage)
    }

    class Transition(private val composeTestRule: ComposeTestRule) {
        fun goBack(interact: SettingsRobot.() -> Unit): SettingsRobot.Transition {
            Log.i(TAG, "goBack: Trying to click the device back button")
            mDevice.pressBack()
            Log.i(TAG, "goBack: Clicked the device back button")

            SettingsRobot().interact()
            return SettingsRobot.Transition()
        }

        fun goBackToAutofillSettings(interact: SettingsSubMenuAutofillRobot.() -> Unit): SettingsSubMenuAutofillRobot.Transition {
            Log.i(TAG, "goBackToAutofillSettings: Trying to click the navigate up toolbar button")
            navigateBackButton().click()
            Log.i(TAG, "goBackToAutofillSettings: Clicked the navigate up toolbar button")

            SettingsSubMenuAutofillRobot(composeTestRule).interact()
            return SettingsSubMenuAutofillRobot.Transition(composeTestRule)
        }

        fun goBackToAutofillSettings(composeTestRule: ComposeTestRule, interact: SettingsSubMenuAutofillRobot.() -> Unit): SettingsSubMenuAutofillRobot.Transition {
            Log.i(TAG, "goBackToAutofillSettings: Trying to click the navigate up toolbar button")
            composeTestRule.navigateBackButton().performClick()
            Log.i(TAG, "goBackToAutofillSettings: Clicked the navigate up toolbar button")

            SettingsSubMenuAutofillRobot(composeTestRule).interact()
            return SettingsSubMenuAutofillRobot.Transition(composeTestRule)
        }

        fun goBackToSavedCreditCards(interact: SettingsSubMenuAutofillRobot.() -> Unit): SettingsSubMenuAutofillRobot.Transition {
            Log.i(TAG, "goBackToSavedCreditCards: Trying to click the navigate up toolbar button")
            composeTestRule.navigateBackButton().performClick()
            Log.i(TAG, "goBackToSavedCreditCards: Clicked the navigate up toolbar button")

            SettingsSubMenuAutofillRobot(composeTestRule).interact()
            return SettingsSubMenuAutofillRobot.Transition(composeTestRule)
        }

        fun goBackToBrowser(composeTestRule: ComposeTestRule, interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "goBackToBrowser: Trying to click the device back button")
            mDevice.pressBack()
            Log.i(TAG, "goBackToBrowser: Clicked the device back button")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }
    }
}

fun autofillScreen(composeTestRule: ComposeTestRule, interact: SettingsSubMenuAutofillRobot.() -> Unit): SettingsSubMenuAutofillRobot.Transition {
    SettingsSubMenuAutofillRobot(composeTestRule).interact()
    return SettingsSubMenuAutofillRobot.Transition(composeTestRule)
}

private fun autofillToolbarTitle() = itemContainingText(getStringResource(R.string.preferences_autofill))
private fun addressesSectionTitle() = itemContainingText(getStringResource(R.string.preferences_addresses))
private fun manageAddressesToolbarTitle() =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/navigationToolbar")
            .childSelector(UiSelector().text(getStringResource(R.string.addresses_manage_addresses))),
    )

private fun saveAndAutofillAddressesOption() = itemContainingText(getStringResource(R.string.preferences_addresses_save_and_autofill_addresses_2))
private fun saveAndAutofillAddressesSummary() = itemContainingText(getStringResource(R.string.preferences_addresses_save_and_autofill_addresses_summary_2))
private fun addAddressButton() = itemContainingText(getStringResource(R.string.preferences_addresses_add_address))
private fun manageAddressesButton() =
    mDevice.findObject(
        UiSelector()
            .resourceId("android:id/title")
            .text(getStringResource(R.string.preferences_addresses_manage_addresses)),
    )

private fun ComposeTestRule.addAddressToolbarTitle() = onNodeWithText(getStringResource(R.string.preferences_addresses_add_address))
private fun ComposeTestRule.editAddressToolbarTitle() = onNodeWithText(getStringResource(R.string.addresses_edit_address))
private fun ComposeTestRule.toolbarCheckmarkButton() = onNodeWithContentDescription(getStringResource(R.string.address_menu_save_address))
private fun navigateBackButton() = itemWithDescription(getStringResource(R.string.action_bar_up_description))
private fun ComposeTestRule.navigateBackButton() = onNodeWithContentDescription("Navigate back")
private fun ComposeTestRule.nameTextInput() = onNodeWithTag(EditAddressTestTag.NAME_FIELD)
private fun ComposeTestRule.streetAddressTextInput() = onNodeWithTag(EditAddressTestTag.STREET_ADDRESS_FIELD)
private fun ComposeTestRule.cityTextInput() = onNodeWithTag(EditAddressTestTag.ADDRESS_LEVEL2_FIELD)
private fun ComposeTestRule.subRegionDropDown() = onNodeWithTag(EditAddressTestTag.ADDRESS_LEVEL1_FIELD)
private fun ComposeTestRule.zipCodeTextInput() = onNodeWithTag(EditAddressTestTag.POSTAL_CODE_FIELD)
private fun ComposeTestRule.countryDropDown() = onNodeWithTag(EditAddressTestTag.COUNTRY_FIELD)
private fun ComposeTestRule.phoneTextInput() = onNodeWithTag(EditAddressTestTag.TEL_FIELD)
private fun ComposeTestRule.emailTextInput() = onNodeWithTag(EditAddressTestTag.EMAIL_FIELD)
private fun ComposeTestRule.addressForm() = onNodeWithTag(EditAddressTestTag.FORM)
private fun ComposeTestRule.saveButton() = onNodeWithTag(EditAddressTestTag.SAVE_BUTTON)
private fun ComposeTestRule.cancelButton() = onNodeWithTag(EditAddressTestTag.CANCEL_BUTTON)
private fun ComposeTestRule.toolbarDeleteAddressButton() = onNodeWithTag(EditAddressTestTag.TOPBAR_DELETE_BUTTON)
private fun ComposeTestRule.cancelDeleteAddressButton() = onNodeWithTag(EditAddressTestTag.DIALOG_CANCEL_BUTTON)
private fun ComposeTestRule.confirmDeleteAddressButton() = onNodeWithTag(EditAddressTestTag.DIALOG_DELETE_BUTTON)

private fun creditCardsSectionTitle() = itemContainingText(getStringResource(R.string.preferences_credit_cards_2))
private fun saveAndAutofillCreditCardsOption() = itemContainingText(getStringResource(R.string.preferences_credit_cards_save_and_autofill_cards_2))
private fun saveAndAutofillCreditCardsSummary() = itemContainingText(getStringResource(R.string.preferences_credit_cards_save_and_autofill_cards_summary_2))
private fun syncCreditCardsAcrossDevicesButton() = itemContainingText(getStringResource(R.string.preferences_credit_cards_sync_cards_across_devices))
private fun addCreditCardButton() = mDevice.findObject(UiSelector().textContains(getStringResource(R.string.preferences_credit_cards_add_credit_card_2)))
private fun savedCreditCardsToolbarTitle() = itemContainingText(getStringResource(R.string.credit_cards_saved_cards))
private fun ComposeTestRule.editCreditCardToolbarTitle() = onNodeWithText(getStringResource(R.string.credit_cards_edit_card))
private fun manageSavedCreditCardsButton() = mDevice.findObject(UiSelector().textContains(getStringResource(R.string.preferences_credit_cards_manage_saved_cards_2)))

private fun ComposeTestRule.creditCardNumberTextInput() = onNodeWithTag(CreditCardEditorTestTags.CARD_NUMBER_FIELD)

private fun ComposeTestRule.nameOnCreditCardTextInput() = onNodeWithTag(CreditCardEditorTestTags.NAME_ON_CARD_FIELD)

private fun ComposeTestRule.expiryMonthDropDown() =
    onNodeWithTag(CreditCardEditorTestTags.EXPIRATION_MONTH_FIELD)

private fun ComposeTestRule.expiryYearDropDown() =
    onNodeWithTag(CreditCardEditorTestTags.EXPIRATION_YEAR_FIELD)

private fun savedCreditCardNumber() = mDevice.findObject(UiSelector().resourceId("$packageName:id/credit_card_logo"))
private fun ComposeTestRule.deleteCreditCardToolbarButton() = onNodeWithTag(CreditCardEditorTestTags.TOPBAR_DELETE_BUTTON)
private fun ComposeTestRule.saveCreditCardToolbarButton() = onNodeWithTag(CreditCardEditorTestTags.TOPBAR_SAVE_BUTTON)
private fun ComposeTestRule.confirmDeleteCreditCardButton() = onNodeWithTag(CreditCardEditorTestTags.DELETE_DIALOG_DELETE_BUTTON)
private fun ComposeTestRule.cancelDeleteCreditCardButton() = onNodeWithTag(CreditCardEditorTestTags.DELETE_DIALOG_CANCEL_BUTTON)
private fun securedCreditCardsLaterButton() = onView(withId(android.R.id.button2)).inRoot(RootMatchers.isDialog())
private fun ComposeTestRule.saveFormButton() = onNodeWithTag(CreditCardEditorTestTags.SAVE_BUTTON)
private fun ComposeTestRule.cancelFormButton() = onNodeWithTag(CreditCardEditorTestTags.CANCEL_BUTTON)
private fun ComposeTestRule.deleteFormButton() = onNodeWithTag(CreditCardEditorTestTags.DELETE_BUTTON)

private fun ComposeTestRule.expiryMonthOption(expiryMonth: String) =
    onNodeWithText(expiryMonth, substring = true, ignoreCase = true)

private fun ComposeTestRule.expiryYearOption(expiryYear: String) = onNodeWithText(expiryYear, substring = true, ignoreCase = true)

@OptIn(ExperimentalTestApi::class)
private fun clickDropdownOption(
    composeTestRule: ComposeTestRule,
    dropDown: () -> SemanticsNodeInteraction,
    optionText: String,
    logTag: String,
    errorMessage: String,
) {
    waitForKeyboardDismiss()
    // Drain any leftover popup from a previous attempt; non-fatal if it times out.
    runCatching { waitForPopupToDismiss(composeTestRule) }
        .onFailure { Log.w(TAG, "$logTag: pre-call waitForPopupToDismiss timed out: $it") }
    composeTestRule.waitForIdle()

    for (attempt in 1..3) {
        if (attempt > 1) {
            // The previous attempt failed mid-flow and may have left a popup visible; clicking
            // the dropdown trigger again with the popup still open would toggle it shut rather
            // than re-open it. Best-effort dismiss before retrying.
            runCatching { waitForPopupToDismiss(composeTestRule, timeoutMs = 2_000L) }
                .onFailure { Log.w(TAG, "$logTag: inter-attempt waitForPopupToDismiss timed out: $it") }
        }
        dropDown().performTouchInput { click() }

        try {
            composeTestRule.waitUntilAtLeastOneExists(hasText(optionText), 5_000L)
            val nodeCount = composeTestRule.onAllNodes(hasText(optionText)).fetchSemanticsNodes().size
            try {
                composeTestRule.onAllNodes(hasText(optionText))[nodeCount - 1].performScrollTo()
                composeTestRule.waitForIdle()
            } catch (scrollEx: Exception) {
                Log.w(TAG, "$logTag: performScrollTo failed: ${scrollEx.message?.take(100)}")
            }
            composeTestRule.onAllNodes(hasText(optionText))[nodeCount - 1].performClick()
        } catch (e: Exception) {
            Log.w(TAG, "$logTag: attempt $attempt failed: ${e.javaClass.simpleName}: ${e.message?.take(200)}")
            continue
        }
        waitForPopupToDismiss(composeTestRule)
        return
    }
    throw AssertionError(errorMessage)
}

/**
 * Polls until the Compose DropdownMenu popup window is no longer present in the accessibility
 * window hierarchy, or throws if it does not dismiss within [timeoutMs].
 */
private fun waitForPopupToDismiss(composeTestRule: ComposeTestRule, timeoutMs: Long = 10000L) {
    composeTestRule.waitForIdle()
    val startTime = SystemClock.elapsedRealtime()
    var polled = 0
    while (SystemClock.elapsedRealtime() - startTime < timeoutMs) {
        // Compose's DropdownMenu renders into a separate popup window whose
        // AccessibilityWindowInfo.title is set to "Pop-Up" by the framework.
        val hasPopup = InstrumentationRegistry.getInstrumentation()
            .uiAutomation
            .windows
            .any { it.title?.contains("Pop-Up", ignoreCase = true) == true }
        if (!hasPopup) {
            if (polled > 0) {
                Log.i(TAG, "waitForPopupToDismiss: popup gone after ${SystemClock.elapsedRealtime() - startTime}ms ($polled polls)")
            } else {
                Log.i(TAG, "waitForPopupToDismiss: no popup present")
            }
            return
        }
        polled++
        composeTestRule.waitForIdle()
        SystemClock.sleep(100)
    }
    throw AssertionError("waitForPopupToDismiss: popup did not dismiss within ${timeoutMs}ms")
}

/**
 * Closes the soft keyboard and waits until the IME window is fully gone from the window
 * hierarchy. On slow emulators (e.g. Firebase Test Lab) the hide animation can take ~9 s; polling
 * here prevents the IME animation from dismissing a dropdown popup that opens immediately after.
 */
private fun waitForKeyboardDismiss(timeoutMs: Long = 15000L) {
    Log.i(TAG, "waitForKeyboardDismiss: Trying to close the soft keyboard")
    closeSoftKeyboard()
    Log.i(TAG, "waitForKeyboardDismiss: Successfully closed the soft keyboard")

    waitForAppWindowToBeUpdated()

    val startTime = SystemClock.elapsedRealtime()
    var polled = 0
    while (SystemClock.elapsedRealtime() - startTime < timeoutMs) {
        val hasImeWindow = InstrumentationRegistry.getInstrumentation()
            .uiAutomation
            .windows
            .any { it.type == AccessibilityWindowInfo.TYPE_INPUT_METHOD }
        if (!hasImeWindow) {
            if (polled > 0) {
                Log.i(TAG, "waitForKeyboardDismiss: keyboard gone after ${SystemClock.elapsedRealtime() - startTime}ms ($polled polls)")
            } else {
                Log.i(TAG, "waitForKeyboardDismiss: keyboard was not present")
            }
            return
        }
        polled++
        SystemClock.sleep(300)
    }
    throw AssertionError("waitForKeyboardDismiss: keyboard did not dismiss within ${timeoutMs}ms")
}
