/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const Geometry = ChromeUtils.importESModule(
  "resource://gre/modules/RustGeometry.sys.mjs"
);

add_task(async function () {
  const ln1 = new Geometry.Line({
    start: new Geometry.Point({ coordX: 0, coordY: 0 }),
    end: new Geometry.Point({ coordX: 1, coordY: 2 }),
  });
  const ln2 = new Geometry.Line({
    start: new Geometry.Point({ coordX: 1, coordY: 1 }),
    end: new Geometry.Point({ coordX: 2, coordY: 2 }),
  });
  const origin = new Geometry.Point({ coordX: 0, coordY: 0 });
  Assert.ok((await Geometry.intersection(ln1, ln2)).equals(origin));
  Assert.deepEqual(await Geometry.intersection(ln1, ln2), origin);
  Assert.strictEqual(await Geometry.intersection(ln1, ln1), null);
});
