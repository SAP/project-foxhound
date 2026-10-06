// |jit-test| --enable-import-text

let text = "hello\n";

let m = parseModule(text, "text-module.js", "text");
let a = registerModule("text-module", m);

let importer = parseModule(`
    import text from 'text-module' with { type: 'text' };
    globalThis.importedText = text;
`);

let b = registerModule("importer", importer);

moduleLink(b);
moduleEvaluate(b);

assertEq(globalThis.importedText, text);

// Test dynamic import
let result = null;
let error = null;
let promise = import('./text-module.txt', { with: { type: 'text' } });
promise.then((ns) => {
    result = ns.default;
}).catch((e) => {
    error = e;
});

drainJobQueue();
assertEq(error, null);
assertEq(result, text);
