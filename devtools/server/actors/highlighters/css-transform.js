/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  AutoRefreshHighlighter,
} = require("resource://devtools/server/actors/highlighters/auto-refresh.js");
const {
  CanvasFrameAnonymousContentHelper,
  getComputedStyle,
} = require("resource://devtools/server/actors/highlighters/utils/markup.js");
const {
  setIgnoreLayoutChanges,
  getNodeBounds,
} = require("resource://devtools/shared/layout/utils.js");

// The minimum distance a line should be before it has an arrow marker-end
const ARROW_LINE_MIN_DISTANCE = 10;

var MARKER_COUNTER = 1;

/**
 * The CssTransformHighlighter is the class that draws an outline around a
 * transformed element and an outline around where it would be if untransformed
 * as well as arrows connecting the 2 outlines' corners.
 */
class CssTransformHighlighter extends AutoRefreshHighlighter {
  constructor(highlighterEnv) {
    super(highlighterEnv);

    this.markup = new CanvasFrameAnonymousContentHelper(
      this.highlighterEnv,
      this._buildMarkup.bind(this),
      {
        contentRootHostClassName: "devtools-highlighter-css-transform",
      }
    );
    this.isReady = this.markup.initialize();
  }

  _buildMarkup() {
    const container = this.markup.createNode({
      attributes: {
        class: "highlighter-container",
      },
    });

    // The root wrapper is used to unzoom the highlighter when needed.
    this.rootEl = this.markup.createNode({
      parent: container,
      attributes: {
        id: "css-transform-root",
        class: "css-transform-root",
      },
    });

    const svg = this.markup.createSVGNode({
      nodeType: "svg",
      parent: this.rootEl,
      attributes: {
        id: "css-transform-elements",
        hidden: "true",
        width: "100%",
        height: "100%",
      },
    });

    // Add a marker tag to the svg root for the arrow tip
    this.markerId = "css-transform-arrow-marker-" + MARKER_COUNTER;
    MARKER_COUNTER++;
    const marker = this.markup.createSVGNode({
      nodeType: "marker",
      parent: svg,
      attributes: {
        id: this.markerId,
        markerWidth: "10",
        markerHeight: "5",
        orient: "auto",
        markerUnits: "strokeWidth",
        refX: "10",
        refY: "5",
        viewBox: "0 0 10 10",
      },
    });
    this.markup.createSVGNode({
      nodeType: "path",
      parent: marker,
      attributes: {
        d: "M 0 0 L 10 5 L 0 10 z",
        fill: "#08C",
      },
    });

    const shapesGroup = this.markup.createSVGNode({
      nodeType: "g",
      parent: svg,
    });

    // Create the 2 polygons (transformed and untransformed)
    this.markup.createSVGNode({
      nodeType: "polygon",
      parent: shapesGroup,
      attributes: {
        id: "css-transform-untransformed",
        class: "css-transform-untransformed",
      },
    });
    this.markup.createSVGNode({
      nodeType: "polygon",
      parent: shapesGroup,
      attributes: {
        id: "css-transform-transformed",
        class: "css-transform-transformed",
      },
    });

    // Create the arrows
    for (const nb of ["1", "2", "3", "4"]) {
      this.markup.createSVGNode({
        nodeType: "line",
        parent: shapesGroup,
        attributes: {
          id: "css-transform-line" + nb,
          class: "css-transform-line",
          "marker-end": "url(#" + this.markerId + ")",
        },
      });
    }

    return container;
  }

  /**
   * Destroy the nodes. Remove listeners.
   */
  destroy() {
    AutoRefreshHighlighter.prototype.destroy.call(this);
    this.markup.destroy();
    this.rootEl = null;
  }

  getElement(id) {
    return this.markup.getElement(id);
  }

  /**
   * Show the highlighter on a given node
   */
  _show() {
    if (!this._isTransformed(this.currentNode)) {
      this.hide();
      return false;
    }

    return this._update();
  }

  /**
   * Checks if the supplied node is transformed and not inline
   */
  _isTransformed(node) {
    const style = getComputedStyle(node);
    return style && style.transform !== "none" && style.display !== "inline";
  }

  _setPolygonPoints(quad, id) {
    const points = [];
    for (const point of ["p1", "p2", "p3", "p4"]) {
      points.push(quad[point].x + "," + quad[point].y);
    }
    this.getElement(id).setAttribute("points", points.join(" "));
  }

  _setLinePoints(p1, p2, id) {
    const line = this.getElement(id);
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);

    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    if (dist < ARROW_LINE_MIN_DISTANCE) {
      line.removeAttribute("marker-end");
    } else {
      line.setAttribute("marker-end", "url(#" + this.markerId + ")");
    }
  }

  /**
   * Update the highlighter on the current highlighted node (the one that was
   * passed as an argument to show(node)).
   * Should be called whenever node size or attributes change
   */
  _update() {
    setIgnoreLayoutChanges(true);

    // Getting the points for the transformed shape
    const quads = this.currentQuads.border;
    if (
      !quads.length ||
      quads[0].bounds.width <= 0 ||
      quads[0].bounds.height <= 0
    ) {
      this._hideShapes();
      return false;
    }

    const [quad] = quads;

    // Getting the points for the untransformed shape
    const untransformedQuad = getNodeBounds(this.win, this.currentNode);

    this._setPolygonPoints(quad, "css-transform-transformed");
    this._setPolygonPoints(untransformedQuad, "css-transform-untransformed");
    this._setLinePoints(untransformedQuad.p1, quad.p1, "css-transform-line1");
    this._setLinePoints(untransformedQuad.p2, quad.p2, "css-transform-line2");
    this._setLinePoints(untransformedQuad.p3, quad.p3, "css-transform-line3");
    this._setLinePoints(untransformedQuad.p4, quad.p4, "css-transform-line4");

    // Adapt to the current zoom
    this.markup.scaleRootElement(this.currentNode, "css-transform-root");

    this._showShapes();

    setIgnoreLayoutChanges(
      false,
      this.highlighterEnv.window.document.documentElement
    );
    return true;
  }

  /**
   * Hide the highlighter, the outline and the infobar.
   */
  _hide() {
    setIgnoreLayoutChanges(true);
    this._hideShapes();
    setIgnoreLayoutChanges(
      false,
      this.highlighterEnv.window.document.documentElement
    );
  }

  _hideShapes() {
    this.getElement("css-transform-elements").setAttribute("hidden", "true");
  }

  _showShapes() {
    this.getElement("css-transform-elements").removeAttribute("hidden");
  }
}

exports.CssTransformHighlighter = CssTransformHighlighter;
