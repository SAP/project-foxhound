/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Testing basic expression evaluation
const {
  MAX_AUTOCOMPLETE_ATTEMPTS,
  MAX_AUTOCOMPLETIONS,
} = require("resource://devtools/shared/webconsole/js-property-provider.js");
const {
  DevToolsServer,
} = require("resource://devtools/server/devtools-server.js");

add_task(async () => {
  const tab = await addTab(`data:text/html;charset=utf-8,
  <!DOCTYPE html>
  <html dir="ltr" class="class1">
  <head><title>Testcase</title></head>
  <script>
    window.foobarObject = Object.create(
      null,
      Object.getOwnPropertyDescriptors({
        foo: 1,
        foobar: 2,
        foobaz: 3,
        omg: 4,
        omgfoo: 5,
        strfoo: "foobarz",
        omgstr: "foobarz" + "abb".repeat(${DevToolsServer.LONG_STRING_LENGTH} * 2),
      })
    );

    window.largeObject1 = Object.create(null);
    for (let i = 0; i < ${MAX_AUTOCOMPLETE_ATTEMPTS} + 1; i++) {
      window.largeObject1["a" + i] = i;
    }

    window.largeObject2 = Object.create(null);
    for (let i = 0; i < ${MAX_AUTOCOMPLETIONS} * 2; i++) {
      window.largeObject2["a" + i] = i;
    }

    var originalExec = RegExp.prototype.exec;

    var promptIterable = { [Symbol.iterator]() { return { next: prompt } } };

    function aliasedTest() {
      const aliased = "ALIASED";
      return [0].map(() => aliased)[0];
    }

    var testMap = new Map([[1, 1], [2, 2], [3, 3], [4, 4]]);
    var testSet = new Set([1, 2, 3, 4, 5]);
    var testProxy = new Proxy({}, { getPrototypeOf: prompt });
    var testInt8Array = new Int8Array([1, 2, 3]);
    var testArrayBuffer = testInt8Array.buffer;
    var testDataView = new DataView(testArrayBuffer, 2);

    var testCanvasContext = document.createElement("canvas").getContext("2d");

    async function testAsync() { return 10; }
    async function testAsyncAwait() { await 1; return 10; }
    async function * testAsyncGen() { return 10; }
    async function * testAsyncGenAwait() { await 1; return 10; }
  </script>
  <body id="body1" class="class2"><h1>Body text</h1></body>
  </html>`);

  const commands = await CommandsFactory.forTab(tab);
  await commands.targetCommand.startListening();

  await doSimpleEval(commands);
  await doWindowEval(commands);
  await doEvalWithException(commands);
  await doEvalWithHelper(commands);
  await doEvalString(commands);
  await doEvalLongString(commands);
  await doEvalWithBinding(commands);
  await forceLexicalInit(commands);
  await doSimpleEagerEval(commands);
  await doEagerEvalWithSideEffect(commands);
  await doEagerEvalWithSideEffectIterator(commands);
  await doEagerEvalWithSideEffectMonkeyPatched(commands);
  await doEagerEvalESGetters(commands);
  await doEagerEvalDOMGetters(commands);
  await doEagerEvalAsyncFunctions(commands);

  await commands.destroy();
});

async function doSimpleEval(commands) {
  info("test eval '2+2'");
  const response = await commands.scriptCommand.execute("2+2");
  checkObject(response, {
    input: "2+2",
    result: 4,
  });

  ok(!response.exception, "no eval exception");
  ok(!response.helperResult, "no helper result");
}

async function doWindowEval(commands) {
  info("test eval 'document'");
  const response = await commands.scriptCommand.execute("document");
  checkObject(response, {
    input: "document",
    result: {
      type: "object",
      class: "HTMLDocument",
      actor: /[a-z]/,
    },
  });

  ok(!response.exception, "no eval exception");
  ok(!response.helperResult, "no helper result");
}

