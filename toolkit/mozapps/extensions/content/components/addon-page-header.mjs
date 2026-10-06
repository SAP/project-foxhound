/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AboutAddonsHTMLElement } from "../aboutaddons-utils.mjs";

class AddonPageHeader extends AboutAddonsHTMLElement {
  static get markup() {
    return `
      <template>
        <div class="sticky-container">
          <div class="main-search">
            <label
              for="search-addons"
              class="search-label"
              data-l10n-id="default-heading-search-label"
            ></label>
            <search-addons></search-addons>
          </div>
          <div class="main-heading">
            <moz-button
              type="ghost"
              iconsrc="chrome://global/skin/icons/arrow-left.svg"
              size="default"
              class="back-button"
              action="go-back"
              data-l10n-id="header-back-button"
              hidden
            ></moz-button>
            <h1 class="header-name"></h1>
            <div class="spacer"></div>
            <addon-updates-message
              id="updates-message"
              hidden
            ></addon-updates-message>
            <div class="page-options-menu">
              <moz-button
                size="default"
                class="more-options-button"
                iconsrc="chrome://global/skin/icons/settings.svg"
                data-l10n-id="addon-page-options-button"
              ></moz-button>
            </div>
          </div>
        </div>
        <global-warnings></global-warnings>
      </template>
    `;
  }

  connectedCallback() {
    if (this.childElementCount === 0) {
      this.appendChild(AddonPageHeader.fragment);
      this.heading = this.querySelector(".header-name");
      this.backButton = this.querySelector(".back-button");
      this.pageOptionsMenuButton = this.querySelector(".more-options-button");

      // The addon-page-options element is outside of this element since this is
      // position: sticky and that would break the positioning of the menu.
      this.pageOptionsMenu = document.getElementById(
        this.getAttribute("page-options-id")
      );

      // Wiring up the addon-page-options panel-list with the page options
      // moz-button.
      customElements
        .whenDefined("addon-page-options")
        .then(
          () =>
            (this.pageOptionsMenuButton.menuId =
              this.pageOptionsMenu.panelListId)
        );
    }
    document.addEventListener("view-selected", this);
    this.addEventListener("click", this);
  }

  disconnectedCallback() {
    document.removeEventListener("view-selected", this);
    this.removeEventListener("click", this);
  }

  setViewInfo({ type, param }) {
    this.setAttribute("current-view", type);
    this.setAttribute("current-param", param);
    let viewType = type === "list" ? param : type;
    this.setAttribute("type", viewType);

    this.heading.hidden = viewType === "detail";
    this.backButton.hidden = viewType !== "detail" && viewType !== "shortcuts";

    this.backButton.disabled = !history.state?.previousView;

    if (viewType !== "detail") {
      document.l10n.setAttributes(this.heading, `${viewType}-heading`);
    }
  }

  handleEvent(e) {
    if (e.type === "click") {
      switch (e.target) {
        case this.backButton:
          window.history.back();
          break;
      }
    } else if (e.target == document && e.type == "view-selected") {
      const { type, param } = e.detail;
      this.setViewInfo({ type, param });
    }
  }
}
customElements.define("addon-page-header", AddonPageHeader);
