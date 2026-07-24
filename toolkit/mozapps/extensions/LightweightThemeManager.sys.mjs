/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Holds optional fallback theme data that will be returned when no data for an
// active theme can be found. This the case for WebExtension Themes, for example.
var _fallbackThemeData = null;

// Parses the `images` property of a theme manifest and stores them in `styles`.
function loadImages(images, styles, experiment, baseURI, logger) {
  for (let image of Object.keys(images)) {
    let val = images[image];

    if (!val) {
      continue;
    }

    switch (image) {
      case "additional_backgrounds": {
        let backgroundImages = val.map(img => baseURI.resolve(img));
        styles.additionalBackgrounds = backgroundImages;
        break;
      }
      case "theme_frame": {
        let resolvedURL = baseURI.resolve(val);
        styles.headerURL = resolvedURL;
        break;
      }
      default: {
        if (experiment?.images && image in experiment.images) {
          styles.experimental.images[image] = baseURI.resolve(val);
        } else {
          logger?.warn(`Unrecognized theme property found: images.${image}`);
        }
        break;
      }
    }
  }
}

// Parses the `colors` property of a theme manifest, and stores them in `styles`.
function loadColors(colors, styles, experiment, logger) {
  for (let color of Object.keys(colors)) {
    let val = colors[color];
    if (!val) {
      continue;
    }

    let cssColor = val;
    if (Array.isArray(val)) {
      cssColor =
        "rgb" + (val.length > 3 ? "a" : "") + "(" + val.join(",") + ")";
    }

    switch (color) {
      case "frame":
        styles.accentcolor = cssColor;
        break;
      case "frame_inactive":
        styles.accentcolorInactive = cssColor;
        break;
      case "tab_background_text":
        styles.textcolor = cssColor;
        break;
      case "toolbar":
        styles.toolbarColor = cssColor;
        break;
      case "toolbar_text":
      case "bookmark_text":
        styles.toolbar_text = cssColor;
        break;
      case "icons":
        styles.icon_color = cssColor;
        break;
      case "icons_attention":
        styles.icon_attention_color = cssColor;
        break;
      case "tab_background_separator":
      case "tab_loading":
      case "tab_text":
      case "tab_line":
      case "tab_selected":
      case "toolbar_field":
      case "toolbar_field_text":
      case "toolbar_field_border":
      case "toolbar_field_focus":
      case "toolbar_field_text_focus":
      case "toolbar_field_border_focus":
      case "toolbar_top_separator":
      case "toolbar_bottom_separator":
      case "toolbar_vertical_separator":
      case "button_background_hover":
      case "button_background_active":
      case "popup":
      case "popup_text":
      case "popup_border":
      case "popup_highlight":
      case "popup_highlight_text":
      case "ntp_background":
      case "ntp_card_background":
      case "ntp_text":
      case "sidebar":
      case "sidebar_border":
      case "sidebar_text":
      case "sidebar_highlight":
      case "sidebar_highlight_text":
      case "toolbar_field_highlight":
      case "toolbar_field_highlight_text":
        styles[color] = cssColor;
        break;
      default:
        if (experiment?.colors && color in experiment.colors) {
          styles.experimental.colors[color] = cssColor;
        } else {
          logger?.warn(`Unrecognized theme property found: colors.${color}`);
        }
        break;
    }
  }
}