async function doEvalWithException(commands) {
  info("test eval with exception");
  const response = await commands.scriptCommand.execute(
    "window.doTheImpossible()"
  );
  checkObject(response, {
    input: "window.doTheImpossible()",
    result: {
      type: "undefined",
    },
    exceptionMessage: /doTheImpossible/,
  });

  ok(response.exception, "js eval exception");
  ok(!response.helperResult, "no helper result");
}

async function doEvalWithHelper(commands) {
  info("test eval with helper");
  const response = await commands.scriptCommand.execute("clear()");
  checkObject(response, {
    input: "clear()",
    result: {
      type: "undefined",
    },
    helperResult: { type: "clearOutput" },
  });

  ok(!response.exception, "no eval exception");
}

async function doEvalString(commands) {
  const response = await commands.scriptCommand.execute(
    "window.foobarObject.strfoo"
  );

  checkObject(response, {
    input: "window.foobarObject.strfoo",
    result: "foobarz",
  });
}

async function doEvalLongString(commands) {
  const response = await commands.scriptCommand.execute(
    "window.foobarObject.omgstr"
  );

  const str = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    function() {
      return content.wrappedJSObject.foobarObject.omgstr;
    }
  );

  const initial = str.substring(0, DevToolsServer.LONG_STRING_INITIAL_LENGTH);

  checkObject(response, {
    input: "window.foobarObject.omgstr",
    result: {
      type: "longString",
      initial,
      length: str.length,
    },
  });
}

async function doEvalWithBinding(commands) {
  const response = await commands.scriptCommand.execute("document;");
  const documentActor = response.result.actorID;

  info("running a command with _self as document using selectedObjectActor");
  const selectedObjectSame = await commands.scriptCommand.execute(
    "_self === document",
    {
      selectedObjectActor: documentActor,
    }
  );
  checkObject(selectedObjectSame, {
    result: true,
  });
}

async function forceLexicalInit(commands) {
  info("test that failed let/const bindings are initialized to undefined");

  const testData = [
    {
      stmt: "let foopie = wubbalubadubdub",
      vars: ["foopie"],
    },
    {
      stmt: "let {z, w={n}=null} = {}",
      vars: ["z", "w"],
    },
    {
      stmt: "let [a, b, c] = null",
      vars: ["a", "b", "c"],
    },
    {
      stmt: "const nein1 = rofl, nein2 = copter",
      vars: ["nein1", "nein2"],
    },
    {
      stmt: "const {ha} = null",
      vars: ["ha"],
    },
    {
      stmt: "const [haw=[lame]=null] = []",
      vars: ["haw"],
    },
    {
      stmt: "const [rawr, wat=[lame]=null] = []",
      vars: ["rawr", "haw"],
    },
    {
      stmt: "let {zzz: xyz=99, zwz: wb} = nexistepas()",
      vars: ["xyz", "wb"],
    },
    {
      stmt: "let {c3pdoh=101} = null",
      vars: ["c3pdoh"],
    },
    {
      stmt: "const {...x} = x",
      vars: ["x"],
    },
    {
      stmt: "const {xx,yy,...rest} = null",
      vars: ["xx", "yy", "rest"],
    },
  ];

  for (const data of testData) {
    const response = await commands.scriptCommand.execute(data.stmt);
    checkObject(response, {
      input: data.stmt,
      result: { type: "undefined" },
    });
    ok(response.exception, "expected exception");
    for (const varName of data.vars) {
      const response2 = await commands.scriptCommand.execute(varName);
      checkObject(response2, {
        input: varName,
        result: { type: "undefined" },
      });
      ok(!response2.exception, "unexpected exception");
    }
  }
}

async function doSimpleEagerEval(commands) {
  const testData = [
    {
      code: "2+2",
      result: 4,
    },
    {
      code: "(x => x * 2)(3)",
      result: 6,
    },
    {
      code: "[1, 2, 3].map(x => x * 2).join()",
      result: "2,4,6",
    },
    {
      code: `"abc".match(/a./)[0]`,
      result: "ab",
    },
    {
      code: "aliasedTest()",
      result: "ALIASED",
    },
  ];

  for (const { code, result } of testData) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(response, {
      input: code,
      result,
    });

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }
}

