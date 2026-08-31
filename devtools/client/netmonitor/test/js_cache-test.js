"use strict";

function scriptInitiatorFunc() {
  const script = document.createElement("script");
  script.src = "js_cache-test2.js";
  document.body.append(script);
}

scriptInitiatorFunc();
