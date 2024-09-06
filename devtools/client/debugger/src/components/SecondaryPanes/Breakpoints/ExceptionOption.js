/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */
import {
  div,
  input,
  label,
} from "devtools/client/shared/vendor/react-dom-factories";
import PropTypes from "devtools/client/shared/vendor/react-prop-types";

export default function ExceptionOption({
  className,
  isChecked = false,
  label: inputLabel,
  onChange,
}) {
  return label(
    {
      className,
    },
    input({
      type: "checkbox",
      checked: isChecked,
      onChange,
    }),
    div(
      {
        className: "breakpoint-exceptions-label",
      },
      inputLabel
    )
  );
}

ExceptionOption.propTypes = {
  className: PropTypes.string.isRequired,
  isChecked: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