// Parses the `properties` property of the theme manifest.
function loadProperties(properties, styles, experiment, logger) {
  let additionalBackgroundsCount = styles.additionalBackgrounds?.length || 0;
  const assertValidAdditionalBackgrounds = (property, valueCount) => {
    if (!additionalBackgroundsCount) {
      logger?.warn(
        `The '${property}' property takes effect only when one ` +
          `or more additional background images are specified using the 'additional_backgrounds' property.`
      );
      return false;
    }
    if (additionalBackgroundsCount !== valueCount) {
      logger?.warn(
        `The amount of values specified for '${property}' ` +
          `(${valueCount}) is not equal to the amount of additional background ` +
          `images (${additionalBackgroundsCount}), which may lead to unexpected results.`
      );
    }
    return true;
  };

  for (let property of Object.getOwnPropertyNames(properties)) {
    let val = properties[property];

    if (!val) {
      continue;
    }

    switch (property) {
      case "additional_backgrounds_alignment": {
        if (!assertValidAdditionalBackgrounds(property, val.length)) {
          break;
        }

        styles.backgroundsAlignment = val.join(",");
        break;
      }
      case "additional_backgrounds_tiling": {
        if (!assertValidAdditionalBackgrounds(property, val.length)) {
          break;
        }

        let tiling = [];
        for (let i = 0, l = styles.additionalBackgrounds.length; i < l; ++i) {
          tiling.push(val[i] || "no-repeat");
        }
        styles.backgroundsTiling = tiling.join(",");
        break;
      }
      case "color_scheme":
      case "content_color_scheme": {
        styles[property] = val;
        break;
      }
      default: {
        if (experiment?.properties && property in experiment.properties) {
          styles.experimental.properties[property] = val;
        } else {
          logger?.warn(
            `Unrecognized theme property found: properties.${property}`
          );
        }
        break;
      }
    }
  }
}

function loadDetails(details, experiment, baseURI, id, version, logger) {
  let styles = {};
  if (experiment) {
    styles.experimental = {
      colors: {},
      images: {},
      properties: {},
    };
  }

  if (details.colors) {
    loadColors(details.colors, styles, experiment, logger);
  }

  if (details.images) {
    loadImages(details.images, styles, experiment, baseURI, logger);
  }

  if (details.properties) {
    loadProperties(details.properties, styles, experiment, logger);
  }

  styles.id = id;
  styles.version = version;
  return styles;
}

export var LightweightThemeManager = {
  aiThemeData: null,
  _aiThemeDataPromise: null,

  async promiseAIThemeData() {
    if (this.aiThemeData) {
      return this.aiThemeData;
    }

    if (this._aiThemeDataPromise) {
      return this._aiThemeDataPromise;
    }

    this._aiThemeDataPromise = this._fetchThemeDataFromBuiltinManifest(
      "resource://builtin-themes/aiwindow/"
    ).then(data => {
      this.aiThemeData = data;
      this._aiThemeDataPromise = null;
      return data;
    });

    return this._aiThemeDataPromise;
  },
  async _fetchThemeDataFromBuiltinManifest(baseURI) {
    let baseURIObj = Services.io.newURI(baseURI);
    let res = await fetch(baseURIObj.resolve("./manifest.json"));
    let manifest = await res.json();
    return this.themeDataFrom(
      manifest.theme,
      manifest.dark_theme,
      manifest.theme_experiment,
      baseURIObj,
      manifest.browser_specific_settings.gecko.id,
      manifest.version,
      /* logger = */ null
    );
  },
  // Reads theme data from either an extension manifest or a dynamic theme,
  // and converts it to an internal format used by our theming code.
  //
  // NOTE: This format must be backwards compatible, since it's stored in
  // the extension's startup data, or it needs to be discarded when it changes.
  //
  // @param {object} details the `theme` entry in the manifest.
  // @param {object} darkDetails the `dark_theme` entry in the manifest.
  // @param {object?} experiment the `experiment` entry in the manifest.
  // @param {nsIURI} baseURI the base URL to resolve images and so against.
  // @param {string} id the extension id.
  // @param {string} version the extension version.
  // @param {object?} logger the extension logger if needed.
  //
  // @return {object} the internal representation of the theme.
  themeDataFrom(
    details,
    darkDetails,
    experiment,
    baseURI,
    id,
    version,
    logger
  ) {
    if (experiment?.stylesheet) {
      experiment.stylesheet = baseURI.resolve(experiment.stylesheet);
    }
    let lwtData = {
      experiment,
    };
    lwtData.theme = loadDetails(
      details,
      experiment,
      baseURI,
      id,
      version,
      logger
    );
    if (darkDetails) {
      lwtData.darkTheme = loadDetails(
        darkDetails,
        experiment,
        baseURI,
        id,
        version,
        logger
      );
    }
    return lwtData;
  },

  set fallbackThemeData(data) {
    if (data && Object.getOwnPropertyNames(data).length) {
      _fallbackThemeData = Object.assign({}, data);
    } else {
      _fallbackThemeData = null;
    }
  },

  get themeData() {
    return _fallbackThemeData || { theme: null };
  },
};
