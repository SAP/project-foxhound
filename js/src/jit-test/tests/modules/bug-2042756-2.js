ignoreUnhandledRejections();

oomTest(() => {
    var child = parseModule("await null; export let cv = 10;", "child.js");
    registerModule("child", child);
    var parent = parseModule("import { cv } from 'child'; await null;", "parent.js");
    moduleLink(parent);
    var ev = moduleEvaluate(parent);
    if (ev && ev.then) ev.then(() => {}, () => {});
    drainJobQueue();
});
