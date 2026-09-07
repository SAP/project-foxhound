// |jit-test| --wasm-compiler=optimizing; --disable-wasm-huge-memory; --spectre-mitigations=off; skip-if: !hasDisassembler() || wasmCompileMode() != "ion" || !getBuildConfiguration("x64") || getBuildConfiguration("simulator") || getJitCompilerOptions()["ion.check-range-analysis"]; include:codegen-x64-test.js

// Spectre mitigation is disabled above to make the generated code simpler to
// match; ion.check-range-analysis makes a hash of the code and makes testing
// pointless.

// White-box testing of bounds check elimination on 64-bit systems.
//
// This is probably fairly brittle, but BCE on 64-bit platforms regressed (bug
// 1735207) without us noticing, so it's not like we can do without these tests.
//
// See also bce-x86-ion-codegen.js.
//
// If this turns out to be too brittle to be practical then an alternative to
// testing the output code is to do what we do for SIMD, record (in a log or
// buffer of some kind) that certain optimizations triggered, and then check the
// log.

var memTypes = ['i32', 'i64'];

for ( let memType of memTypes ) {
    // Make sure the check for the second load is removed: the two load
    // instructions should appear back-to-back in the output.
    codegenTestX64_adhoc(
`(module
   (memory ${memType} 1)
   (func (export "f") (param ${memType}) (result i32)
     (local ${memType})
     (local.set 1 (${memType}.add (local.get 0) (${memType}.const 8)))
     (i32.load (local.get 1))
     drop
     (i32.load (local.get 1))))`,
    'f', `
(movq 0x08\\(%r..\\), %r..\ncmp %r.., %r..|cmpq 0x08\\(%r..\\), %r..)
jnb 0x00000000000000..
movl \\(%r..,%r..,1\\), %e..
movl \\(%r..,%r..,1\\), %eax`,
        {no_prefix:true});

    // Make sure constant indices below the heap minimum do not require a bounds
    // check.
    codegenTestX64_adhoc(
`(module
   (memory ${memType} 1)
   (func (export "f") (result i32)
     (i32.load (${memType}.const 16))))`,
    'f',
    `movl 0x10\\(%r15\\), %eax`);

    // Ditto, even at the very limit of the known heap, extending into the guard
    // page.  This is an OOB access, of course, but it needs no explicit bounds
    // check.
    codegenTestX64_adhoc(
`(module
   (memory ${memType} 1)
   (func (export "f") (result i32)
     (i32.load (${memType}.const 65535))))`,
    'f',
`
mov \\$0xFFFF, %eax
movl \\(%r15,%rax,1\\), %eax`);
}
