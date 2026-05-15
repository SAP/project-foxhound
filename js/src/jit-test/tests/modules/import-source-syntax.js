// |jit-test| skip-if: !getBuildConfiguration("source-phase-imports"); --enable-source-phase-imports

load(libdir + "asserts.js");

function assertIsImportDeclaration(src) {
  const ast = Reflect.parse(src, {target: "module"});
  assertEq(ast.type, "Program");
  assertEq(ast.body.length, 1);
  const importDecl = ast.body[0];
  assertEq(importDecl.type, "ImportDeclaration");
}

function assertIsImportSourceDeclaration(src) {
  const ast = Reflect.parse(src, {target: "module"});
  assertEq(ast.type, "Program");
  assertEq(ast.body.length, 1);
  const importDecl = ast.body[0];
  assertEq(importDecl.type, "ImportSourceDeclaration");
}

const ast = Reflect.parse("import source mod from './module.js'", {target: "module"});
assertEq(ast.type, "Program");
assertEq(ast.body.length, 1);

const importDecl = ast.body[0];
assertEq(importDecl.type, "ImportSourceDeclaration");

const binding = importDecl.binding;
assertEq(binding.type, "Identifier");
assertEq(binding.name, "mod");

const moduleRequest = importDecl.moduleRequest;
assertEq(moduleRequest.type, "ModuleRequest");
assertEq(moduleRequest.source.type, "Literal");
assertEq(moduleRequest.source.value, "./module.js");
assertEq(moduleRequest.attributes.length, 0);

assertIsImportDeclaration("import source from './module.js'");
assertIsImportDeclaration("import source, { mod } from './module.js'");
assertIsImportSourceDeclaration("import source source from './module.js'");
assertIsImportSourceDeclaration("import source from from './module.js'");
assertIsImportSourceDeclaration(`import
  source
  mod
  from
  './module.js'`);

// Check that `source` is defined properly
assertThrowsInstanceOf(() => Reflect.parse("import source source from './module.js'; let source = 2;", {target: "module"}), SyntaxError);

// Error outside of module context
assertThrowsInstanceOf(() => Reflect.parse("import source mod from './module.js'"), SyntaxError);

assertThrowsInstanceOf(() => Reflect.parse("import source source source from './module.js'", {target: "module"}), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import source source from from './module.js'", {target: "module"}), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import source from from from './module.js'", {target: "module"}), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import source await from './module.js'", {target: "module"}), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import source yield from './module.js'", {target: "module"}), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import source from", {target: "module"}), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import source from 42", {target: "module"}), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import source mod from 'module.js' with { type: 'json' }", {target: "module"}), SyntaxError);

assertErrorMessage(() => Reflect.parse("import source * from './module.js'", {target: "module"}), SyntaxError, "missing declaration after 'import source'");

