// |reftest| shell-option(--enable-promise-allkeyed) skip-if(!Promise.hasOwnProperty('allSettledKeyed'))

/*---
feature: [Promise.allSettledKeyed]
---*/

// Side effects during property access should trigger Promise state revalidation
// This would FAIL without validatePromiseState mechanism
{
    let sideEffectTriggered = false;
    let thenCalledAfterModification = false;
    let result;
    let obj = {
        a: Promise.resolve(1),
        get b() {
            if (!sideEffectTriggered) {
                sideEffectTriggered = true;
                // Modify Promise.prototype during property access
                Promise.prototype.thenBackup = Promise.prototype.then;
                let originalThen = Promise.prototype.then;
                Promise.prototype.then = function(...args) {
                    thenCalledAfterModification = true;
                    // Restore and call original to allow test to complete
                    Promise.prototype.then = originalThen;
                    return originalThen.apply(this, args);
                };
            }
            return Promise.reject(2);
        }
    };

    Promise.allSettledKeyed(obj).then(v => { result = v; });
    drainJobQueue();
    
    // Cleanup
    if (Promise.prototype.thenBackup) {
        Promise.prototype.then = Promise.prototype.thenBackup;
        delete Promise.prototype.thenBackup;
    }
    
    // Verify side effect happened and state was revalidated (non-optimized path used)
    assertEq(sideEffectTriggered, true);
    assertEq(thenCalledAfterModification, true);
    assertEq(result.a.status, "fulfilled");
    assertEq(result.a.value, 1);
    assertEq(result.b.status, "rejected");
    assertEq(result.b.reason, 2);
}

if (typeof reportCompare === "function")
    reportCompare(0, 0);
