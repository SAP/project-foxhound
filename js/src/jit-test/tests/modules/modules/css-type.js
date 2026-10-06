try {
    parseModule("import x from 'y' with { type: 'css' };").requestedModules[0].moduleRequest.moduleType
} catch (e)  {}

