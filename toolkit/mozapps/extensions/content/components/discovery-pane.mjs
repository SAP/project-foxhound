/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RecommendedSection } from "./recommended-section.mjs";

// NOTE: importing recommended-footer webcomponent because it is used
// in this webcomponent template.
// eslint-disable-next-line import/no-unassigned-import
import "./recommended-footer.mjs";

// NOTE: this class is inheriting its `render` method from RecommendedSection.
class DiscoveryPane extends RecommendedSection {
  static get markup() {
    return `
      <template>
        <header>
          <p>
            <span data-l10n-id="discopane-intro3">
              <a
                class="discopane-intro-learn-more-link"
                is="moz-support-link"
                support-page="recommended-extensions-program"
                data-l10n-name="learn-more-trigger"
              >
              </a>
            </span>
          </p>
        </header>
        <taar-notice></taar-notice>
        <recommended-addon-list></recommended-addon-list>
        <footer is="recommended-footer" class="view-footer"></footer>
      </template>
    `;
  }
}
customElements.define("discovery-pane", DiscoveryPane);
