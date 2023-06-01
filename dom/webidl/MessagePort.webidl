/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * For more information on this interface, please see
 * https://html.spec.whatwg.org/#message-ports
 */

[Exposed=(Window,Worker,AudioWorklet)]
interface MessagePort : EventTarget {
  [Throws]
  undefined postMessage(any message, sequence<object> transferable);
  [Throws]
  undefined postMessage(any message, optional StructuredSerializeOptions options = {});

  undefined start();
  undefined close();

  // event handlers
  attribute EventHandler onmessage;
  attribute EventHandler onmessageerror;
};

// Used to declare which objects should be transferred.
dictionary StructuredSerializeOptions {
  sequence<object> transfer = [];
};
