/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RecommendedSection } from "./recommended-section.mjs";

// NOTE: importing recommended-footer webcomponent because it is used
// in this webcomponent template.
// eslint-disable-next-line import/no-unassigned-import
import "./recommended-footer.mjs";

// NOTE: this class is inheriting its `render` method from RecommendedSection.
class RecommendedExtensionsSection extends RecommendedSection {
  static get markup() {
    return `
      <template>
        <h2
          data-l10n-id="recommended-extensions-heading"
          class="header-name recommended-heading"
        ></h2>
        <taar-notice></taar-notice>
        <recommended-addon-list
          type="extension"
          hide-installed
        ></recommended-addon-list>
        <footer is="recommended-footer" class="view-footer"></footer>
      </template>
    `;
  }
}
customElements.define(
  "recommended-extensions-section",
  RecommendedExtensionsSection
);
