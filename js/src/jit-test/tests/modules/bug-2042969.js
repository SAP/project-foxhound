function sig(e) {
  var t = (e instanceof TypeError) ? "TypeError"
        : (e && e.constructor ? e.constructor.name : typeof e);
  return t + " | " + String(e && e.message).slice(0, 40);
}
var out = [];
function run(label, opts) {
  return import("module_does_not_exist_zzz", opts).then(
    function () { out.push(label + ": RESOLVED"); },
    function (e) { out.push(label + ": " + sig(e)); });
}
Promise.all([
  run("1_intkey", { with: { 0: {} } }),
  run("2_order",  { with: { foo: 123 } }),
]).then(function () {
  assertEq(out.sort().join("\n"),
    "1_intkey: TypeError | import: expected string, got Object\n" +
    "2_order: TypeError | import: expected string, got number");
});
drainJobQueue();
