// |jit-test| skip-if: !getBuildConfiguration("source-phase-imports"); --enable-source-phase-imports

load(libdir + "asserts.js");

const ast = Reflect.parse("import.source('module.js')");
assertEq(ast.type, "Program");
assertEq(ast.body.length, 1);
assertEq(ast.body[0].type, "ExpressionStatement");
assertEq(ast.body[0].expression.type, "CallImportSource");
assertEq(ast.body[0].expression.meta.type, "Identifier");
assertEq(ast.body[0].expression.meta.name, "import");
assertEq(ast.body[0].expression.property.type, "Identifier");
assertEq(ast.body[0].expression.property.name, "source");
assertEq(ast.body[0].expression.arguments.length, 1);
assertEq(ast.body[0].expression.arguments[0].type, "Literal");
assertEq(ast.body[0].expression.arguments[0].value, "module.js");

Reflect.parse("while (false) {import.source('<module source>');};");
Reflect.parse("function fn() { import.source('module.js'); }");
Reflect.parse("const fn = () => import.source('module.js');");
Reflect.parse("for (let i = 0; i < 10; i++) { import.source('module.js'); }");
Reflect.parse("for (const x of [1, 2, 3]) { import.source('module.js'); }");
Reflect.parse("for (const key in {a: 1}) { import.source('module.js'); }");
Reflect.parse("if (true) { import.source('module.js'); }");
Reflect.parse("if (false) {} else { import.source('module.js'); }");
Reflect.parse("try { import.source('module.js'); } catch (e) {}");
Reflect.parse("try {} catch (e) { import.source('module.js'); }");
Reflect.parse("const mod = 'test'; import.source(`${mod}.js`);");
Reflect.parse("const x = true ? import.source('a.js') : import.source('b.js');");
Reflect.parse("async function fn() { await import.source('module.js'); }");
Reflect.parse("function* gen() { yield import.source('module.js'); }");
Reflect.parse("const fn = async () => await import.source('module.js');");
Reflect.parse("switch (x) { case 1: import.source('module.js'); break; }");
Reflect.parse("{ import.source('module.js'); }");
Reflect.parse("function fn() { return import.source('module.js'); }");
Reflect.parse("const mod = import.source('module.js');");
Reflect.parse("class C { method() { import.source('module.js'); } }");
Reflect.parse("import.source('module' + '.js');");

assertThrowsInstanceOf(() => Reflect.parse("typeof import.source"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("new import.source('module.js')"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source()"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source(...['module.js'])"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source.property"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source['module.js']"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("function fn() { return import.source; }"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("void import.source"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("!import.source"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("delete import.source"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source++"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source = 'value'"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source.foo()"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source`template`"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("(async () => await import.UNKNOWN('module'))"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source('module.js',)"), SyntaxError);
assertThrowsInstanceOf(() => Reflect.parse("import.source('module.js', {with: {type:'json'}})"), SyntaxError);

