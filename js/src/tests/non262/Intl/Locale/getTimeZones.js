// |reftest| shell-option(--enable-intl-locale-info) skip-if(!this.hasOwnProperty('Intl')||!this.Intl.Locale.prototype.hasOwnProperty('getTimeZones'))

const regions = [
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

  // List of all macro regions in CLDR 48.
  //
  // Regions with status "macroregion" in <https://github.com/unicode-org/cldr/blob/main/common/validity/region.xml>.
  ...validityData(`
    001~3 005 009 011 013~5 017~9 021 029 030 034~5 039 053~4 057 061
    142~3 145 150~1 154~5
    202
    419
    EU EZ
    QO
    UN
  `),

  "ZZ", // Identifier for the unknown region.
];

const primaryTimeZoneIdentifiers = new Set(Intl.supportedValuesOf("timeZone"));

// Ensure all time zones are sorted alphabetically, don't contain duplicates, and they use their
// canonical name.
for (let region of regions) {
  let timeZones = new Intl.Locale(`und-${region}`).getTimeZones();
  let sorted = [...timeZones].sort();

  assertEqArray(timeZones, sorted);
  assertEq(timeZones.length, new Set(timeZones).size);

  for (let timeZone of timeZones) {
    assertEq(primaryTimeZoneIdentifiers.has(timeZone), true);
  }
}

// "tz" Unicode extensions are ignored.
assertEqArray(new Intl.Locale("fr-FR-u-tz-deber").getTimeZones(), ["Europe/Paris"]);

// Returns |undefined| when no region subtag is present.
assertEq(new Intl.Locale("en").getTimeZones(), undefined);

// Ensure region subtags in transform extension sequences are ignored.
assertEq(new Intl.Locale("en-t-en-US").getTimeZones(), undefined);

if (typeof reportCompare === "function")
  reportCompare(0, 0);
