// |jit-test| skip-if: !isAsmJSCompilationAvailable()

// Generate a function with many parameters and local variables.
// We want to test the limits and this module should fail validation.
function build_asm_code(num_params, num_locals_decl_extra) {
  let params = [];
  let param_annots = [];
  for (let i = 0; i < num_params; ++i) {
    params.push(`p${i}`);
    param_annots.push(`  p${i} = p${i} | 0;`);
  }
  let local_inits = [];
  local_inits.push(`x = 0`);
  for (let i = 0; i < num_locals_decl_extra; ++i) {
    let name = `l${i}`;
    local_inits.push(`${name} = 0`);
  }
  if (local_inits.length > 0) {
    local_decl = `  var ${local_inits.join()};`;
  }
  const body = `
    x = p0 | 0;
    switch (x | 0) {
      case 0:
        return 1;
      case 1:
        return 2;
      default:
        return 3;
    }
    return 0;
  `;
  const code = `
function Module(stdlib, foreign, buffer) {
  "use asm";
  // No stdlib imports needed

  // Function 'f' with specified parameters and locals
  function f(${params.join()}) {
    ${param_annots.join("")}
    ${local_decl}
    ${body}
  }

  // Export function 'f'
  return { f: f };
}
`;
  return code;
}
const num_params = 10;
const num_locals_decl_extra = 49997;
const code = build_asm_code(num_params, num_locals_decl_extra);

const module = eval(`(${code})`);
