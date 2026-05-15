/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { AboutWelcomeUtils } from "../lib/aboutwelcome-utils.mjs";
import { Localized } from "./MSLocalized";

export const TileList = props => {
  const { content } = props;

  if (!content) {
    return null;
  }

  const CONFIGURABLE_STYLES = [
    "background",
    "borderRadius",
    "height",
    "marginBlock",
    "marginBlockStart",
    "marginBlockEnd",
    "marginInline",
    "paddingBlock",
    "paddingBlockStart",
    "paddingBlockEnd",
    "paddingInline",
    "paddingInlineStart",
    "paddingInlineEnd",
    "width",
  ];

  return (
    <div className={"tile-list-container"}>
      {content.items.map(({ icon, text }, index) => (
        <div key={index} className="tile-list-item">
          <div className="tile-list-icon-wrapper">
            <div
              className="tile-list-icon"
              style={AboutWelcomeUtils.getValidStyle(icon, CONFIGURABLE_STYLES)}
            ></div>
          </div>
          <div className="tile-list-text">
            <Localized text={text}>
              <div className="text body-text" />
            </Localized>
          </div>
        </div>
      ))}
    </div>
  );
};
