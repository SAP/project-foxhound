// |reftest| shell-option(--enable-promise-allkeyed) skip-if(!Promise.hasOwnProperty('allSettledKeyed'))

/*---
feature: [Promise.allSettledKeyed]
---*/

// behavior: empty object input, should resolve to an empty object with a null prototype
{
    let result;
    Promise.allSettledKeyed({}).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(Object.keys(result).length, 0);
}

// Single fulfilled promise
{
    let result;
    Promise.allSettledKeyed({ a: Promise.resolve(1) }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertDeepEq(Object.getOwnPropertyNames(result).sort(), ["a"]);
    assertEq(Object.getPrototypeOf(result.a), null);
    assertEq(result.a.status, "fulfilled");
    assertEq(result.a.value, 1);
    assertDeepEq(Object.getOwnPropertyNames(result.a).sort(), ["status", "value"]);
}

// Single rejected promise
{
    let result;
    Promise.allSettledKeyed({ a: Promise.reject("error") }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a.status, "rejected");
    assertEq(result.a.reason, "error");
    assertDeepEq(Object.getOwnPropertyNames(result.a).sort(), ["reason", "status"]);
}

// Multiple fulfilled promises
{
    let result;
    Promise.allSettledKeyed({
        a: Promise.resolve(1),
        b: Promise.resolve(2),
        c: Promise.resolve(3)
    }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a.status, "fulfilled");
    assertEq(result.a.value, 1);
    assertEq(result.b.status, "fulfilled");
    assertEq(result.b.value, 2);
    assertEq(result.c.status, "fulfilled");
    assertEq(result.c.value, 3);
}

// Mix of fulfilled and rejected promises
{
    let result;
    Promise.allSettledKeyed({
        a: Promise.resolve(1),
        b: Promise.reject("error"),
        c: Promise.resolve(3)
    }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a.status, "fulfilled");
    assertEq(result.a.value, 1);
    assertEq(result.b.status, "rejected");
    assertEq(result.b.reason, "error");
    assertEq(result.c.status, "fulfilled");
    assertEq(result.c.value, 3);
}

// All rejected promises
{
    let result;
    Promise.allSettledKeyed({
        a: Promise.reject("error1"),
        b: Promise.reject("error2"),
        c: Promise.reject("error3")
    }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a.status, "rejected");
    assertEq(result.a.reason, "error1");
    assertEq(result.b.status, "rejected");
    assertEq(result.b.reason, "error2");
    assertEq(result.c.status, "rejected");
    assertEq(result.c.reason, "error3");
}

// Mix of promise and non-promise values
{
    let result;
    Promise.allSettledKeyed({
        a: 1,
        b: Promise.resolve(2),
        c: Promise.reject("error"),
        d: 4
    }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a.status, "fulfilled");
    assertEq(result.a.value, 1);
    assertEq(result.b.status, "fulfilled");
    assertEq(result.b.value, 2);
    assertEq(result.c.status, "rejected");
    assertEq(result.c.reason, "error");
    assertEq(result.d.status, "fulfilled");
    assertEq(result.d.value, 4);
}

// Async resolution in different order
{
    let result;
    let resolve1, resolve2, reject3;
    
    let p1 = new Promise(res => { resolve1 = res; });
    let p2 = new Promise(res => { resolve2 = res; });
    let p3 = new Promise((res, rej) => { reject3 = rej; });
    
    Promise.allSettledKeyed({ a: p1, b: p2, c: p3 }).then(v => {
        result = v;
    });
    
    // Resolve/reject in reverse order
    reject3("third error");
    drainJobQueue();
    resolve2("second");
    drainJobQueue();
    resolve1("first");
    drainJobQueue();
    
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a.status, "fulfilled");
    assertEq(result.a.value, "first");
    assertEq(result.b.status, "fulfilled");
    assertEq(result.b.value, "second");
    assertEq(result.c.status, "rejected");
    assertEq(result.c.reason, "third error");
}

// Never rejects - always fulfills
{
    let fulfilled = false;
    let result;
    
    Promise.allSettledKeyed({
        a: Promise.reject("error1"),
        b: Promise.reject("error2"),
        c: Promise.reject("error3")
    }).then(
        v => {
            fulfilled = true;
            result = v;
        },
        reason => {
            throw new Error("Promise.allSettledKeyed should never reject");
        }
    );
    drainJobQueue();
    
    assertEq(fulfilled, true);
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a.status, "rejected");
    assertEq(result.a.reason, "error1");
    assertEq(result.b.status, "rejected");
    assertEq(result.b.reason, "error2");
    assertEq(result.c.status, "rejected");
    assertEq(result.c.reason, "error3");
}

if (typeof reportCompare === "function")
    reportCompare(0, 0);
