"use strict";

self.onmessage = e => {
  const [cmd, ...args] = e.data;
  let returnValue;
  if (cmd === "do_call_setTimeout") {
    returnValue = setTimeout(() => console.log("Timeout ran...?"), args[0]);
  } else if (cmd === "do_call_clearTimeout") {
    clearTimeout(args[0]);
  } else {
    throw new Error(`Unexpected message: ${uneval(e.data)}`);
  }
  self.postMessage({ replyToCmd: cmd, returnValue });
};
