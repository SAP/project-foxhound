// |jit-test| --no-threads

function opt(a) {
    for (const it in a) {
        a[it] = 5;
    }
}
const obj = JSON.rawJSON(256n, 256n, opt);
for (let i = 0; i < 100; i++) {
    opt(obj);
}
JSON.stringify(obj);
