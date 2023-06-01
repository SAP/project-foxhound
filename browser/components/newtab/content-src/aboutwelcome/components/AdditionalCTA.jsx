/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { Localized } from "./MSLocalized";

export const AdditionalCTA = ({ content, handleAction }) => {
  let buttonStyle = "";

  if (!content.additional_button?.style) {
    buttonStyle = "primary";
  } else {
    buttonStyle =
      content.additional_button?.style === "link"
        ? "cta-link"
        : content.additional_button?.style;
  }

  return (
    <Localized text={content.additional_button?.label}>
      <button
        className={`${buttonStyle} additional-cta`}
        onClick={handleAction}
        value="additional_button"
        disabled={content.additional_button?.disabled === true}
      />
    </Localized>
  );
};
