/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Logo } from "content-src/components/Logo/Logo";
import React from "react";
import { ExternalComponentWrapper } from "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper";

export class Search extends React.PureComponent {
  render() {
    return (
      <div className="search-wrapper">
        {this.props.showLogo && <Logo />}
        <ExternalComponentWrapper
          type="SEARCH"
          className="search-inner-wrapper"
        ></ExternalComponentWrapper>
      </div>
    );
  }
}
