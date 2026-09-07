/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Use Lit's index.all.ts to map lit.all.mjs to types loaded through npm.
 *
 * The `lit/` here will point to the lit module defined in the root devDependencies.
 * lit, @lit/reactive-element and lit-html are mapped to those modules in tools/ts/config/fixed_paths.js
 *
 * Changes (index as an example, but for all the paths):
 *   ./index.js -> lit/index
 *
 * Original: https://github.com/lit/lit/blob/lit@2.5.0/packages/lit/src/index.all.ts
 */

export * from 'lit/index';

export * from 'lit/async-directive';
export * from 'lit/directive-helpers';
export * from 'lit/directive';
export * from 'lit/directives/async-append';
export * from 'lit/directives/async-replace';
export * from 'lit/directives/cache';
export * from 'lit/directives/choose';
export * from 'lit/directives/class-map';
export * from 'lit/directives/guard';
export * from 'lit/directives/if-defined';
export * from 'lit/directives/join';
export * from 'lit/directives/keyed';
export * from 'lit/directives/live';
export * from 'lit/directives/map';
export * from 'lit/directives/range';
export * from 'lit/directives/ref';
export * from 'lit/directives/repeat';
export * from 'lit/directives/style-map';
export * from 'lit/directives/template-content';
export * from 'lit/directives/unsafe-html';
export * from 'lit/directives/unsafe-svg';
export * from 'lit/directives/until';
export * from 'lit/directives/when';
// Any new exports in `packages/lit-html/src/static.ts` need to be added here.
export {
  html as staticHtml,
  literal,
  svg as staticSvg,
  unsafeStatic,
  withStatic,
} from 'lit/static-html';
