/* vim: set ts=2 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export class TestProcessActorParent extends JSProcessActorParent {
  constructor() {
    super();
    this.wrappedJSObject = this;
    this.sawActorCreated = false;
  }

  actorCreated() {
    this.sawActorCreated = true;
  }

  receiveMessage(aMessage) {
    switch (aMessage.name) {
      case "init":
        aMessage.data.initial = true;
        this.sendAsyncMessage("toChild", aMessage.data);
        break;
      case "toParent":
        aMessage.data.toParent = true;
        this.sendAsyncMessage("done", aMessage.data);
        break;
      case "asyncMul": {
        let { a, b } = aMessage.data;
        return { result: a * b };
      }
      case "RequestInputStream": {
        let stream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(
          Ci.nsIStringInputStream
        );
        stream.setUTF8Data("Oh boy here we go.");
        return stream;
      }
    }

    return undefined;
  }

  show() {
    return "TestProcessActorParent";
  }
}
