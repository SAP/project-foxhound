// |jit-test| slow; error:InternalError

const DEPTH = 20000;

try {
  registerModule("m_" + DEPTH, parseModule("export let x = 0;"));
  for (let i = DEPTH - 1; i >= 0; i--) {
    registerModule("m_" + i, parseModule('import "m_' + (i + 1) + '";'));
  }

  import("m_0");
} catch {}
