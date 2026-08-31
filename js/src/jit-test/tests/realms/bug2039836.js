// |jit-test| error:transplant into nuked compartment
nukeAllCCWs();
newGlobal({newCompartment: true, transplantWindowProxy: this});
