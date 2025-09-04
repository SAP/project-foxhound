/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file is loaded into the browser window scope.
/* eslint-env mozilla/browser-window */

var gProfiles = {
  async init() {
    this.createNewProfile = this.createNewProfile.bind(this);
    this.handleCommand = this.handleCommand.bind(this);
    this.launchProfile = this.launchProfile.bind(this);
    this.manageProfiles = this.manageProfiles.bind(this);
    this.onPopupShowing = this.onPopupShowing.bind(this);
    this.toggleProfileMenus = this.toggleProfileMenus.bind(this);
    this.updateView = this.updateView.bind(this);

    this.bundle = Services.strings.createBundle(
      "chrome://browser/locale/browser.properties"
    );

    this.emptyProfilesButton = PanelMultiView.getViewNode(
      document,
      "appMenu-empty-profiles-button"
    );
    this.profilesButton = PanelMultiView.getViewNode(
      document,
      "appMenu-profiles-button"
    );
    this.fxaMenuEmptyProfilesButton = PanelMultiView.getViewNode(
      document,
      "PanelUI-fxa-menu-empty-profiles-button"
    );
    this.fxaMenuProfilesButton = PanelMultiView.getViewNode(
      document,
      "PanelUI-fxa-menu-profiles-button"
    );
    this.subview = PanelMultiView.getViewNode(document, "PanelUI-profiles");
    this.subview.addEventListener("command", this.handleCommand);

    PanelUI.mainView.addEventListener("ViewShowing", () =>
      this._onPanelShowing(this.profilesButton, this.emptyProfilesButton)
    );

    let fxaPanelView = PanelMultiView.getViewNode(document, "PanelUI-fxa");
    fxaPanelView.addEventListener("ViewShowing", () =>
      this._onPanelShowing(
        this.fxaMenuProfilesButton,
        this.fxaMenuEmptyProfilesButton
      )
    );

    this.profilesButton.addEventListener("command", this.handleCommand);
    this.emptyProfilesButton.addEventListener("command", this.handleCommand);

    this.fxaMenuProfilesButton.addEventListener("command", this.handleCommand);
    this.fxaMenuEmptyProfilesButton.addEventListener(
      "command",
      this.handleCommand
    );

    this.toggleProfileMenus(SelectableProfileService?.isEnabled);

    if (SelectableProfileService) {
      let listener = (event, isEnabled) => this.toggleProfileMenus(isEnabled);

      SelectableProfileService.on("enableChanged", listener);
      window.addEventListener("unload", () =>
        SelectableProfileService.off("enableChanged", listener)
      );
    }
  },

  toggleProfileMenus(isEnabled) {
    let profilesMenu = document.getElementById("profiles-menu");
    profilesMenu.hidden = !isEnabled;
  },

  async _onPanelShowing(profilesButton, emptyProfilesButton) {
    if (!SelectableProfileService?.isEnabled) {
      emptyProfilesButton.hidden = true;
      profilesButton.hidden = true;
      return;
    }

    // If the feature is preffed on, but we haven't created profiles yet, the
    // service will not be initialized.
    let profiles = SelectableProfileService.initialized
      ? await SelectableProfileService.getAllProfiles()
      : [];
    if (profiles.length < 2) {
      profilesButton.hidden = true;
      emptyProfilesButton.hidden = false;
      return;
    }

    emptyProfilesButton.hidden = true;
    profilesButton.hidden = false;

    let { themeBg, themeFg } = SelectableProfileService.currentProfile.theme;
    profilesButton.style.setProperty("--appmenu-profiles-theme-bg", themeBg);
    profilesButton.style.setProperty("--appmenu-profiles-theme-fg", themeFg);
    profilesButton.setAttribute(
      "label",
      SelectableProfileService.currentProfile.name
    );
    let avatar = SelectableProfileService.currentProfile.avatar;
    profilesButton.setAttribute(
      "image",
      `chrome://browser/content/profiles/assets/16_${avatar}.svg`
    );
  },

  /**
   * Draws the menubar panel contents.
   */
  async onPopupShowing() {
    let menuPopup = document.getElementById("menu_ProfilesPopup");
    while (menuPopup.hasChildNodes()) {
      menuPopup.firstChild.remove();
    }

    let profiles = await SelectableProfileService.getAllProfiles();
    let currentProfile = SelectableProfileService.currentProfile;

    for (let profile of profiles) {
      let menuitem = document.createXULElement("menuitem");
      let { themeBg, themeFg } = profile.theme;
      menuitem.setAttribute("profileid", profile.id);
      menuitem.setAttribute("command", "Profiles:LaunchProfile");
      menuitem.setAttribute("label", profile.name);
      menuitem.style.setProperty("--menu-profiles-theme-bg", themeBg);
      menuitem.style.setProperty("--menu-profiles-theme-fg", themeFg);
      menuitem.style.listStyleImage = `url(chrome://browser/content/profiles/assets/48_${profile.avatar}.svg)`;
      menuitem.classList.add("menuitem-iconic", "menuitem-iconic-profile");

      if (profile.id === currentProfile.id) {
        menuitem.classList.add("current");
        menuitem.setAttribute("type", "checkbox");
        menuitem.setAttribute("checked", "true");
      }

      menuPopup.appendChild(menuitem);
    }

    let newProfile = document.createXULElement("menuitem");
    newProfile.id = "menu_newProfile";
    newProfile.setAttribute("command", "Profiles:CreateProfile");
    newProfile.setAttribute("data-l10n-id", "menu-profiles-new-profile");
    newProfile.style.listStyleImage =
      "url(chrome://global/skin/icons/plus.svg)";
    menuPopup.appendChild(newProfile);

    let separator = document.createXULElement("menuseparator");
    separator.id = "profilesSeparator";
    menuPopup.appendChild(separator);

    let manageProfiles = document.createXULElement("menuitem");
    manageProfiles.id = "menu_manageProfiles";
    manageProfiles.setAttribute("command", "Profiles:ManageProfiles");
    manageProfiles.setAttribute(
      "data-l10n-id",
      "menu-profiles-manage-profiles"
    );
    menuPopup.appendChild(manageProfiles);
  },

  manageProfiles() {
    return SelectableProfileService.maybeSetupDataStore().then(() => {
      toOpenWindowByType(
        "about:profilemanager",
        "about:profilemanager",
        "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar,centerscreen"
      );
    });
  },

  createNewProfile() {
    SelectableProfileService.createNewProfile();
  },

  async updateView(target) {
    await this.populateSubView();
    PanelUI.showSubView("PanelUI-profiles", target);
  },

  async updateFxAView(target) {
    await this.populateSubView();
    PanelUI.showSubView("PanelUI-profiles", target);
  },

  launchProfile(aEvent) {
    SelectableProfileService.getProfile(
      aEvent.target.getAttribute("profileid")
    ).then(profile => {
      SelectableProfileService.launchInstance(profile);
    });
  },

  async handleCommand(aEvent) {
    switch (aEvent.target.id) {
      /* App menu button events */
      case "appMenu-profiles-button":
      // deliberate fallthrough
      case "appMenu-empty-profiles-button": {
        this.updateView(aEvent.target);
        break;
      }
      /* FxA menu button events */
      case "PanelUI-fxa-menu-empty-profiles-button":
      // deliberate fallthrough
      case "PanelUI-fxa-menu-profiles-button": {
        aEvent.stopPropagation();
        this.updateFxAView(aEvent.target);
        break;
      }
      /* Subpanel events that may be triggered in FxA menu or app menu */
      case "profiles-appmenu-back-button": {
        aEvent.target.closest("panelview").panelMultiView.goBack();
        aEvent.target.blur();
        break;
      }
      case "profiles-edit-this-profile-button": {
        openTrustedLinkIn("about:editprofile", "tab");
        break;
      }
      case "profiles-manage-profiles-button": {
        this.manageProfiles();
        break;
      }
      case "profiles-create-profile-button": {
        this.createNewProfile();
        break;
      }

      /* Menubar events */
      case "Profiles:CreateProfile": {
        this.createNewProfile();
        break;
      }
      case "Profiles:ManageProfiles": {
        this.manageProfiles();
        break;
      }
      case "Profiles:LaunchProfile": {
        this.launchProfile(aEvent.sourceEvent);
        break;
      }
    }
    /* Subpanel profile events that may be triggered in FxA menu or app menu */
    if (aEvent.target.classList.contains("profile-item")) {
      this.launchProfile(aEvent);
    }
  },

  /**
   * Inserts the subpanel contents for the PanelUI subpanel, which may be shown
   * either in the app menu or the FxA toolbar button menu.
   */
  async populateSubView() {
    let profiles = [];
    let currentProfile = null;

    if (SelectableProfileService.initialized) {
      profiles = await SelectableProfileService.getAllProfiles();
      currentProfile = SelectableProfileService.currentProfile;
    }

    let backButton = PanelMultiView.getViewNode(
      document,
      "profiles-appmenu-back-button"
    );
    backButton.setAttribute(
      "aria-label",
      this.bundle.GetStringFromName("panel.back")
    );

    let currentProfileCard = PanelMultiView.getViewNode(
      document,
      "current-profile"
    );
    currentProfileCard.hidden = !(currentProfile && profiles.length > 1);

    let profilesHeader = PanelMultiView.getViewNode(
      document,
      "PanelUI-profiles-header"
    );

    let editButton = PanelMultiView.getViewNode(
      document,
      "profiles-edit-this-profile-button"
    );

    if (profiles.length < 2) {
      profilesHeader.removeAttribute("style");
      editButton.hidden = true;
    } else {
      profilesHeader.style.backgroundColor = "var(--appmenu-profiles-theme-bg)";
      editButton.hidden = false;
    }

    if (currentProfile && profiles.length > 1) {
      let subview = PanelMultiView.getViewNode(document, "PanelUI-profiles");
      let { themeBg, themeFg } = currentProfile.theme;
      subview.style.setProperty("--appmenu-profiles-theme-bg", themeBg);
      subview.style.setProperty("--appmenu-profiles-theme-fg", themeFg);

      let headerText = PanelMultiView.getViewNode(
        document,
        "profiles-header-content"
      );
      headerText.textContent = currentProfile.name;

      let profileIconEl = PanelMultiView.getViewNode(
        document,
        "profile-icon-image"
      );
      currentProfileCard.style.setProperty(
        "--appmenu-profiles-theme-bg",
        themeBg
      );
      currentProfileCard.style.setProperty(
        "--appmenu-profiles-theme-fg",
        themeFg
      );

      let avatar = currentProfile.avatar;
      profileIconEl.style.listStyleImage = `url("chrome://browser/content/profiles/assets/80_${avatar}.svg")`;
    }

    let subtitle = PanelMultiView.getViewNode(document, "profiles-subtitle");
    subtitle.hidden = profiles.length < 2;

    let profilesList = PanelMultiView.getViewNode(document, "profiles-list");
    while (profilesList.lastElementChild) {
      profilesList.lastElementChild.remove();
    }
    for (let profile of profiles) {
      if (profile.id === SelectableProfileService.currentProfile.id) {
        continue;
      }

      let button = document.createXULElement("toolbarbutton");
      button.setAttribute("profileid", profile.id);
      button.setAttribute("label", profile.name);
      button.className = "subviewbutton subviewbutton-iconic profile-item";
      let { themeFg, themeBg } = profile.theme;
      button.style.setProperty("--appmenu-profiles-theme-bg", themeBg);
      button.style.setProperty("--appmenu-profiles-theme-fg", themeFg);
      button.setAttribute(
        "image",
        `chrome://browser/content/profiles/assets/16_${profile.avatar}.svg`
      );

      profilesList.appendChild(button);
    }
  },
};
