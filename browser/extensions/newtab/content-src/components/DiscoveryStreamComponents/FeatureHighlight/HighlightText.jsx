/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";

export const HighlightText = ({ as: Tag = "p", className, value, id }) => {
  if (!value) {
    return null;
  }
  if (value.raw) {
    return (
      <Tag id={id} className={className}>
        {value.raw}
      </Tag>
    );
  }
  if (value.l10nId) {
    return <Tag id={id} className={className} data-l10n-id={value.l10nId} />;
  }
  return null;
};
