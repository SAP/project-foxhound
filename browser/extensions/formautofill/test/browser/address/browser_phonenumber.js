/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(3);

// ISSUE 1:
// When an address is saved from the Add/Edit Address dialog, if the phone number's country code
// does not match the selected country, the phone fields are not saved correctly. Here are some
// examples of what is saved:
//
// If a North American phone number is saved with a North American country, the fields
// are saved as follows, which are correct:
//   "tel-country-code":"+1",
//   "tel-national":"6475559216",
//   "tel-area-code":"647",
//   "tel-local":"5559216",
//   "tel-local-prefix":"555",
//   "tel-local-suffix":"9216"
// If a non-North American phone number is saved with a North American country, the
// country code is not assigned, and the tel-national is set to the entire phone number.
// tel-national should not include the country code. For example, this might be saved:
//   "tel-national":"+34123456789"
// but should be:
//   "tel-country-code":"+34",
//   "tel-national":"123456789",
// Here is an example for Spain, where the phone number matches the country:
//   "tel-country-code":"+34",
//   "tel-national":"679900123",
// However, if the country differs, as above, the country-code is empty and the entire
// phone number is stored in tel-national:
//   "tel-national":"+3345678912"

let profiles = {
  ADDRESS_US_LOCAL: {
    "given-name": "John",
    "family-name": "Smith",
    "tel-country-code": "1",
    "tel-national": "6172535702",
    country: "US",
  },
  ADDRESS_US_REMOTE: {
    "given-name": "John",
    "family-name": "Smith",
    "tel-country-code": "49",
    "tel-national": "30983333000",
    country: "US",
  },
  ADDRESS_DE_LOCAL: {
    "given-name": "John",
    "family-name": "Smith",
    "tel-country-code": "49",
    "tel-national": "30983333001",
    country: "DE",
  },
  ADDRESS_DE_REMOTE: {
    "given-name": "John",
    "family-name": "Smith",
    "tel-country-code": "33",
    "tel-national": "34564947391",
    country: "DE",
  },
  ADDRESS_US_LOCAL_WITH_EXTENSION: {
    "given-name": "John",
    "family-name": "Smith",
    "tel-country-code": "1",
    "tel-national": "6172535703x987",
    country: "US",
  },
};

