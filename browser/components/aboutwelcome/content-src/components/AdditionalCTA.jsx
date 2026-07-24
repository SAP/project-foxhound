/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { Localized } from "./MSLocalized";
import { SubmenuButton } from "./SubmenuButton";

export const AdditionalCTA = ({
  content,
  handleAction,
  activeMultiSelect,
  textInputs,
}) => {
  let buttonStyle = "";
  const isSplitButton =
    content.submenu_button?.attached_to === "additional_button";
  let className = "additional-cta-box";
  if (isSplitButton) {
    className += " split-button-container";
  }

  if (!content.additional_button?.style) {
    buttonStyle = "primary";
  } else {
    buttonStyle =
      content.additional_button?.style === "link"
        ? "cta-link"
        : content.additional_button?.style;
  }

  const computeDisabled = React.useCallback(
    disabledValue => {
      if (disabledValue === "hasActiveMultiSelect") {
        if (!activeMultiSelect) {
          return true;
        }

        for (const key in activeMultiSelect) {
          if (activeMultiSelect[key]?.length > 0) {
            return false;
          }
        }

        return true;
      }
      if (disabledValue === "hasTextInput") {
        // For text input, we check if the user has entered any text in the
        // textarea(s) present on the screen.
        if (!textInputs) {
          return true;
        }
        return Object.values(textInputs).every(
          input => !input.isValid || input.value.trim().length === 0
        );
      }
      return disabledValue;
    },
    [activeMultiSelect, textInputs]
  );

  return (
    <div className={className}>
      <Localized text={content.additional_button?.label}>
        <button
          id="additional_button"
          className={`${buttonStyle} additional-cta`}
          onClick={handleAction}
          value="additional_button"
          disabled={computeDisabled(content.additional_button?.disabled)}
        />
      </Localized>
      {isSplitButton ? (
        <SubmenuButton content={content} handleAction={handleAction} />
      ) : null}
    </div>
  );
};
