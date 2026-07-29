/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useState } from "react";
import { LinkMenu } from "../../LinkMenu/LinkMenu";

/**
 * A context menu for blocking, following and unfollowing sections.
 *
 * @param props
 * @returns {React.FunctionComponent}
 */
export function SectionContextMenu({
  type = "DISCOVERY_STREAM",
  buttonType = "icon",
  title,
  source,
  index,
  dispatch,
  sectionKey,
  following,
  sectionPersonalization,
  sectionPosition,
  learnMoreUrl,
}) {
  const SECTIONS_CONTEXT_MENU_OPTIONS = [];
  if (following) {
    SECTIONS_CONTEXT_MENU_OPTIONS.push("SectionUnfollow");
  }
  SECTIONS_CONTEXT_MENU_OPTIONS.push("SectionBlock");
  SECTIONS_CONTEXT_MENU_OPTIONS.push("Separator");
  SECTIONS_CONTEXT_MENU_OPTIONS.push("SectionLearnMore");
  const [showContextMenu, setShowContextMenu] = useState(false);

  const onClick = e => {
    e.preventDefault();
    setShowContextMenu(!showContextMenu);
  };

  const onUpdate = () => {
    setShowContextMenu(!showContextMenu);
  };

  return (
    <div
      className={`section-context-menu${showContextMenu ? " context-menu-open" : ""}`}
    >
      <moz-button
        type={buttonType}
        size="default"
        iconsrc="chrome://global/skin/icons/more.svg"
        title={title || source}
        aria-expanded={showContextMenu}
        onClick={onClick}
      />
      {showContextMenu && (
        <LinkMenu
          onUpdate={onUpdate}
          dispatch={dispatch}
          index={index}
          source={type.toUpperCase()}
          options={SECTIONS_CONTEXT_MENU_OPTIONS}
          shouldSendImpressionStats={true}
          site={{
            sectionPersonalization,
            sectionKey,
            sectionPosition,
            title,
            learnMoreUrl,
          }}
        />
      )}
    </div>
  );
}
