oomTest(function() {
  setRealmLocale("en");
  "a".toLocaleLowerCase();

  setRealmLocale("de");
  "a".toLocaleLowerCase();
}, {keepFailing: true});
