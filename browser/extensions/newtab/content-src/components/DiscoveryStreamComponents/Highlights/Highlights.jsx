/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { connect } from "react-redux";
import { FluentOrText } from "content-src/components/FluentOrText/FluentOrText";
import React from "react";
import { SectionIntl } from "content-src/components/Sections/Sections";

// @nova-cleanup(remove-pref): Remove PREF_NOVA_ENABLED
const PREF_NOVA_ENABLED = "nova.enabled";

export class _Highlights extends React.PureComponent {
  render() {
    const section = this.props.Sections.find(s => s.id === "highlights");
    if (!section || !section.enabled) {
      return null;
    }

    // @nova-cleanup(remove-conditional): Remove novaEnabled check, always show title
    const novaEnabled = this.props.Prefs.values[PREF_NOVA_ENABLED];

    return (
      <div className="ds-highlights sections-list">
        {novaEnabled && (
          <h2 className="ds-highlights-title">
            <FluentOrText message={section.title} />
          </h2>
        )}
        <SectionIntl {...section} isFixed={true} />
      </div>
    );
  }
}

export const Highlights = connect(state => ({
  Sections: state.Sections,
  Prefs: state.Prefs,
}))(_Highlights);