let forms = [
  // The next three tests have a phone number dropdown for the country code with values
  // of the form +XX. The following input field has autocomplete='tel' so it should
  // be filled in with the full phone number including country code.
  //
  // ISSUE 2: when autocomplete="tel" is used, and there is a country field before it,
  // we could attempt to autocorrect this to autocomplete="tel-national".
  {
    description:
      "dropdown for country, values of form '+XX', input field with autocomplete='tel'",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <select id="phone_country_select">
                    <option value="-">Unknown
                    <option value="+33">France
                    <option value="+49">Germany
                    <option value="+30">Greece
                    <option value="+1">United States
                  </select>
                  <input id="tel" autocomplete="tel">
                </form>`,
    results: {
      ADDRESS_US_LOCAL: { "tel-country-code": "+1", tel: "*+16172535702" },
      ADDRESS_US_REMOTE: { "tel-country-code": "+49", tel: "*+4930983333000" },
      ADDRESS_DE_LOCAL: { "tel-country-code": "+49", tel: "*+4930983333001" },
      // ISSUE 3:
      // This is incorrect, the country code is already part of the phone number,
      // but it is being applied twice. The result should be:
      //      ADDRESS_DE_REMOTE: { "tel-country-code": "+33", tel: "*+3334564947391" },
      // This same issue affects a number of the remaining tests.
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        tel: "*+493334564947391",
      },
    },
  },
  {
    // ISSUE 4:
    // Constrast this test to the previous test that detects the dropdown as 'country'
    // but here as 'tel-country-code', even though the only difference is the label of
    // one of the countries.
    // The country here is labelled as 'US' but we only match the exact string 'United States'.
    // We should either allow additional forms of the country name or look for more matching
    // strings in the other options. This situation is handled by the special country check
    // in inferFieldInfo(), which only looks for the last two options and assumes that these
    // last two must match a country. Probably, we should not do that check at all if we think
    // this will be a tel-country-code field.
    // This was fixed by bug 1999525.
    description:
      "dropdown for country, values of form '+XX', but with an alternate name for the country",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <select id="phone_country_select">
                    <option value="-">Unknown
                    <option value="+33">France
                    <option value="+49">Germany
                    <option value="+30">Greece
                    <option value="+1">US
                  </select>
                  <input id="tel" autocomplete="tel">
                </form>`,
    results: {
      ADDRESS_US_LOCAL: { "tel-country-code": "+1", tel: "*+16172535702" },
      ADDRESS_US_REMOTE: { "tel-country-code": "+49", tel: "*+4930983333000" },
      ADDRESS_DE_LOCAL: { "tel-country-code": "+49", tel: "*+4930983333001" },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        tel: "*+493334564947391",
      },
    },
  },
  {
    description:
      "dropdown for country, values of form '+XX', but missing the desired country",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <select id="phone_country_select">
                    <option value="-">Unknown
                    <option value="+33">France
                    <option value="+30">Greece
                  </select>
                  <input id="tel" autocomplete="tel">
                </form>`,
    results: {
      ADDRESS_US_LOCAL: { "tel-country-code": "", tel: "*+16172535702" },
      ADDRESS_US_REMOTE: { "tel-country-code": "", tel: "*+4930983333000" },
      ADDRESS_DE_LOCAL: { "tel-country-code": "", tel: "*+4930983333001" },
      ADDRESS_DE_REMOTE: { "tel-country-code": "", tel: "*+493334564947391" },
    },
  },

  // Next, a similar test but without the + prefix in the value.
  {
    description:
      "dropdown for country, values of form 'XX', input field with autocomplete='tel'",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <select id="phone_country_select">
                    <option value="-">Unknown
                    <option value="33">France
                    <option value="49">Germany
                    <option value="30">Greece
                    <option value="1">United States
                  </select>
                  <input id="tel" autocomplete="tel">
                </form>`,
    results: {
      ADDRESS_US_LOCAL: { "tel-country-code": "1", tel: "*+16172535702" },
      ADDRESS_US_REMOTE: { "tel-country-code": "49", tel: "*+4930983333000" },
      ADDRESS_DE_LOCAL: { "tel-country-code": "49", tel: "*+4930983333001" },
      ADDRESS_DE_REMOTE: { "tel-country-code": "49", tel: "*+493334564947391" },
    },
  },

  // This test is similar, but autocomplete='tel-country-code' is used on the dropdown
  // instead.
  {
    description:
      "dropdown for country, values of form '+XX', dropdown with autocomplete='tel-country-code'",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <select id="phone_country_select" autocomplete="tel-country-code">
                    <option value="-">Unknown
                    <option value="+33">France
                    <option value="+49">Germany
                    <option value="+30">Greece
                    <option value="+1">United States
                  </select>
                  <input id="tel">
                </form>`,
    results: {
      // Interestingly, this is being detected as a 'tel' field but is treated
      // as 'tel-national' when filled in:
      ADDRESS_US_LOCAL: {
        "tel-country-code": "*+1",
        "tel-national": "@6172535702",
      },
      // ISSUE 5:
      // The 'tel' field has a '0' prepended.
      ADDRESS_US_REMOTE: {
        "tel-country-code": "*+49",
        "tel-national": "@030983333000",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "*+49",
        "tel-national": "@030983333001",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "*+49",
        "tel-national": "@03334564947391",
      },
    },
  },
  // This test has no autocomplete attributes.
  {
    description:
      "dropdown for country, values of form '+XX', no autocomplete attributes",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <select id="phone_country_select">
                    <option value="-">Unknown
                    <option value="+33">France
                    <option value="+49">Germany
                    <option value="+30">Greece
                    <option value="+1">United States
                  </select>
                  <input id="tel">
                </form>`,
    results: {
      ADDRESS_US_LOCAL: {
        "tel-country-code": "+1",
        "tel-national": "@6172535702",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@030983333000",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "+49",
        "tel-national": "@030983333001",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@03334564947391",
      },
    },
  },

  // This next two tests have two input fields instead of a dropdown, and
  // both input fields have autocomplete attributes.
  {
    description: "input field for country, with two autocomplete attributes",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="co" autocomplete="tel-country-code">
                  <input id="tel" autocomplete="tel">
                  </form>`,
    results: {
      ADDRESS_US_LOCAL: { "tel-country-code": "*+1", tel: "*+16172535702" },
      ADDRESS_US_REMOTE: { "tel-country-code": "*+49", tel: "*+4930983333000" },
      ADDRESS_DE_LOCAL: { "tel-country-code": "*+49", tel: "*+4930983333001" },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "*+49",
        tel: "*+493334564947391",
      },
    },
  },
  {
    description:
      "input field for country, with two autocomplete attributes, using tel-national",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="co" autocomplete="tel-country-code">
                  <input id="tel" autocomplete="tel-national">
                  </form>`,
    results: {
      ADDRESS_US_LOCAL: {
        "tel-country-code": "*+1",
        "tel-national": "*6172535702",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "*+49",
        "tel-national": "*030983333000",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "*+49",
        "tel-national": "*030983333001",
      },
      ADDRESS_DE_REMOTE: {
        // ISSUE 6: the country code should be +33 and the tel-national
        // should be 34564947391.
        "tel-country-code": "*+49",
        "tel-national": "*03334564947391",
      },
    },
  },
  // The following tests do not use autocomplete attributes, to demonstrate different
  // matching.
  {
    description:
      "input field for country and phone, no autocomplete attributes, variant 1",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="country-tel">
                  <input id="phone">
                  </form>`,
    results: {
      ADDRESS_US_LOCAL: {
        "tel-country-code": "+1",
        "tel-national": "@6172535702",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@030983333000",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "+49",
        "tel-national": "@030983333001",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@03334564947391",
      },
    },
  },
  // ISSUE 7:
  // In this test, despite phone-country being in the expression list for
  // tel-country-code, the 'tel' expression overrides it, so we end up with
  // two 'tel' fields. We should probably match 'tel-country-code' before 'tel'.
  // This issue was fixed by bug 1914361.
  {
    description:
      "input field for country and phone, no autocomplete attributes, variant 2",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="phone-country">
                  <input id="phone">
                  </form>`,
    results: {
      ADDRESS_US_LOCAL: {
        "tel-country-code": "+1",
        "tel-national": "@6172535702",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@030983333000",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "+49",
        "tel-national": "@030983333001",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@03334564947391",
      },
    },
  },
  // ISSUE 8:
  // In this test, the country-code matches country, and doesn't seem to match
  // tel-country-code at all.
  // This issue was fixed by bug 1914361.
  {
    description:
      "input field for country and phone, no autocomplete attributes, variant 3",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="tel-country">
                  <input id="tel">
                  <input id="country">
                  </form>`,
    results: {
      // ISSUE 9: Unrelated to phone numbers, but it would be expected that
      // "United States" and "Germany" would be filled in here for the country
      // instead of the country abbreviations.
      ADDRESS_US_LOCAL: {
        "tel-country-code": "+1",
        "tel-national": "@6172535702",
        country: "US",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@030983333000",
        country: "US",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "+49",
        "tel-national": "@030983333001",
        country: "DE",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@03334564947391",
        country: "DE",
      },
    },
  },

  {
    description:
      "four input fields with autocomplete set to the different parts of a telephone number",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="t1" autocomplete="tel-country-code">
                  <input id="t2" autocomplete="tel-area-code">
                  <input id="t3" autocomplete="tel-local-prefix">
                  <input id="t4" autocomplete="tel-local-suffix">
                </form>`,
    results: {
      // ISSUE 10:
      // Splitting the phone number up into parts is only supported for North American
      // phone numbers. The tel-area-code, tel-local, tel-local-prefix and tel-local-suffix
      // fields are not assigned, nor can be filled in. Fixing this will require knowledge
      // and analysis of the phone number format for different regions, however several
      // non-North American sites have been found that ask for the area code, for example
      // the sites in bugs 1755497 (Germany) and 1938072 (Indonesia). Chrome is able to
      // split non-North American phone numbers into component parts to some degree.
      ADDRESS_US_LOCAL: {
        "tel-country-code": "*+1",
        "tel-area-code": "*617",
        "tel-local-prefix": "*253",
        "tel-local-suffix": "*5702",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "*+49",
        "tel-area-code": "*",
        "tel-local-prefix": "*",
        "tel-local-suffix": "*",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "*+49",
        "tel-area-code": "*",
        "tel-local-prefix": "*",
        "tel-local-suffix": "*",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "*+49",
        "tel-area-code": "*",
        "tel-local-prefix": "*",
        "tel-local-suffix": "*",
      },
    },
  },
  {
    description:
      "four input fields for the different parts of a telephone number without autocomplete attributes, variant 1",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="phone-country-code">
                  <input id="phone-area-code">
                  <input id="phone-local-prefix">
                  <input id="phone-local-suffix">
                </form>`,
    results: {
      // The fields here are all matching as type 'tel' and then _parsePhoneFields is
      // modifying them to be specific telephone fields.
      ADDRESS_US_LOCAL: {
        "tel-country-code": "+1",
        "tel-area-code": "@617",
        "tel-local-prefix": "@253",
        "tel-local-suffix": "@5702",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "+49",
        "tel-area-code": "@",
        "tel-local-prefix": "@",
        "tel-local-suffix": "@",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "+49",
        "tel-area-code": "@",
        "tel-local-prefix": "@",
        "tel-local-suffix": "@",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        "tel-area-code": "@",
        "tel-local-prefix": "@",
        "tel-local-suffix": "@",
      },
    },
  },
  // This version is similar to the last test but uses 'tel' in the ids rather than 'phone'.
  {
    description:
      "four input fields for the different parts of a telephone number without autocomplete attributes, variant 2",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="tel-country-code">
                  <input id="tel-area-code">
                  <input id="tel-local-prefix">
                  <input id="tel-local-suffix">
                </form>`,
    results: {
      // ISSUE 11:
      // Just changing the ids here to include 'tel' rather than 'phone' as in the previous test
      // makes it so that they don't match any field. This actually applies to any tel field, except
      // tel-country-code which there is a rule to match.
      ADDRESS_US_LOCAL: { "tel-country-code": "+1" },
      ADDRESS_US_REMOTE: { "tel-country-code": "+49" },
      ADDRESS_DE_LOCAL: { "tel-country-code": "+49" },
      ADDRESS_DE_REMOTE: { "tel-country-code": "+49" },
    },
  },
  {
    description:
      "four input fields for the different parts of a telephone number without autocomplete attributes, variant 3 with maxlength attributes",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="phone-country-code" maxlength="3">
                  <input id="phone-area-code" maxlength="3">
                  <input id="phone-local-prefix" maxlength="3">
                  <input id="phone-local-suffix" maxlength="5">
                </form>`,
    results: {
      // These do not match the grammar in PHONE_FIELD_GRAMMARS so they are all
      // treated as 'tel' fields, but the values are cropped due to the maxlength
      // attributes.
      // ISSUE 12: why does tel2 have the value "617" and not "61725" as its maxlength is 5?
      ADDRESS_US_LOCAL: {
        "tel-country-code": "+1",
        "tel-national": "@617",
        tel: "617",
        tel2: "617",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@030",
        tel: "030",
        tel2: "030",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "+49",
        "tel-national": "@030",
        tel: "030",
        tel2: "030",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@033",
        tel: "033",
        tel2: "033",
      },
    },
  },
  {
    description:
      "three input fields, autocomplete='tel-country-code', autocomplete='tel-local' and autocomplete='tel-extension'",
    fixtureData: `<form>
                  <input id="firstname">
                  <input id="lastname">
                  <input id="tcc" autocomplete="tel-country-code"/>
                  <input id="tel" autocomplete="tel-local"/>
                  <input id="ext" autocomplete="tel-extension"/>
                </form>`,
    results: {
      // ISSUE 13:
      // Although there is some support for recognizing tel-extension fields in _parsePhoneFields,
      // there isn't any means to enter or recognize them in the address editing UI, so extensions
      // never get filled in. However, it doesn't appear that other browsers support phone
      // extensions either, so this is a low priority.
      ADDRESS_US_LOCAL: {
        "tel-country-code": "*+1",
        "tel-local": "*2535702",
        "tel-extension": "*",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "*+49",
        "tel-local": "*",
        "tel-extension": "*",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "*+49",
        "tel-local": "*",
        "tel-extension": "*",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "*+49",
        "tel-local": "*",
        "tel-extension": "*",
      },
      ADDRESS_US_LOCAL_WITH_EXTENSION: {
        "tel-country-code": "*",
        "tel-local": "*",
        "tel-extension": "*",
      },
    },
  },
  {
    description: "three input fields, based on testcase from bug 1935701",
    fixtureData: `<form>
                    <input id="firstname">
                    <input id="lastname">
                    <input id="postalcode">
                    <input type="tel" id="tel1" id="tel1" size="11" maxlength="12" placeholder="000">
                    -
                    <input type="tel" id="tel2" id="tel2" size="11" maxlength="8" placeholder="0000">
                    -
                    <input type="tel" id="tel3" id="tel3" size="11" maxlength="8" placeholder="0000">
                </form>`,
    results: {
      // ISSUE 14:
      // The telephone fields are not detected at all. This was fixed by 1935980.
      ADDRESS_US_LOCAL: {
        "postal-code": "",
        tel1: "6172535702",
        tel2: "6172535702",
        tel3: "6172535702",
      },
      ADDRESS_US_REMOTE: {
        "postal-code": "",
        tel1: "030983333000",
        tel2: "030983333000",
        tel3: "030983333000",
      },
      ADDRESS_DE_LOCAL: {
        "postal-code": "",
        tel1: "030983333001",
        tel2: "030983333001",
        tel3: "030983333001",
      },
      ADDRESS_DE_REMOTE: {
        "postal-code": "",
        tel1: "033345649473",
        tel2: "033345649473",
        tel3: "033345649473",
      },
    },
  },
  {
    // ISSUE 15: if the regular expression in the pattern is invalid, an error can occur
    // in telTransformer()
    description:
      "two input fields, Spanish labels, based on testcase from bug 1914361",
    fixtureData: `<form>
                    <input id="firstname">
                    <input id="lastname">
                    <label for="phoneprefix">Prefijo</label>
                    <input placeholder=" " id="phoneprefix" name="phoneprefix"
                           pattern="^\\+[0-9]{2,3}$" autocomplete="off">
                    <label for="phonenumber">Teléfono</label>
                    <input placeholder=" " maxlength="20" type="text" id="phonenumber" name="phonenumber"
                           pattern="^[679]{1}[0-9]{8}$">
                </form>`,
    results: {
      // ISSUE 16: the telephone fields should be treated as tel-country-code and tel-national.
      // This was fixed by bug 1999525.
      ADDRESS_US_LOCAL: {
        "tel-country-code": "+1",
        "tel-national": "@6172535702",
      },
      ADDRESS_US_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@030983333000",
      },
      ADDRESS_DE_LOCAL: {
        "tel-country-code": "+49",
        "tel-national": "@030983333001",
      },
      ADDRESS_DE_REMOTE: {
        "tel-country-code": "+49",
        "tel-national": "@03334564947391",
      },
    },
  },
  {
    description:
      "two input fields, German labels, based on testcase from bug 1755497",
    fixtureData: `<form>
                    <input id="firstname">
                    <input id="lastname">
                    <input id="areaCode" type="tel" placeholder="Vorwahl"
                            autocomplete="tel-area-code" maxlength="5">
                    <label for="areaCode">Vorwahl</label>
                    <input id="phoneNumber" type="tel" placeholder="Telefonnummer"
                           autocomplete="tel-local" maxlength="9">
                    <label for="phoneNumber">Telefonnummer</label>
                </form>`,
    results: {
      // ISSUE 17: as with the earlier test, tel-area-code and tel-local
      // are not supported in Germany.
      ADDRESS_US_LOCAL: { "tel-area-code": "*617", "tel-local": "*2535702" },
      ADDRESS_US_REMOTE: { "tel-area-code": "*", "tel-local": "*" },
      ADDRESS_DE_LOCAL: { "tel-area-code": "*", "tel-local": "*" },
      ADDRESS_DE_REMOTE: { "tel-area-code": "*", "tel-local": "*" },
    },
  },
];

// We could also test a profile which just had a 'tel field. Running these tests
// with this change appears to work correctly.
//function unsplitPhone(profile) {
//  profile = Object.assign({}, profile);
//  profile.tel = profile["tel-country-code"] + profile["tel-national"];
//  delete profile["tel-country-code"];
//  delete profile["tel-national"];
//  return profile;
//}

function processTestItems() {
  let tests = [];

  for (let test of forms) {
    for (let profileKey of Object.keys(test.results)) {
      let newItem = {};
      newItem.description = test.description + " for " + profileKey;
      newItem.fixtureData = test.fixtureData;

      newItem.profile = profiles[profileKey];

      let expectedResult = {};
      expectedResult.default = { reason: "regex-heuristic" };
      expectedResult.fields = [];

      expectedResult.fields.push({
        fieldName: "given-name",
        autofill: newItem.profile["given-name"],
      });
      expectedResult.fields.push({
        fieldName: "family-name",
        autofill: newItem.profile["family-name"],
      });

      let profileInfo = test.results[profileKey];
      for (let field of Object.keys(profileInfo)) {
        // This is a special case to handle when two fields of the
        // same type are present, which can be specified as, for example,
        // 'tel' and 'tel2'.
        let fieldName = field;
        if (field.match(/[0-9]$/)) {
          fieldName = field.substring(0, field.length - 1);
        }

        let fieldData = { fieldName };

        let value = profileInfo[field];
        // A value starting with * means use reason="autocomplete".
        if (value[0] == "*") {
          fieldData.reason = "autocomplete";
          value = value.substring(1);
        } else if (value[0] == "@") {
          fieldData.reason = "update-heuristic";
          value = value.substring(1);
        }
        fieldData.autofill = value;
        expectedResult.fields.push(fieldData);
      }

      newItem.expectedResult = [expectedResult];
      tests.push(newItem);
    }
  }

  return tests;
}

add_autofill_heuristic_tests(processTestItems());
