"use strict";

console.log("hello world");
setTimeout(() => postMessage("message from worker"), 50);
