/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/preferences/widgets/nav-notice.mjs";

const THEMES = {
  Default: {},
  Magenta: {
    themeBg: "hsla(335, 91%,75%, 1)",
    themeFg: "hsla(0, 0%, 0%, 1)",
  },
  "Ocean Blue": {
    themeBg: "hsla(234, 90%, 19%, 1)",
    themeFg: "hsla(0, 0%, 100%, 1)",
  },
  "Marigold Yellow": {
    themeBg: "hsla(45, 92%, 77%, 1)",
    themeFg: "hsla(0, 0%, 0%, 1)",
  },
  "Brick Red": {
    themeBg: "hsla(11, 87%, 32%, 1)",
    themeFg: "hsla(0, 0%, 100%, 1)",
  },
};

export default {
  title: "Domain-specific UI Widgets/Settings/Nav Notice",
  component: "nav-notice",
  argTypes: {
    theme: {
      options: Object.keys(THEMES),
      mapping: THEMES,
      control: "select",
    },
  },
  parameters: {
    status: "in-development",
    fluent: `
enterprise-notice =
  .label = Your browser is being managed by your organization
profile-notice =
  .label = Original profile
page-nav =
  .heading = Settings
search-placeholder =
  .placeholder = Search settings
account-sync = Account and sync
  .title = Account and sync
home-startup = Home and startup
  .title = Home and startup
search = Search
  .title = Search
`,
  },
};

const pageNavTemplate = theme => {
  return html`<style>
      moz-page-nav {
        max-width: 254px;
      }
    </style>
    <moz-page-nav data-l10n-id="page-nav">
      <moz-input-search
        slot="subheading"
        data-l10n-id="search-placeholder"
      ></moz-input-search>
      ${EnterpriseNotice({ slot: "subheading", ...EnterpriseNotice.args })}
      ${ProfileNotice({ slot: "subheading", theme, ...ProfileNotice.args })}
      <moz-page-nav-button view="view-one" data-l10n-id="account-sync">
      </moz-page-nav-button>
      <moz-page-nav-button view="view-two" data-l10n-id="home-startup">
      </moz-page-nav-button>
      <moz-page-nav-button view="view-three" data-l10n-id="search">
      </moz-page-nav-button>
    </moz-page-nav>`;
};

const Template = ({ iconSrc, href, l10nId, inPageNav, theme, slot }) => {
  if (inPageNav) {
    return pageNavTemplate(theme);
  }

  return html`
    <nav-notice
      iconsrc=${iconSrc}
      href=${ifDefined(href)}
      data-l10n-id=${l10nId}
      slot=${ifDefined(slot)}
      .theme=${theme}
    ></nav-notice>
  `;
};

export const EnterpriseNotice = Template.bind({});
EnterpriseNotice.args = {
  l10nId: "enterprise-notice",
  iconSrc: "chrome://global/skin/icons/rating-star.svg#full",
  href: "",
  inPageNav: false,
  theme: THEMES.Default,
};

export const ProfileNotice = Template.bind({});
ProfileNotice.args = {
  ...EnterpriseNotice.args,
  l10nId: "profile-notice",
  iconSrc: "chrome://global/skin/icons/highlights.svg",
  href: "about:profiles",
};

export const InPageNav = Template.bind({});
InPageNav.args = {
  inPageNav: true,
};
