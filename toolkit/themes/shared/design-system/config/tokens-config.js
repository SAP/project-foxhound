/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fs = require("node:fs");
const path = require("node:path");
const StyleDictionary = require("style-dictionary");
const { createPropertyFormatter } = StyleDictionary.formatHelpers;
const figmaConfig = require("./figma-tokens-config");
const { OVERRIDE_IDENTIFIERS } = require("./override-identifiers");

/**
 * Base tokens are shared across all components and surfaces (e.g. color, typography, spacing).
 * They are not component-specific and always go into the shared CSS output.
 *
 * @type {{ dir: string }}
 */
const BASE_TOKEN_PATH = {
  dir: "src/tokens/base",
};

/**
 * @typedef {object} TokenPath
 * @property {string} dir - Path to the component directory, relative to design-system/.
 * @property {boolean} [isGlobal] - If true, tokens go into the shared CSS output.
 *  If false/absent, each component gets its own CSS output file co-located with its tokens.json.
 * @property {function(string): string} [nameTransform] - Optional transform applied to the filename-derived component name.
 */
/** @type {TokenPath[]} */
const COMPONENT_TOKEN_PATHS = [
  {
    dir: "src/tokens/components",
    isGlobal: true,
  },
  {
    dir: "../../../content/widgets",
    nameTransform: name => name.replace("moz-", ""),
  },
  {
    dir: "../../../../browser/themes/shared",
  },
];

const PURPOSE = {
  SEMANTIC: "semantic",
  STORYBOOK: "storybook",
};

/**
 * @typedef {object} TokenCategory
 * @property {string} name - A name used to group tokens into a category for storybook/stylelint to reference.
 * @property {string[]} [alternateNames] - Names not matching standard token naming conventions (e.g. "width" instead of "size").
 * @property {string[]} purposes - What the token category is used for, either semantic tokens used by stylelint or tokens to be demonstrated in storybook.
 */
