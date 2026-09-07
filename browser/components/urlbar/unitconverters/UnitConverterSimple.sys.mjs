/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { UrlbarUtils } from "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs";

// Some constants to be used in the unit table below
const G = 9.80665; // standard gravity (m/s²)
const LB_TO_KG = 0.45359237; // 1 lb = 0.45359237 kg (exact)
const M_TO_IN = 100 / 2.54; // 1 inch is defined as 2.54 cm

// NOTE: This units table need to be localized upon supporting multi locales
//       since it supports en-US only.
//       e.g. Should support plugada or funty as well for pound.
/**
 * @type {{[key: string]: any}[]}
 */
const UNITS_GROUPS = [
  {
    // Angle
    degree: 1,
    deg: "degree",
    d: "degree",
    "°": "degree",
    radian: Math.PI / 180.0,
    rad: "radian",
    r: "radian",
    gradian: 1 / 0.9,
    grad: "gradian",
    g: "gradian",
    minute: 60,
    min: "minute",
    m: "minute",
    second: 3600,
    sec: "second",
    s: "second",
    sign: 1 / 30.0,
    mil: 1 / 0.05625,
    revolution: 1 / 360.0,
    circle: 1 / 360.0,
    turn: 1 / 360.0,
    quadrant: 1 / 90.0,
    rightangle: 1 / 90.0,
    sextant: 1 / 60.0,
  },
  {
    // Force
    newton: 1,
    n: "newton",
    kilonewton: 0.001,
    kn: "kilonewton",
    "gram-force": 1000 / G,
    gf: "gram-force",
    "kilogram-force": 1 / G,
    kgf: "kilogram-force",
    "ton-force": 1 / G / 1000,
    tf: "ton-force",
    exanewton: 1.0e-18,
    en: "exanewton",
    petanewton: 1.0e-15,
    PN: "petanewton",
    Pn: "petanewton",
    teranewton: 1.0e-12,
    tn: "teranewton",
    giganewton: 1.0e-9,
    gn: "giganewton",
    meganewton: 0.000001,
    MN: "meganewton",
    Mn: "meganewton",
    hectonewton: 0.01,
    hn: "hectonewton",
    dekanewton: 0.1,
    dan: "dekanewton",
    decinewton: 10,
    dn: "decinewton",
    centinewton: 100,
    cn: "centinewton",
    millinewton: 1000,
    mn: "millinewton",
    micronewton: 1e6,
    µn: "micronewton",
    nanonewton: 1e9,
    nn: "nanonewton",
    piconewton: 1e12,
    pn: "piconewton",
    femtonewton: 1e15,
    fn: "femtonewton",
    attonewton: 1e18,
    an: "attonewton",
    dyne: 100000,
    dyn: "dyne",
    "joule/meter": 1,
    "j/m": "joule/meter",
    "joule/centimeter": 100,
    "j/cm": "joule/centimeter",
    "ton-force-short": 1 / (2000 * LB_TO_KG * G),
    short: "ton-force-short",
    "ton-force-long": 1 / (2240 * LB_TO_KG * G),
    tonf: "ton-force-long",
    "kip-force": 1 / (1000 * LB_TO_KG * G),
    kipf: "kip-force",
    "pound-force": 1 / (LB_TO_KG * G),
    lbf: "pound-force",
    "ounce-force": 16 / (LB_TO_KG * G),
    ozf: "ounce-force",
    poundal: 1 / (LB_TO_KG * 0.3048),
    pdl: "poundal",
    pond: 1000 / G,
    p: "pond",
    kilopond: 1 / G,
    kp: "kilopond",
  },
  {
    // Length
    meter: 1,
    m: "meter",
    femtometer: 1e15,
    fermi: "femtometer",
    fm: "femtometer",
    picometer: 1e12,
    pm: "picometer",
    angstrom: 1e10,
    nanometer: 1e9,
    nm: "nanometer",
    micrometer: 1e6,
    μm: "micrometer",
    millimeter: 1000,
    mm: "millimeter",
    centimeter: 100,
    cm: "centimeter",
    kilometer: 0.001,
    km: "kilometer",
    mile: M_TO_IN / 63360,
    mi: "mile",
    yard: M_TO_IN / 36,
    yd: "yard",
    foot: M_TO_IN / 12,
    feet: "foot",
    ft: "foot",
    inch: M_TO_IN,
    inches: "inch",
    in: "inch",
    "nautical mile": 1 / 1852,
    nmi: "nautical mile",
    NM: "nautical mile",
    "light-year": 1 / 9460730472580800,
    "light year": "light-year",
    lyr: "light-year",
    ly: "light-year",
    "astronomical unit": 1 / 149597870700,
    au: "astronomical unit",
  },
  {
    // Mass
    kilogram: 1,
    kg: "kilogram",
    gram: 1000,
    g: "gram",
    milligram: 1000000,
    mg: "milligram",
    ton: 0.001,
    t: "ton",
    "long ton": 1 / LB_TO_KG / 2240,
    longton: "long ton",
    "l.t.": "long ton",
    "l/t": "long ton",
    "short ton": 1 / LB_TO_KG / 2000,
    shortton: "short ton",
    "s.t.": "short ton",
    "s/t": "short ton",
    pound: 1 / LB_TO_KG,
    lbs: "pound",
    lb: "pound",
    ounce: 16 / LB_TO_KG,
    oz: "ounce",
    carat: 5000,
    ffd: 5000,
  },
  {
    // Speed
    "m/s": 1,
    "km/h": 3600 / 1000,
    "km/hr": "km/h",
    kph: "km/h",
    "ft/s": M_TO_IN / 12,
    fps: "ft/s",
    mph: (3600 * M_TO_IN) / 63360,
    "mi/hr": "mph",
    "mi/h": "mph",
    knot: 3600 / 1852,
    kn: "knot",
    kt: "knot",
  },
];

