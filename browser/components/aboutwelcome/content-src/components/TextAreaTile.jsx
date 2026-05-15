/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useEffect, useCallback, useMemo, useState } from "react";
import { AboutWelcomeUtils } from "../lib/aboutwelcome-utils.mjs";

const CONFIGURABLE_STYLES = [
  "color",
  "display",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "marginBlock",
  "marginInline",
  "paddingBlock",
  "paddingInline",
  "textAlign",
  "whiteSpace",
  "width",
  "border",
  "borderRadius",
  "minHeight",
  "minWidth",
];

export const TextAreaTile = ({
  content,
  textInputs,
  setTextInput,
  tileIndex,
}) => {
  const { data } = content.tiles;
  const id = data.id || `tile-${tileIndex}`;

  const [isValid, setIsValid] = useState(true);
  const [charCounter, setCharCounter] = useState(data.character_limit || 0);

  const textInput = useMemo(() => {
    if (textInputs) {
      return textInputs?.[id];
    }
    return null;
  }, [textInputs, id]);

  const handleChange = useCallback(
    event => {
      let valid = isValid;
      if (data.character_limit) {
        setCharCounter(data.character_limit - event.target.value.length);
        valid = event.target.value.length <= data.character_limit;
      }
      setIsValid(valid);
      setTextInput({ value: event.target.value, isValid: valid }, id);
    },
    [isValid, data.character_limit, id, setTextInput]
  );

  useEffect(() => {
    if (!textInput) {
      setTextInput({ value: "", isValid: true }, id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="textarea-container"
      style={AboutWelcomeUtils.getValidStyle(
        data.container_style,
        CONFIGURABLE_STYLES,
        true
      )}
    >
      {data.character_limit && (
        <div
          className={`textarea-char-counter ${isValid ? "" : "invalid"}`}
          style={AboutWelcomeUtils.getValidStyle(
            data.char_counter_style,
            CONFIGURABLE_STYLES,
            true
          )}
        >
          {charCounter}
        </div>
      )}
      <textarea
        name={id}
        className={`textarea-input ${isValid ? "" : "invalid"}`}
        rows={data.rows}
        cols={data.cols}
        onChange={handleChange}
        value={textInput?.value || ""}
        placeholder={data.placeholder}
        style={AboutWelcomeUtils.getValidStyle(
          data.textarea_style,
          CONFIGURABLE_STYLES,
          true
        )}
      />
    </div>
  );
};
