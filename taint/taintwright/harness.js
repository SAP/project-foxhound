const assert = require('assert');
const fs = require('fs');
const path = require('path');
const process = require('process');

const Testing = require('./testing.js');

class Harness {
    constructor(browserContext) {
        this.context = browserContext;

        this.testBaseDir = "";
        this.tests = [];
        this.sources = [];
        this.debugLog = false;
    }

    enableDebugLog() {
        this.debugLog = true;
    }

    setTestDir(dir) {
        this.testBaseDir = dir;
    }

    registerSource(str) {
        let content = `<script>function test() { return ${str} }</script>`;
        this.sources.push(content);
    }

    // Pass in 
    registerFile(filePath) {
        const jsFilePath = path.join(this.testBaseDir, `${filePath}.js`);
        const outFilePath = path.join(this.testBaseDir, `${filePath}.out`);

        if(!fs.existsSync(jsFilePath)) {
            console.log(`ERROR: File ${jsFilePath} does not exist`);
            process.exit(1);
        }
        if(!fs.existsSync(outFilePath)) {
            console.log(`ERROR: File ${outFilePath} does not exist`);
            process.exit(1);
        }

        let expected = JSON.parse(fs.readFileSync(outFilePath, 'utf8'));
        let code = fs.readFileSync(jsFilePath, 'utf8');

        // Embed test code in script tags
        let content = `<script>${code}</script>`;
        this.tests.push({
            name: path.parse(filePath).name,
            content: content,
            expected: expected
        });
    }

    registerFunction(testFunction, expected) {
        let content = `<script>function test() {(${testFunction.toString()})()}</script>`;
        this.tests.push({
            name: testFunction.name,
            content: content,
            expected: expected
        });
    }

    async executeSourceTests() {
        let successes = 0;
        for (const content of this.sources) {
            let page = await this.context.newPage();
            if(this.debugLog) {
                page.on('console', async msg => {
                    const values = [];
                    for (const arg of msg.args())
                        values.push(await arg.jsonValue());
                    console.log(...values);
                });
            }
            await page.setContent(content);
            let success = await page.evaluate(() => {
                // Return if source returns tainted data
                return test().taint.length > 0;
            });
            if(success) {
                successes++;
            }
            await page.close();
        }
        console.log(`\n${successes}/${this.sources.length} source tests have succeeded`);
        return successes === this.sources.length;
    }

    async executeTests() {
        let successes = 0;
        for (const { name, content, expected } of this.tests) {
            let page = await this.context.newPage();
            if(this.debugLog) {
                page.on('console', async msg => {
                    const values = [];
                    for (const arg of msg.args())
                        values.push(await arg.jsonValue());
                    console.log(...values);
                });
            }
            await page.exposeBinding("__playwright_taint_report", async function (source, value) {
                if(Testing.taintEqual(expected, value)) {
                    successes++;
                    console.log(`TEST(${name}): SUCCESS`);
                } else {
                    console.log(`TEST(${name}): FAIL\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(value)}`);
                }
            });
            await page.setContent(content);
            await page.evaluate(() => {
                // Register Event Listener to forward taint info
                window.addEventListener('__taintreport', (r) => { __playwright_taint_report(r.detail.str.taint) });
                // Execute Test Code
                test();
            });
            await page.close();
        }
        console.log(`\n${successes}/${this.tests.length} tests have succeeded`);
        return successes === this.tests.length;
    }

    async execute() {
        return await this.executeSourceTests() && await this.executeTests();
    }

    close() {
        if(this.server) {
            this.server.close();
        }
    }
}

module.exports = Harness;
