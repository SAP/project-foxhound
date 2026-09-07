/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { HighlightText } from "./HighlightText";
import { HighlightImage } from "./HighlightImage";
import { resolveText, resolveImage } from "./OMCHighlightRegistry.mjs";

export const HighlightPopoverBody = ({ body, content }) => {
  const image = resolveImage({ content, defaults: body?.image });
  const title = resolveText({
    content,
    rawKey: "cardTitle",
    l10nKey: "title",
    defaultL10nId: body?.title?.l10nId,
  });
  const subtitle = resolveText({
    content,
    rawKey: "cardMessage",
    l10nKey: "subtitle",
    defaultL10nId: body?.subtitle?.l10nId,
  });

  return (
    <div className="highlight-popover-body">
      <HighlightImage source={image} className="highlight-popover-image" />
      <HighlightText as="h3" className="title" value={title} />
      <HighlightText as="p" className="subtitle" value={subtitle} />
    </div>
  );
};
