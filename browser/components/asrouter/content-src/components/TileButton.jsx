/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useRef } from "react";
import { Localized } from "./MSLocalized";

export const TileButton = props => {
  const { content, handleAction, inputName } = props;
  const ref = useRef(null);

  if (!content) {
    return null;
  }

  function onClick(event) {
    let mockEvent = {
      currentTarget: ref.current,
      source: event.target.id,
      name: "command",
      action: content.action,
    };
    handleAction(mockEvent);
  }

  return (
    <Localized text={content.label}>
      <button
        id={`tile-button-${inputName}`}
        onClick={onClick}
        value="tile_button"
        ref={ref}
        className={`${content.style} tile-button slim`}
      />
    </Localized>
  );
};
