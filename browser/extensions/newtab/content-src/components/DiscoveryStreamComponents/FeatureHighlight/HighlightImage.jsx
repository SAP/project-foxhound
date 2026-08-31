/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";

export const HighlightImage = ({
  source,
  className,
  alt = "",
  width,
  height,
}) => {
  if (!source) {
    return null;
  }

  if (source.srcLight && source.srcDark) {
    return (
      <picture>
        <source srcSet={source.srcDark} media="(prefers-color-scheme: dark)" />
        <source
          srcSet={source.srcLight}
          media="(prefers-color-scheme: light)"
        />
        <img
          className={className}
          src={source.srcLight}
          alt={alt}
          width={width}
          height={height}
        />
      </picture>
    );
  }

  if (source.src) {
    return (
      <img
        className={className}
        src={source.src}
        alt={alt}
        width={width}
        height={height}
      />
    );
  }

  return null;
};
