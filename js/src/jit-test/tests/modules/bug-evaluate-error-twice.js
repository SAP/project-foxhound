let module1 = registerModule('module1', parseModule(
  `throw 1;`));
moduleLink(module1);
moduleEvaluate(module1).catch(() => 0);
moduleEvaluate(module1).catch(() => 0);
drainJobQueue();
