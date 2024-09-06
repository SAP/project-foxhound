import * as scriptTestsData from "./support/script-tests-data.js";
import * as linkTestsData from "./support/link-tests-data.js";
import * as fontfaceTestsData from "./support/font-face-tests-data.js";
import * as imageTestsData from "./support/image-tests-data.js";
import * as fetchTestsData from "./support/fetch-tests-data.js";

const kTopicHttpOnOpeningRequest = "http-on-opening-request";

function getFileNameAndSuffixOf(aStr) {
  return aStr.substr(aStr.lastIndexOf("/") + 1);
}

let httpOnOpeningRequests = [];

const observeHttpOnOpeningRequest = { observe(aSubject, aTopic) {
  assert_equals(aTopic, kTopicHttpOnOpeningRequest, "Observed '" +
        kTopicHttpOnOpeningRequest + "'");

  const fileNameAndSuffix = getFileNameAndSuffixOf(
    aSubject.QueryInterface(SpecialPowers.Ci.nsIChannel).URI.spec);
  const internalPriority =
    aSubject.QueryInterface(SpecialPowers.Ci.nsISupportsPriority).priority;

  httpOnOpeningRequests.push(
    { fileNameAndSuffix: fileNameAndSuffix,
    internalPriority: internalPriority});
}};

SpecialPowers.addObserver(observeHttpOnOpeningRequest,
      kTopicHttpOnOpeningRequest);

function containsOnlyUniqueFileNames(aRequests) {
  const fileNames = aRequests.map((r) => r.fileNameAndSuffix);
  return (new Set(fileNames)).size == fileNames.length;
}

const kTestGroups = [
  scriptTestsData, linkTestsData, fontfaceTestsData, imageTestsData, fetchTestsData
];

const kSupportFolderName = "support";

function runSingleTest(aTestData, aTestFolderName) {
  promise_test((t) => {
    return new Promise(resolve => {
      const testPath = kSupportFolderName + "/" + aTestFolderName + "/" +
        aTestData.testFileName;
      var childWindow = window.open(testPath);

      t.add_cleanup(() => {
            httpOnOpeningRequests = [];
            childWindow.close();
      });

      window.addEventListener("message", resolve);
    }).then(e => {
      assert_true(typeof e.data === "string", "String message received");
      assert_equals(e.data, "ChildLoaded", "Child loaded");

      assert_greater_than(aTestData.expectedRequests.length, 0,
        "Test data should be non-empty");

      assert_true(containsOnlyUniqueFileNames(aTestData.expectedRequests),
        "Test data contains only unique filenames")

      assert_greater_than(httpOnOpeningRequests.length, 0,
        "Observed HTTP requests should be non-empty");

      assert_true(containsOnlyUniqueFileNames(httpOnOpeningRequests),
        "Observed only one HTTP request per filename");

      // The actual order of the "http-on-opening-request"s is not checked,
      // since the corresponding notification is sent when the resource is
      // started to be loaded. However, since the resources might be too
      // quick to load, depending on the machine and network, it can't be
      // ensured that the server can reflect the priorities correctly.
      // Hence, here only the internal priority sent to the server is
      // checked.
      aTestData.expectedRequests.forEach(
        (expectedRequest) => {
          const actualRequest =
            httpOnOpeningRequests.find(
              (actualRequest) => actualRequest.fileNameAndSuffix ==
                                 expectedRequest.fileNameAndSuffix);
          assert_not_equals(actualRequest, undefined,
            "Found request for \"" + expectedRequest.fileNameAndSuffix +
            "\"");
          assert_equals(actualRequest.internalPriority,
            expectedRequest.internalPriority,
            "Check internal priority for '" +
            expectedRequest.fileNameAndSuffix + "'");
      });
    });
  }, aTestData.testFileName + ": test different 'fetchpriority' values");
}

export function runTests(aRunConfig) {
  for (const testGroup of kTestGroups) {
    const testDataKey = aRunConfig.testDataKey;
    if (!testGroup[testDataKey]) {
      continue;
    }
    for (const singleTestData of testGroup[testDataKey]) {
      runSingleTest(singleTestData, testGroup.kTestFolderName);
    }
  }
}
