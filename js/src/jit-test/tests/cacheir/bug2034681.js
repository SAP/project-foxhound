for (let i = 0; i < 10; i++) {}
function f() {
    return 1n;
}
const obj = new Date();
obj.valueOf = f;
-obj;
