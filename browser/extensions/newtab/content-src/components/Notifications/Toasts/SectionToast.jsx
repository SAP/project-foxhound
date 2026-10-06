/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useEffect, useRef } from "react";

function SectionToast({ onDismissClick, onAnimationEnd, toastData }) {
  const mozMessageBarRef = useRef(null);

  useEffect(() => {
    const { current: mozMessageBarElement } = mozMessageBarRef;

    mozMessageBarElement.addEventListener(
      "message-bar:user-dismissed",
      onDismissClick,
      {
        once: true,
      }
    );

    return () => {
      mozMessageBarElement.removeEventListener(
        "message-bar:user-dismissed",
        onDismissClick
      );
    };
  }, [onDismissClick]);

  return (
    <moz-message-bar
      type="success"
      class="notification-feed-item newtab-toast-success"
      dismissable={true}
      data-l10n-id={toastData.l10nId}
      data-l10n-args={JSON.stringify({ topic: toastData.topic })}
      ref={mozMessageBarRef}
      onAnimationEnd={onAnimationEnd}
    ></moz-message-bar>
  );
}

export { SectionToast };
