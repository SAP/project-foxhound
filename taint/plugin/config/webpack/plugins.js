const { IgnorePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('css-minimizer-webpack-plugin');
const HtmlIncAssetsPlugin = require('html-webpack-include-assets-plugin');
const safePostCssParser = require('postcss-safe-parser');
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const CopyPlugin = require('copy-webpack-plugin');

const paths = require('../paths');
const staticFiles = require('./static-files');

const minifyHtml = {
  removeComments: true,
  collapseWhitespace: true,
  removeRedundantAttributes: true,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  removeStyleLinkTypeAttributes: true,
  keepClosingSlash: true,
  minifyJS: true,
  minifyCSS: true,
  minifyURLs: true,
};


const getPlugins = (isEnvProduction = false, shouldUseSourceMap = false) => {
  /* HTML Plugins for options, panel, options */
  const optionsHtmlPlugin = new HtmlWebpackPlugin(
    Object.assign(
      {},
      {
        title: 'Options',
        chunks: ['options'],
        filename: 'options.html',
        template: paths.optionsTemplate,
      },
      isEnvProduction
        ? {
          minify: minifyHtml,
        }
        : undefined
    )
  );

  const popupHtmlPlugin = new HtmlWebpackPlugin(
    Object.assign(
      {},
      {
        title: 'Popup',
        chunks: ['popup'],
        filename: 'popup.html',
        template: paths.popupTemplate,
      },
      isEnvProduction
        ? {
          minify: minifyHtml,
        }
        : undefined
    )
  );

  const panelHtmlPlugin = new HtmlWebpackPlugin(
    Object.assign(
      {},
      {
        title: 'Panel',
        chunks: ['panel'],
        filename: 'panel.html',
        template: paths.panelTemplate,
      },
      isEnvProduction
        ? {
          minify: minifyHtml,
        }
        : undefined
    )
  );

  const moduleNotFoundPlugin = new ModuleNotFoundPlugin(paths.appPath);
  const caseSensitivePathsPlugin = new CaseSensitivePathsPlugin();
  const miniCssExtractPlugin = new MiniCssExtractPlugin({
    filename: '[name].css',
    // chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
  });
  const ignorePlugin = new IgnorePlugin({resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/});
  const terserPlugin = (compiler) => {
    const TerserPlugin = require('terser-webpack-plugin');
    new TerserPlugin({
      terserOptions: {
        parse: {
          ecma: 8,
        },
        compress: {
          ecma: 5,
          warnings: false,
          comparisons: false,
          inline: 2,
        },
        mangle: {
          safari10: true,
        },
        output: {
          ecma: 5,
          comments: false,
          ascii_only: true,
        },
        sourceMap: shouldUseSourceMap,
      },
      parallel: true,
    }).apply(compiler);
  }
  /*const optimizeCSSAssetsPlugin = new OptimizeCSSAssetsPlugin({
    minimizerOptions: {
      processorOptions: {
        parser: safePostCssParser,
        map: shouldUseSourceMap
            ? {
              inline: false,
              annotation: true,
            }
            : false,
      },
    },
  });*/
    const optimizeCSSAssetsPlugin = new OptimizeCSSAssetsPlugin();
  /* Include these static JS and CSS assets in the generated HTML files */
  const htmlIncAssetsPlugin = new HtmlIncAssetsPlugin({
    append: false,
    assets: staticFiles.htmlAssets,
  });

  const moduleScopePlugin = new ModuleScopePlugin(paths.appSrc, [paths.appPackageJson]);
  const copyPlugin = new CopyPlugin({patterns: staticFiles.copyPatterns});

  return {
    optionsHtmlPlugin,
    popupHtmlPlugin,
    panelHtmlPlugin,
    moduleNotFoundPlugin,
    caseSensitivePathsPlugin,
    miniCssExtractPlugin,
    ignorePlugin,
    terserPlugin,
    optimizeCSSAssetsPlugin,
    moduleScopePlugin,
    copyPlugin,
    htmlIncAssetsPlugin
  };
};

module.exports = getPlugins;


