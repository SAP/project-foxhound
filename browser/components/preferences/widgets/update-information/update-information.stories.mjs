/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/preferences/widgets/update-information.mjs";

export default {
  title: "Domain-specific UI Widgets/Settings/Update Information",
  component: "update-information",
  parameters: {
    status: "in-development",
  },
};

const Template = ({
  version = "",
  distribution = "",
  distributionId = "",
  releaseNotesURL = "",
}) => html`
  <div style="max-width: 500px">
    <update-information
      version=${ifDefined(version)}
      distribution=${ifDefined(distribution)}
      distributionId=${ifDefined(distributionId)}
      releaseNotesURL=${ifDefined(releaseNotesURL)}
    ></update-information>
  </div>
`;

export const Default = Template.bind({});
Default.args = {
  version: "149.0a1 (2026-01-30) (64-bit)",
  distribution: "distribution about text",
  distributionId: "distribution id",
  releaseNotesURL: "https://www.firefox.com/en-US/releases/",
};