/** @type {TokenCategory[]} */
const TOKEN_CATEGORIES = [
  {
    name: "table-background",
    purposes: [PURPOSE.STORYBOOK],
  },
  {
    name: "table-border",
    purposes: [PURPOSE.STORYBOOK],
  },
  {
    name: "table-header",
    purposes: [PURPOSE.STORYBOOK],
  },
  {
    name: "background-color",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "text-color",
    alternateNames: ["link-color"],
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "border-color",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "border-radius",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "border-width",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "border",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "outline-color",
    purposes: [PURPOSE.SEMANTIC],
  },
  {
    name: "outline-width",
    purposes: [PURPOSE.SEMANTIC],
  },
  {
    name: "outline-offset",
    alternateNames: ["outline-inset"],
    purposes: [PURPOSE.SEMANTIC],
  },
  {
    name: "outline",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "focus-outline",
    purposes: [PURPOSE.SEMANTIC],
  },
  {
    name: "space",
    alternateNames: ["padding", "margin", "inset", "gap"],
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "box-shadow",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "font-size",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "font-weight",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "icon-size",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "icon-color",
    alternateNames: ["fill", "stroke"],
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "size",
    alternateNames: ["height", "width", "transform"],
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "dimension",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "opacity",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
  {
    name: "color",
    purposes: [PURPOSE.SEMANTIC, PURPOSE.STORYBOOK],
  },
];

/**
 * Returns info about all component token files across all COMPONENT_TOKEN_PATHS.
 *
 * @returns {{ name: string, destination: string | null }[]}
 */
const getComponentInfo = () => {
  return COMPONENT_TOKEN_PATHS.filter(({ dir }) =>
    fs.existsSync(path.join(__dirname, "..", dir))
  ).flatMap(({ dir, isGlobal = false, nameTransform = n => n }) => {
    const srcDir = path.join(__dirname, "..", dir);
    return fs
      .readdirSync(srcDir, { recursive: true })
      .filter(f => typeof f === "string")
      .filter(
        f =>
          f.endsWith(".tokens.json") &&
          !OVERRIDE_IDENTIFIERS.some(({ name }) =>
            f.endsWith(`.${name}.tokens.json`)
          )
      )
      .map(relativePath => ({
        name: nameTransform(
          path.basename(relativePath).replace(".tokens.json", "")
        ),
        destination: isGlobal
          ? null
          : `${dir}/${relativePath.replace(".tokens.json", ".tokens.css")}`,
      }));
  });
};

/**
 * Returns only the components that produce their own CSS output file.
 *
 * @returns {{ name: string, destination: string }[]}
 */
const getExternalComponentInfo = () =>
  /** @type {{ name: string, destination: string }[]} */
  (getComponentInfo().filter(({ destination }) => destination !== null));

const getTokenSections = () => {
  const componentSections = getComponentInfo().reduce(
    (components, { name }) => ({
      ...components,
      [name]: name,
    }),
    {}
  );

  const baseSections = TOKEN_CATEGORIES.filter(category =>
    category.purposes.includes(PURPOSE.SEMANTIC)
  ).reduce((sections, category) => {
    return {
      ...sections,
      [category.name]: category.name,
    };
  }, {});

  const allSections = {
    ...baseSections,
    ...componentSections,
  };

  return Object.fromEntries(
    Object.keys(allSections)
      // moz-box interferes with box-shadow tokens, so put "box" at the end of the list
      .sort((a, b) => (a > b || a === "box" ? 1 : -1))
      .map(key => [key, allSections[key]])
  );
};

/**
 * Defines file configuration options for all external components that
 * style-dictionary will process.
 *
 * @typedef {object} FileConfig
 * @property {string} destination - The file path where CSS will be written.
 * @property {string} format - Identifies which format style-dictionary will use for its output.
 *
 * @returns {FileConfig[]}
 */
const getExternalComponentFileConfig = () =>
  getExternalComponentInfo().map(({ name, destination }) => ({
    destination,
    format: `css/variables/${name}`,
  }));

/**
 * Defines formatting functions for all external components that
 * style-dictionary will process.
 *
 * @returns {{[key: string]: Function}}
 */
const getExternalComponentFormatConfig = () =>
  getExternalComponentInfo().reduce(
    (config, { name: componentName }) => ({
      ...config,
      [`css/variables/${componentName}`]: createDesktopFormat({
        componentName,
      }),
    }),
    {}
  );

const TSHIRT_ORDER = [
  "circle",
  "xxxsmall",
  "xxsmall",
  "xsmall",
  "small",
  "medium",
  "large",
  "xlarge",
  "xxlarge",
  "xxxlarge",
];

const STATE_ORDER = [
  "base",
  "default",
  "root",
  "hover",
  "active",
  "focus",
  "disabled",
];

const getLayerString = () => {
  const themeLayers = [
    "tokens-foundation",
    "tokens-browser-theme",
    "tokens-foundation-brand",
  ];
  const a11yLayers = ["tokens-prefers-contrast", "tokens-forced-colors"];

  const themeLayersWithOverrides = [
    ...themeLayers,
    ...OVERRIDE_IDENTIFIERS.flatMap(({ name }) =>
      themeLayers.map(layer => `${layer}-${name}`)
    ),
  ];

  const a11yLayersWithOverrides = a11yLayers.flatMap(layer => [
    layer,
    ...OVERRIDE_IDENTIFIERS.map(({ name }) => `${layer}-${name}`),
  ]);

  const layers = [...themeLayersWithOverrides, ...a11yLayersWithOverrides];

  return `@layer ${layers.join(", ")};\n\n`;
};

/**
 * Adds the Mozilla Public License header in one comment and
 * how to make changes in the generated output files via the
 * *.tokens.json file in another comment. Also imports
 * tokens-shared.css when applicable.
 *
 * @param {string} surface
 *  Desktop surface, either "brand" or "platform". Determines
 *  whether or not we need to import tokens-shared.css.
 * @returns {string} Formatted comment header string
 */
let customFileHeader = ({ surface, platform, componentName = "" }) => {
  let licenseString = [
    "/* This Source Code Form is subject to the terms of the Mozilla Public",
    " * License, v. 2.0. If a copy of the MPL was not distributed with this",
    " * file, You can obtain one at http://mozilla.org/MPL/2.0/. */",
  ].join("\n");

  let commentString = [
    `/* DO NOT EDIT this file directly, instead modify ${componentName ? `moz-${componentName}.tokens.json` : "the relevant *.tokens.json file"}`,
    " * and run `mach buildtokens` to see your changes. */",
  ].join("\n");

  let cssImport = surface
    ? `@import url("chrome://global/skin/design-system/tokens-shared.css");\n\n`
    : "";
  let layerString = !surface && !platform ? getLayerString() : "";

  return [
    licenseString + "\n\n" + commentString + "\n\n" + cssImport + layerString,
  ];
};

const NEST_MEDIA_QUERIES_COMMENT = `/* Bug 1879900: Can't nest media queries inside of :host, :root selector
   until Bug 1879349 lands */`;

const MEDIA_QUERY_PROPERTY_MAP = {
  "forced-colors": "forcedColors",
  "browser-theme": "browserTheme",
  "prefers-contrast": "prefersContrast",
};

function formatBaseTokenNames(str) {
  let formattedName = str.replaceAll(
    /(?<tokenName>\w+)-base(?=\b)/g,
    "$<tokenName>"
  );

  OVERRIDE_IDENTIFIERS.forEach(({ name }) => {
    formattedName = formattedName.replaceAll(`-${name}`, "");
  });

  return formattedName;
}

/**
 * Creates a surface-specific formatter. The formatter is used to build
 * our different CSS files, including "prefers-contrast" and "forced-colors"
 * media queries. See more at
 * https://amzn.github.io/style-dictionary/#/formats?id=formatter
 *
 * @param {object} config
 * @param {string} [config.surface]
 *  Which desktop area we are generating CSS for.
 *  Either "brand" (i.e. in-content) or "platform" (i.e. chrome).
 * @param {string} [config.componentName=""]
 *  The name of the component that will be split out into its own CSS file.
 * @returns {Function} - Formatter function that returns a CSS string.
 */
const createDesktopFormat =
  ({ surface, componentName = "" } = {}) =>
  args => {
    let contents =
      customFileHeader({ surface, componentName }) +
      formatTokens({
        surface,
        args,
        componentName,
      }) +
      formatTokens({
        mediaQuery: "prefers-contrast",
        surface,
        args,
        componentName,
      }) +
      formatTokens({
        mediaQuery: "forced-colors",
        surface,
        args,
        componentName,
      }) +
      formatTokens({
        mediaQuery: "browser-theme",
        surface,
        args,
        componentName,
      });

    OVERRIDE_IDENTIFIERS.forEach(({ name, pref }) => {
      const overrideContents =
        formatTokens({
          surface,
          args,
          overrideIdentifier: name,
          componentName,
        }) +
        formatTokens({
          mediaQuery: "prefers-contrast",
          surface,
          args,
          overrideIdentifier: name,
          componentName,
        }) +
        formatTokens({
          mediaQuery: "forced-colors",
          surface,
          args,
          overrideIdentifier: name,
          componentName,
        }) +
        formatTokens({
          mediaQuery: "browser-theme",
          surface,
          args,
          overrideIdentifier: name,
          componentName,
        });
      if (!overrideContents) {
        return;
      }

      contents += `
@media -moz-pref("${pref}") {
${overrideContents}
}
`;
    });

    return contents;
  };

/**
 * Creates the format for the nova newtab tokens file. Outputs nova override
 * tokens as plain :root and @media (forced-colors) blocks without @layer
 * wrappers or pref media queries, so tokens always apply when the nova
 * newtab CSS is loaded. See browser/extensions/newtab for usage context.
 */
const createNovaNewtabFormat = () => args => {
  let licenseString = [
    "/* This Source Code Form is subject to the terms of the Mozilla Public",
    " * License, v. 2.0. If a copy of the MPL was not distributed with this",
    " * file, You can obtain one at http://mozilla.org/MPL/2.0/. */",
  ].join("\n");

  let commentString = [
    "/* DO NOT EDIT this file directly, instead modify the relevant *.nova.tokens.json file",
    " * and run `mach buildtokens` to see your changes. */",
  ].join("\n");

  let backwardCompatString = [
    "/*",
    " * @backward-compat { version 155 }",
    " * Nova design token overrides are gated on the `browser.design-tokens.nova` pref in",
    " * tokens-shared.css, which is NOT enabled when HNT ships its Nova experience (gated",
    " * on `browser.newtabpage.activity-stream.nova.enabled`). Since the newtab extension",
    " * can train-hop, it cannot rely on toolkit CSS behind a pref gate. This file provides",
    " * those token values directly so nova/activity-stream.css is self-contained.",
    " * Remove this file when `browser.nova.enabled` unifies both prefs and reaches Release.",
    " */",
  ].join("\n");

  let header =
    licenseString +
    "\n\n" +
    commentString +
    "\n\n" +
    backwardCompatString +
    "\n\n";

  let css =
    header +
    formatNovaNewtabTokens({ args }) +
    formatNovaNewtabTokens({ mediaQuery: "forced-colors", args });

  return postProcessNovaNewtab(css);
};

/**
 * Post-processes generated CSS to match the stylelint rules enforced on SCSS
 * files in browser/extensions/newtab:
 *  - Shorten #RRGGBB hex to #RGB where all pairs match (color-hex-length: short)
 *  - Convert decimal alpha values to percentages (alpha-value-notation: percentage)
 *  - Add blank line before /* block comments that immediately follow a declaration
 *    (comment-empty-line-before: always)
 */
function postProcessNovaNewtab(css) {
  return css
    .replace(/#[0-9A-Fa-f]{3,6}\b/g, hex => hex.toUpperCase())
    .replace(/#FFFFFF/g, "#FFF")
    .replace(/,\s*0\.(\d+)\)/g, (_, dec) => {
      let pct = dec.length === 1 ? dec + "0" : String(parseInt(dec, 10));
      return `, ${pct}%)`;
    })
    .replace(/([^\n])\n( +\/\* (?!\*))/g, "$1\n\n$2");
}

/**
 * Formats nova override tokens as plain CSS without @layer or pref media
 * query wrapping, for use in the newtab's self-contained nova CSS file.
 */
function formatNovaNewtabTokens({ mediaQuery, args }) {
  const overrideIdentifier = "nova";
  let prop = MEDIA_QUERY_PROPERTY_MAP[mediaQuery] ?? "default";
  let dictionary = Object.assign({}, args.dictionary);
  let tokens = [];

  dictionary.allTokens.forEach(token => {
    if (shouldSkipToken({ overrideIdentifier, token })) {
      return;
    }

    let originalVal = getOriginalTokenValue(token, prop);
    if (originalVal != undefined) {
      let formattedToken = transformToken({ token, originalVal, dictionary });
      tokens.push(formattedToken);
    }
  });

  if (!tokens.length) {
    return "";
  }

  dictionary.allTokens = dictionary.allProperties = tokens;
  let indentation = mediaQuery ? "    " : "  ";

  let formattedVars = formatVariables({
    format: "css",
    dictionary,
    outputReferences: false,
    formatting: {
      indentation,
      commentPosition: "above",
    },
  });

  if (mediaQuery) {
    return `\n@media (${mediaQuery}) {\n  :root.nova-tokens {\n${formattedVars}\n  }\n}\n`;
  }

  return `:root.nova-tokens {\n${formattedVars}\n}\n`;
}

/**
 * Determines whether a token should be skipped for processing, based on whether it's relevant to the file being built.
 *
 * @param {object} options
 * @param {string} [options.overrideIdentifier=""] - The name of the set of overrides being processed, if applicable.
 * @param {string} [options.componentName=""] - The name of the component being processed, if applicable.
 * @param {object} options.token - The token being processed.
 * @returns {boolean}
 */
const shouldSkipToken = ({ overrideIdentifier, componentName, token }) => {
  // Skip any tokens that belong to a set of overrides.
  if (
    !overrideIdentifier &&
    (OVERRIDE_IDENTIFIERS.some(({ name }) =>
      token.name.includes(`-${name}-`)
    ) ||
      token.override)
  ) {
    return true;
  }

  // Ignore base/default tokens if a set of overrides is specified.
  if (overrideIdentifier && !token.name.includes(`-${overrideIdentifier}-`)) {
    return true;
  }

  // moz-box greedily assumes box-shadow tokens belong to it.
  if (componentName === "box" && token.name.startsWith("box-shadow")) {
    return true;
  }

  // Allow box-shadow tokens to pass through, since they would fail a later check due to moz-box.
  if (!componentName && token.name.startsWith("box-shadow")) {
    return false;
  }

  // Skip any tokens that don't belong to the component, if applicable.
  if (
    componentName &&
    !(
      token.name.startsWith(`${componentName}-`) || token.name === componentName
    )
  ) {
    return true;
  }

  // Skip custom component tokens if we're only getting base/shared tokens.
  if (
    !componentName &&
    getExternalComponentInfo().some(
      ({ name }) => token.name.startsWith(`${name}-`) || token.name === name
    )
  ) {
    return true;
  }

  return false;
};

/**
 * Formats a subset of tokens into CSS. Wraps token CSS in a media query when
 * applicable.
 *
 * @param {object} tokenArgs
 * @param {string} [tokenArgs.mediaQuery]
 *  Media query formatted CSS should be wrapped in. This is used
 *  to determine what property we are parsing from the token values.
 * @param {string} [tokenArgs.surface]
 *  Specifies a desktop surface, either "brand" or "platform".
 * @param {string} [tokenArgs.overrideIdentifier]
 *  Separates base/default tokens from overrides.
 * @param {string} [tokenArgs.componentName]
 *  Treat specified components differently.
 * @param {object} tokenArgs.args
 *  Formatter arguments provided by style-dictionary. See more at
 *  https://amzn.github.io/style-dictionary/#/formats?id=formatter
 * @returns {string} Tokens formatted into a CSS string.
 */
function formatTokens({
  mediaQuery,
  surface,
  args,
  overrideIdentifier,
  componentName,
}) {
  let prop = MEDIA_QUERY_PROPERTY_MAP[mediaQuery] ?? "default";
  let dictionary = Object.assign({}, args.dictionary);
  let tokens = [];

  dictionary.allTokens.forEach(token => {
    if (shouldSkipToken({ overrideIdentifier, componentName, token })) {
      return;
    }

    let originalVal = getOriginalTokenValue(token, prop, surface);
    if (originalVal != undefined) {
      let formattedToken = transformToken({
        token,
        originalVal,
        dictionary,
        surface,
      });
      tokens.push(formattedToken);
    }
  });

  if (!tokens.length) {
    return "";
  }

  dictionary.allTokens = dictionary.allProperties = tokens;
  let indentation = mediaQuery ? "      " : "    ";
  if (overrideIdentifier) {
    indentation += "  ";
  }

  let formattedVars = formatVariables({
    format: "css",
    dictionary,
    outputReferences: false,
    formatting: {
      indentation,
      commentPosition: "above",
    },
    componentName,
  });

  let layer = `tokens-${mediaQuery ?? `foundation${surface == "brand" ? "-brand" : ""}`}${overrideIdentifier ? `-${overrideIdentifier}` : ""}`;

  // Weird spacing below is unfortunately necessary for formatting the built CSS.
  if (mediaQuery === "browser-theme") {
    return `
${NEST_MEDIA_QUERIES_COMMENT}
@layer ${layer} {
  @media not ((forced-colors) or (-moz-native-theme)) {
    :root:not([lwtheme]),
    :host(.anonymous-content-host) {
${formattedVars}
    }
  }
}
`;
  }
  if (mediaQuery) {
    return `
${NEST_MEDIA_QUERIES_COMMENT}
@layer ${layer} {
  @media (${mediaQuery}) {
    :root,
    :host${componentName ? "" : "(.anonymous-content-host)"} {
${formattedVars}
    }
  }
}
`;
  }

  return `@layer ${layer} {
  :root,
  :host${componentName ? "" : "(.anonymous-content-host)"} {
${formattedVars}
  }
}
`;
}

/**
 * Builds a `light-dark()` CSS value from a token layer's `light` and `dark` keys.
 *
 * @param {object} [layerValue] - Token layer from JSON with `light` and `dark` set.
 * @returns {string|undefined} `light-dark(light, dark)`, or undefined if either key is missing.
 */
function getLightDarkPair(layerValue) {
  if (layerValue?.light && layerValue?.dark) {
    return `light-dark(${layerValue.light}, ${layerValue.dark})`;
  }
  return undefined;
}

/**
 * Finds the original value of a token for a given media query and surface.
 *
 * @param {object} token - Token object parsed by style-dictionary.
 * @param {string} prop - Name of the property we're querying for.
 * @param {string} [surface]
 *  The desktop surface we're generating CSS for, either "brand" or "platform".
 * @returns {string|undefined} The original token value based on our parameters.
 */
function getOriginalTokenValue(token, prop, surface) {
  const { value } = token.original;

  // Non-object values apply to the foundation layer only.
  if (typeof value !== "object") {
    return prop === "default" ? value : undefined;
  }

  // Brand and platform CSS read from their surface layer. shared reads from the root.
  const layer = surface ? value[surface] : value;
  if (!layer || typeof layer !== "object") {
    return undefined;
  }
  let originalValue = layer[prop];
  if (typeof originalValue === "object") {
    return originalValue.default;
  }
  return originalValue;
}

/**
 * Updates a token's value to the relevant original value after resolving
 * variable references. Also checks for surface specific comments.
 *
 * @param {object} config
 * @param {object} config.token - Token object parsed from JSON by style-dictionary.
 * @param {string} config.originalVal
 *  Original value of the token for the combination of surface and media query.
 * @param {object} config.dictionary
 *  Object of transformed tokens and helper fns provided by style-dictionary.
 * @param {string} config.surface
 *  The desktop surface we're generating CSS for, either "brand", "platform",
 *  or "shared".
 * @returns {object} Token object with an updated value.
 */
function transformToken({ token, originalVal, dictionary, surface }) {
  let value = originalVal;
  if (dictionary.usesReference(value)) {
    dictionary.getReferences(value).forEach(ref => {
      try {
        value = value.replace(`{${ref.path.join(".")}}`, `var(--${ref.name})`);
      } catch (ex) {
        console.error(`Error processing token ref: ${originalVal}`);
        throw ex;
      }
    });
  }

  let surfaceComment = token.original?.value[surface]?.comment;
  return { ...token, value, comment: surfaceComment ?? token.comment };
}

const fileToComponentTypeMap = new Map();
function isComponentToken({ filePath }) {
  if (!fileToComponentTypeMap.has(filePath)) {
    let componentInfo = COMPONENT_TOKEN_PATHS.find(info =>
      filePath.startsWith(info.dir)
    );
    if (componentInfo) {
      fileToComponentTypeMap.set(filePath, {
        component: true,
        global: !!componentInfo.isGlobal,
      });
    } else {
      fileToComponentTypeMap.set(filePath, {
        component: false,
        global: true,
      });
    }
  }
  let info = fileToComponentTypeMap.get(filePath);
  return info.component && !info.global;
}

/**
 * Creates a browserTheme transform that works for a given surface. Maps the
 * nativeTheme value to the correct browserTheme when necessary.
 *
 * @param {string} surface
 *  The desktop surface we're generating CSS for, either "brand", "platform",
 *  or "shared".
 * @returns {string} Name of the transform that was registered.
 */
const createBrowserThemeTransform = surface => {
  let name = `browserThemeTransform/${surface}`;

  // Matcher function for determining if a token's value needs to undergo
  // a light-dark transform.
  let matcher = token => {
    let match =
      token.original.value.nativeTheme &&
      // Components only have shared tokens, otherwise only run on platform.
      (isComponentToken(token) ? surface == "shared" : surface == "platform");
    return match;
  };

  let getValueObject = root => {
    if (root.light) {
      return { light: root.light, dark: root.dark };
    }
    return { default: root.default };
  };

  // Function that uses the token's original value to create a new "default"
  // light-dark value and updates the original value object.
  let transformer = token => {
    let value = token.original.value;
    if (surface == "platform" && value.platform) {
      let browserTheme = getValueObject(token.original.value.platform);
      token.original.value.platform = {
        default: value.nativeTheme,
        browserTheme,
      };
      return token.value;
    }
    let browserThemeRoot = value.brand ? value.brand : value;
    let browserTheme = getValueObject(browserThemeRoot);
    if (isComponentToken(token)) {
      delete token.original.value.light;
      delete token.original.value.dark;
      token.original.value.default = value.nativeTheme;
      token.original.value.browserTheme = browserTheme;
    } else {
      token.original.value.platform = {
        default: value.nativeTheme,
        browserTheme,
      };
    }
    return token.value;
  };

  StyleDictionary.registerTransform({
    type: "value",
    transitive: true,
    name,
    matcher,
    transformer,
  });

  return name;
};

/**
 * Creates a light-dark transform that works for a given surface. Registers
 * the transform with style-dictionary and returns the transform's name.
 *
 * @param {string} surface
 *  The desktop surface we're generating CSS for, either "brand", "platform",
 *  or "shared".
 * @returns {string} Name of the transform that was registered.
 */
const createLightDarkTransform = surface => {
  let name = `lightDarkTransform/${surface}`;

  function getTokenRoot(token) {
    let isComponent = isComponentToken(token);
    let root =
      isComponent || surface == "shared"
        ? token.original.value
        : token.original.value[surface];
    let isBrowserTheme =
      (surface == "platform" || (isComponent && surface == "shared")) &&
      root?.browserTheme;
    if (isBrowserTheme) {
      root = root.browserTheme;
    }
    return root;
  }

  // Matcher function for determining if a token's value needs to undergo
  // a light-dark transform.
  let matcher = token => {
    let root = getTokenRoot(token);
    return root && root.light && root.dark;
  };

  // Function that uses the token's original value to create a new "default"
  // light-dark value and updates the original value object.
  let transformer = token => {
    let root = getTokenRoot(token);
    let lightDarkVal = `light-dark(${root.light}, ${root.dark})`;
    root.default = lightDarkVal;
    return lightDarkVal;
  };

  StyleDictionary.registerTransform({
    type: "value",
    transitive: true,
    name,
    matcher,
    transformer,
  });

  return name;
};

/**
 * Format the tokens dictionary to a string. This mostly defers to
 * StyleDictionary.createPropertyFormatter but first it sorts the tokens based
 * on the groupings in TOKEN_SECTIONS and adds comment headers to CSS output.
 *
 * @param {object} options
 *  Options for tokens to format.
 * @param {string} options.format
 *  The format to output. Supported: "css"
 * @param {object} options.dictionary
 *  The tokens dictionary.
 * @param {string} options.outputReferences
 *  Whether to output variable references.
 * @param {object} options.formatting
 *  The formatting settings to be passed to createPropertyFormatter.
 * @param {string} [options.componentName=""]
 *  The name of the component being processed, if applicable.
 * @returns {string} The formatted tokens.
 */
function formatVariables({
  format,
  dictionary,
  outputReferences,
  formatting,
  componentName,
}) {
  let lastSection = [];
  let propertyFormatter = createPropertyFormatter({
    outputReferences,
    dictionary,
    format,
    formatting,
  });

  let outputParts = [];
  let remainingTokens = [...dictionary.allTokens];
  let isFirst = true;

  function tokenParts(name) {
    let lastDash = name.lastIndexOf("-");
    let suffix = name.substring(lastDash + 1);
    if (TSHIRT_ORDER.includes(suffix) || STATE_ORDER.includes(suffix)) {
      return [name.substring(0, lastDash), suffix];
    }
    return [name, ""];
  }

  for (let [label, selector] of Object.entries(getTokenSections())) {
    let sectionMatchers = Array.isArray(selector) ? selector : [selector];
    let sectionParts = [];

    remainingTokens = remainingTokens.filter(token => {
      const normalizedName = formatBaseTokenNames(token.name);
      if (
        sectionMatchers.some(m =>
          m.test
            ? m.test(normalizedName)
            : normalizedName.startsWith(`${m}-`) || normalizedName === m
        )
      ) {
        sectionParts.push(token);
        return false;
      }
      return true;
    });

    if (sectionParts.length) {
      sectionParts.sort((a, b) => {
        let aName = formatBaseTokenNames(a.name);
        let bName = formatBaseTokenNames(b.name);
        let [aToken, aSuffix] = tokenParts(aName);
        let [bToken, bSuffix] = tokenParts(bName);
        if (aSuffix || bSuffix) {
          if (aToken == bToken) {
            let aSize = TSHIRT_ORDER.indexOf(aSuffix);
            let bSize = TSHIRT_ORDER.indexOf(bSuffix);
            if (aSize != -1 && bSize != -1) {
              return aSize - bSize;
            }
            let aState = STATE_ORDER.indexOf(aSuffix);
            let bState = STATE_ORDER.indexOf(bSuffix);
            if (aState != -1 && bState != -1) {
              return aState - bState;
            }
          }
        }
        return aToken.localeCompare(bToken, undefined, { numeric: true });
      });

      let headingParts = [];
      if (!isFirst) {
        headingParts.push("");
      }
      isFirst = false;

      let sectionLevel = "**";
      let labelParts = label.split("/");
      for (let i = 0; i < labelParts.length; i++) {
        if (labelParts[i] != lastSection[i] && !componentName) {
          headingParts.push(
            `${formatting.indentation}/${sectionLevel} ${labelParts[i]} ${sectionLevel}/`
          );
        }
        sectionLevel += "*";
      }
      lastSection = labelParts;

      outputParts = outputParts.concat(
        headingParts.concat(sectionParts.map(propertyFormatter))
      );
    }
  }

  return formatBaseTokenNames(outputParts.join("\n"));
}

// Easy way to grab variable values later for display.
let variableLookupTable = {};

function tokensTableFormat(args, isSemanticTable = false) {
  let dictionary = Object.assign({}, args.dictionary);
  let resolvedTokens = dictionary.allTokens
    // Exclude override tokens from stylelint/storybook token tables.
    .filter(
      token =>
        !token.override &&
        !OVERRIDE_IDENTIFIERS.some(({ name }) =>
          token.name.includes(`-${name}-`)
        )
    )
    .map(token => {
      let tokenVal = resolveReferences(dictionary, token.original);
      return {
        name: token.name,
        ...tokenVal,
      };
    });
  dictionary.allTokens = dictionary.allProperties = resolvedTokens;

  let parsedData = JSON.parse(
    formatBaseTokenNames(
      StyleDictionary.format["javascript/module-flat"]({
        ...args,
        dictionary,
      })
    )
      .trim()
      .replaceAll(/(^module\.exports\s*=\s*|\;$)/g, "")
  );
  let tokensTable = formatTokensTableData(parsedData, isSemanticTable);

  return `${customFileHeader({ platform: "tokens-table" })}
  export const tokensTable = ${JSON.stringify(tokensTable)};

  export const variableLookupTable = ${JSON.stringify(variableLookupTable)};
  `;
}

function resolveReferences(dictionary, originalVal) {
  let resolvedValues = {};
  Object.entries(originalVal).forEach(([key, value]) => {
    if (typeof value === "object" && value != null) {
      resolvedValues[key] = resolveReferences(dictionary, value);
    } else {
      let resolvedVal = getValueWithReferences(dictionary, value);
      resolvedValues[key] = resolvedVal;
    }
  });
  return resolvedValues;
}

function getValueWithReferences(dictionary, value) {
  let valWithRefs = value;
  if (dictionary.usesReference(value)) {
    dictionary.getReferences(value).forEach(ref => {
      valWithRefs = valWithRefs.replace(
        `{${ref.path.join(".")}}`,
        `var(--${ref.name})`
      );
    });
  }
  return valWithRefs;
}

function formatTokensTableData(tokensData, isSemanticTable = false) {
  let tokensTable = {};
  Object.entries(tokensData).forEach(([key, value]) => {
    variableLookupTable[key] = value;
    let formattedToken = {
      value,
      name: `--${key}`,
    };

    const tableName = getTokenCategoryName(
      key,
      isSemanticTable ? PURPOSE.SEMANTIC : PURPOSE.STORYBOOK
    );

    if (tokensTable[tableName]) {
      tokensTable[tableName].push(formattedToken);
    } else {
      tokensTable[tableName] = [formattedToken];
    }
  });
  return tokensTable;
}

function getTokenCategoryName(tokenName, purpose) {
  // Use the token's name to determine the category it belongs to.
  // e.g. --button-background-color-primary goes to "background-color"
  const matchingCategory = TOKEN_CATEGORIES.find(
    ({ name, alternateNames, purposes }) => {
      if (!purposes.includes(purpose)) {
        return false;
      }

      const matchesAsSegment = n =>
        new RegExp(`(^|-)${n}(-|$)`).test(tokenName);

      return matchesAsSegment(name) || alternateNames?.some(matchesAsSegment);
    }
  );

  if (!matchingCategory) {
    return "uncategorized";
  }

  return matchingCategory.name;
}

function getTokenCategory(filePath) {
  const fileName = path.basename(filePath);
  const tokenCategory = fileName
    .replace(".tokens.json", "")
    .replace("moz-", "");

  return tokenCategory;
}

module.exports = {
  source: [BASE_TOKEN_PATH, ...COMPONENT_TOKEN_PATHS].map(
    ({ dir }) => `${dir}/**/*.tokens.json`
  ),
  format: {
    "css/variables/shared": createDesktopFormat(),
    "css/variables/brand": createDesktopFormat({ surface: "brand" }),
    "css/variables/platform": createDesktopFormat({ surface: "platform" }),
    "css/variables/nova-newtab": createNovaNewtabFormat(),
    // Organize tokens to be consumed by Storybook.
    "javascript/tokens-table": args => tokensTableFormat(args, false),
    // Organize tokens to be used by stylelint rules.
    "javascript/semantic-categories": args => tokensTableFormat(args, true),
    ...getExternalComponentFormatConfig(),
    ...figmaConfig.formats,
  },
  parsers: [
    {
      pattern: /\.json$/,
      parse: ({ filePath, contents }) =>
        JSON.parse(`{"${getTokenCategory(filePath)}": ${contents}}`),
    },
  ],
  platforms: {
    css: {
      options: {
        outputReferences: true,
        showFileHeader: false,
      },
      transforms: [
        ...StyleDictionary.transformGroup.css,
        ...["shared", "platform", "brand"].map(createBrowserThemeTransform),
        ...["shared", "platform", "brand"].map(createLightDarkTransform),
      ],
      files: [
        {
          destination: "dist/tokens-shared.css",
          format: "css/variables/shared",
        },
        {
          destination:
            "../../../../browser/extensions/newtab/content-src/styles/nova/_tokens.scss",
          format: "css/variables/nova-newtab",
        },
        {
          destination: "dist/tokens-brand.css",
          format: "css/variables/brand",
          filter: token =>
            typeof token.original.value == "object" &&
            token.original.value.brand,
        },
        {
          destination: "dist/tokens-platform.css",
          format: "css/variables/platform",
          filter: token =>
            typeof token.original.value == "object" &&
            token.original.value.platform,
        },
        ...getExternalComponentFileConfig(),
      ],
    },
    tables: {
      options: {
        outputReferences: true,
        showFileHeader: false,
      },
      transforms: [
        ...StyleDictionary.transformGroup.css,
        ...["shared", "platform", "brand"].map(createBrowserThemeTransform),
        ...["shared", "platform", "brand"].map(createLightDarkTransform),
      ],
      files: [
        {
          destination: "dist/tokens-table.mjs",
          format: "javascript/tokens-table",
        },
        {
          destination: "dist/semantic-categories.mjs",
          format: "javascript/semantic-categories",
        },
      ],
    },
    figma: figmaConfig.platform,
  },
};
