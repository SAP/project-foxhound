/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RecommendedSection } from "./recommended-section.mjs";

// NOTE: importing recommended-footer webcomponent because it is used
// in this webcomponent template.
// eslint-disable-next-line import/no-unassigned-import
import "./recommended-themes-footer.mjs";

// NOTE: this class is inheriting its `render` method from RecommendedSection.
class RecommendedThemesSection extends RecommendedSection {
  static get markup() {
    return `
      <template>
        <h2
          data-l10n-id="recommended-themes-heading"
          class="header-name recommended-heading"
        ></h2>
        <recommended-addon-list
          type="theme"
          hide-installed
        ></recommended-addon-list>
        <footer is="recommended-themes-footer" class="view-footer"></footer>
      </template>
    `;
  }
}
customElements.define("recommended-themes-section", RecommendedThemesSection);
