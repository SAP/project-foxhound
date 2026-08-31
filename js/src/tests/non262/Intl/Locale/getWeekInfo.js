// |reftest| shell-option(--enable-intl-locale-info) skip-if(!this.hasOwnProperty('Intl')||!this.Intl.Locale.prototype.hasOwnProperty('getWeekInfo'))

// Week information from CLDR, search for the <weekData> element in
// <https://github.com/unicode-org/cldr/blob/master/common/supplemental/supplementalData.xml>.

function weekInfo(tag) {
  return new Intl.Locale(tag).getWeekInfo();
}

const Weekday = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const testData = {
  "001": {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  },
  "US": {
    firstDay: Weekday.Sunday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  },
  "DE": {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  },
  "FR": {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  },
  "GB": {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  },
  "MV": {
    firstDay: Weekday.Friday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  },
  "EG": {
    firstDay: Weekday.Saturday,
    weekend: [Weekday.Friday, Weekday.Saturday],
  },
  "CN": {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  },
  "IL": {
    firstDay: Weekday.Sunday,
    weekend: [Weekday.Friday, Weekday.Saturday],
  },
  "IR": {
    firstDay: Weekday.Saturday,
    weekend: [Weekday.Friday],
  },
  "AF": {
    firstDay: Weekday.Saturday,
    weekend: [Weekday.Thursday, Weekday.Friday],
  },
  "IN": {
    firstDay: Weekday.Sunday,
    weekend: [Weekday.Sunday],
  },
};

for (let [region, weekinfo] of Object.entries(testData)) {
  assertDeepEq(weekInfo(`und-${region}`), weekinfo);
}

// "ca" Unicode extensions are not ignored.
//
// https://github.com/tc39/ecma402/issues/1055
{
  let weekinfo = weekInfo("en-US");
  let gregory = weekInfo("en-US-u-ca-gregory");
  let iso8601 = weekInfo("en-US-u-ca-iso8601");

  assertDeepEq(weekinfo, {
    firstDay: Weekday.Sunday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  });
  assertDeepEq(gregory, weekinfo);
  assertDeepEq(iso8601, {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  });
}

// Test large "ca" Unicode extensions.
{
  // The third locale's language tag exceeds |ULOC_KEYWORD_AND_VALUES_CAPACITY|, which causes
  // ICU to create a "bogus" locale (cf. |icu::Locale::isBogus()|).
  //
  // Should we ever enable "ca" Unicode extensions, we must sanitise the input before passing it to
  // ICU to avoid running into these ICU internal limits.

  let one = weekInfo("de-u-ca" + "-aaaaaaaa".repeat(1));
  let ten = weekInfo("de-u-ca" + "-aaaaaaaa".repeat(10));
  let hundred = weekInfo("de-u-ca" + "-aaaaaaaa".repeat(100));

  assertDeepEq(ten, one);
  assertDeepEq(hundred, one);
}

// "rg" Unicode extensions are not ignored.
{
  let weekinfo_en_US = weekInfo("en-US");
  let weekinfo_en_GB = weekInfo("en-GB");
  let weekinfo = weekInfo("en-US-u-rg-gbzzzz");

  assertDeepEq(weekinfo_en_US, {
    firstDay: Weekday.Sunday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  });
  assertDeepEq(weekinfo_en_GB, {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  });
  assertDeepEq(weekinfo, weekinfo_en_GB);
}

// "sd" Unicode extensions are not ignored.
{
  let weekinfo_en_US = weekInfo("en-US");
  let weekinfo_en_GB = weekInfo("en-GB");
  let weekinfo = weekInfo("en-u-sd-gbzzzz");

  assertDeepEq(weekinfo_en_US, {
    firstDay: Weekday.Sunday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  });
  assertDeepEq(weekinfo_en_GB, {
    firstDay: Weekday.Monday,
    weekend: [Weekday.Saturday, Weekday.Sunday],
  });
  assertDeepEq(weekinfo, weekinfo_en_GB);
}

// "fw" Unicode extensions are not ignored.
{
  let weekinfo_en_US = weekInfo("en-US");
  let weekinfo_en_GB = weekInfo("en-GB");
  let weekinfo = weekInfo("en-US-u-fw-mon");

  assertDeepEq(weekinfo_en_US, {
   firstDay: Weekday.Sunday,
   weekend: [Weekday.Saturday, Weekday.Sunday],
  });
  assertDeepEq(weekinfo_en_GB, {
   firstDay: Weekday.Monday,
   weekend: [Weekday.Saturday, Weekday.Sunday],
  });
  assertDeepEq(weekinfo, weekinfo_en_GB);
}

// All possible calendars from <https://github.com/unicode-org/cldr/blob/master/common/bcp47/calendar.xml>.
const calendars = [
  "buddhist",
  "chinese",
  "coptic",
  "dangi",
  "ethioaa",
  "ethiopic-amete-alem",
  "ethiopic",
  "gregory",
  "hebrew",
  "indian",
  "islamic",
  "islamic-umalqura",
  "islamic-tbla",
  "islamic-civil",
  "islamic-rgsa",
  // "iso8601",  // ISO-8601 calendar changes first day of week.
  "japanese",
  "persian",
  "roc",
  "islamicc",
];

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

// Test all Unicode calendar extension on all regions.
for (let region of regions) {
  let map = new Map();
  for (let calendar of calendars) {
    let weekinfo = weekInfo(`und-${region}-u-ca-${calendar}`);

    let key = JSON.stringify(weekinfo);
    if (!map.has(key)) {
      map.set(key, {weekinfo, calendars: []});
    }
    map.get(key).calendars.push(calendar);
  }

  // All weekInfo objects must have the same content.
  assertEq(map.size, 1, "unexpected weekInfo elements");
}

if (typeof reportCompare === "function")
  reportCompare(0, 0);
