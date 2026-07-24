import React, { useEffect } from "react";
import { mount } from "enzyme";
import {
  useIntersectionObserver,
  getActiveCardSize,
  getActiveColumnLayout,
  useConfetti,
} from "content-src/lib/utils.jsx";

// Test component to use the useIntersectionObserver
function TestComponent({ callback, threshold }) {
  const ref = useIntersectionObserver(callback, threshold);
  return <div ref={el => ref.current.push(el)}></div>;
}

function TestConfettiComponent({ count, spread }) {
  const [canvasRef, fireConfetti] = useConfetti(count, spread);

  useEffect(() => {
    // Trigger the animation once mounted
    fireConfetti();
  }, [fireConfetti]);

  return <canvas ref={canvasRef} width={100} height={100} />;
}

describe("useIntersectionObserver", () => {
  let callback;
  let threshold;
  let sandbox;
  let observerStub;
  let wrapper;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    callback = sandbox.spy();
    threshold = 0.5;
    observerStub = sandbox
      .stub(window, "IntersectionObserver")
      .callsFake(function (cb) {
        this.observe = sandbox.spy();
        this.unobserve = sandbox.spy();
        this.disconnect = sandbox.spy();
        this.callback = cb;
      });
    wrapper = mount(
      <TestComponent callback={callback} threshold={threshold} />
    );
  });

  afterEach(() => {
    sandbox.restore();
    wrapper.unmount();
  });

  it("should create an IntersectionObserver instance with the correct options", () => {
    assert.calledWithNew(observerStub);
    assert.calledWith(observerStub, sinon.match.any, { threshold });
  });

  it("should observe elements when mounted", () => {
    const observerInstance = observerStub.getCall(0).returnValue;
    assert.called(observerInstance.observe);
  });

  it("should call callback and unobserve element when it intersects", () => {
    wrapper = mount(
      <TestComponent callback={callback} threshold={threshold} />
    );
    const observerInstance = observerStub.getCall(0).returnValue;
    const observedElement = wrapper.find("div").getDOMNode();

    // Simulate an intersection
    observerInstance.callback([
      { isIntersecting: true, target: observedElement },
    ]);

    assert.calledOnce(callback);
    assert.calledWith(callback, observedElement);
    assert.calledOnce(observerInstance.unobserve);
    assert.calledWith(observerInstance.unobserve, observedElement);
  });

  it("should not call callback if element is not intersecting", () => {
    wrapper = mount(
      <TestComponent callback={callback} threshold={threshold} />
    );
    const observerInstance = observerStub.getCall(0).returnValue;
    const observedElement = wrapper.find("div").getDOMNode();

    // Simulate a non-intersecting entry
    observerInstance.callback([
      { isIntersecting: false, target: observedElement },
    ]);

    assert.notCalled(callback);
    assert.notCalled(observerInstance.unobserve);
  });
});

describe("getActiveCardSize", () => {
  it("returns 'large-card' for col-4-large and screen width 1920 and sections enabled", () => {
    const result = getActiveCardSize(
      1920,
      "col-4-large col-3-medium col-2-small col-1-small",
      true
    );
    assert.equal(result, "large-card");
  });

  it("returns 'medium-card' for col-3-medium and screen width 1200 and sections enabled", () => {
    const result = getActiveCardSize(
      1200,
      "col-4-large col-3-medium col-2-small col-1-small",
      true
    );
    assert.equal(result, "medium-card");
  });

  it("returns 'small-card' for col-2-small and screen width 800 and sections enabled", () => {
    const result = getActiveCardSize(
      800,
      "col-4-large col-3-medium col-2-small col-1-medium",
      true
    );
    assert.equal(result, "small-card");
  });

  it("returns 'medium-card' for col-1-medium at 500px", () => {
    const result = getActiveCardSize(
      500,
      "col-1-medium col-1-position-0",
      true
    );
    assert.equal(result, "medium-card");
  });

  it("returns 'medium-card' for col-1-small at 500px (edge case)", () => {
    const result = getActiveCardSize(500, "col-1-small col-1-position-0", true);
    assert.equal(result, "medium-card");
  });

  it("returns null when no matching card type is found (edge case)", () => {
    const result = getActiveCardSize(
      1200,
      "col-4-position-0 col-3-position-0",
      true
    );
    assert.isNull(result);
  });

  it("returns 'medium-card' when required arguments are missing and sections are disabled", () => {
    const result = getActiveCardSize(null, null, false);
    assert.equal(result, "medium-card");
  });

  it("returns null when required arguments are missing and sections are enabled", () => {
    const result = getActiveCardSize(null, null, true);
    assert.isNull(result);
  });

  it("returns 'spoc' when flightId has value", () => {
    const result = getActiveCardSize(null, null, false, 123);
    assert.equal(result, "spoc");
  });
});

describe("getActiveColumnLayout", () => {
  it("returns 'col-4' for screen width 1920", () => {
    const result = getActiveColumnLayout(1920);
    assert.equal(result, "col-4");
  });

  it("returns 'col-3' for screen width 1200", () => {
    const result = getActiveColumnLayout(1200);
    assert.equal(result, "col-3");
  });

  it("returns 'col-2' for screen width 800", () => {
    const result = getActiveColumnLayout(800);
    assert.equal(result, "col-2");
  });

  it("returns 'col-1' for screen width 500", () => {
    const result = getActiveColumnLayout(500);
    assert.equal(result, "col-1");
  });
});

describe("useConfetti hook", () => {
  let sandbox;
  let rafStub;
  // eslint-disable-next-line no-unused-vars
  let cafStub;
  let getContextStub;
  let fakeContext;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Create a fake 2D context
    fakeContext = {
      clearRect: sandbox.spy(),
      setTransform: sandbox.spy(),
      rotate: sandbox.spy(),
      scale: sandbox.spy(),
      fillRect: sandbox.spy(),
      globalAlpha: 1,
    };

    // Stub getContext on all canvas elements
    getContextStub = sandbox
      .stub(HTMLCanvasElement.prototype, "getContext")
      .withArgs("2d")
      .returns(fakeContext);

    sandbox
      .stub(window, "matchMedia")
      .withArgs("(prefers-reduced-motion: reduce)")
      .returns({ matches: false });

    // stub so that it only runs for one frame
    rafStub = sandbox.stub(window, "requestAnimationFrame").returns(24);
    cafStub = sandbox.stub(window, "cancelAnimationFrame");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should initialize and animate confetti when fireConfetti is called", () => {
    // Mount the component, which calls fireConfetti in useEffect
    mount(<TestConfettiComponent count={5} />);
    assert.calledWith(getContextStub, "2d");
    assert.ok(fakeContext.clearRect.calledOnce);
    assert.equal(fakeContext.fillRect.callCount, 5);
    assert.ok(rafStub.calledOnce);
  });
  it("does nothing when prefers-reduced-motion is enabled", () => {
    // simulate prefers reduced motion
    window.matchMedia
      .withArgs("(prefers-reduced-motion: reduce)")
      .returns({ matches: true });

    mount(<TestConfettiComponent count={5} />);

    // Confrim the confetti hasnt been drawn
    assert.ok(fakeContext.clearRect.notCalled);
    assert.ok(fakeContext.fillRect.notCalled);
    assert.ok(rafStub.notCalled);
  });
});
