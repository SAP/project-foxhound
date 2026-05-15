/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  literal,
  staticHtml,
  ifDefined,
} from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

export default class NavNotice extends MozLitElement {
  static properties = {
    href: { type: String },
    iconSrc: { type: String },
    label: { type: String, fluent: true },
    theme: { type: Object },
  };

  static queries = {
    boxEl: "moz-box-link, moz-box-item",
  };

  willUpdate(changedProperties) {
    if (changedProperties.has("theme")) {
      if (this.theme?.themeBg && this.theme?.themeFg) {
        this.style.setProperty("--theme-bg-color", this.theme.themeBg);
        this.style.setProperty("--theme-fg-color", this.theme.themeFg);
      } else {
        this.style.removeProperty("--theme-bg-color");
        this.style.removeProperty("--theme-fg-color");
      }
    }
  }

  render() {
    let element = this.href ? literal`moz-box-link` : literal`moz-box-item`;
    return staticHtml`<link
        rel="stylesheet"
        href="chrome://browser/content/preferences/widgets/nav-notice.css"
      />
      <${element} iconsrc=${this.iconSrc} label=${this.label} href=${ifDefined(this.href)}></${element}>`;
  }
}
customElements.define("nav-notice", NavNotice);
