// |jit-test| skip-if: getBuildConfiguration("android")
// Disabled on Android because of differing recursion limits (bug 2000192)

let REPEAT_COUNT = 300;
let someCondition = Math.random() > 0.5;
function generateJS() {
  let str = "if (someCondition) {let foo;".repeat(REPEAT_COUNT) +
      "}".repeat(REPEAT_COUNT);
  return str;
}
eval(generateJS());
