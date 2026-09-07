// |jit-test| --ion-check-range-analysis; --disable-main-thread-denormals; skip-if: helperThreadCount() == 0

let inIon_lege = false;
let inIon_legt = false;
let inIon_ltge = false;
let inIon_ltgt = false;

function test_lege(negzero) {
  inIon_lege = inIon();
  const a = 3.337610787760802e-308;
  const b = 2.2250738585072014e-308;
  if (negzero <= (-a) + b) {
    if (negzero >= a - b) {
      // b - a < -0.0 < a - b
      //
      // So you thought you understood math, yet this branch is taken!
      //
      // Don't worry, you are just enterring a corner case of floating point
      // arithmetic where numbers are represented as fixed point numbers called
      // subnormal or denormal.
      //
      // Except that these numbers are a hell of a slow down, and any reasonable
      // person would disable computation with these numbers for the sake of
      // performance.
      //
      // Well, reasonable is debatable given that this performance improvement
      // comes at the cost of sanity, as we no longer have 2 zeros (+0.0 and
      // -0.0), but we have 2^53 zeros and the above conditions are basically
      // checking:
      //
      //   -0.0 <= -0.0 <= 0.0
      //
      // The problem, is that when you have the choice to disable denormals, any
      // sane person would do it either for everything or for nothing, but not
      // having one half of the program with denormals enabled and the other
      // half with denormals disabled.
      //
      // What happens here is that Range Analysis, our lovely optimization,
      // works with denormal enabled, yet this code might or might not run with
      // denormals disabled :tada:.
      //
      // Thus making assumptions about whether zero can enter this branch or not
      // yield to inconsistencies, and we have to make sure that Range Analysis
      // is conservative to account for this corner case.
      //
      // This test case runs with extra checks for Range Analysis to trip on the
      // unexpected value of negzero.
      if (1 / Math.sign(negzero) == -Infinity) {
        return "What Should Have Been Impossible Happened!";
      }
    }
    return "The impossible happened!";
  }
  return "the ordinary happened!";
}

function test_ltge(negzero) {
  inIon_ltge = inIon();
  const a = 3.337610787760802e-308;
  const b = 2.2250738585072014e-308;
  if (negzero < (-a) + b) {
    if (negzero >= a - b) {
      if (1 / Math.sign(negzero) == -Infinity) {
        throw 1;
      }
      throw 2;
    }
    throw 3;
  }
  return 0;
}

function test_ltgt(negzero) {
  inIon_ltgt = inIon();
  const a = 3.337610787760802e-308;
  const b = 2.2250738585072014e-308;
  if (negzero < (-a) + b) {
    if (negzero > a - b) {
      if (1 / Math.sign(negzero) == -Infinity) {
        throw 1;
      }
      throw 2;
    }
    throw 3;
  }
  return 0;
}

function test_legt(negzero) {
  inIon_legt = inIon();
  const a = 3.337610787760802e-308;
  const b = 2.2250738585072014e-308;
  if (negzero <= (-a) + b) {
    if (negzero > a - b) {
      if (1 / Math.sign(negzero) == -Infinity) {
        throw 1;
      }
      throw 2;
    }
    return 1;
  }
  return 0;
}

// Disable the optimizing JIT on the top-level.
with({}){};

// Assert consistency across execution modes.
let expect_lege = test_lege(-0.0);
let expect_legt = test_legt(-0.0);
let expect_ltgt = test_ltgt(-0.0);
let expect_ltge = test_ltge(-0.0);
while (!(inIon_lege && inIon_legt && inIon_ltgt && inIon_ltge)) {
  assertEq(test_lege(-0.0), expect_lege);
  assertEq(test_legt(-0.0), expect_legt);
  assertEq(test_ltgt(-0.0), expect_ltgt);
  assertEq(test_ltge(-0.0), expect_ltge);
}
