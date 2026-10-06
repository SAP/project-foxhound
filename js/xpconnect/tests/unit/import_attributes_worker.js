onmessage = function () {
  const { data } = ChromeUtils.importESModule(
    "resource://test/import_attributes.mjs",
    { global: "current" }
  );
  postMessage({ value: data.value });
};