async function doEagerEvalWithSideEffect(commands) {
  const testData = [
    // Modify environment.
    "var a = 10; a;",

    // Directly call a funtion with side effect.
    "prompt();",

    // Call a funtion with side effect inside a scripted function.
    "(() => { prompt(); })()",

    // Call a funtion with side effect from self-hosted JS function.
    "[1, 2, 3].map(prompt)",

    // Call a function with Function.prototype.call.
    "Function.prototype.call.bind(Function.prototype.call)(prompt);",

    // Call a function with Function.prototype.apply.
    "Function.prototype.apply.bind(Function.prototype.apply)(prompt);",

    // Indirectly call a function with Function.prototype.apply.
    "Reflect.apply(prompt, null, []);",
    "'aaaaaaaa'.replace(/(a)(a)(a)(a)(a)(a)(a)(a)/, prompt)",

    // Indirect call on obj[Symbol.iterator]().next.
    "Array.from(promptIterable)",
  ];

  for (const code of testData) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(response, {
      input: code,
      result: { type: "undefined" },
    });

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }
}

async function doEagerEvalWithSideEffectIterator(commands) {
  // Indirect call on %ArrayIterator%.prototype.next,

  // Create an iterable object that reuses iterator across multiple call.
  let response = await commands.scriptCommand.execute(`
var arr = [1, 2, 3];
var iterator = arr[Symbol.iterator]();
var iterable = { [Symbol.iterator]() { return iterator; } };
"ok";
`);
  checkObject(response, {
    result: "ok",
  });
  ok(!response.exception, "no eval exception");
  ok(!response.helperResult, "no helper result");

  const testData = [
    "Array.from(iterable)",
    "new Map(iterable)",
    "new Set(iterable)",
  ];

  for (const code of testData) {
    response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(response, {
      input: code,
      result: { type: "undefined" },
    });

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }

  // Verify the iterator's internal state isn't modified.
  response = await commands.scriptCommand.execute(`[...iterator].join(",")`);
  checkObject(response, {
    result: "1,2,3",
  });
  ok(!response.exception, "no eval exception");
  ok(!response.helperResult, "no helper result");
}

async function doEagerEvalWithSideEffectMonkeyPatched(commands) {
  // Patch the built-in function without eager evaluation.
  let response = await commands.scriptCommand.execute(
    `RegExp.prototype.exec = prompt; "patched"`
  );
  checkObject(response, {
    result: "patched",
  });
  ok(!response.exception, "no eval exception");
  ok(!response.helperResult, "no helper result");

  // Test eager evaluation, where the patched built-in is called internally.
  // This should be aborted.
  const code = `"abc".match(/a./)[0]`;
  response = await commands.scriptCommand.execute(code, { eager: true });
  checkObject(response, {
    input: code,
    result: { type: "undefined" },
  });

  ok(!response.exception, "no eval exception");
  ok(!response.helperResult, "no helper result");

  // Undo the patch without eager evaluation.
  response = await commands.scriptCommand.execute(
    `RegExp.prototype.exec = originalExec; "unpatched"`
  );
  checkObject(response, {
    result: "unpatched",
  });
  ok(!response.exception, "no eval exception");
  ok(!response.helperResult, "no helper result");

  // Test eager evaluation again, without the patch.
  // This should be evaluated.
  response = await commands.scriptCommand.execute(code, { eager: true });
  checkObject(response, {
    input: code,
    result: "ab",
  });
}

