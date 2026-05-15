/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const url =
  "about:certificate?cert=MIIEsDCCA5igAwIBAgIUKX%2FPsMs9ycAQSBCbMXNQJtA5Am4wDQYJKoZIhvcNAQELBQAwITEfMB0GA1UEAwwWQ2VydHZpZXdlciBUZXN0IElzc3VlcjAiGA8yMDIwMDEwMTAwMDAwMFoYDzIwNDkwMTAxMDAwMDAwWjAiMSAwHgYDVQQDDBdDZXJ0dmlld2VyIFRlc3QgU3ViamVjdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALqIUahEjhbWQf1utogGNhA9PBPZ6uQ1SrTs9WhXbCR7wcclqODYH72xnAabbhqG8mvir1p1a2pkcQh6pVqnRYf3HNUknAJ%2BzUP8HmnQOCApk6sgw0nk27lMwmtsDu0Vgg%2Fxfq1pGrHTAjqLKkHup3DgDw2N%2FWYLK7AkkqR9uYhheZCxV5A90jvF4LhIH6g304hD7ycW2FW3ZlqqfgKQLzp7EIAGJMwcbJetlmFbt%2BKWEsB1MaMMkd20yvf8rR0l0wnvuRcOp2jhs3svIm9p47SKlWEd7ibWJZ2rkQhONsscJAQsvxaLL%2BXxj5kXMbiz%2Fkkj%2BnJRxDHVA6zaGAo17Y0CAwEAAaOCAdkwggHVMDIGCCsGAQUFBwEBBCYwJDAiBggrBgEFBQcwAYYWaHR0cDovL2xvY2FsaG9zdDo4ODg4LzAPBgNVHRMBAf8EBTADAQH%2FMCgGA1UdIAQhMB8wBwYFZ4EMAQEwFAYSKwYBBAHrSYUahRqFGgGDdAkBMBMGA1UdJQQMMAoGCCsGAQUFBwMBMA4GA1UdDwEB%2FwQEAwIBhjAWBgNVHREEDzANggtleGFtcGxlLmNvbTCCASUGCisGAQQB1nkCBAIEggEVBIIBEQEPAHUAKrgwRDO5FN7S8x5CB%2FJRwXo3oJJoUtkIAgb4Xlc5FioAAAGUHyl8AAAABAMARjBEAiBcdVGfExFQzV2K3iCjvAYwkf%2Byc3VfMWTs%2FctCgApw5gIgRafynpUWWNFU5IGinUAH9iDXVEOW7ZgmkZtwCwQThQ8AlgDNeRdNGEsWeEl3r8cOu4yKezTP7Z%2B7GD6Lprh70wkA0gAAAZQfKXwAAAAEAwBnMGUCMQDtBic%2BoWg6VLTYGkN0hEiWPOY%2BvoEXA%2BzXPXLwolQGWdTsRUboVudeZVW3k6n3APMCMH8jluFThKPCL0BhJLvmN49NV3jvCO3wSUSUPneJciRVtv0otIlh5ng8PqFrFBHo%2BDANBgkqhkiG9w0BAQsFAAOCAQEAW8qizE6SMno2irSWQEGznA7xLXqVWFM5rW%2F6SA9uynXIGaaoKtkkWQy4qa7RI7vgACCwyoBJCr3Y7ypneKJUB%2BfTD0QIA5HH3ohz%2FUqI5SdezUCUQVd8lscdSEIvcyV35Gw5r3EAL%2BcFRk4UgeFewGwYCW61YPS72NzHGLfLA6%2FNpiZJongsqaYFb98fvk0DIFnmiyIcWfqO7n%2FpNAbh1wvkGhQ1qWKH6jZs2XC7RueaZuo88XCJTqIWs87p0LqUrkfrBNizVSGouCn9euoUC1ngwOKeSzAuPR4k3OGOD3V6bBQ5EI7gAIv1hqyBvHFC1mvCEKv0qJHlycrRRPNIug%3D%3D";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/components/certviewer/tests/browser/adjustedCerts.js",
  this
);

