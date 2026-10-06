/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Pinyin
{
  let locales = [
    "zh",
    "zh-CN",
    "zh-SG",
    "zh-Hans",
    "zh-Hans-CN",
    "zh-Hans-HK",
    "zh-Hans-MO",
    "zh-Hans-SG",
    "zh-Hans-TW",
    "zh-u-co-pinyin",
    "zh-CN-u-co-pinyin",
    "zh-HK-u-co-pinyin",
    "zh-MO-u-co-pinyin",
    "zh-SG-u-co-pinyin",
    "zh-TW-u-co-pinyin",
    "zh-Hant-CN-u-co-pinyin",
    "zh-Hant-HK-u-co-pinyin",
    "zh-Hant-MO-u-co-pinyin",
    "zh-Hant-SG-u-co-pinyin",
    "zh-Hant-TW-u-co-pinyin",
  ];
  let cases = [
    ["艾", "a", -1],
    ["佰", "a", -1],
    ["ㄅ", "a", 1],
    ["ㄅ", "ж", 1],
    ["艾", "佰", -1],
    ["艾", "ㄅ", -1],
    ["佰", "ㄅ", -1],
    ["不", "把", 1],
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    // `collator.resolvedOptions().collation`
    // is sometimes `"default"` instead of being `"pinyin"`
    // for all of the above, despite Chinese being a
    // special case in CLDR that doesn't have a `"standard"`
    // collation, which is what `"default"` is for other
    // languages.
    for (let c of cases) {
        assertEq(collator.compare(c[0], c[1]), c[2]);
    }
  }
}

// Stroke
{
  let locales = [
    "zh-HK",
    "zh-MO",
    "zh-TW",
    "zh-Hant",
    "zh-Hant-CN",
    "zh-Hant-HK",
    "zh-Hant-MO",
    "zh-Hant-SG",
    "zh-Hant-TW",
    "zh-u-co-stroke",
    "zh-CN-u-co-stroke",
    "zh-HK-u-co-stroke",
    "zh-MO-u-co-stroke",
    "zh-SG-u-co-stroke",
    "zh-TW-u-co-stroke",
    "zh-Hans-CN-u-co-stroke",
    "zh-Hans-HK-u-co-stroke",
    "zh-Hans-MO-u-co-stroke",
    "zh-Hans-SG-u-co-stroke",
    "zh-Hans-TW-u-co-stroke",
  ];
  let cases = [
    ["艾", "a", -1],
    ["佰", "a", -1],
    ["ㄅ", "a", -1],
    ["ㄅ", "ж", -1],
    ["艾", "佰", -1],
    ["艾", "ㄅ", -1],
    ["佰", "ㄅ", -1],
    ["不", "把", -1],
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    // `collator.resolvedOptions().collation`
    // is sometimes `"default"` instead of being `"stroke"`
    // for all of the above, despite Chinese being a
    // special case in CLDR that doesn't have a `"standard"`
    // collation, which is what `"default"` is for other
    // languages.
    for (let c of cases) {
        assertEq(collator.compare(c[0], c[1]), c[2]);
    }
  }
}

// Zhuyin
{
  let locales = [
    "zh-u-co-zhuyin",
    "zh-CN-u-co-zhuyin",
    "zh-HK-u-co-zhuyin",
    "zh-MO-u-co-zhuyin",
    "zh-SG-u-co-zhuyin",
    "zh-TW-u-co-zhuyin",
    "zh-Hans-CN-u-co-zhuyin",
    "zh-Hans-HK-u-co-zhuyin",
    "zh-Hans-MO-u-co-zhuyin",
    "zh-Hans-SG-u-co-zhuyin",
    "zh-Hans-TW-u-co-zhuyin",
    "zh-Hant-CN-u-co-zhuyin",
    "zh-Hant-HK-u-co-zhuyin",
    "zh-Hant-MO-u-co-zhuyin",
    "zh-Hant-SG-u-co-zhuyin",
    "zh-Hant-TW-u-co-zhuyin",
  ];
  let cases = [
    ["艾", "a", -1],
    ["佰", "a", -1],
    ["ㄅ", "a", -1],
    ["ㄅ", "ж", -1],
    ["艾", "佰", 1],
    ["艾", "ㄅ", -1],
    ["佰", "ㄅ", -1],
    ["不", "把", 1],
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    assertEq(collator.resolvedOptions().collation, "zhuyin");
    for (let c of cases) {
        assertEq(collator.compare(c[0], c[1]), c[2]);
    }
  }
}

// Unihan
{
  let locales = [
    "zh-u-co-unihan",
    "zh-CN-u-co-unihan",
    "zh-HK-u-co-unihan",
    "zh-MO-u-co-unihan",
    "zh-SG-u-co-unihan",
    "zh-TW-u-co-unihan",
    "zh-Hans-CN-u-co-unihan",
    "zh-Hans-HK-u-co-unihan",
    "zh-Hans-MO-u-co-unihan",
    "zh-Hans-SG-u-co-unihan",
    "zh-Hans-TW-u-co-unihan",
    "zh-Hant-CN-u-co-unihan",
    "zh-Hant-HK-u-co-unihan",
    "zh-Hant-MO-u-co-unihan",
    "zh-Hant-SG-u-co-unihan",
    "zh-Hant-TW-u-co-unihan",
  ];
  let cases = [
    ["艾", "a", -1],
    ["佰", "a", -1],
    ["ㄅ", "a", -1],
    ["ㄅ", "ж", -1],
    ["艾", "佰", 1],
    ["艾", "ㄅ", -1],
    ["佰", "ㄅ", -1],
    ["不", "把", -1],
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    assertEq(collator.resolvedOptions().collation, "unihan");
    for (let c of cases) {
        assertEq(collator.compare(c[0], c[1]), c[2]);
    }
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
