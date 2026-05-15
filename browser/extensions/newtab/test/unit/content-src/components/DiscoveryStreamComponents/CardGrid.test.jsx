import {
  _CardGrid as CardGrid,
  // eslint-disable-next-line no-shadow
  IntersectionObserver,
} from "content-src/components/DiscoveryStreamComponents/CardGrid/CardGrid";
import { combineReducers, createStore } from "redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { Provider } from "react-redux";
import { DSCard } from "content-src/components/DiscoveryStreamComponents/DSCard/DSCard";
import { TopicsWidget } from "content-src/components/DiscoveryStreamComponents/TopicsWidget/TopicsWidget";
import React from "react";
import { shallow, mount } from "enzyme";

// Wrap this around any component that uses useSelector,
// or any mount that uses a child that uses redux.
function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<CardGrid>", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <CardGrid
        Prefs={INITIAL_STATE.Prefs}
        DiscoveryStream={INITIAL_STATE.DiscoveryStream}
      />
    );
  });

  it("should render an empty div", () => {
    assert.ok(wrapper.exists());
    assert.lengthOf(wrapper.children(), 0);
  });

  it("should render DSCards", () => {
    wrapper.setProps({ items: 2, data: { recommendations: [{}, {}] } });

    assert.lengthOf(wrapper.find(".ds-card-grid").children(), 2);
    assert.equal(wrapper.find(".ds-card-grid").children().at(0).type(), DSCard);
  });

  it("should add 4 card classname to card grid", () => {
    wrapper.setProps({
      fourCardLayout: true,
      data: { recommendations: [{}, {}] },
    });

    assert.ok(wrapper.find(".ds-card-grid-four-card-variant").exists());
  });

  it("should add no description classname to card grid", () => {
    wrapper.setProps({
      hideCardBackground: true,
      data: { recommendations: [{}, {}] },
    });

    assert.ok(wrapper.find(".ds-card-grid-hide-background").exists());
  });

  it("should add/hide description classname to card grid", () => {
    wrapper.setProps({
      data: { recommendations: [{}, {}] },
    });

    assert.ok(wrapper.find(".ds-card-grid-include-descriptions").exists());

    wrapper.setProps({
      hideDescriptions: true,
      data: { recommendations: [{}, {}] },
    });

    assert.ok(!wrapper.find(".ds-card-grid-include-descriptions").exists());
  });

  it("should create a widget card", () => {
    wrapper.setProps({
      widgets: {
        positions: [{ index: 1 }],
        data: [{ type: "TopicsWidget" }],
      },
      data: {
        recommendations: [{}, {}, {}],
      },
    });

    assert.ok(wrapper.find(TopicsWidget).exists());
  });

  it("should render AdBanner if enabled", () => {
    const commonProps = {
      ...INITIAL_STATE,
      items: 2,
      data: { recommendations: [{}, {}] },
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          "newtabAdSize.leaderboard": true,
          "newtabAdSize.billboard": true,
        },
      },
      DiscoveryStream: {
        ...INITIAL_STATE.DiscoveryStream,
        spocs: {
          ...INITIAL_STATE.DiscoveryStream.spocs,
          data: {
            newtab_spocs: {
              items: [
                {
                  format: "leaderboard",
                },
              ],
            },
          },
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider>
        <CardGrid {...commonProps} />
      </WrapWithProvider>
    );

    assert.ok(wrapper.find(".ad-banner-wrapper").exists());
  });

  describe("Keyboard navigation", () => {
    beforeEach(() => {
      const commonProps = {
        items: 3,
        data: {
          recommendations: [{}, {}, {}],
        },
        Prefs: INITIAL_STATE.Prefs,
        DiscoveryStream: INITIAL_STATE.DiscoveryStream,
      };

      wrapper = mount(
        <WrapWithProvider>
          <CardGrid {...commonProps} />
        </WrapWithProvider>
      );
    });

    afterEach(() => {
      wrapper.unmount();
    });

    it("should pass tabIndex={0} to the first card and tabIndex={-1} to other cards", () => {
      const firstCard = wrapper.find(DSCard).at(0);
      const secondCard = wrapper.find(DSCard).at(1);
      const thirdCard = wrapper.find(DSCard).at(2);

      assert.equal(firstCard.prop("tabIndex"), 0);
      assert.equal(secondCard.prop("tabIndex"), -1);
      assert.equal(thirdCard.prop("tabIndex"), -1);
    });

    it("should update focused index when onFocus is called", () => {
      const secondCard = wrapper.find(DSCard).at(1);
      const onFocus = secondCard.prop("onFocus");

      onFocus();
      wrapper.update();

      assert.equal(wrapper.find(DSCard).at(1).prop("tabIndex"), 0);
      assert.equal(wrapper.find(DSCard).at(0).prop("tabIndex"), -1);
    });

    describe("handleCardKeyDown", () => {
      let sandbox;
      let grid;
      let mockLink;
      let mockTargetCard;
      let mockCurrentCard;
      let mockEvent;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
        grid = wrapper.find(".ds-card-grid");

        mockLink = { focus: sandbox.spy() };
        mockTargetCard = {
          matches: sandbox.stub().returns(true),
          querySelector: sandbox.stub().returns(mockLink),
        };
        mockCurrentCard = {};
        mockEvent = {
          preventDefault: sandbox.spy(),
          target: {
            closest: sandbox.stub().returns(mockCurrentCard),
          },
        };
      });

      afterEach(() => {
        sandbox.restore();
      });

      it("should navigate to next card with ArrowRight", () => {
        mockEvent.key = "ArrowRight";
        mockCurrentCard.nextElementSibling = mockTargetCard;

        grid.prop("onKeyDown")(mockEvent);

        assert.calledOnce(mockEvent.preventDefault);
        assert.calledOnce(mockTargetCard.querySelector);
        assert.calledWith(mockTargetCard.querySelector, "a.ds-card-link");
        assert.calledOnce(mockLink.focus);
      });

      it("should navigate to previous card with ArrowLeft", () => {
        mockEvent.key = "ArrowLeft";
        mockCurrentCard.previousElementSibling = mockTargetCard;

        grid.prop("onKeyDown")(mockEvent);

        assert.calledOnce(mockEvent.preventDefault);
        assert.calledOnce(mockTargetCard.querySelector);
        assert.calledWith(mockTargetCard.querySelector, "a.ds-card-link");
        assert.calledOnce(mockLink.focus);
      });

      it("should return early if no current card found", () => {
        mockEvent.key = "ArrowRight";
        mockEvent.target.closest.returns(null);

        grid.prop("onKeyDown")(mockEvent);

        assert.calledOnce(mockEvent.preventDefault);
        assert.notCalled(mockTargetCard.querySelector);
      });

      it("should handle case where no matching sibling card is found", () => {
        mockEvent.key = "ArrowRight";
        mockCurrentCard.nextElementSibling = {
          matches: sandbox.stub().returns(false),
        };

        grid.prop("onKeyDown")(mockEvent);

        assert.calledOnce(mockEvent.preventDefault);
        assert.notCalled(mockLink.focus);
      });
    });
  });
});

// Build IntersectionObserver class with the arg `entries` for the intersect callback.
function buildIntersectionObserver(entries) {
  return class {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      this.callback(entries);
    }

    unobserve() {}

    disconnect() {}
  };
}

describe("<IntersectionObserver>", () => {
  let wrapper;
  let fakeWindow;
  let intersectEntries;

  beforeEach(() => {
    intersectEntries = [{ isIntersecting: true }];
    fakeWindow = {
      IntersectionObserver: buildIntersectionObserver(intersectEntries),
    };
    wrapper = mount(<IntersectionObserver windowObj={fakeWindow} />);
  });

  it("should render an empty div", () => {
    assert.ok(wrapper.exists());
    assert.equal(wrapper.children().at(0).type(), "div");
  });

  it("should fire onIntersecting", () => {
    const onIntersecting = sinon.stub();
    wrapper = mount(
      <IntersectionObserver
        windowObj={fakeWindow}
        onIntersecting={onIntersecting}
      />
    );
    assert.calledOnce(onIntersecting);
  });
});
