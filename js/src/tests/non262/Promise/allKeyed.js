// |reftest| shell-option(--enable-promise-allkeyed) skip-if(!Promise.hasOwnProperty('allKeyed'))

/*---
feature: [Promise.allKeyed]
---*/

// Empty object
{
    let result;
    Promise.allKeyed({}).then(v => {
        result = v;
    });
    drainJobQueue();
    // Result object has null prototype as per spec
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(Object.keys(result).length, 0);
}

// Single property with fulfilled promise
{
    let result;
    Promise.allKeyed({ a: Promise.resolve(1) }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a, 1);
}

// Multiple properties with fulfilled promises
{
    let result;
    Promise.allKeyed({
        a: Promise.resolve(1),
        b: Promise.resolve(2),
        c: Promise.resolve(3)
    }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a, 1);
    assertEq(result.b, 2);
    assertEq(result.c, 3);
}

// Mix of promise and non-promise values
{
    let result;
    Promise.allKeyed({
        a: 1,
        b: Promise.resolve(2),
        c: 3,
        d: Promise.resolve(4)
    }).then(v => {
        result = v;
    });
    drainJobQueue();
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a, 1);
    assertEq(result.b, 2);
    assertEq(result.c, 3);
    assertEq(result.d, 4);
}

// Rejection - should reject if any promise rejects
{
    let rejected = false;
    let rejectionReason;
    Promise.allKeyed({
        a: Promise.resolve(1),
        b: Promise.reject("error"),
        c: Promise.resolve(3)
    }).then(
        v => { throw new Error("Should not fulfill"); },
        reason => {
            rejected = true;
            rejectionReason = reason;
        }
    );
    drainJobQueue();
    assertEq(rejected, true);
    assertEq(rejectionReason, "error");
}

// Async resolution order (promises resolve in different order than keys)
{
    let result;
    let resolve1, resolve2, resolve3;
    
    let p1 = new Promise(res => { resolve1 = res; });
    let p2 = new Promise(res => { resolve2 = res; });
    let p3 = new Promise(res => { resolve3 = res; });
    
    Promise.allKeyed({ a: p1, b: p2, c: p3 }).then(v => {
        result = v;
    });
    
    // Resolve in reverse order
    resolve3("third");
    drainJobQueue();
    resolve2("second");
    drainJobQueue();
    resolve1("first");
    drainJobQueue();
    
    assertEq(Object.getPrototypeOf(result), null);
    assertEq(result.a, "first");
    assertEq(result.b, "second");
    assertEq(result.c, "third");
}

if (typeof reportCompare === "function")
    reportCompare(0, 0);
