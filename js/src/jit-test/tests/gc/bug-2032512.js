// Create a second realm in the same compartment so NukedAllRealms() is false.
var g2 = newGlobal({sameCompartmentAs: this});

// Create a transplantable object.
let {object, transplant} = transplantableObject();

// Create a WeakRef targeting this object (stored unwrapped in zone's weakRefMap).
let wr = new WeakRef(object);

// Transplant the object to a new compartment. The original address becomes a CCW.
let g3 = newGlobal({newCompartment: true});
transplant(g3);

// nukeAllCCWs calls NukeCrossCompartmentWrappers with NukeAllReferences.
// But NukedAllRealms returns false because g2's realm hasn't been nuked.
// So nukeAll is false for the current compartment, and the outgoing CCW survives.
// Then clearWeakRefTargets iterates the weakRefMap and hits nonCCWRealm() on the CCW.
nukeAllCCWs();
