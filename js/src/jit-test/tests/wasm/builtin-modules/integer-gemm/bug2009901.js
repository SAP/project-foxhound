// This test depends on the CommonTestSetup.js script
// which contains the common functionality
// that is required for running the test.
const COMMON_TEST_SETUP_SCRIPT = "./CommonTestSetup.js"

const TEST_AS_STRING =`
let {int8_prepare_b} = instance.exports;

const input = 64 * 960;
const scale = 1.0;
const zeroPoint = 0.0;
const rows = 64;
const cols = 24;
const output = 0;

assertErrorMessage(() => int8_prepare_b(input, scale, zeroPoint, rows, cols, output), WebAssembly.RuntimeError, /index out of bounds/);
`

// Run the test
import(COMMON_TEST_SETUP_SCRIPT).then((importedModule) => {
  importedModule.runTest(importedModule.COMMON_TEST_SETUP_AS_STRING + TEST_AS_STRING);
});
