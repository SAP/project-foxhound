// Verify the environment chain for Debugger.Object described in
// js/src/vm/EnvironmentObject.h.

const g = newGlobal({newCompartment: true});
const dbg = new Debugger();
const gw = dbg.addDebuggee(g);

const bindings = {
  bindings_prop: 50,
};

const envs = JSON.parse(gw.executeInGlobalWithBindings(`
var qualified = 10;
unqualified = 20;
let lexical = 30;
this.prop = 40;

const envs = [];
let env = getInnerMostEnvironmentObject();
while (env) {
  envs.push({
    type: getEnvironmentObjectType(env) || "*global*",
    qualified: !!Object.getOwnPropertyDescriptor(env, "qualified"),
    unqualified: !!Object.getOwnPropertyDescriptor(env, "unqualified"),
    lexical: !!Object.getOwnPropertyDescriptor(env, "lexical"),
    prop: !!Object.getOwnPropertyDescriptor(env, "prop"),
    bindings_prop: !!Object.getOwnPropertyDescriptor(env, "bindings_prop"),
  });

  env = getEnclosingEnvironmentObject(env);
}
JSON.stringify(envs);
`, bindings).return);

assertEq(envs.length, 3);

let i = 0, env;

env = envs[i]; i++;
assertEq(env.type, "WithEnvironmentObject");
assertEq(env.qualified, false);
assertEq(env.unqualified, false);
assertEq(env.lexical, false);
assertEq(env.prop, false);
assertEq(env.bindings_prop, true, "bindings property must live in the with env for bindings");

env = envs[i]; i++;
assertEq(env.type, "GlobalLexicalEnvironmentObject");
assertEq(env.qualified, false);
assertEq(env.unqualified, false);
assertEq(env.lexical, true, "lexical must live in the GlobalLexicalEnvironmentObject");
assertEq(env.prop, false);
assertEq(env.bindings_prop, false);

env = envs[i]; i++;
assertEq(env.type, "*global*");
assertEq(env.qualified, true, "qualified var must live in the global");
assertEq(env.unqualified, true, "unqualified name must live in the global");
assertEq(env.lexical, false);
assertEq(env.prop, true, "this property must live in the global");
assertEq(env.bindings_prop, false);
