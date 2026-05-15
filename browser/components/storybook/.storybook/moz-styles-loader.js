/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file contains a webpack loader which rewrites JS source files to use
 * CSS imports when running in Storybook. This allows JS files loaded in
 * Storybook to use chrome:// and moz-src:/// URIs when loading external
 * stylesheets without having to worry about Storybook being able to find and
 * detect changes to the files.
 *
 * This loader allows Lit-based custom element code like this to work with
 * Storybook:
 *
 *    render() {
 *      return html`
 *        <link rel="stylesheet" href="chrome://global/content/elements/moz-toggle.css" />
 *        ...
 *      `;
 *    }
 *
 * By rewriting the source to this:
 *
 *    import moztoggleStyles from "toolkit/content/widgets/moz-toggle/moz-toggle.css";
 *    ...
 *    render() {
 *      return html`
 *        <link rel="stylesheet" href=${moztoggleStyles} />
 *        ...
 *      `;
 *    }
 *
 * It works similarly for vanilla JS custom elements that utilize template
 * strings. The following code:
 *
 *    static get markup() {
 *      return`
 *        <template>
 *          <link rel="stylesheet" href="chrome://browser/skin/migration/migration-wizard.css">
 *          ...
 *        </template>
 *      `;
 *    }
 *
 * Gets rewritten to:
 *
 *    import migrationwizardStyles from "browser/themes/shared/migration/migration-wizard.css";
 *    ...
 *    static get markup() {
 *      return`
 *        <template>
 *          <link rel="stylesheet" href=${migrationwizardStyles}>
 *          ...
 *        </template>
 *      `;
 *    }
 *
 * For moz-src:/// URIs the path is resolved relative to the importing file:
 *
 *    render() {
 *      return html`
 *        <link rel="stylesheet" href="moz-src:///third_party/js/prosemirror/prosemirror-view/style/prosemirror.css" />
 *        ...
 *      `;
 *    }
 *
 * Gets rewritten to:
 *
 *    import prosemirrorStyles from "../../../../third_party/js/prosemirror/prosemirror-view/style/prosemirror.css";
 *    ...
 *    render() {
 *      return html`
 *        <link rel="stylesheet" href=${prosemirrorStyles} />
 *        ...
 *      `;
 *    }
 */

const path = require("path");
const projectRoot = path.resolve(__dirname, "../../../../");
const { rewriteChromeUri, rewriteMozSrcUri } = require("./moz-uri-utils.js");

/**
 * Return an array of the unique chrome:// and moz-src:/// CSS URIs referenced in this file.
 *
 * @param {string} source - The source file to scan.
 * @returns {string[]} Unique list of chrome:// and moz-src:/// CSS URIs
 */
function getReferencedCssUris(source) {
  const cssRegexes = [/chrome:\/\/.*?\.css/g, /moz-src:\/\/\/.*?\.css/g];
  const matches = new Set();
  for (let regex of cssRegexes) {
    for (let match of source.matchAll(regex)) {
      // Add the full URI to the set of matches.
      matches.add(match[0]);
    }
  }
  return [...matches];
}

/**
 * Resolve a CSS URI to a local path and its absolute dependency path.
 *
 * @param {string} cssUri - The CSS URI to resolve.
 * @param {string} resourcePath - The path of the file.
 * @returns {{localPath: string, dependencyPath: string}} The local relative path and absolute dependency path.
 */
function resolveCssUri(cssUri, resourcePath) {
  let localPath = "";
  let dependencyPath = "";

  if (cssUri.startsWith("chrome://")) {
    localPath = rewriteChromeUri(cssUri);
    if (localPath) {
      dependencyPath = path.join(projectRoot, localPath);
    }
  }
  if (cssUri.startsWith("moz-src:///")) {
    const absolutePath = rewriteMozSrcUri(cssUri);
    if (absolutePath) {
      localPath = path.relative(path.dirname(resourcePath), absolutePath);
      // Ensure the path is treated as a relative file and not a package when imported.
      if (!localPath.startsWith(".")) {
        localPath = `./${localPath}`;
      }
      dependencyPath = absolutePath;
    }
  }

  return { localPath, dependencyPath };
}

/**
 * Replace references to chrome:// and moz-src:/// URIs with the relative path
 * on disk from the project root.
 *
 * @this {WebpackLoader} https://webpack.js.org/api/loaders/
 * @param {string} source - The source file to update.
 * @returns {string} The updated source.
 */
async function rewriteCssUris(source) {
  const cssUriToLocalPath = new Map();
  // We're going to rewrite the chrome:// and moz-src:/// URIs, find all referenced URIs.
  let cssDependencies = getReferencedCssUris(source);
  for (let cssUri of cssDependencies) {
    const { localPath, dependencyPath } = resolveCssUri(
      cssUri,
      this.resourcePath
    );
    if (localPath) {
      // Store the mapping to a local path for this URI.
      cssUriToLocalPath.set(cssUri, localPath);
      // Tell webpack the file being handled depends on the referenced file.
      this.addMissingDependency(dependencyPath);
    }
  }
  // Rewrite the source file with mapped chrome:// and moz-src:/// URIs.
  let rewrittenSource = source;
  for (let [cssUri, localPath] of cssUriToLocalPath.entries()) {
    // Generate an import friendly variable name for the default export from
    // the CSS file e.g. __chrome_styles_loader__moztoggleStyles.
    let cssImport = `__chrome_styles_loader__${path
      .basename(localPath, ".css")
      .replaceAll("-", "")}Styles`;

    // MozTextLabel is a special case for now since we don't use a template.
    if (
      path.basename(this.resourcePath) == "moz-label.mjs" ||
      this.resourcePath.endsWith(".js")
    ) {
      rewrittenSource = rewrittenSource.replaceAll(`"${cssUri}"`, cssImport);
    } else {
      rewrittenSource = rewrittenSource.replaceAll(
        cssUri,
        `\$\{${cssImport}\}`
      );
    }

    // Add a CSS import statement as the first line in the file.
    rewrittenSource =
      `import ${cssImport} from "${localPath}";\n` + rewrittenSource;
  }
  return rewrittenSource;
}

/**
 * The WebpackLoader export. Runs async since apparently that's preferred.
 *
 * @param {string} source - The source to rewrite.
 * @param {Map} sourceMap - Source map data, unused.
 * @param {object} meta - Metadata, unused.
 */
module.exports = async function mozUriLoader(source) {
  // Get a callback to tell webpack when we're done.
  const callback = this.async();
  // Rewrite the source async since that appears to be preferred (and will be
  // necessary once we support rewriting CSS/SVG/etc).
  const newSource = await rewriteCssUris.call(this, source);
  // Give webpack the rewritten content.
  callback(null, newSource);
};
