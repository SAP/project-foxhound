/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useState } from "react";

const ADD_ICON = "chrome://global/skin/icons/plus.svg";
const CHECK_ICON = "chrome://global/skin/icons/check.svg";
const CLOSE_ICON = "chrome://global/skin/icons/close.svg";

export function SectionFollowButton({
  following,
  onFollowClick,
  onUnfollowClick,
  title,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [justFollowed, setJustFollowed] = useState(false);
  // This key is incremented on mouse leave / blur to remount moz-button and
  // restore it to its icon-only state.
  const [remountKey, setRemountKey] = useState(0);
  const isJustFollowed = following && isHovered && justFollowed;
  const isUnfollowing = following && isHovered && !justFollowed;

  let followButtonL10nId = "newtab-section-follow-button";
  let icon = ADD_ICON;
  let buttonType = "default";

  if (isJustFollowed) {
    followButtonL10nId = "newtab-section-following-button";
    icon = CHECK_ICON;
    buttonType = "primary";
  } else if (isUnfollowing) {
    followButtonL10nId = "newtab-section-unfollow-button";
    icon = CLOSE_ICON;
    buttonType = "destructive";
  } else if (isHovered) {
    buttonType = "primary";
  } else if (following) {
    icon = CHECK_ICON;
  }

  // Bug 2030391 - Provide an aria-label for the default icon state
  let labelL10nId = null;
  let labelL10nArgs = null;
  if (title) {
    labelL10nId = following
      ? "newtab-section-unfollow-button-label"
      : "newtab-section-follow-button-label";
    labelL10nArgs = JSON.stringify({ topic: title });
  }

  const handleFollowClick = () => {
    setJustFollowed(true);
    onFollowClick();
  };

  const hoverHandlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => {
      setIsHovered(false);
      setJustFollowed(false);
      setRemountKey(k => k + 1);
    },
    onFocus: () => setIsHovered(true),
    onBlur: () => {
      setIsHovered(false);
      setJustFollowed(false);
      setRemountKey(k => k + 1);
    },
  };

  return (
    <div
      className={`section-follow${following ? " following" : ""}`}
      {...hoverHandlers}
    >
      <moz-button
        key={remountKey}
        type={buttonType}
        iconsrc={icon}
        onClick={following ? onUnfollowClick : handleFollowClick}
        data-l10n-id={isHovered ? followButtonL10nId : labelL10nId}
        data-l10n-args={isHovered ? null : labelL10nArgs}
      ></moz-button>
    </div>
  );
}
