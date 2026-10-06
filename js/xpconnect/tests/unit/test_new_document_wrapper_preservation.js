function run_test() {
  function init() {
    var xmldoc = (new DOMParser()).parseFromString("<foo><bar>stuff</bar></foo>", "text/xml");
    xmldoc._test = true;
    return xmldoc.evaluate("foo/bar", xmldoc , null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  }

  let node = init();
  Cu.forceGC();
  Assert.ok(node.ownerDocument._test, "_test param survives GC");
}
