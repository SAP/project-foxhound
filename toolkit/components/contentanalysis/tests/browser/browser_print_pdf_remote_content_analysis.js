/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/contentanalysis/tests/browser/browser_print_pdf_content_analysis_impl.js",
  this
);

testPDFUrl =
  "https://example.com/browser/toolkit/components/contentanalysis/tests/browser/file_pdf.pdf";