async function doEagerEvalESGetters(commands) {
  // [code, expectedResult]
  const testData = [
    // ArrayBuffer
    ["testArrayBuffer.byteLength", 3],

    // DataView
    ["testDataView.buffer === testArrayBuffer", true],
    ["testDataView.byteLength", 1],
    ["testDataView.byteOffset", 2],

    // Map
    ["testMap.size", 4],

    // RegExp
    ["/a/.dotAll", false],
    ["/a/giy.flags", "giy"],
    ["/a/g.global", true],
    ["/a/g.hasIndices", false],
    ["/a/g.ignoreCase", false],
    ["/a/g.multiline", false],
    ["/a/g.source", "a"],
    ["/a/g.sticky", false],
    ["/a/g.unicode", false],

    // Set
    ["testSet.size", 5],

    // Symbol
    ["Symbol.iterator.description", "Symbol.iterator"],

    // TypedArray
    ["testInt8Array.buffer === testArrayBuffer", true],
    ["testInt8Array.byteLength", 3],
    ["testInt8Array.byteOffset", 0],
    ["testInt8Array.length", 3],
    ["testInt8Array[Symbol.toStringTag]", "Int8Array"],
  ];

  for (const [code, expectedResult] of testData) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(
      response,
      {
        input: code,
        result: expectedResult,
      },
      code
    );

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }

  const testDataWithSideEffect = [
    // get Object.prototype.__proto__
    //
    // This can invoke Proxy getPrototypeOf handler, which can be any native
    // function, and debugger cannot hook the call.
    `[].__proto__`,
    `testProxy.__proto__`,
  ];

  for (const code of testDataWithSideEffect) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(
      response,
      {
        input: code,
        result: { type: "undefined" },
      },
      code
    );

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }
}

