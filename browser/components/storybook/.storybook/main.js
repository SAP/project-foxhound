/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* eslint-env node */

const path = require("path");
const projectRoot = path.resolve(__dirname, "../../../../");

// ./mach environment --format json
// topobjdir should be the build location

module.exports = {
  stories: [
    "../**/*.stories.md",
    "../stories/**/*.stories.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx|md)",
    `${projectRoot}/toolkit/**/*.stories.@(js|jsx|mjs|ts|tsx)`,
  ],
  // Additions to the staticDirs might also need to get added to
  // MozXULElement.importCss in preview.mjs to enable auto-reloading.
  staticDirs: [
    `${projectRoot}/toolkit/content/widgets/`,
    `${projectRoot}/browser/themes/shared/`,
  ],
  addons: [
    "@storybook/addon-links",
    {
      name: "@storybook/addon-essentials",
      options: {
        backgrounds: false,
        measure: false,
        outline: false,
      },
    },
    "@storybook/addon-a11y",
  ],
  framework: "@storybook/web-components",
  webpackFinal: async (config, { configType }) => {
    // `configType` has a value of 'DEVELOPMENT' or 'PRODUCTION'
    // You can change the configuration based on that.
    // 'PRODUCTION' is used when building the static version of storybook.

    // Make whatever fine-grained changes you need
    config.resolve.alias.browser = `${projectRoot}/browser`;
    config.resolve.alias.toolkit = `${projectRoot}/toolkit`;
    config.resolve.alias[
      "toolkit-widgets"
    ] = `${projectRoot}/toolkit/content/widgets/`;
    config.resolve.alias[
      "lit.all.mjs"
    ] = `${projectRoot}/toolkit/content/widgets/vendor/lit.all.mjs`;
    // @mdx-js/react@1.x.x versions don't get hoisted to the root node_modules
    // folder due to the versions of React it accepts as a peer dependency. That
    // means we have to go one level deeper and look in the node_modules of
    // @storybook/addon-docs, which depends on @mdx-js/react.
    config.resolve.alias["@mdx-js/react"] =
      "browser/components/storybook/node_modules/@storybook/addon-docs/node_modules/@mdx-js/react";

    // The @storybook/web-components project uses lit-html. Redirect it to our
    // bundled version.
    config.resolve.alias["lit-html/directive-helpers.js"] = "lit.all.mjs";
    config.resolve.alias["lit-html"] = "lit.all.mjs";

    config.module.rules.push({
      test: /\.ftl$/,
      type: "asset/source",
    });

    config.module.rules.push({
      test: /\.mjs/,
      loader: path.resolve(__dirname, "./chrome-uri-loader.js"),
    });

    // We're adding a rule for files matching this pattern in order to support
    // writing docs only stories in plain markdown.
    const MD_STORY_REGEX = /(stories|story)\.md$/;

    // Find the existing rule for MDX stories.
    let mdxStoryTest = /(stories|story)\.mdx$/.toString();
    let mdxRule = config.module.rules.find(
      rule => rule.test.toString() === mdxStoryTest
    );

    // Use a custom Webpack loader to transform our markdown stories into MDX,
    // then run our new MDX through the same loaders that Storybook usually uses
    // for MDX files. This is how we get a docs page from plain markdown.
    config.module.rules.push({
      test: MD_STORY_REGEX,
      use: [
        ...mdxRule.use,
        { loader: path.resolve(__dirname, "./markdown-story-loader.js") },
      ],
    });

    // Find the existing rule for markdown files.
    let markdownTest = /\.md$/.toString();
    let markdownRuleIndex = config.module.rules.findIndex(
      rule => rule.test.toString() === markdownTest
    );
    let markdownRule = config.module.rules[markdownRuleIndex];

    // Modify the existing markdown rule so it doesn't process .stories.md
    // files, but still treats any other markdown files as asset/source.
    config.module.rules[markdownRuleIndex] = {
      ...markdownRule,
      exclude: MD_STORY_REGEX,
    };

    config.optimization = {
      splitChunks: false,
      runtimeChunk: false,
      sideEffects: false,
      usedExports: false,
      concatenateModules: false,
      minimizer: [],
    };

    // Return the altered config
    return config;
  },
  core: {
    builder: "webpack5",
  },
};
