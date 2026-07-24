/* This Source Code Form is subject to the terms of the Mozilla Public * License, v. 2.0. If a copy of the MPL was not distributed with this file, * You can obtain one at http://mozilla.org/MPL/2.0/. */
import React from "react";
import { AboutWelcomeUtils } from "../lib/aboutwelcome-utils.mjs";
import { Localized } from "./MSLocalized";
import { LinkParagraph } from "./LinkParagraph";

export const ConfirmationChecklist = props => {
  const { content, handleAction } = props;

  if (!content) {
    return null;
  }

  const CONFIGURABLE_STYLES = [
    "background",
    "borderRadius",
    "display",
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
    <div className={`confirmation-checklist-section`}>
      <div
        className={`confirmation-checklist-container`}
        style={AboutWelcomeUtils.getValidStyle(
          content.style,
          CONFIGURABLE_STYLES
        )}
      >
        {content.items.map(({ icon, text, subtext, link_keys }, index) => (
          <div key={index} className={"confirmation-checklist-item"}>
            <div className="confirmation-checklist-icon-wrapper">
              <div
                className="confirmation-checklist-icon"
                style={AboutWelcomeUtils.getValidStyle(
                  icon,
                  CONFIGURABLE_STYLES
                )}
              ></div>
              <div className="confirmation-checklist-text">
                <Localized text={text}>
                  <div className="text body-text" />
                </Localized>
              </div>
            </div>
            <div className="confirmation-checklist-subtext">
              <LinkParagraph
                text_content={{ text: subtext, link_keys }}
                handleAction={handleAction}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
