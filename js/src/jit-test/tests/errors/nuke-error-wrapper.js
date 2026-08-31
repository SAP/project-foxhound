// |jit-test| error:finished
var g = newGlobal({newCompartment: true});
g.evaluate(`
  // Override Error.prototype.name with a getter that nukes CCWs
  Object.defineProperty(Error.prototype, 'name', {
    get: function() {
      // Nuke all cross-compartment wrappers pointing into this realm.
      // This makes the CCW in the main compartment (that roots our ErrorObject)
      // become a dead proxy, removing the only reference to our ErrorObject.
      nukeAllCCWs();

      // Force a full GC to tenure the ErrorObject and compact heap.
      // ErrorObject survives this GC because it's 'this' (on the C++ stack).
      gc();
      
      // Set maxBytes to current gcBytes so the NEXT allocation triggers GC.
      // The next GC will collect the ErrorObject, freeing its JSErrorReport.
      gcparam('maxBytes', gcparam('gcBytes'));

      // Return undefined (not a string) to force fallback to reportp->exnType
      // and then reportp->newMessageString (both UAF after GC collects ErrorObject)
      return undefined;
    }
  });

  // Create the Error object in this compartment
  this.err = new Error("finished");
`);

// Get a CCW (cross-compartment wrapper) to the ErrorObject.
// Then clear the reference in compartment A so the only reference is through our CCW.
// Then throw the foreign error at top level.
var foreignError = g.err;
g.err = null;
throw foreignError;
