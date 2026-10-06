/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { Localized } from "./MSLocalized";

export const ContentToggle = ({ content, toggled, onToggle }) => {
  const { data } = content.tiles;
  const onChange = React.useCallback(
    e => onToggle?.(e.target.checked),
    [onToggle]
  );

  if (!data.visible) {
    return null;
  }

  return (
    <label className="content-toggle-label">
      <input type="checkbox" checked={toggled} onChange={onChange} />
      <Localized text={data.label}>
        <span />
      </Localized>
    </label>
  );
};