add_task(async function test() {
  Assert.ok(adjustedCerts, "adjustedCerts found");

  let tabName = adjustedCerts[0].tabName;
  let certItems = adjustedCerts[0].certItems;

  await BrowserTestUtils.withNewTab(url, async function (browser) {
    await SpecialPowers.spawn(
      browser,
      [[certItems, tabName]],
      async function ([adjustedCerts, expectedTabName]) {
        let certificateSection = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector("certificate-section");
        }, "Certificate section found");

        let infoGroups =
          certificateSection.shadowRoot.querySelectorAll("info-group");
        Assert.ok(infoGroups, "infoGroups found");
        Assert.equal(
          infoGroups.length,
          adjustedCerts.length,
          "infoGroups must have the same length of adjustedCerts"
        );

        let tabName =
          certificateSection.shadowRoot.querySelector(
            ".tab[idnumber='0']"
          ).textContent;
        Assert.equal(tabName, expectedTabName, "Tab name should be the same");

        function getElementByAttribute(source, property, target) {
          for (let elem of source) {
            if (elem.hasOwnProperty(property) && elem[property] === target) {
              return elem;
            }
          }
          return null;
        }

        function checkBooleans(got, expected) {
          info(
            "If adjustedCertElments returned true, this value should be Yes, otherwise it should be No"
          );
          let gotBool;
          if (got === "Yes") {
            gotBool = true;
          } else if (got === "No") {
            gotBool = false;
          } else {
            gotBool = null;
          }
          Assert.equal(
            gotBool,
            expected,
            `Expected ${expected}, got ${gotBool}`
          );
        }

        for (let infoGroup of infoGroups) {
          let sectionId = infoGroup.shadowRoot
            .querySelector(".info-group-title")
            .getAttribute("data-l10n-id")
            .replace("certificate-viewer-", "");

          let adjustedCertsElem = getElementByAttribute(
            adjustedCerts,
            "sectionId",
            sectionId
          );
          Assert.ok(adjustedCertsElem, "The element exists in adjustedCerts");

          let infoItems = infoGroup.shadowRoot.querySelectorAll("info-item");
          Assert.equal(
            infoItems.length,
            adjustedCertsElem.sectionItems.length,
            "sectionItems must be the same length"
          );

          let i = 0;
          // Message ID mappings
          let stringMapping = {
            signaturealgorithm: "signature-algorithm",
          };
          for (let infoItem of infoItems) {
            let infoItemLabel = infoItem.shadowRoot
              .querySelector("label")
              .getAttribute("data-l10n-id");
            let infoElem = infoItem.shadowRoot.querySelector(".info");
            let infoItemInfo = infoElem.textContent;
            let adjustedCertsElemLabel =
              adjustedCertsElem.sectionItems[i].labelId;
            let adjustedCertsElemInfo = adjustedCertsElem.sectionItems[i].info;

            if (adjustedCertsElemLabel == null) {
              adjustedCertsElemLabel = "";
            }
            adjustedCertsElemLabel = adjustedCertsElemLabel
              .replace(/\s+/g, "-")
              .replace(/\./g, "")
              .replace(/\//g, "")
              .replace(/--/g, "-")
              .toLowerCase();
            adjustedCertsElemLabel =
              stringMapping[adjustedCertsElemLabel] || adjustedCertsElemLabel;

            if (adjustedCertsElemInfo == null) {
              adjustedCertsElemInfo = "";
            }
            if (typeof adjustedCertsElemInfo === "boolean") {
              checkBooleans(infoItemInfo, adjustedCertsElemInfo);
              continue;
            }

            if (
              adjustedCertsElemLabel === "timestamp" ||
              adjustedCertsElemLabel === "not-after" ||
              adjustedCertsElemLabel === "not-before"
            ) {
              Assert.equal(
                infoElem.textContent,
                adjustedCertsElemInfo.utc,
                "Timestamps must be equal"
              );
              i++;
              continue;
            }
            if (adjustedCertsElemLabel === "download") {
              Assert.equal(infoElem.children.length, 2, "Should have 2 links.");
              for (let kid of infoElem.children) {
                Assert.equal(
                  kid.localName,
                  "a",
                  "Should get a cert/chain link."
                );
                Assert.ok(
                  kid.download.endsWith("pem"),
                  "Link `download` attribute should point to pem file."
                );
                Assert.ok(
                  kid.dataset.l10nId.includes("pem"),
                  "Link should be labeled"
                );
                Assert.equal(
                  kid.dataset.l10nId.includes("chain"),
                  kid.download.includes("chain"),
                  "Download label and filename should match"
                );
              }
              // Remaining tests in browser_downloadLink.js

              i++;
              continue;
            }

            if (Array.isArray(adjustedCertsElemInfo)) {
              // there is a case where we have a boolean
              adjustedCertsElemInfo = adjustedCertsElemInfo
                .toString()
                .replace(/,/g, ", ");
            }

            Assert.ok(
              infoItemLabel.includes(adjustedCertsElemLabel),
              "data-l10n-id must contain the original label"
            );

            Assert.equal(
              infoItemInfo,
              adjustedCertsElemInfo,
              "Info must be equal"
            );

            i++;
          }
        }
      }
    );
  });
});
