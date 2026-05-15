// |reftest| shell-option(--enable-promise-allkeyed) skip-if(!Promise.hasOwnProperty('allKeyed'))

/*---
feature: [Promise.allKeyed]
---*/

// Side effects during Promise.resolve should trigger revalidation
// This would FAIL without proper state validation during thenable resolution
{
    let resolveCalled = false;
    let result;
    let obj = {
        a: {
            then: function(resolve, reject) {
                if (!resolveCalled) {
                    resolveCalled = true;
                    // Modify Promise during thenable resolution
                    Promise.tempProp = true;
                }
                resolve(1);
            }
        },
        b: Promise.resolve(2)
    };

    Promise.allKeyed(obj).then(v => { result = v; });
    drainJobQueue();
    
    delete Promise.tempProp;
    assertEq(resolveCalled, true);
    assertEq(result.a, 1);
    assertEq(result.b, 2);
}

if (typeof reportCompare === "function")
    reportCompare(0, 0);
