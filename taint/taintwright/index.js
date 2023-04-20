
const { firefox } = require('playwright');

const Harness = require('./harness.js');
const Testing = require('./testing.js');

const assert = require('assert');

let exampleTest = () => {
    location.hash = "initial";
    // Source
    let tainted = location.hash;

    // Propagation
    tainted += "postfix";

    // Sink
    location.hash = tainted;
}

(async () => {
    options = {
        executablePath: "../../archive/foxhound/foxhound",
    };

    console.log("Starting browser");
    const browser = await firefox.launch(options);
    console.log("Browser Version:", browser.version(), "connected:", browser.isConnected());
    const context = await browser.newContext();

    let harness = new Harness(context);

    //harness.registerSource("location.hash");
    //harness.registerSource("window.name");

    context.addInitScript(
        { content: "window.addEventListener('__taintreport', (r) => { __playwright_taint_report(r.detail.str.taint)});"}
    );

    let expected = Testing.taintFromList([{begin: 0, end: 8, flow: ["function", "location.hash", "concat", "location.hash"]}]);
    //harness.registerFunction(exampleTest, expected);

    harness.registerFile("tests/stringify");
    harness.registerFile("tests/externalJsString", ["taintme.js"]);
    harness.registerFile("tests/htmlTaint");
    harness.registerFile("tests/sources");
    harness.registerFile("tests/sinks");

    harness.buildIndex();
    let success = await harness.execute();
    await harness.close();

    // Check if all tests were succesful
    //assert(success);

    //await browser.close();
})();

//module.exports = app;
