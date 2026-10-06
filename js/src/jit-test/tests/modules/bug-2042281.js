load(libdir + "asserts.js");

function expectSyntaxError(src) {
  assertThrowsInstanceOf(() => {
    parseModule(src);
  }, SyntaxError);
}

// WithEntries requires commas between entries.
expectSyntaxError(`import x from "y" with { a: "1" b: "2" };`);
expectSyntaxError(`import x from "y" with { a: "1" b: "2" c: "3" };`);
expectSyntaxError(`import x from "y" with { "a": "1" "b": "2" };`);
expectSyntaxError(`export * from "y" with { a: "1" b: "2" };`);
expectSyntaxError(`export {z} from "y" with { a: "1" b: "2" };`);

// Valid WithClause forms: with { } and with { WithEntries ,opt }
// https://tc39.es/ecma262/#prod-WithClause
parseModule(`import x from "y" with {};`);
parseModule(`import x from "y" with { a: "1" };`);
parseModule(`import x from "y" with { "a": "1" };`);
parseModule(`import x from "y" with { a: "1", b: "2" };`);
parseModule(`import x from "y" with { a: "1", b: "2", c: "3" };`);
parseModule(`export * from "y" with { a: "1" };`);
parseModule(`export {z} from "y" with { a: "1", b: "2" };`);

// Optional trailing comma in WithClause (with { WithEntries , }).
parseModule(`import x from "y" with { a: "1", };`);
parseModule(`import x from "y" with { a: "1", b: "2", };`);
parseModule(`import x from "y" with { "a": "1", "b": "2", };`);
parseModule(`export * from "y" with { a: "1", };`);
parseModule(`export {z} from "y" with { a: "1", b: "2", };`);
