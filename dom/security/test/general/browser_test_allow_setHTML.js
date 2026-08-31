"use strict";

add_task(function () {
  let p = document.createElement("p");
  p.setHTML("<b>test</b>", { sanitizer: {} });
  is(p.firstChild.tagName, "b");
});
