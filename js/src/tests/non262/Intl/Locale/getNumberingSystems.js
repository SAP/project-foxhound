// |reftest| shell-option(--enable-intl-locale-info) skip-if(!this.hasOwnProperty('Intl')||!this.Intl.Locale.prototype.hasOwnProperty('getNumberingSystems'))

// Numbering system information from CLDR, search for the <defaultNumberingSystem> element in
// <https://github.com/unicode-org/cldr/blob/master/common/main>.

function numSystems(tag) {
  return new Intl.Locale(tag).getNumberingSystems();
}

// Unknown language, script, and region should all give the same results.
assertEqArray(numSystems("und"), ["latn"]);
assertEqArray(numSystems("und-ZZ"), ["latn"]);
assertEqArray(numSystems("und-Zzzz"), ["latn"]);
assertEqArray(numSystems("und-Zzzz-ZZ"), ["latn"]);

// Ensure "default", "native", "traditional" and "finance" numbering system
// identifiers aren't resolved and instead are returned as-is.
assertEqArray(numSystems("en-u-nu-default"), ["default"]);
assertEqArray(numSystems("en-u-nu-native"), ["native"]);
assertEqArray(numSystems("en-u-nu-traditio"), ["traditio"]);
assertEqArray(numSystems("en-u-nu-finance"), ["finance"]);

assertEqArray(numSystems("ja-u-nu-default"), ["default"]);
assertEqArray(numSystems("ja-u-nu-native"), ["native"]);
assertEqArray(numSystems("ja-u-nu-traditio"), ["traditio"]);
assertEqArray(numSystems("ja-u-nu-finance"), ["finance"]);

// Test some locales.
assertEqArray(numSystems("en"), ["latn"]);
assertEqArray(numSystems("de"), ["latn"]);
assertEqArray(numSystems("ar"), ["latn"]);
assertEqArray(numSystems("fa"), ["arabext"]);
assertEqArray(numSystems("as"), ["beng"]);
assertEqArray(numSystems("ccp"), ["cakm"]);
assertEqArray(numSystems("my"), ["mymr"]);
assertEqArray(numSystems("sat"), ["olck"]);
assertEqArray(numSystems("dz"), ["tibt"]);

// Script subtag may cause to select a different numbering system.
assertEqArray(numSystems("ff"), ["latn"]);
assertEqArray(numSystems("ff-Adlm"), ["adlm"]);

// Region subtag may cause to select a different numbering system.
assertEqArray(numSystems("ar"), ["latn"]);
assertEqArray(numSystems("ar-SA"), ["arab"]);
assertEqArray(numSystems("ar-TN"), ["latn"]);

if (typeof reportCompare === "function")
  reportCompare(0, 0);
