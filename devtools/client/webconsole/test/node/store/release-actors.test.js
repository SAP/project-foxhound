/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const {
  getFirstMessage,
  setupActions,
  setupStore,
  getWebConsoleUiMock,
} = require("resource://devtools/client/webconsole/test/node/helpers.js");

const {
  stubPackets,
} = require("resource://devtools/client/webconsole/test/node/fixtures/stubs/index.js");
const expect = require("expect");

describe("Release actor enhancer:", () => {
  let actions;

  beforeAll(() => {
    actions = setupActions();
  });

  describe("release", () => {
    it("releases backend actors when limit reached adding a single message", () => {
      const logLimit = 100;
      const releasedActors = [];

      const { dispatch, getState } = setupStore([], {
        storeOptions: { logLimit },
        webConsoleUI: getWebConsoleUiMock({
          commands: {
            client: {
              mainRoot: {},
            },
            objectCommand: {
              releaseObjects: async frontsToRelease => {
                for (const front of frontsToRelease) {
                  releasedActors.push(front.actorID);
                }
              },
            },
          },
        }),
      });

      // Add a log message.
      const packet = stubPackets.get(
        "console.log('myarray', ['red', 'green', 'blue'])"
      );
      dispatch(actions.messagesAdd([packet]));

      const firstMessage = getFirstMessage(getState());
      const firstMessageActor = firstMessage.parameters[1].actorID;

      // Add an evaluation result message (see Bug 1408321).
      const evaluationResultPacket = stubPackets.get("new Date(0)");
      dispatch(actions.messagesAdd([evaluationResultPacket]));
      const secondMessageActor = evaluationResultPacket.result.actorID;

      const logCount = logLimit + 1;
      const assertPacket = stubPackets.get(
        "console.assert(false, {message: 'foobar'})"
      );
      const thirdMessageActor = assertPacket.arguments[0].actorID;

      for (let i = 1; i <= logCount; i++) {
        assertPacket.arguments.push(`message num ${i}`);
        dispatch(actions.messagesAdd([assertPacket]));
      }

      expect(releasedActors.length).toBe(3);
      expect(releasedActors).toInclude(firstMessageActor);
      expect(releasedActors).toInclude(secondMessageActor);
      expect(releasedActors).toInclude(thirdMessageActor);
    });

    it("releases backend actors when limit reached adding multiple messages", () => {
      const logLimit = 100;
      const releasedActors = [];
      const { dispatch, getState } = setupStore([], {
        storeOptions: { logLimit },
        webConsoleUI: getWebConsoleUiMock({
          commands: {
            client: {
              mainRoot: {},
            },
            objectCommand: {
              releaseObjects: async frontsToRelease => {
                for (const front of frontsToRelease) {
                  releasedActors.push(front.actorID);
                }
              },
            },
          },
        }),
      });

      // Add a log message.
      const logPacket = stubPackets.get(
        "console.log('myarray', ['red', 'green', 'blue'])"
      );
      dispatch(actions.messagesAdd([logPacket]));

      const firstMessage = getFirstMessage(getState());
      const firstMessageActor = firstMessage.parameters[1].actorID;

      // Add an evaluation result message (see Bug 1408321).
      const evaluationResultPacket = stubPackets.get("new Date(0)");
      dispatch(actions.messagesAdd([evaluationResultPacket]));
      const secondMessageActor = evaluationResultPacket.result.actorID;

      // Add an assertion message.
      const assertPacket = stubPackets.get(
        "console.assert(false, {message: 'foobar'})"
      );
      dispatch(actions.messagesAdd([assertPacket]));
      const thirdMessageActor = assertPacket.arguments[0].actorID;

      // Add ${logLimit} messages so we prune the ones we added before.
      const packets = [];
      // Alternate between 2 packets so we don't trigger the repeat message mechanism.
      const oddPacket = stubPackets.get("console.log(undefined)");
      const evenPacket = stubPackets.get("console.log('foobar', 'test')");
      for (let i = 0; i < logLimit; i++) {
        const packet = i % 2 === 0 ? evenPacket : oddPacket;
        packets.push(packet);
      }

      // Add all the packets at once. This will prune the first 3 messages.
      dispatch(actions.messagesAdd(packets));

      expect(releasedActors.length).toBe(3);
      expect(releasedActors).toInclude(firstMessageActor);
      expect(releasedActors).toInclude(secondMessageActor);
      expect(releasedActors).toInclude(thirdMessageActor);
    });

    it("properly releases backend actors after clear", () => {
      const releasedActors = [];
      const { dispatch, getState } = setupStore([], {
        webConsoleUI: getWebConsoleUiMock({
          commands: {
            client: {
              mainRoot: {},
            },
            objectCommand: {
              releaseObjects: async frontsToRelease => {
                for (const front of frontsToRelease) {
                  releasedActors.push(front.actorID);
                }
              },
            },
          },
        }),
      });

      // Add a log message.
      const logPacket = stubPackets.get(
        "console.log('myarray', ['red', 'green', 'blue'])"
      );
      dispatch(actions.messagesAdd([logPacket]));

      const firstMessage = getFirstMessage(getState());
      const firstMessageActor = firstMessage.parameters[1].actorID;

      // Add an assertion message.
      const assertPacket = stubPackets.get(
        "console.assert(false, {message: 'foobar'})"
      );
      dispatch(actions.messagesAdd([assertPacket]));
      const secondMessageActor = assertPacket.arguments[0].actorID;

      // Add an evaluation result message (see Bug 1408321).
      const evaluationResultPacket = stubPackets.get("new Date(0)");
      dispatch(actions.messagesAdd([evaluationResultPacket]));
      const thirdMessageActor = evaluationResultPacket.result.actorID;

      // Add a message with a long string messageText property.
      const longStringPacket = stubPackets.get("TypeError longString message");
      dispatch(actions.messagesAdd([longStringPacket]));
      const fourthMessageActor =
        longStringPacket.pageError.errorMessage.actorID;
      const fifthMessageActor = longStringPacket.pageError.exception.actorID;

      // Kick-off the actor release.
      dispatch(actions.messagesClear());

      expect(releasedActors.length).toBe(5);
      expect(releasedActors).toInclude(firstMessageActor);
      expect(releasedActors).toInclude(secondMessageActor);
      expect(releasedActors).toInclude(thirdMessageActor);
      expect(releasedActors).toInclude(fourthMessageActor);
      expect(releasedActors).toInclude(fifthMessageActor);
    });
  });
});
