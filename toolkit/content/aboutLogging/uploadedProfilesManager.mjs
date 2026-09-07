/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This module manages the UI for displaying and managing uploaded profiles
// in the about:logging page.

const $ = document.querySelector.bind(document);

/**
 * This returns the server endpoint URL to delete a profile.
 * The pref "toolkit.aboutlogging.deleteProfileUrl" can change it in case it is
 * needed. It's mostly used for tests.
 *
 * @param {string} profileToken - The profile token to delete
 * @returns {string}
 */
function deleteProfileUrl(profileToken) {
  const baseUrl = Services.prefs.getStringPref(
    "toolkit.aboutlogging.deleteProfileUrl",
    "https://api.profiler.firefox.com/profile"
  );
  return `${baseUrl}/${profileToken}`;
}

/**
 * Deletes a profile from the profiler server using the JWT token.
 *
 * @param {string} profileToken - The profile token (hash) for the profile
 * @param {string} jwtToken - The JWT token for the profile
 * @throws {Error} Throws an error with meaningful message if deletion fails
 */
async function deleteProfileFromServer(profileToken, jwtToken) {
  // Delete endpoint URL - construct the profile-specific delete URL
  const deleteUrl = deleteProfileUrl(profileToken);

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.firefox-profiler+json;version=1.0",
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Server responded with ${response.status}: ${response.statusText}`
    );
  }
}

export class UploadedProfilesManager {
  #container = null;
  #profilesList = null;
  #errorElement = null;

  constructor() {
    this.#createUI();
    this.refresh();

    // Make this manager globally available for refreshing from upload logic
    window.gUploadedProfilesManager = this;
  }

  /**
   * Create the UI elements for the uploaded profiles section.
   */
  #createUI() {
    // Find the main content container to append at the end
    const mainContent = $(".main-content");

    // Create the main container
    this.#container = document.createElement("section");
    this.#container.id = "uploaded-profiles-section";

    // Create the title
    const title = document.createElement("h2");
    document.l10n.setAttributes(title, "about-logging-uploaded-profiles-title");

    // Create the subsection container
    const subsection = document.createElement("div");
    subsection.className = "page-subsection";

    // Create the profiles list container
    this.#profilesList = document.createElement("div");
    this.#profilesList.id = "uploaded-profiles-list";

    // Create the "no profiles" message
    const noProfilesMessage = document.createElement("div");
    noProfilesMessage.id = "no-uploaded-profiles";
    document.l10n.setAttributes(
      noProfilesMessage,
      "about-logging-no-uploaded-profiles"
    );
    noProfilesMessage.hidden = true;

    // Create the error element
    this.#errorElement = document.createElement("div");
    this.#errorElement.id = "uploaded-profiles-error";
    this.#errorElement.hidden = true;

    // Assemble the structure
    subsection.append(
      this.#profilesList,
      noProfilesMessage,
      this.#errorElement
    );
    this.#container.append(title, subsection);

    // Append at the end of the main content
    mainContent.append(this.#container);

    // Add event delegation for delete buttons
    this.#profilesList.addEventListener("click", event => {
      if (event.target.classList.contains("delete-profile-button")) {
        this.#handleDeleteClick(event);
      }
    });
  }

  /**
   * Show an error message to the user.
   *
   * @param {string} errorText - The error message to display
   */
  #showError(errorText) {
    document.l10n.setAttributes(
      this.#errorElement,
      "about-logging-unknown-error",
      { errorText }
    );
    this.#errorElement.hidden = false;
  }

  /**
   * Hide the error message.
   */
  #hideError() {
    this.#errorElement.hidden = true;
  }

  /**
   * Refresh the list of uploaded profiles.
   */
  async refresh() {
    try {
      this.#hideError();
      const { getAllUploadedProfiles } =
        await import("chrome://global/content/aboutLogging/profileStorage.mjs");

      const profiles = await getAllUploadedProfiles();
      this.#renderProfiles(profiles);
    } catch (error) {
      console.error("Error refreshing uploaded profiles:", error);
      this.#showError(String(error));
    }
  }

  /**
   * Render the list of profiles in the UI.
   *
   * @param {Array} profiles - Array of profile objects
   */
  #renderProfiles(profiles) {
    const noProfilesMessage = this.#container.querySelector(
      "#no-uploaded-profiles"
    );

    if (profiles.length === 0) {
      this.#profilesList.textContent = "";
      noProfilesMessage.hidden = false;
      return;
    }

    noProfilesMessage.hidden = true;

    // Clear existing content
    this.#profilesList.textContent = "";

    // Create profile items.
    profiles.forEach(profile => {
      const profileItem = document.createElement("div");
      profileItem.className = "uploaded-profile-item";
      profileItem.dataset.profileId = profile.id;

      const profileInfo = document.createElement("div");
      profileInfo.className = "uploaded-profile-info";

      const profileName = document.createElement("div");
      profileName.className = "uploaded-profile-name";
      profileName.textContent = profile.profileName;

      const profileDetails = document.createElement("div");
      profileDetails.className = "uploaded-profile-details";

      const profileDate = document.createElement("span");
      profileDate.className = "uploaded-profile-date";
      profileDate.textContent = profile.uploadDate.toLocaleString();

      const profileUrl = document.createElement("a");
      profileUrl.href = profile.profileUrl;
      profileUrl.target = "_blank";
      profileUrl.className = "uploaded-profile-url";
      document.l10n.setAttributes(
        profileUrl,
        "about-logging-view-uploaded-profile"
      );

      const profileActions = document.createElement("div");
      profileActions.className = "uploaded-profile-actions";

      const deleteButton = document.createElement("moz-button");
      deleteButton.className = "delete-profile-button";
      document.l10n.setAttributes(
        deleteButton,
        "about-logging-delete-uploaded-profile"
      );

      // Assemble the structure
      profileDetails.append(profileDate, profileUrl);
      profileInfo.append(profileName, profileDetails);
      profileActions.append(deleteButton);
      profileItem.append(profileInfo, profileActions);

      this.#profilesList.append(profileItem);
    });
  }

  /**
   * Handle click on delete button.
   *
   * @param {Event} event
   */
  async #handleDeleteClick(event) {
    const button = event.target;
    const profileItem = button.closest(".uploaded-profile-item");
    const profileId = parseInt(profileItem.dataset.profileId, 10);

    // Show confirmation dialog
    const profileName = profileItem.querySelector(
      ".uploaded-profile-name"
    ).textContent;

    // Get localized confirmation message and title
    const [confirmMessage, confirmTitle] = await document.l10n.formatValues([
      { id: "about-logging-delete-profile-confirm", args: { profileName } },
      "about-logging-delete-profile-confirm-title",
    ]);

    if (!Services.prompt.confirm(window, confirmTitle, confirmMessage)) {
      return;
    }

    try {
      // Hide any previous error messages
      this.#hideError();

      // Disable the button during deletion
      button.disabled = true;
      document.l10n.setAttributes(button, "about-logging-deleting-profile");

      // Get the profile info to get the JWT token
      const { getUploadedProfile, deleteUploadedProfile } =
        await import("chrome://global/content/aboutLogging/profileStorage.mjs");

      const profile = await getUploadedProfile(profileId);
      if (!profile) {
        throw new Error("Profile not found in local storage");
      }

      // Delete from server first
      await deleteProfileFromServer(profile.profileToken, profile.jwtToken);

      // Delete from local storage only if server deletion was successful
      await deleteUploadedProfile(profileId);

      // Refresh the list
      this.refresh();
    } catch (error) {
      console.error("Error deleting profile:", error);

      // Re-enable the button and show error to user
      button.disabled = false;
      document.l10n.setAttributes(
        button,
        "about-logging-delete-uploaded-profile"
      );

      // Show the error to the user
      this.#showError(String(error));
    }
  }
}
