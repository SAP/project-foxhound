/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { MultiStageUtils } from "../lib/multistage-utils.mjs";

const TEXTBOX_STYLES = ["backgroundColor", "maxHeight"];

export const TextBoxTile = ({ content, contentToggled }) => {
  const { data } = content.tiles;

  const activeContent = contentToggled ? data.content : data.alternateContent;

  return (
    <div className="textbox-container">
      <div
        className="textbox-input"
        style={MultiStageUtils.getValidStyle(data.style, TEXTBOX_STYLES)}
      >
        {activeContent ?? ""}
      </div>
    </div>
  );
};
