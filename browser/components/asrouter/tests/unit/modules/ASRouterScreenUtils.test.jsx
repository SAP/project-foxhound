import { ASRouterScreenUtils } from "modules/ASRouterScreenUtils.sys.mjs";
import { GlobalOverrider } from "tests/unit/utils";
import { ASRouter } from "modules/ASRouter.sys.mjs";

describe("ASRouterScreenUtils", () => {
  let sandbox;
  let globals;

  beforeEach(() => {
    globals = new GlobalOverrider();
    globals.set({
      ASRouter,
      ASRouterTargeting: {
        Environment: {},
      },
    });

    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
    globals.restore();
  });
  describe("removeScreens", () => {
    it("should run callback function once for each array element", async () => {
      const callback = sandbox.stub().resolves(false);
      const arr = ["foo", "bar"];
      await ASRouterScreenUtils.removeScreens(arr, callback);
      assert.calledTwice(callback);
    });
    it("should remove screen when passed function evaluates true", async () => {
      const callback = sandbox.stub().resolves(true);
      const arr = ["foo", "bar"];
      await ASRouterScreenUtils.removeScreens(arr, callback);
      assert.deepEqual(arr, []);
    });
  });
  describe("evaluateScreenTargeting", () => {
    it("should return the eval result if the eval succeeds", async () => {
      const evalStub = sandbox.stub(ASRouter, "evaluateExpression").resolves({
        evaluationStatus: {
          success: true,
          result: false,
        },
      });
      const result =
        await ASRouterScreenUtils.evaluateScreenTargeting("test expression");
      assert.calledOnce(evalStub);
      assert.equal(result, false);
    });
    it("should return true if the targeting eval fails", async () => {
      const evalStub = sandbox.stub(ASRouter, "evaluateExpression").resolves({
        evaluationStatus: {
          success: false,
          result: false,
        },
      });
      const result =
        await ASRouterScreenUtils.evaluateScreenTargeting("test expression");
      assert.calledOnce(evalStub);
      assert.equal(result, true);
    });
  });
  describe("evaluateTargetingAndRemoveScreens", () => {
    it("should manipulate an array of screens", async () => {
      const screens = [
        {
          id: "first",
          targeting: true,
        },
        {
          id: "second",
          targeting: false,
        },
      ];

      const expectedScreens = [
        {
          id: "first",
          targeting: true,
        },
      ];
      sandbox.stub(ASRouter, "evaluateExpression").callsFake(targeting => {
        return {
          evaluationStatus: {
            success: true,
            result: targeting.expression,
          },
        };
      });
      const evaluatedStrings =
        await ASRouterScreenUtils.evaluateTargetingAndRemoveScreens(screens);
      assert.deepEqual(evaluatedStrings, expectedScreens);
    });
    it("should not remove screens with no targeting", async () => {
      const screens = [
        {
          id: "first",
        },
        {
          id: "second",
          targeting: false,
        },
      ];

      const expectedScreens = [
        {
          id: "first",
        },
      ];
      sandbox
        .stub(ASRouterScreenUtils, "evaluateScreenTargeting")
        .callsFake(targeting => {
          if (targeting === undefined) {
            return true;
          }
          return targeting;
        });
      const evaluatedStrings =
        await ASRouterScreenUtils.evaluateTargetingAndRemoveScreens(screens);
      assert.deepEqual(evaluatedStrings, expectedScreens);
    });
  });

  describe("addScreenImpression", () => {
    it("Should call addScreenImpression with provided screen ID", () => {
      const addScreenImpressionStub = sandbox.stub(
        ASRouter,
        "addScreenImpression"
      );
      const testScreen = { id: "test" };
      ASRouterScreenUtils.addScreenImpression(testScreen);

      assert.calledOnce(addScreenImpressionStub);
      assert.equal(addScreenImpressionStub.firstCall.args[0].id, testScreen.id);
    });
  });
  describe("getUnhandledCampaignAction", () => {
    it("Should call evaluateExpression", () => {
      const evaluateExpressionStub = sandbox.stub(
        ASRouter,
        "evaluateExpression"
      );
      ASRouterScreenUtils.getUnhandledCampaignAction();

      assert.calledOnce(evaluateExpressionStub);
      assert.equal(
        evaluateExpressionStub.firstCall.args[0].expression,
        "unhandledCampaignAction"
      );
    });
  });

  describe("hasSeenScreen", () => {
    it("returns true when the screen has a recorded impression", async () => {
      sandbox
        .stub(ASRouter, "state")
        .value({ screenImpressions: { SCREEN_A: 1234 } });
      assert.equal(await ASRouterScreenUtils.hasSeenScreen("SCREEN_A"), true);
    });
    it("returns false when the screen has no recorded impression", async () => {
      sandbox.stub(ASRouter, "state").value({ screenImpressions: {} });
      assert.equal(await ASRouterScreenUtils.hasSeenScreen("SCREEN_A"), false);
    });
  });

  describe("handleImpressionAction", () => {
    let handleActionStub;
    beforeEach(() => {
      handleActionStub = sandbox.stub();
      globals.set({
        SpecialMessageActions: { handleAction: handleActionStub },
      });
    });

    it("dispatches an allowlisted action with its data intact and returns true", async () => {
      const browser = {};
      const result = await ASRouterScreenUtils.handleImpressionAction(
        {
          action: {
            type: "PIN_FIREFOX_TO_TASKBAR",
            data: { privatePin: false },
          },
          screen_id: "SCREEN_A",
        },
        browser
      );

      assert.equal(result, true);
      assert.calledOnce(handleActionStub);
      const [actionArg, browserArg] = handleActionStub.firstCall.args;
      assert.equal(actionArg.type, "PIN_FIREFOX_TO_TASKBAR");
      assert.deepEqual(actionArg.data, { privatePin: false });
      assert.equal(browserArg, browser);
    });

    it("dispatches PIN_FIREFOX_TO_START_MENU and returns true", async () => {
      const result = await ASRouterScreenUtils.handleImpressionAction(
        {
          action: { type: "PIN_FIREFOX_TO_START_MENU" },
          screen_id: "SCREEN_A",
        },
        {}
      );

      assert.equal(result, true);
      assert.calledOnce(handleActionStub);
      assert.equal(
        handleActionStub.firstCall.args[0].type,
        "PIN_FIREFOX_TO_START_MENU"
      );
    });

    it("dispatches a MULTI_ACTION whose nested actions are all allowlisted", async () => {
      const action = {
        type: "MULTI_ACTION",
        data: {
          actions: [
            { type: "PIN_FIREFOX_TO_TASKBAR" },
            { type: "PIN_FIREFOX_TO_START_MENU" },
          ],
        },
      };

      const result = await ASRouterScreenUtils.handleImpressionAction(
        { action, screen_id: "SCREEN_A" },
        {}
      );

      assert.equal(result, true);
      assert.calledOnce(handleActionStub);
      // The whole MULTI_ACTION is passed through to SpecialMessageActions.
      assert.deepEqual(handleActionStub.firstCall.args[0], {
        type: "MULTI_ACTION",
        data: action.data,
      });
    });

    it("rejects a MULTI_ACTION containing a non-allowlisted nested action", async () => {
      const result = await ASRouterScreenUtils.handleImpressionAction(
        {
          action: {
            type: "MULTI_ACTION",
            data: {
              actions: [
                { type: "PIN_FIREFOX_TO_TASKBAR" },
                { type: "SET_DEFAULT_BROWSER" },
              ],
            },
          },
          screen_id: "SCREEN_A",
        },
        {}
      );

      assert.equal(result, false);
      assert.notCalled(handleActionStub);
    });

    it("rejects a MULTI_ACTION with no nested actions", async () => {
      const result = await ASRouterScreenUtils.handleImpressionAction(
        {
          action: { type: "MULTI_ACTION", data: { actions: [] } },
          screen_id: "SCREEN_A",
        },
        {}
      );

      assert.equal(result, false);
      assert.notCalled(handleActionStub);
    });

    it("rejects a non-allowlisted action and returns false", async () => {
      const result = await ASRouterScreenUtils.handleImpressionAction(
        { action: { type: "OPEN_URL", data: {} }, screen_id: "SCREEN_A" },
        {}
      );

      assert.equal(result, false);
      assert.notCalled(handleActionStub);
    });

    it("skips a `once` action when the screen has already been seen", async () => {
      sandbox.stub(ASRouterScreenUtils, "hasSeenScreen").resolves(true);

      const result = await ASRouterScreenUtils.handleImpressionAction(
        {
          action: { type: "PIN_FIREFOX_TO_TASKBAR", once: true },
          screen_id: "SCREEN_A",
        },
        {}
      );

      assert.equal(result, false);
      assert.notCalled(handleActionStub);
    });

    it("fires a `once` action when the screen has not been seen", async () => {
      sandbox.stub(ASRouterScreenUtils, "hasSeenScreen").resolves(false);

      const result = await ASRouterScreenUtils.handleImpressionAction(
        {
          action: { type: "PIN_FIREFOX_TO_TASKBAR", once: true },
          screen_id: "SCREEN_A",
        },
        {}
      );

      assert.equal(result, true);
      assert.calledOnce(handleActionStub);
    });
  });
});