// There are some units that will be same in lower case in same unit group.
// e.g. Mn: meganewton and mn: millinewton on force group.
// Handle them as case-sensitive.
const CASE_SENSITIVE_UNITS = ["PN", "Pn", "MN", "Mn", "NM"];

const NUMBER_REGEX = "-?\\d+(?:\\.\\d+)?\\s*";
const UNIT_REGEX = "[A-Za-zµ°_./-]+ ?[A-Za-z]*";

// NOTE: This regex need to be localized upon supporting multi locales
//       since it supports en-US input format only.
const QUERY_REGEX = new RegExp(
  `^(${NUMBER_REGEX})(${UNIT_REGEX})(?:\\s+in\\s+|\\s+to\\s+|\\s*=\\s*)(${UNIT_REGEX})`,
  "i"
);

/**
 * This module converts simple unit such as angle and length.
 */
export class UnitConverterSimple {
  /**
   * Convert the given search string.
   *
   * @param {string} searchString
   *   The string to be converted
   * @returns {string} conversion result.
   */
  convert(searchString) {
    const regexResult = QUERY_REGEX.exec(searchString);
    if (!regexResult) {
      return null;
    }

    const target = findUnitGroup(regexResult[2].trim(), regexResult[3].trim());

    if (!target) {
      return null;
    }

    const { group, inputUnit, outputUnit } = target;
    const inputNumber = Number(regexResult[1]);
    const outputNumber = (inputNumber / group[inputUnit]) * group[outputUnit];

    let formattedUnit;
    try {
      const formatter = new Intl.NumberFormat("en-US", {
        style: "unit",
        unit: outputUnit,
      });
      const parts = formatter.formatToParts(1);
      formattedUnit = parts.find(part => part.type == "unit").value;
    } catch (e) {
      formattedUnit = outputUnit;
    }

    return `${UrlbarUtils.formatUnitConversionResult(outputNumber)} ${formattedUnit}`;
  }
}

/**
 * Returns the suitable units for the given two values.
 * If could not found suitable unit, returns null.
 *
 * @param {string} inputUnit
 *    A set of units to convert, mapped to the `inputUnit` value on the return
 * @param {string} outputUnit
 *    A set of units to convert, mapped to the `outputUnit` value on the return
 */
function findUnitGroup(inputUnit, outputUnit) {
  inputUnit = toSuitableUnit(inputUnit);
  outputUnit = toSuitableUnit(outputUnit);

  const group = UNITS_GROUPS.find(ug => ug[inputUnit] && ug[outputUnit]);

  if (!group) {
    return null;
  }

  const inputValue = group[inputUnit];
  const outputValue = group[outputUnit];

  return {
    group,
    inputUnit: typeof inputValue === "string" ? inputValue : inputUnit,
    outputUnit: typeof outputValue === "string" ? outputValue : outputUnit,
  };
}

/**
 * Converts the unit value to an appropriate case if necessary.
 *
 * @param {string} unit
 */
function toSuitableUnit(unit) {
  return CASE_SENSITIVE_UNITS.includes(unit) ? unit : unit.toLowerCase();
}
