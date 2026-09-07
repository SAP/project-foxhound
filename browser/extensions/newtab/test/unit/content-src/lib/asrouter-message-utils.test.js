import {
  ASROUTER_NEWTAB_MESSAGE_POSITIONS,
  shouldShowOMCHighlight,
  shouldShowASRouterNewTabMessage,
} from "content-src/lib/asrouter-message-utils.mjs";

const { ABOVE_TOPSITES, ABOVE_WIDGETS, ABOVE_CONTENT_FEED } =
  ASROUTER_NEWTAB_MESSAGE_POSITIONS;

describe("shouldShowOMCHighlight", () => {
  it("returns false when messagesProp is null", () => {
    assert.isFalse(shouldShowOMCHighlight(null, "TestComponent"));
  });

  it("returns false when messageData is null", () => {
    assert.isFalse(
      shouldShowOMCHighlight(
        { messageData: null, isVisible: true },
        "TestComponent"
      )
    );
  });

  it("returns false when messageData is empty", () => {
    assert.isFalse(
      shouldShowOMCHighlight(
        { messageData: {}, isVisible: true },
        "TestComponent"
      )
    );
  });

  it("returns false when isVisible is false", () => {
    assert.isFalse(
      shouldShowOMCHighlight(
        {
          messageData: { content: { messageType: "TestComponent" } },
          isVisible: false,
        },
        "TestComponent"
      )
    );
  });

  it("returns false when componentId does not match messageType", () => {
    assert.isFalse(
      shouldShowOMCHighlight(
        {
          messageData: { content: { messageType: "OtherComponent" } },
          isVisible: true,
        },
        "TestComponent"
      )
    );
  });

  it("returns true when messageType matches and message is visible", () => {
    assert.isTrue(
      shouldShowOMCHighlight(
        {
          messageData: { content: { messageType: "TestComponent" } },
          isVisible: true,
        },
        "TestComponent"
      )
    );
  });
});

describe("shouldShowASRouterNewTabMessage", () => {
  function makeMessages({ position, isVisible = true } = {}) {
    return {
      isVisible,
      messageData: {
        content: {
          messageType: "ASRouterNewTabMessage",
          ...(position !== undefined ? { position } : {}),
        },
      },
    };
  }

  it("returns false when messagesProps is null", () => {
    assert.isFalse(
      shouldShowASRouterNewTabMessage(
        null,
        "ASRouterNewTabMessage",
        ABOVE_TOPSITES
      )
    );
  });

  it("returns false when messageData is null", () => {
    assert.isFalse(
      shouldShowASRouterNewTabMessage(
        { messageData: null, isVisible: true },
        "ASRouterNewTabMessage",
        ABOVE_TOPSITES
      )
    );
  });

  it("returns false when the message is not visible", () => {
    assert.isFalse(
      shouldShowASRouterNewTabMessage(
        makeMessages({ isVisible: false }),
        "ASRouterNewTabMessage",
        ABOVE_TOPSITES
      )
    );
  });

  describe("with no position configured (defaults to ABOVE_TOPSITES)", () => {
    let messages;

    beforeEach(() => {
      messages = makeMessages();
    });

    it("returns true at ABOVE_TOPSITES", () => {
      assert.isTrue(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_TOPSITES
        )
      );
    });

    it("returns false at ABOVE_WIDGETS", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_WIDGETS
        )
      );
    });

    it("returns false at ABOVE_CONTENT_FEED", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_CONTENT_FEED
        )
      );
    });
  });

  describe("with position ABOVE_TOPSITES", () => {
    let messages;

    beforeEach(() => {
      messages = makeMessages({ position: ABOVE_TOPSITES });
    });

    it("returns true at ABOVE_TOPSITES", () => {
      assert.isTrue(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_TOPSITES
        )
      );
    });

    it("returns false at ABOVE_WIDGETS", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_WIDGETS
        )
      );
    });

    it("returns false at ABOVE_CONTENT_FEED", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_CONTENT_FEED
        )
      );
    });
  });

  describe("with position ABOVE_WIDGETS", () => {
    let messages;

    beforeEach(() => {
      messages = makeMessages({ position: ABOVE_WIDGETS });
    });

    it("returns false at ABOVE_TOPSITES", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_TOPSITES
        )
      );
    });

    it("returns true at ABOVE_WIDGETS", () => {
      assert.isTrue(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_WIDGETS
        )
      );
    });

    it("returns false at ABOVE_CONTENT_FEED", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_CONTENT_FEED
        )
      );
    });
  });

  describe("with position ABOVE_CONTENT_FEED", () => {
    let messages;

    beforeEach(() => {
      messages = makeMessages({ position: ABOVE_CONTENT_FEED });
    });

    it("returns false at ABOVE_TOPSITES", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_TOPSITES
        )
      );
    });

    it("returns false at ABOVE_WIDGETS", () => {
      assert.isFalse(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_WIDGETS
        )
      );
    });

    it("returns true at ABOVE_CONTENT_FEED", () => {
      assert.isTrue(
        shouldShowASRouterNewTabMessage(
          messages,
          "ASRouterNewTabMessage",
          ABOVE_CONTENT_FEED
        )
      );
    });
  });
});