async function doEagerEvalDOMGetters(commands) {
  // [code, expectedResult]
  const testData = [
    // DOMTokenList
    ["document.documentElement.classList.length", 1],
    ["document.documentElement.classList.value", "class1"],

    // Document
    ["document.URL.startsWith('data:')", true],
    ["document.documentURI.startsWith('data:')", true],
    ["document.compatMode", "CSS1Compat"],
    ["document.characterSet", "UTF-8"],
    ["document.charset", "UTF-8"],
    ["document.inputEncoding", "UTF-8"],
    ["document.contentType", "text/html"],
    ["document.doctype.constructor.name", "DocumentType"],
    ["document.documentElement.constructor.name", "HTMLHtmlElement"],
    ["document.title", "Testcase"],
    ["document.dir", "ltr"],
    ["document.body.constructor.name", "HTMLBodyElement"],
    ["document.head.constructor.name", "HTMLHeadElement"],
    ["document.images.constructor.name", "HTMLCollection"],
    ["document.embeds.constructor.name", "HTMLCollection"],
    ["document.plugins.constructor.name", "HTMLCollection"],
    ["document.links.constructor.name", "HTMLCollection"],
    ["document.forms.constructor.name", "HTMLCollection"],
    ["document.scripts.constructor.name", "HTMLCollection"],
    ["document.defaultView === window", true],
    ["typeof document.currentScript", "object"],
    ["document.anchors.constructor.name", "HTMLCollection"],
    ["document.applets.constructor.name", "HTMLCollection"],
    ["document.all.constructor.name", "HTMLAllCollection"],
    ["document.styleSheetSets.constructor.name", "DOMStringList"],
    ["typeof document.featurePolicy", "undefined"],
    ["typeof document.blockedNodeByClassifierCount", "undefined"],
    ["typeof document.blockedNodesByClassifier", "undefined"],
    ["typeof document.permDelegateHandler", "undefined"],
    ["document.children.constructor.name", "HTMLCollection"],
    ["document.firstElementChild === document.documentElement", true],
    ["document.lastElementChild === document.documentElement", true],
    ["document.childElementCount", 1],
    ["document.location.href.startsWith('data:')", true],

    // Element
    ["document.body.namespaceURI", "http://www.w3.org/1999/xhtml"],
    ["document.body.prefix === null", true],
    ["document.body.localName", "body"],
    ["document.body.tagName", "BODY"],
    ["document.body.id", "body1"],
    ["document.body.className", "class2"],
    ["document.body.classList.constructor.name", "DOMTokenList"],
    ["document.body.part.constructor.name", "DOMTokenList"],
    ["document.body.attributes.constructor.name", "NamedNodeMap"],
    ["document.body.innerHTML.includes('Body text')", true],
    ["document.body.outerHTML.includes('Body text')", true],
    ["document.body.previousElementSibling !== null", true],
    ["document.body.nextElementSibling === null", true],
    ["document.body.children.constructor.name", "HTMLCollection"],
    ["document.body.firstElementChild !== null", true],
    ["document.body.lastElementChild !== null", true],
    ["document.body.childElementCount", 1],

    // Node
    ["document.body.nodeType === Node.ELEMENT_NODE", true],
    ["document.body.nodeName", "BODY"],
    ["document.body.baseURI.startsWith('data:')", true],
    ["document.body.isConnected", true],
    ["document.body.ownerDocument === document", true],
    ["document.body.parentNode === document.documentElement", true],
    ["document.body.parentElement === document.documentElement", true],
    ["document.body.childNodes.constructor.name", "NodeList"],
    ["document.body.firstChild !== null", true],
    ["document.body.lastChild !== null", true],
    ["document.body.previousSibling !== null", true],
    ["document.body.nextSibling === null", true],
    ["document.body.nodeValue === null", true],
    ["document.body.textContent.includes('Body text')", true],
    ["typeof document.body.flattenedTreeParentNode", "undefined"],
    ["typeof document.body.isNativeAnonymous", "undefined"],
    ["typeof document.body.containingShadowRoot", "undefined"],
    ["typeof document.body.accessibleNode", "undefined"],

    // Performance
    ["performance.timeOrigin > 0", true],
    ["performance.timing.constructor.name", "PerformanceTiming"],
    ["performance.navigation.constructor.name", "PerformanceNavigation"],
    ["performance.eventCounts.constructor.name", "EventCounts"],

    // window
    ["window.window === window", true],
    ["window.self === window", true],
    ["window.document.constructor.name", "HTMLDocument"],
    ["window.performance.constructor.name", "Performance"],
    ["typeof window.browsingContext", "undefined"],
    ["typeof window.windowUtils", "undefined"],
    ["typeof window.windowGlobalChild", "undefined"],
    ["window.visualViewport.constructor.name", "VisualViewport"],
    ["typeof window.caches", "undefined"],
    ["window.location.href.startsWith('data:')", true],
  ];
  if (typeof Scheduler === "function") {
    // Scheduler is behind a pref.
    testData.push(["window.scheduler.constructor.name", "Scheduler"]);
  }

  for (const [code, expectedResult] of testData) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(
      response,
      {
        input: code,
        result: expectedResult,
      },
      code
    );

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }

  const testDataWithSideEffect = [
    // NOTE: This is not an exhaustive list.
    // Document
    `document.implementation`,
    `document.domain`,
    `document.referrer`,
    `document.cookie`,
    `document.lastModified`,
    `document.readyState`,
    `document.designMode`,
    `document.onbeforescriptexecute`,
    `document.onafterscriptexecute`,

    // Element
    `document.documentElement.scrollTop`,
    `document.documentElement.scrollLeft`,
    `document.documentElement.scrollWidth`,
    `document.documentElement.scrollHeight`,

    // Performance
    `performance.onresourcetimingbufferfull`,

    // window
    `window.name`,
    `window.history`,
    `window.customElements`,
    `window.locationbar`,
    `window.menubar`,
    `window.status`,
    `window.closed`,

    // CanvasRenderingContext2D / CanvasCompositing
    `testCanvasContext.globalAlpha`,
  ];

  for (const code of testDataWithSideEffect) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(
      response,
      {
        input: code,
        result: { type: "undefined" },
      },
      code
    );

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }
}

async function doEagerEvalAsyncFunctions(commands) {
  // [code, expectedResult]
  const testData = [["typeof testAsync()", "object"]];

  for (const [code, expectedResult] of testData) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(
      response,
      {
        input: code,
        result: expectedResult,
      },
      code
    );

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }

  const testDataWithSideEffect = [
    // await is effectful
    "testAsyncAwait()",

    // initial yield is effectful
    "testAsyncGen()",
    "testAsyncGenAwait()",
  ];

  for (const code of testDataWithSideEffect) {
    const response = await commands.scriptCommand.execute(code, {
      eager: true,
    });
    checkObject(
      response,
      {
        input: code,
        result: { type: "undefined" },
      },
      code
    );

    ok(!response.exception, "no eval exception");
    ok(!response.helperResult, "no helper result");
  }
}
