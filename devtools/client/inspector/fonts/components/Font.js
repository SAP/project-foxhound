/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  createFactory,
  PureComponent,
} = require("resource://devtools/client/shared/vendor/react.js");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.js");

const {
  getStr,
} = require("resource://devtools/client/inspector/fonts/utils/l10n.js");
const FontName = createFactory(
  require("resource://devtools/client/inspector/fonts/components/FontName.js")
);
const FontOrigin = createFactory(
  require("resource://devtools/client/inspector/fonts/components/FontOrigin.js")
);
const FontPreview = createFactory(
  require("resource://devtools/client/inspector/fonts/components/FontPreview.js")
);
const FontMetadata = createFactory(
  require("resource://devtools/client/inspector/fonts/components/FontMetadata.js")
);

const Types = require("resource://devtools/client/inspector/fonts/types.js");

class Font extends PureComponent {
  static get propTypes() {
    return {
      font: PropTypes.shape(Types.font).isRequired,
      onPreviewClick: PropTypes.func,
      onToggleFontHighlight: PropTypes.func.isRequired,
    };
  }

  constructor(props) {
    super(props);

    this.state = {
      isFontFaceRuleExpanded: false,
    };

    this.onFontFaceRuleToggle = this.onFontFaceRuleToggle.bind(this);
  }

  onFontFaceRuleToggle(event) {
    this.setState({
      isFontFaceRuleExpanded: !this.state.isFontFaceRuleExpanded,
    });
    event.stopPropagation();
  }

  renderFontCSSCode(rule, ruleText) {
    if (!rule) {
      return null;
    }

    // Cut the rule text in 3 parts: the selector, the declarations, the closing brace.
    // This way we can collapse the declarations by default and display an expander icon
    // to expand them again.
    const leading = ruleText.substring(0, ruleText.indexOf("{") + 1);
    const body = ruleText.substring(
      ruleText.indexOf("{") + 1,
      ruleText.lastIndexOf("}")
    );
    const trailing = ruleText.substring(ruleText.lastIndexOf("}"));

    const { isFontFaceRuleExpanded } = this.state;

    return dom.pre(
      {
        className: "font-css-code",
      },
      this.renderFontCSSCodeTwisty(),
      leading,
      isFontFaceRuleExpanded
        ? body
        : dom.button({
            className: "font-truncated-string-expander",
            onClick: this.onFontFaceRuleToggle,
            title: getStr("fontinspector.showFullText"),
          }),
      trailing
    );
  }

  renderFontCSSCodeTwisty() {
    const { isFontFaceRuleExpanded } = this.state;

    return dom.button({
      className: "theme-twisty",
      onClick: this.onFontFaceRuleToggle,
      "aria-expanded": isFontFaceRuleExpanded,
      title: getStr("fontinspector.showFullText"),
    });
  }

  renderFontFamilyName(family) {
    if (!family) {
      return null;
    }

    return dom.div({ className: "font-family-name" }, family);
  }

  render() {
    const { font, onPreviewClick, onToggleFontHighlight } = this.props;

    const { CSSFamilyName, previewUrl, rule, ruleText } = font;

    return dom.li(
      {
        className: "font",
      },
      dom.div(
        {},
        this.renderFontFamilyName(CSSFamilyName),
        FontName({ font, onToggleFontHighlight })
      ),
      FontOrigin({ font }),
      FontPreview({ onPreviewClick, previewUrl }),
      this.renderFontCSSCode(rule, ruleText),
      FontMetadata({ font })
    );
  }
}

module.exports = Font;
