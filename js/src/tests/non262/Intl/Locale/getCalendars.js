// |reftest| shell-option(--enable-intl-locale-info) skip-if(!this.hasOwnProperty('Intl')||!this.Intl.Locale.prototype.hasOwnProperty('getCalendars'))

// Calendar preference information from CLDR, search for the <calendarPreferenceData> element in
// <https://github.com/unicode-org/cldr/blob/master/common/supplemental/supplementalData.xml>.

function calendars(tag) {
  return new Intl.Locale(tag).getCalendars();
}

// Unknown language, script, and region should all give the same results.
assertEqArray(calendars("und"), ["gregory"]);
assertEqArray(calendars("und-ZZ"), ["gregory"]);
assertEqArray(calendars("und-Zzzz"), ["gregory"]);
assertEqArray(calendars("und-Zzzz-ZZ"), ["gregory"]);

// Simple tests using "en".
assertEqArray(calendars("en"), ["gregory"]);
assertEqArray(calendars("en-US"), ["gregory"]);
assertEqArray(calendars("en-ZZ"), ["gregory"]);

// Simple tests using "de".
assertEqArray(calendars("de"), ["gregory"]);
assertEqArray(calendars("de-DE"), ["gregory"]);
assertEqArray(calendars("de-ZZ"), ["gregory"]);

// Test region "001".
assertEqArray(calendars("und-001"), ["gregory"]);
assertEqArray(calendars("en-001"), ["gregory"]);
assertEqArray(calendars("ar-001"), ["gregory"]);

// Locales which don't use just the Gregorian calendar.
assertEqArray(calendars("und-CN"), ["gregory", "chinese"]);
assertEqArray(calendars("und-EG"), ["gregory", "coptic", "islamic-civil", "islamic-tbla"]);
assertEqArray(calendars("und-ET"), ["gregory", "ethiopic"]);
assertEqArray(calendars("und-IL"), ["gregory", "hebrew", "islamic-civil", "islamic-tbla"]);
assertEqArray(calendars("und-IN"), ["gregory", "indian"]);
assertEqArray(calendars("und-IR"), ["persian", "gregory", "islamic-civil", "islamic-tbla"]);
assertEqArray(calendars("und-JP"), ["gregory", "japanese"]);
assertEqArray(calendars("und-KR"), ["gregory", "dangi"]);
assertEqArray(calendars("und-SA"), ["gregory", "islamic-umalqura"]);
assertEqArray(calendars("und-TH"), ["buddhist", "gregory"]);
assertEqArray(calendars("und-TW"), ["gregory", "roc", "chinese"]);

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
  assertEq(calendars(`und-${region}`).length > 0, true);
}

if (typeof reportCompare === "function")
  reportCompare(0, 0);
