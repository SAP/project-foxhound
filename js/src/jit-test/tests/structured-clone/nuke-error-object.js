// |jit-test| error:dead object
var g = newGlobal({newCompartment: true});

// Create an error in g's realm with a poison message object.
// The message object's toString will nuke all CCWs targeting g's realm.
g.evaluate(`
  var err = new Error("initial");
  var poison = {
    toString: function() {
      nukeAllCCWs();
      return "pwned";
    }
  };
  // Set the error's message to the poison object.
  // When structured clone calls ToString(message), it triggers the nuke.
  err.message = poison;
`);

// Get a CCW to g's error in our compartment and serialize it.
serialize(g.err);
