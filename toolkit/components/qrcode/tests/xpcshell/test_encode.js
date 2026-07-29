/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

/**
 * Test encoding a simple message.
 */

const { QR } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/qrcode/encoder.mjs"
);

function run_test() {
  const imgData = QR.encodeToDataURI("HELLO", "L");
  Assert.equal(
    imgData.src,
    "data:image/gif;base64,R0lGODdhOgA6AIAAAAAAAP///ywAAAAAOgA6AAAC" +
      "/4yPqcvtD6OctNqLs968+w+G4gKU5nkaKKquLuW+QVy2tAkDTj3rfQts8CRDko" +
      "+HPPoYRUgy9YsyldDm44mLWhHYZM6W7WaDqyCRGkZDySxpRGw2sqvLt1q5w/fo" +
      "XyE6vnUQOJUHBlinMGh046V1F5PDqNcoqcgBOWKBKbK2N+aY+Ih49VkmqMcl2l" +
      "dkhZUK1umE6jZXJ2ZJaujZaRqH4bpb2uZrJxvIt4Ebe9qoYYrJOsw8apz2bCut" +
      "m9kqDcw52uuImyr5Oh1KXH1jrn2anuunywtODU/o2c6teceW39ZcLFg/fNMo1b" +
      "t3jVw2dwTPwJq1KYG3gAklCgu37yGxeScYKyiCc+7DR34hPVQiuQ7UhJMagyEb" +
      "lymmzJk0a9q8iTOnzp0NCgAAOw=="
  );
  Assert.equal(imgData.width, 58);
  Assert.equal(imgData.height, 58);
  Assert.equal(imgData.matrix, undefined, "matrix omitted by default");
  Assert.equal(imgData.dotCount, undefined, "dotCount omitted by default");

  const justMatrix = QR.encodeToMatrix("HELLO", "L");
  Assert.equal(
    justMatrix.dotCount,
    21,
    "HELLO at L correction is version 1 (21 dots)"
  );
  Assert.equal(justMatrix.src, undefined, "matrix encoding omits image data");
  Assert.equal(justMatrix.width, undefined, "matrix encoding omits width");
  Assert.equal(justMatrix.height, undefined, "matrix encoding omits height");
  Assert.equal(
    justMatrix.matrix.length,
    justMatrix.dotCount,
    "matrix has correct number of rows"
  );
  Assert.equal(
    justMatrix.matrix[0].length,
    justMatrix.dotCount,
    "matrix rows have correct number of columns"
  );
  Assert.strictEqual(
    typeof justMatrix.matrix[0][0],
    "boolean",
    "matrix entries are booleans"
  );
  Assert.ok(
    justMatrix.matrix[0][0],
    "top-left corner of finder pattern is dark"
  );
}
