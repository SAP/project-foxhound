let src = `
import * as ns from "self";
ns["not an identifier!"];
export let x = 1;
export { x as "not an identifier!" };
`;
let m = parseModule(src);
registerModule("self", m);
moduleLink(m);
moduleEvaluate(m).catch(e => print("err:", e));
drainJobQueue();

