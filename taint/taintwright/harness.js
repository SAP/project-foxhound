const assert = require('assert');
const fs = require('fs');
const path = require('path');
const process = require('process');

const express = require('express');

const Testing = require('./testing.js');

class Harness {
    constructor(browserContext) {
        this.context = browserContext;

        this.testBaseDir = "";
        this.tests = [];
        this.sources = [];
        this.debugLog = false;
        this.indexScript = "";

        this.app = express();
        this.port = 3000;

        // Serve static files
        this.app.use(express.static('public'));
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
    registerFile(filePath, includes) {
        const jsFilePath = path.join(this.testBaseDir, `${filePath}.js`);
        const bodyFilePath = path.join(this.testBaseDir, `${filePath}.html`);

        if(!fs.existsSync(jsFilePath)) {
            console.log(`ERROR: File ${jsFilePath} does not exist`);
            process.exit(1);
        }

        let body = "";
        if(fs.existsSync(bodyFilePath)) {
            body = fs.readFileSync(bodyFilePath, 'utf8');
        }

        let code = fs.readFileSync(jsFilePath, 'utf8');

        // Embed test code in script tags
        let includeTags = "";
        if(includes) {
            for(const file of includes){
                includeTags += `<script src="${file}"></script>`
            }
        }

        let name = path.parse(filePath).name;
        let tags = includeTags + `<script>${code};</script>`;

        let content = `<html><head><script src="lib.js"></script>${tags}</html><body onload="exec()">${body}</body></html>`;
        this.indexScript += tags;

        this.tests.push({
            name: name,
            content: tags,
        });
        this.app.get(`/${name}`, (req, res) => {
            res.send(content);
        });
    }

    registerFunction(testFunction, expected) {
        let content = `<script>function ${testFunction.name}() {(${testFunction.toString()})()}</script>`;
        this.tests.push({
            name: testFunction.name,
            content: content,
            expected: expected
        });

        this.app.get(`/${testFunction.name}`, (req, res) => {
            res.send(content);
        });
    }

    /*
      Dynamically build a html endpoint at '/' that executes all tests
    */
    buildIndex() {
        // Just append all tests
        let script = "";
        for (const { name, content } of this.tests) {
            script += content;
        }
        let page = `<html><head><script src="lib.js"></script>${script}</head><body onLoad="exec()"></body></html>`;
        this.app.get('/', (req, res) => {
            res.send(page);
        });
        // This is the endpoint for playwright to navigate to
        // The only difference to the endpoint at '/' is that exec() is not executed onload
        // This endpoint is needed so that there is no weirdness with the exec() that executes
        // on load of the body
        let playwrightPage = `<html><head><script src="lib.js"></script>${script}</head><body></body></html>`;
        this.app.get('/playwright', (req, res) => {
            res.send(playwrightPage);
        });
    }

    /*
      Executes all tests and returns if all succeeded
    */
    async executeTests() {
        let successes = 0;
        let totalTests = 0;
        this.app.listen(this.port, () => {
            console.log("App listenening");
        });
        let page = await this.context.newPage();
        await page.exposeFunction('__report_tainttest_result', (name, success) => {
            if(success) {
                console.log(`[+] ${name}`);
                successes++;
            } else {
                console.log(`[-] ${name}`);
            }
            totalTests++;
        });
        await page.goto('localhost:3000/playwright');
        await page.evaluate(() => exec());
        /*
        for (const { name, content } of this.tests) {
            let page = await this.context.newPage();
            if(this.debugLog) {
                // Forwards browser console logs to node console
                page.on('console', async msg => {
                    const values = [];
                    for (const arg of msg.args())
                        values.push(await arg.jsonValue());
                    console.log(...values);
                });
            }


            let result = await page.evaluate(() => exec());
            if(result) {
                successes++;
            }
        }
        */
        console.log(`\n${successes}/${totalTests} tests have succeeded`);
        return successes === totalTests;
    }

    async execute() {
        return await this.executeTests();
    }

    close() {
        if(this.server) {
            this.server.close();
        }
    }
}

module.exports = Harness;
