var otherGlobal = newGlobal({newCompartment: true});
var ccwRegex = otherGlobal.eval("/test/");

// Define a getter for "lazy" that nukes CCWs when accessed during enumeration
Object.defineProperty(this, "lazy", {
    get: function() {
        otherGlobal.eval("nukeAllCCWs()");
        return false;
    },
    configurable: true
});

help(ccwRegex);
