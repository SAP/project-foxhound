/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

// This test verifies that
// nsIMIMEService.validateFileNameForSaving sanitizes filenames
// properly with different flags.

"use strict";

let reservedNames = [];
if (AppConstants.platform === "win") {
  reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
    "CLOCK$",
  ];
}

add_task(async function validate_filename_method() {
  let mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);

  function checkFilename(filename, flags, mime = "image/png") {
    return mimeService.validateFileNameForSaving(filename, mime, flags);
  }

  Assert.equal(checkFilename("basicfile.png", 0), "basicfile.png");
  Assert.equal(checkFilename("  whitespace.png  ", 0), "whitespace.png");
  Assert.equal(
    checkFilename(" .whitespaceanddots.png...", 0),
    "whitespaceanddots.png"
  );
  Assert.equal(
    checkFilename("  \u00a0 \u00a0 extrawhitespace.png  \u00a0 \u00a0 ", 0),
    "extrawhitespace.png"
  );
  Assert.equal(
    checkFilename("  filename  with  whitespace.png  ", 0),
    "filename with whitespace.png"
  );
  Assert.equal(checkFilename("\\path.png", 0), "_path.png");
  Assert.equal(
    checkFilename("\\path*and/$?~file.png", 0),
    "_path_and_$_~file.png"
  );

  Assert.equal(
    checkFilename(" \u180e whit\u180ee.png \u180e", 0),
    "whit\u180ee.png"
  );
  Assert.equal(checkFilename("簡単簡単簡単", 0), "簡単簡単簡単.png");
  Assert.equal(
    checkFilename("\u3000簡単\u3000\u3000簡単簡単\u3000\u3000.png\u3000", 0),
    "簡単\u3000簡単簡単\u3000.png"
  );
  Assert.equal(checkFilename(" happy\u061c\u2069.png", 0), "happy__.png");
  Assert.equal(
    checkFilename("12345678".repeat(30) + "abcdefghijk.png", 0),
    "12345678".repeat(30) + "abcdefgh.png"
  );
  Assert.equal(
    checkFilename("簡単".repeat(41) + ".png", 0),
    "簡単".repeat(41) + ".png"
  );
  Assert.equal(
    checkFilename("a" + "簡単".repeat(42) + ".png", 0),
    "a" + "簡単".repeat(41) + ".png"
  );
  Assert.equal(
    checkFilename("ab" + "簡単".repeat(42) + ".png", 0),
    "ab" + "簡単".repeat(41) + ".png"
  );
  Assert.equal(
    checkFilename("abc" + "簡単".repeat(42) + ".png", 0),
    "abc" + "簡単".repeat(40) + "簡.png"
  );
  Assert.equal(checkFilename("café.png", 0), "café.png");
  Assert.equal(
    checkFilename("café".repeat(49) + "caf.png", 0),
    "café".repeat(49) + "caf.png"
  );
  Assert.equal(
    checkFilename("café".repeat(51) + ".png", 0),
    "café".repeat(49) + "caf.png"
  );

  Assert.equal(
    checkFilename("\u{100001}\u{100002}.png", 0),
    "\u{100001}\u{100002}.png"
  );
  Assert.equal(
    checkFilename("\u{100001}\u{100002}".repeat(31) + ".png", 0),
    "\u{100001}\u{100002}".repeat(31) + ".png"
  );
  Assert.equal(
    checkFilename("\u{100001}\u{100002}".repeat(32) + ".png", 0),
    "\u{100001}\u{100002}".repeat(31) + ".png"
  );

  Assert.equal(
    checkFilename("noextensionfile".repeat(16), 0),
    "noextensionfile".repeat(16) + ".png"
  );
  Assert.equal(
    checkFilename("noextensionfile".repeat(17), 0),
    "noextensionfile".repeat(16) + "noextens.png"
  );
  Assert.equal(
    checkFilename("noextensionfile".repeat(16) + "noextensionfil.", 0),
    "noextensionfile".repeat(16) + "noextens.png"
  );

  Assert.equal(checkFilename("  first  .png  ", 0), "first .png");
  Assert.equal(
    checkFilename(
      "  second  .png  ",
      mimeService.VALIDATE_DONT_COLLAPSE_WHITESPACE
    ),
    "second  .png"
  );

  // For whatever reason, the Android mime handler accepts the .jpeg
  // extension for image/png, so skip this test there.
  if (AppConstants.platform != "android") {
    Assert.equal(checkFilename("thi/*rd.jpeg", 0), "thi__rd.png");
  }

  Assert.equal(
    checkFilename("f*\\ourth  file.jpg", mimeService.VALIDATE_SANITIZE_ONLY),
    "f__ourth file.jpg"
  );
  Assert.equal(
    checkFilename(
      "f*\\ift  h.jpe*\\g",
      mimeService.VALIDATE_SANITIZE_ONLY |
        mimeService.VALIDATE_DONT_COLLAPSE_WHITESPACE
    ),
    "f__ift  h.jpe__g"
  );
  Assert.equal(checkFilename("sixth.j  pe/*g", 0), "sixth.png");

  let repeatStr = "12345678".repeat(30);
  Assert.equal(
    checkFilename(
      repeatStr + "seventeenth.png",
      mimeService.VALIDATE_DONT_TRUNCATE
    ),
    repeatStr + "seventeenth.png"
  );
  Assert.equal(
    checkFilename(repeatStr + "seventeenth.png", 0),
    repeatStr + "seventee.png"
  );

  // no filename, so index is used by default.
  Assert.equal(checkFilename(".png", 0), "png.png");

  // sanitization only, so Untitled is not added, but initial period is stripped.
  Assert.equal(
    checkFilename(".png", mimeService.VALIDATE_SANITIZE_ONLY),
    "png"
  );

  // correct .png extension is applied.
  Assert.equal(checkFilename(".butterpecan.icecream", 0), "butterpecan.png");

  // sanitization only, so extension is not modified, but initial period is stripped.
  Assert.equal(
    checkFilename(".butterpecan.icecream", mimeService.VALIDATE_SANITIZE_ONLY),
    "butterpecan.icecream"
  );

  let ext = ".fairlyLongExtension";
  Assert.equal(
    checkFilename(repeatStr + ext, mimeService.VALIDATE_SANITIZE_ONLY),
    repeatStr.substring(0, 254 - ext.length) + ext
  );

  ext = "lo#?n/ginvalid? ch\\ars";
  Assert.equal(
    checkFilename(repeatStr + ext, mimeService.VALIDATE_SANITIZE_ONLY),
    repeatStr + "lo#_n_gi"
  );

  ext = ".long/invalid#? ch\\ars";
  Assert.equal(
    checkFilename(repeatStr + ext, mimeService.VALIDATE_SANITIZE_ONLY),
    repeatStr.substring(0, 233) + ".long_invalid#_ch_ars"
  );

  Assert.equal(
    checkFilename("test_ﾃｽﾄ_T\x83E\\S\x83T.png", 0),
    "test_ﾃｽﾄ_T_E_S_T.png"
  );
  Assert.equal(
    checkFilename("test_ﾃｽﾄ_T\x83E\\S\x83T.pﾃ\x83ng", 0),
    "test_ﾃｽﾄ_T_E_S_T.png"
  );

  // Check we don't invalidate surrogate pairs when trimming.
  Assert.equal(checkFilename("test😀", 0, ""), "test😀");
  Assert.equal(checkFilename("test😀😀", 0, ""), "test😀😀");

  // Some examples with unpaired surrogate code units.
  Assert.equal(
    checkFilename(
      "file\uD800name with <unpaired surrogate> and invalid chars.png",
      0
    ),
    "file\uFFFDname with _unpaired surrogate_ and invalid chars.png"
  );
  Assert.equal(
    checkFilename(
      "name with <unpaired surrogate> in.exten\uDFFFsion",
      mimeService.VALIDATE_SANITIZE_ONLY
    ),
    "name with _unpaired surrogate_ in.exten\uFFFDsion"
  );
  Assert.equal(
    checkFilename("." + "\uDC00\uDC01".repeat(4) + repeatStr, 0),
    "\uFFFD".repeat(8) + repeatStr.substring(0, 224) + ".png"
  );

  // Now check some media types
  Assert.equal(
    mimeService.validateFileNameForSaving("video.ogg", "video/ogg", 0),
    "video.ogg",
    "video.ogg"
  );
  let checkedName = mimeService.validateFileNameForSaving(
    "video.ogv",
    "video/ogg",
    0
  );
  Assert.ok(
    ["video.ogv", "video.ogm"].includes(checkedName),
    `Should get video.ogv or video.ogm for video.ogv, got ${checkedName}`
  );

  checkedName = mimeService.validateFileNameForSaving(
    "video.ogt",
    "video/ogg",
    0
  );
  Assert.ok(
    ["video.ogv", "video.ogm"].includes(checkedName),
    `Should get video.ogv or video.ogm for video.ogt, got ${checkedName}`
  );

  Assert.equal(
    mimeService.validateFileNameForSaving("audio.mp3", "audio/mpeg", 0),
    "audio.mp3",
    "audio.mp3"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("audio.mpega", "audio/mpeg", 0),
    "audio.mpega",
    "audio.mpega"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("audio.mp2", "audio/mpeg", 0),
    "audio.mp2",
    "audio.mp2"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving("audio.mp4", "audio/mpeg", 0),
    AppConstants.platform == "android" ? "audio.mp4" : "audio.mp3",
    "audio.mp4"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving("sound.m4a", "audio/mp4", 0),
    "sound.m4a",
    "sound.m4a"
  );
  // 33.9 being just before API version 34, which corresponds to Android 14,
  // where we noticed this testcase changed behaviour due to Android support
  // for the mimetype/extension changing.
  let isOldAndroid = AppConstants.isPlatformAndVersionAtMost("android", "33.9");
  Assert.equal(
    mimeService.validateFileNameForSaving("sound.m4b", "audio/mp4", 0),
    isOldAndroid ? "sound.m4a" : "sound.m4b",
    "sound.m4b"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("sound.m4c", "audio/mp4", 0),
    AppConstants.platform == "macosx" ? "sound.mp4" : "sound.m4a",
    "sound.mpc"
  );

  // This has a long filename with a 13 character extension. The end of the filename should be
  // cropped to fit into 255 bytes.
  Assert.equal(
    mimeService.validateFileNameForSaving(
      "라이브9.9만 시청컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장24%102 000원 브랜드데이 앵콜 🎁 1.등-유산균-컬처렐-특가!",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY
    ),
    "라이브9.9만 시청컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑.등-유산균-컬처렐-특가!",
    "very long filename with extension"
  );

  // Trailing ideographic spaces left at the truncation position should be trimmed.
  Assert.equal(
    mimeService.validateFileNameForSaving(
      "라이브9.9만 시청컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용\u3000\u3000\u3000\u3000\u3000.등-유산균-컬처렐-특가!",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY |
        mimeService.VALIDATE_DONT_COLLAPSE_WHITESPACE
    ),
    "라이브9.9만 시청컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용.등-유산균-컬처렐-특가!",
    "very long filename with extension truncated among spaces"
  );

  // This filename has a very long extension, almost the entire filename.
  Assert.equal(
    mimeService.validateFileNameForSaving(
      "라이브9.9만 시청컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장24%102 000원 브랜드데이 앵콜 🎁 1등 유산균 컬처렐 특가!",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY
    ),
    "라이브9",
    "another very long filename with long extension"
  );

  // This filename is cropped at <=248 bytes (so there would be room to append "_files").
  Assert.equal(
    mimeService.validateFileNameForSaving(
      ".라이브99만 시청컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장24_102 000원 브랜드데이 앵콜 🎁 1등 유산균 컬처렐 특가!",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY
    ),
    "라이브99만 시청컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장컬처렐 다이제스티브 3박스 - 3박스 더 (뚱랑이 굿즈 증정) - 선물용 쇼핑백 2장24_102 000원 브랜",
    "very filename with extension only"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving("1. First", "text/unknown", 0),
    "1.First",
    "1. First"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "1. First",
      "text/unknown",
      mimeService.VALIDATE_ALLOW_DIRECTORY_NAMES
    ),
    "1. First",
    "1. First with VALIDATE_ALLOW_DIRECTORY_NAMES"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving("filename.LNK", "text/unknown", 0),
    "filename.LNK.download",
    "filename.LNK"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("filename.local", "text/unknown", 0),
    "filename.local.download",
    "filename.local"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("filename.url", "text/unknown", 0),
    "filename.url.download",
    "filename.url"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("filename.URl", "text/unknown", 0),
    "filename.URl.download",
    "filename.URl"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("filename.scf", "text/unknown", 0),
    "filename.scf.download",
    "filename.scf"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving("filename.sCF", "text/unknown", 0),
    "filename.sCF.download",
    "filename.sCF"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving("filename.lnk\n", "text/unknown", 0),
    "filename.lnk_",
    "filename.lnk with newline"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.lnk\n  ",
      "text/unknown",
      0
    ),
    "filename.lnk_",
    "filename.lnk with newline"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.\n\t  lnk",
      "text/unknown",
      0
    ),
    "filename.__lnk",
    "filename.lnk with space and newline"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.local\u180e\u180e\u180e",
      "text/unknown",
      0
    ),
    "filename.local.download",
    "filename.local with vowel separators"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.LNK",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY
    ),
    "filename.LNK.download",
    "filename.LNK sanitize only"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.LNK\n",
      "text/unknown",
      mimeService.VALIDATE_ALLOW_INVALID_FILENAMES
    ),
    "filename.LNK_",
    "filename.LNK allow invalid"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.URL\n",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY |
        mimeService.VALIDATE_ALLOW_INVALID_FILENAMES
    ),
    "filename.URL_",
    "filename.URL allow invalid, sanitize only"
  );

  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.desktop",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY
    ),
    "filename.desktop.download",
    "filename.desktop sanitize only"
  );
  Assert.equal(
    mimeService.validateFileNameForSaving(
      "filename.DESKTOP\n",
      "text/unknown",
      mimeService.VALIDATE_SANITIZE_ONLY |
        mimeService.VALIDATE_ALLOW_INVALID_FILENAMES
    ),
    "filename.DESKTOP_",
    "filename.DESKTOP allow invalid, sanitize only"
  );

  for (const upper of reservedNames) {
    let lower = upper.toLowerCase();

    // with extension
    Assert.equal(
      mimeService.validateFileNameForSaving(`${upper}.fun`, "text/unknown", 0),
      "Untitled.fun",
      `${upper}.fun`
    );
    Assert.equal(
      mimeService.validateFileNameForSaving(`${lower}.fun`, "text/unknown", 0),
      "Untitled.fun",
      `${lower}.fun`
    );

    // without extension
    Assert.equal(
      mimeService.validateFileNameForSaving(upper, "text/unknown", 0),
      "Untitled",
      upper
    );
    Assert.equal(
      mimeService.validateFileNameForSaving(lower, "text/unknown", 0),
      "Untitled",
      lower
    );
  }
});
