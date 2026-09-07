// |reftest| shell-option(--enable-intl-locale-info) skip-if(!this.hasOwnProperty('Intl')||!this.Intl.Locale.prototype.hasOwnProperty('getHourCycles'))

// Hour cycle information from CLDR, search for the <timeData> element in
// <https://github.com/unicode-org/cldr/blob/master/common/supplemental/supplementalData.xml>.

function hourCycles(tag) {
  return new Intl.Locale(tag).getHourCycles();
}

// Unknown language, script, and region should all give the same results.
assertEqArray(hourCycles("und"), ["h12", "h23"]);
assertEqArray(hourCycles("und-ZZ"), ["h23"]);
assertEqArray(hourCycles("und-Zzzz"), ["h12", "h23"]);
assertEqArray(hourCycles("und-Zzzz-ZZ"), ["h23"]);

// Simple tests using "en".
assertEqArray(hourCycles("en"), ["h12", "h23"]);
assertEqArray(hourCycles("en-US"), ["h12", "h23"]);
assertEqArray(hourCycles("en-ZZ"), ["h23"]);
assertEqArray(hourCycles("en-GB"), ["h23", "h12"]);

// Simple tests using "de".
assertEqArray(hourCycles("de"), ["h23", "h12"]);
assertEqArray(hourCycles("de-DE"), ["h23", "h12"]);
assertEqArray(hourCycles("de-ZZ"), ["h23"]);

// Locales without multiple additional allowed hour cycles.
assertEqArray(hourCycles("und-DK"), ["h23"]);
assertEqArray(hourCycles("da-DK"), ["h23"]);

// Locales with more than two additional allowed hour cycles.
assertEqArray(hourCycles("und-JP"), ["h23", "h11", "h12"]);
assertEqArray(hourCycles("ja-JP"), ["h23", "h11", "h12"]);

// Locales where preferred hour cycle doesn't match first allowed hour cycle.
assertEqArray(hourCycles("und-IR"), ["h23", "h12"]);
assertEqArray(hourCycles("fa-IR"), ["h23", "h12"]);

// Locales where language changes the preferred hour cycle.
assertEqArray(hourCycles("und-CA"), ["h12", "h23"]);
assertEqArray(hourCycles("en-CA"), ["h12", "h23"]);
assertEqArray(hourCycles("fr-CA"), ["h23", "h12"]);

// Region "001" has language overrides, too.
assertEqArray(hourCycles("und-001"), ["h23", "h12"]);
assertEqArray(hourCycles("en-001"), ["h12", "h23"]);
assertEqArray(hourCycles("ar-001"), ["h12", "h23"]);

const regions = [
  "001", // UN M.49 code for the World.

  // List of all regular regions in CLDR 48.
  //
  // Regions with status "regular" in <https://github.com/unicode-org/cldr/blob/main/common/validity/region.xml>.
  ...validityData(`
    AC~G AI AL~M AO AQ~U AW~X AZ
    BA~B BD~J BL~O BQ~T BV~W BY~Z
    CA CC~D CF~I CK~R CU~Z
    DE DG DJ~K DM DO DZ
    EA EC EE EG~H ER~T
    FI~K FM FO FR
    GA~B GD~I GL~N GP~U GW GY
    HK HM~N HR HT~U
    IC~E IL~O IQ~T
    JE JM JO~P
    KE KG~I KM~N KP KR KW KY~Z
    LA~C LI LK LR~V LY
    MA MC~H MK~Z
    NA NC NE~G NI NL NO~P NR NU NZ
    OM
    PA PE~H PK~N PR~T PW PY
    QA
    RE RO RS RU RW
    SA~E SG~O SR~T SV SX~Z
    TA TC~D TF~H TJ~O TR TT TV~W TZ
    UA UG UM US UY~Z
    VA VC VE VG VI VN VU
    WF WS
    XK
    YE YT
    ZA ZM ZW
  `),

  "ZZ", // Identifier for the unknown region.
];

// Smoke test using some regions.
for (let region of regions) {
  assertEq(hourCycles(`und-${region}`).length > 0, true);
}

if (typeof reportCompare === "function")
  reportCompare(0, 0);
