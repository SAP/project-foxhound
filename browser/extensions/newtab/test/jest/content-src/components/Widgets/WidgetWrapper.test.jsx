/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { WidgetWrapper } from "content-src/components/Widgets/WidgetWrapper";

describe("<WidgetWrapper>", () => {
  it("renders a <div> with its children", () => {
    const { container } = render(
      <WidgetWrapper>
        <span data-testid="child" />
      </WidgetWrapper>
    );
    const div = container.firstChild;
    expect(div).not.toBeNull();
    expect(div.tagName).toBe("DIV");
    expect(div.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it("forwards arbitrary props to the div (data attrs, handlers, classes)", () => {
    const onClick = jest.fn();
    const { container } = render(
      <WidgetWrapper
        className="extra"
        data-widget-id="weather"
        onClick={onClick}
      />
    );
    const div = container.firstChild;
    expect(div.className).toBe("widget-wrapper col-4 extra");
    expect(div.getAttribute("data-widget-id")).toBe("weather");
    fireEvent.click(div);
    expect(onClick).toHaveBeenCalled();
  });

  it("merges dragProps spread onto the wrapper (className + handlers)", () => {
    const onDragStart = jest.fn();
    const { container } = render(
      <WidgetWrapper
        className="widget-draggable is-dragging"
        draggable={true}
        tabIndex={0}
        data-l10n-id="drag-label-x"
        onDragStart={onDragStart}
      />
    );
    const div = container.firstChild;
    expect(div.className).toBe(
      "widget-wrapper col-4 widget-draggable is-dragging"
    );
    expect(div.getAttribute("draggable")).toBe("true");
    expect(div.getAttribute("tabindex")).toBe("0");
    expect(div.getAttribute("data-l10n-id")).toBe("drag-label-x");
    fireEvent.dragStart(div);
    expect(onDragStart).toHaveBeenCalled();
  });

  it("renders cleanly with no extra props", () => {
    const { container } = render(<WidgetWrapper />);
    const div = container.firstChild;
    expect(div.className).toBe("widget-wrapper col-4");
    expect(div.hasAttribute("draggable")).toBe(false);
  });
});
