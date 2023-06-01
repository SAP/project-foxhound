/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { extend } = require("resource://devtools/shared/extend.js");
var { Pool } = require("resource://devtools/shared/protocol/Pool.js");

/**
 * Keep track of which actorSpecs have been created. If a replica of a spec
 * is created, it can be caught, and specs which inherit from other specs will
 * not overwrite eachother.
 */
var actorSpecs = new WeakMap();

exports.actorSpecs = actorSpecs;

/**
 * An actor in the actor tree.
 *
 * @param optional conn
 *   Either a DevToolsServerConnection or a DevToolsClient.  Must have
 *   addActorPool, removeActorPool, and poolFor.
 *   conn can be null if the subclass provides a conn property.
 * @constructor
 */

class Actor extends Pool {
  constructor(conn, spec) {
    super();

    // Actors migrated to ES Classes, passed the specification via the constructor
    if (spec) {
      this.typeName = spec.typeName;
      this.requestTypes = generateRequestTypes(spec);
      this._actorSpec = spec;
    }
    this.initialize(conn);
  }

  // Existing Actors extending this class expect initialize to contain constructor logic.
  // Bug 1813648: This method can be folded into constructor once all Actor are migrated to ES Classes.
  initialize(conn) {
    // Repeat Pool.constructor here as we can't call it from initialize
    // This is to be removed once actors switch to es classes and are able to call
    // Actor's contructor.
    if (conn) {
      this.conn = conn;
    }

    // Will contain the actor's ID
    this.actorID = null;

    // When the subclass is still using ActorClassWithSpec (i.e. not ES Classses)
    // The spec is only registered in actorSpecs.
    // This codepath can be removed once all actors are using ES Classes.
    if (!this._actorSpec) {
      this._actorSpec = actorSpecs.get(Object.getPrototypeOf(this));
    }

    // Forward events to the connection.
    if (this._actorSpec && this._actorSpec.events) {
      for (const [name, request] of this._actorSpec.events.entries()) {
        this.on(name, (...args) => {
          this._sendEvent(name, request, ...args);
        });
      }
    }
  }

  toString() {
    return "[Actor " + this.typeName + "/" + this.actorID + "]";
  }

  _sendEvent(name, request, ...args) {
    if (this.isDestroyed()) {
      console.error(
        `Tried to send a '${name}' event on an already destroyed actor` +
          ` '${this.typeName}'`
      );
      return;
    }
    let packet;
    try {
      packet = request.write(args, this);
    } catch (ex) {
      console.error("Error sending event: " + name);
      throw ex;
    }
    packet.from = packet.from || this.actorID;
    this.conn.send(packet);

    // This can really be a hot path, even computing the marker label can
    // have some performance impact.
    // Guard against missing `Services.profiler` because Services is mocked to
    // an empty object in the worker loader.
    if (Services.profiler?.IsActive()) {
      ChromeUtils.addProfilerMarker(
        "DevTools:RDP Actor",
        null,
        `${this.typeName}.${name}`
      );
    }
  }

  destroy() {
    super.destroy();
    this.actorID = null;
    this._isDestroyed = true;
    this.conn = null;
  }

  /**
   * Override this method in subclasses to serialize the actor.
   * @param [optional] string hint
   *   Optional string to customize the form.
   * @returns A jsonable object.
   */
  form(hint) {
    return { actor: this.actorID };
  }

  writeError(error, typeName, method) {
    console.error(
      `Error while calling actor '${typeName}'s method '${method}'`,
      error.message || error
    );
    // Also log the error object as-is in order to log the server side stack
    // nicely in the console, while the previous log will log the client side stack only.
    if (error.stack) {
      console.error(error);
    }

    // Do not try to send the error if the actor is destroyed
    // as the connection is probably also destroyed and may throw.
    if (this.isDestroyed()) {
      return;
    }

    this.conn.send({
      from: this.actorID,
      // error.error -> errors created using the throwError() helper
      // error.name -> errors created using `new Error` or Components.exception
      // typeof(error)=="string" -> a method thrown like this `throw "a string"`
      error:
        error.error ||
        error.name ||
        (typeof error == "string" ? error : "unknownError"),
      message: error.message,
      // error.fileName -> regular Error instances
      // error.filename -> errors created using Components.exception
      fileName: error.fileName || error.filename,
      lineNumber: error.lineNumber,
      columnNumber: error.columnNumber,
    });
  }

  _queueResponse(create) {
    const pending = this._pendingResponse || Promise.resolve(null);
    const response = create(pending);
    this._pendingResponse = response;
  }

