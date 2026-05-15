[];
[-777432661, -1161569985, 2147483648];
[62034, -2, -2147483647, 3, 9, 14, -9223372036854775808];
[8, 9, 5, 536870889, 30961, 2147483649, -166670233, 8741];
[4, , 65535, 8, 10000, 7576, 65535, , 128, , 4, 7, 12304, 536870912, ,];
const v26 = new ArrayBuffer(8);
const v27 = new EvalError(v26);
const v28 = [];
const o30 = {
  scope: "DifferentProcess",
};
const v35 = new Uint8Array(serialize(v27, v28, o30).arraybuffer);
for (let i37 = 0; i37 + 16 <= v35.length; i37 += 8) {
  const v46 = new Uint8Array(i37 + 257 * 16);
  v46.set(v35.slice(0, i37), 0);
  const v52 = v35.slice(i37, i37 + 16);
  for (let i53 = i37; i53 < v46.length; i53 += 16) {
    v46.set(v52, i53);
  }
  const o59 = {};
  const v60 = [];
  const o62 = {
    scope: "DifferentProcess",
  };
  const v64 = serialize(o59, v60, o62);
  v64.arraybuffer = v46.buffer;
  try {
    deserialize(v64);
  } catch (e68) {}
}
