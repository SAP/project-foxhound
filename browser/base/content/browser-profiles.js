/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var gProfiles = {
  async init() {
    this.copyProfile = this.copyProfile.bind(this);
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
    let avatarURL =
      await SelectableProfileService.currentProfile.getAvatarURL(16);
    profilesButton.setAttribute("image", avatarURL);
  },

  /**
   * Draws the menubar panel contents.
   */
  async onPopupShowing() {
    let menuPopup = document.getElementById("menu_ProfilesPopup");
    let profiles = await SelectableProfileService.getAllProfiles();
    let currentProfile = SelectableProfileService.currentProfile;
    let insertionPoint = document.getElementById("menu_newProfile");
    let existingItems = [
      ...menuPopup.querySelectorAll(":scope > menuitem[profileid]"),
    ];
    for (let profile of profiles) {
      let menuitem = existingItems.shift();
      let isNewItem = !menuitem;
      if (isNewItem) {
        menuitem = document.createXULElement("menuitem");
        menuitem.classList.add("menuitem-iconic", "menuitem-iconic-profile");
        menuitem.setAttribute("command", "Profiles:LaunchProfile");
      }
      let { themeBg, themeFg } = profile.theme;
      menuitem.setAttribute("profileid", profile.id);
      menuitem.setAttribute("image", await profile.getAvatarURL(48));
      menuitem.style.setProperty("--menu-profiles-theme-bg", themeBg);
      menuitem.style.setProperty("--menu-profiles-theme-fg", themeFg);

      if (profile.id === currentProfile.id) {
        menuitem.classList.add("current");
        menuitem.setAttribute("data-l10n-id", "menu-profiles-current");
        menuitem.setAttribute(
          "data-l10n-args",
          JSON.stringify({ profileName: profile.name })
        );
      } else {
        menuitem.classList.remove("current");
        menuitem.removeAttribute("data-l10n-id");
        menuitem.removeAttribute("data-l10n-args");
        menuitem.setAttribute("label", profile.name);
      }

      if (isNewItem) {
        menuPopup.insertBefore(menuitem, insertionPoint);
      }
    }
    // If there's any old item to remove, do so now.
    for (let remaining of existingItems) {
      remaining.remove();
    }
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

  copyProfile() {
    SelectableProfileService.maybeSetupDataStore().then(() => {
      SelectableProfileService.currentProfile.copyProfile();
    });
  },

  createNewProfile() {
    SelectableProfileService.createNewProfile();
  },

  updateView(target) {
    this.populateSubView();
    PanelUI.showSubView("PanelUI-profiles", target);
  },

  updateFxAView(target) {
    this.populateSubView();
    PanelUI.showSubView("PanelUI-profiles", target);
  },

  launchProfile(aEvent) {
    SelectableProfileService.getProfile(
      aEvent.target.getAttribute("profileid")
    ).then(profile => {
      SelectableProfileService.launchInstance(profile);
    });
  },

  async openTabsInProfile(aEvent, tabsToOpen) {
    let profile = await SelectableProfileService.getProfile(
      aEvent.target.getAttribute("profileid")
    );
    SelectableProfileService.launchInstance(
      profile,
      tabsToOpen.map(tab => tab.linkedBrowser.currentURI.spec)
    );
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
      case "profiles-copy-profile-button": {
        this.copyProfile();
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
      case "Profiles:MoveTabsToProfile": {
        let tabs;
        if (TabContextMenu.contextTab.multiselected) {
          tabs = gBrowser.selectedTabs;
        } else {
          tabs = [TabContextMenu.contextTab];
        }
        this.openTabsInProfile(aEvent.sourceEvent, tabs);
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

    let subview = PanelMultiView.getViewNode(document, "PanelUI-profiles");

    let backButton = PanelMultiView.getViewNode(
      document,
      "profiles-appmenu-back-button"
    );
    backButton.setAttribute(
      "aria-label",
      this.bundle.GetStringFromName("panel.back")
    );
    backButton.style.fill = "var(--appmenu-profiles-theme-fg, currentColor)";

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

    let profilesList = PanelMultiView.getViewNode(document, "profiles-list");
    // Automatically created by PanelMultiView.
    const headerSeparator = profilesHeader.nextElementSibling;
    let footerSeparator = PanelMultiView.getViewNode(
      document,
      "footer-separator"
    );
    if (!footerSeparator) {
      footerSeparator = document.createXULElement("toolbarseparator");
      footerSeparator.id = "footer-separator";
    }

    let createProfileButton = PanelMultiView.getViewNode(
      document,
      "profiles-create-profile-button"
    );
    if (!createProfileButton) {
      createProfileButton = document.createXULElement("toolbarbutton");
      createProfileButton.id = "profiles-create-profile-button";
      createProfileButton.classList.add(
        "subviewbutton",
        "subviewbutton-iconic"
      );
      createProfileButton.setAttribute(
        "data-l10n-id",
        "appmenu-create-profile"
      );
    }

    let copyProfileButton = PanelMultiView.getViewNode(
      document,
      "profiles-copy-profile-button"
    );

    if (!copyProfileButton) {
      copyProfileButton = document.createXULElement("toolbarbutton");
      copyProfileButton.id = "profiles-copy-profile-button";
      copyProfileButton.classList.add("subviewbutton", "subviewbutton-iconic");
      copyProfileButton.setAttribute("data-l10n-id", "appmenu-copy-profile");
    }

    let manageProfilesButton = PanelMultiView.getViewNode(
      document,
      "profiles-manage-profiles-button"
    );

    if (!manageProfilesButton) {
      manageProfilesButton = document.createXULElement("toolbarbutton");
      manageProfilesButton.id = "profiles-manage-profiles-button";
      manageProfilesButton.classList.add(
        "subviewbutton",
        "panel-subview-footer-button"
      );
      manageProfilesButton.setAttribute(
        "data-l10n-id",
        "appmenu-manage-profiles"
      );
    }

    if (profiles.length < 2) {
      profilesHeader.removeAttribute("style");
      editButton.hidden = true;

      headerSeparator.hidden = false;
      footerSeparator.hidden = true;
      const subviewBody = subview.querySelector(".panel-subview-body");
      subview.insertBefore(createProfileButton, subviewBody);
      subview.insertBefore(copyProfileButton, subviewBody);
      subview.insertBefore(manageProfilesButton, subviewBody);
    } else {
      profilesHeader.style.backgroundColor = "var(--appmenu-profiles-theme-bg)";
      profilesHeader.style.color = "var(--appmenu-profiles-theme-fg)";
      editButton.hidden = false;
    }

    if (currentProfile && profiles.length > 1) {
      let { themeBg, themeFg } = currentProfile.theme;
      subview.style.setProperty("--appmenu-profiles-theme-bg", themeBg);
      subview.style.setProperty("--appmenu-profiles-theme-fg", themeFg);

      headerSeparator.hidden = true;
      footerSeparator.hidden = false;
      subview.appendChild(footerSeparator);
      subview.appendChild(createProfileButton);
      subview.appendChild(copyProfileButton);
      subview.appendChild(manageProfilesButton);

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

      profileIconEl.style.listStyleImage = `url(${await currentProfile.getAvatarURL(80)})`;
    }

    let subtitle = PanelMultiView.getViewNode(document, "profiles-subtitle");
    subtitle.hidden = profiles.length < 2;

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
      button.setAttribute("image", await profile.getAvatarURL(16));

      profilesList.appendChild(button);
    }
  },

  async populateMoveTabMenu(menuPopup) {
    if (!SelectableProfileService.initialized) {
      return;
    }

    const profiles = await SelectableProfileService.getAllProfiles();
    const currentProfile = SelectableProfileService.currentProfile;

    const separator = document.getElementById("moveTabSeparator");
    separator.hidden = profiles.length < 2;

    let existingItems = [
      ...menuPopup.querySelectorAll(":scope > menuitem[profileid]"),
    ];

    for (let profile of profiles) {
      if (profile.id === currentProfile.id) {
        continue;
      }

      let menuitem = existingItems.shift();
      let isNewItem = !menuitem;
      if (isNewItem) {
        menuitem = document.createXULElement("menuitem");
        menuitem.setAttribute("tbattr", "tabbrowser-multiple-visible");
        menuitem.setAttribute("data-l10n-id", "move-to-new-profile");
        menuitem.setAttribute("command", "Profiles:MoveTabsToProfile");
      }

      menuitem.disabled = false;
      menuitem.setAttribute("profileid", profile.id);
      menuitem.setAttribute(
        "data-l10n-args",
        JSON.stringify({ profileName: profile.name })
      );

      if (isNewItem) {
        menuPopup.appendChild(menuitem);
      }
    }
    // If there's any old item to remove, do so now.
    for (let remaining of existingItems) {
      remaining.remove();
    }
  },
};