  /**
   * Throw an error with the passed message and attach an `error` property to the Error
   * object so it can be consumed by the writeError function.
   * @param {String} error: A string (usually a single word serving as an id) that will
   *                        be assign to error.error.
   * @param {String} message: The string that will be passed to the Error constructor.
   * @throws This always throw.
   */
  throwError(error, message) {
    const err = new Error(message);
    err.error = error;
    throw err;
  }
}

exports.Actor = Actor;

/**
 * Generate the "requestTypes" object used by DevToolsServerConnection to implement RDP.
 * When a RDP packet is received for calling an actor method, this lookup for
 * the method name in this object and call the function holded on this attribute.
 *
 * @params {Object} actorSpec
 *         The procotol-js actor specific coming from devtools/shared/specs/*.js files
 *         This describes the types for methods and events implemented by all actors.
 * @return {Object} requestTypes
 *         An object where attributes are actor method names
 *         and values are function implementing these methods.
 *         These methods receive a RDP Packet (JSON-serializable object) and a DevToolsServerConnection.
 *         We expect them to return a promise that reserves with the response object
 *         to send back to the client (JSON-serializable object).
 */
var generateRequestTypes = function(actorSpec) {
  // Generate request handlers for each method definition
  const requestTypes = Object.create(null);
  actorSpec.methods.forEach(spec => {
    const handler = function(packet, conn) {
      try {
        const startTime = isWorker ? null : Cu.now();
        let args;
        try {
          args = spec.request.read(packet, this);
        } catch (ex) {
          console.error("Error reading request: " + packet.type);
          throw ex;
        }

        if (!this[spec.name]) {
          throw new Error(
            `Spec for '${actorSpec.typeName}' specifies a '${spec.name}'` +
              ` method that isn't implemented by the actor`
          );
        }
        const ret = this[spec.name].apply(this, args);

        const sendReturn = retToSend => {
          if (spec.oneway) {
            // No need to send a response.
            return;
          }
          if (this.isDestroyed()) {
            console.error(
              `Tried to send a '${spec.name}' method reply on an already destroyed actor` +
                ` '${this.typeName}'`
            );
            return;
          }

          let response;
          try {
            response = spec.response.write(retToSend, this);
          } catch (ex) {
            console.error("Error writing response to: " + spec.name);
            throw ex;
          }
          response.from = this.actorID;
          // If spec.release has been specified, destroy the object.
          if (spec.release) {
            try {
              this.destroy();
            } catch (e) {
              this.writeError(e, actorSpec.typeName, spec.name);
              return;
            }
          }

          conn.send(response);

          ChromeUtils.addProfilerMarker(
            "DevTools:RDP Actor",
            startTime,
            `${actorSpec.typeName}:${spec.name}()`
          );
        };

        this._queueResponse(p => {
          return p
            .then(() => ret)
            .then(sendReturn)
            .catch(e => this.writeError(e, actorSpec.typeName, spec.name));
        });
      } catch (e) {
        this._queueResponse(p => {
          return p.then(() =>
            this.writeError(e, actorSpec.typeName, spec.name)
          );
        });
      }
    };

    requestTypes[spec.request.type] = handler;
  });

  return requestTypes;
};
exports.generateRequestTypes = generateRequestTypes;

var generateRequestHandlers = function(actorSpec, actorProto) {
  actorProto.typeName = actorSpec.typeName;

  // Generate request handlers for each method definition
  actorProto.requestTypes = generateRequestTypes(actorSpec);

  return actorProto;
};

/**
 * Create an actor class for the given actor specification and prototype.
 *
 * @param object actorSpec
 *    The actor specification. Must have a 'typeName' property.
 * @param object actorProto
 *    The actor prototype. Should have method definitions, can have event
 *    definitions.
 */
// bug 1813648: We can remove this codepath, generateRequestHandlers and actorSpecs WeakMap once all Actors use ES Classes
var ActorClassWithSpec = function(actorSpec, actorProto) {
  if (!actorSpec.typeName) {
    throw Error("Actor specification must have a typeName member.");
  }

  // Existing Actors are relying on the initialize instead of constructor methods.
  const cls = function() {
    const instance = Object.create(cls.prototype);
    instance.initialize.apply(instance, arguments);
    return instance;
  };
  cls.prototype = extend(
    Actor.prototype,
    generateRequestHandlers(actorSpec, actorProto)
  );

  actorSpecs.set(cls.prototype, actorSpec);

  return cls;
};
exports.ActorClassWithSpec = ActorClassWithSpec;
