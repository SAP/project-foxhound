function crash() {
  var array = new Float16Array(10).subarray(1);
  array[0] = 1;
  let result = () => {};
  crash(array[0]);
  return result;
}

try {
  crash();
} catch {}
