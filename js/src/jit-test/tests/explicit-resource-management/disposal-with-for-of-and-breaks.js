load(libdir + "asserts.js");

{
  async function test() {
    const log = [];
    const make = n => ({
      async [Symbol.asyncDispose]() {
        log.push(n);
      },
      [Symbol.dispose]() {
        log.push(n);
      }
    });
    async function* gen() {
      yield make("head");
    }
    function* innerGen() {
      yield make("inner");
    }
    for await (await using x of gen()) {
      for (using innerX of innerGen()) {
        using innerY = make("innermost")
        {
          using blockInner = make("blockInnermost")
        }
        break;
      }
      await using y = make("body");
      try { break; } finally { log.push("finally"); }
    }
    return log.join(",");
  }
  let thenCalled = false;
  test().then(r => {
    assertEq(r, "blockInnermost,innermost,inner,finally,body,head")
    thenCalled = true;
  });
  drainJobQueue();
  assertEq(thenCalled, true);
}

{                                                                                                          
  const log = [];                                                                                          
  const make = (n, throws = false) => ({
    [Symbol.dispose]() {                                                                                   
      log.push(n);
      if (throws) throw new Error(n);                                                                      
    }                                                                                                    
  });                                                                                                      
  function* gen() { yield make("head"); }
  let caught = null;                                                                                       
  try {
    for (using x of gen()) {
      using y = make("body", true);
      break;                                                                                               
    }
  } catch (e) {
    caught = e;
  } finally {
    log.push("finally");
  }
  // Body disposer throws; head still disposed by the iterator-close path.
  assertEq(log.join(","), "body,head,finally");
  assertEq(caught?.message, "body");
}
