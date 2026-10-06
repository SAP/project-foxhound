// |jit-test| exitstatus: 6;
var B = parseModule(`await null;`);

var A = parseModule(`
import "B";
invokeInterruptCallback(function() {});
await null;
`);

registerModule("B", B);
registerModule("A", A);
moduleLink(A);
moduleEvaluate(A);
drainJobQueue();
