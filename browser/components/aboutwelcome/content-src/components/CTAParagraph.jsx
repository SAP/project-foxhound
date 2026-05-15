/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { Localized, CONFIGURABLE_STYLES } from "./MSLocalized";
import { AboutWelcomeUtils } from "../lib/aboutwelcome-utils.mjs";

export const CTAParagraph = props => {
  const { content, handleAction } = props;

  if (!content?.text) {
    return null;
  }

  const onClick = React.useCallback(
    event => {
      handleAction(event);
      event.preventDefault();
    },
    [handleAction]
  );

  return (
    <h2
      className={`cta-paragraph ${content?.info_tile ? "info-tile" : ""}`}
      style={{
        ...AboutWelcomeUtils.getValidStyle(content?.style, CONFIGURABLE_STYLES),
      }}
    >
      <div className="cta-paragraph-icon-wrapper">
        <div
          className="cta-paragraph-icon"
          style={AboutWelcomeUtils.getValidStyle(
            content?.icon,
            CONFIGURABLE_STYLES
          )}
        ></div>
      </div>
      <Localized text={content.text}>
        {content.text.string_name && typeof handleAction === "function" ? (
          <span
            data-l10n-id={content.text.string_id}
            onClick={onClick}
            onKeyUp={event =>
              ["Enter", " "].includes(event.key) ? onClick(event) : null
            }
            value="cta_paragraph"
          >
            {" "}
            {/* <a> is valid here because of click and keyup handling. */}
            {/* <button> cannot be used due to fluent integration. <a> content is provided by fluent */}
            <a
              data-l10n-name={content.text.string_name}
              tabIndex="0"
              role="link"
            ></a>
          </span>
        ) : null}
      </Localized>
    </h2>
  );
};
