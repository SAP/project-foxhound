// |reftest| shell-option(--enable-legacy-regexp) skip-if(release_or_beta||!xulRuntime.shell) -- legacy-regexp is not released yet, requires shell-options
/*
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/licenses/publicdomain/
 */

// SKIP test262 export
// This test verifies that RegExp legacy static properties match TC39's expected
// attributes: non-enumerable and configurable.
// See: https://github.com/tc39/proposal-regexp-legacy-features

// Reset RegExp.leftContext to the empty string.
/x/.test('x');

var d = Object.getOwnPropertyDescriptor(RegExp, "leftContext");
assertEq(d.set, undefined);
assertEq(typeof d.get, "function");
let regexpLegacyFeatures = getPrefValue('experimental.legacy_regexp');
assertEq(d.enumerable, !regexpLegacyFeatures);
assertEq(d.configurable, regexpLegacyFeatures);
assertEq(d.get.call(RegExp), "");

reportCompare(0, 0, "ok");
