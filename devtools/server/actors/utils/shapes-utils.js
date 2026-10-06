/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Get the distance between two points on a plane.
 *
 * @param {number} x1 the x coord of the first point
 * @param {number} y1 the y coord of the first point
 * @param {number} x2 the x coord of the second point
 * @param {number} y2 the y coord of the second point
 * @returns {number} the distance between the two points
 */
const getDistance = (x1, y1, x2, y2) => {
  return Math.round(Math.hypot(x2 - x1, y2 - y1));
};

/**
 * Determine if the given x/y coords are along the edge of the given ellipse.
 * We allow for a small area around the edge that still counts as being on the edge.
 *
 * @param {number} x the x coordinate of the click
 * @param {number} y the y coordinate of the click
 * @param {number} cx the x coordinate of the center of the ellipse
 * @param {number} cy the y coordinate of the center of the ellipse
 * @param {number} rx the x radius of the ellipse
 * @param {number} ry the y radius of the ellipse
 * @param {number} clickWidthX the width of the area that counts as being on the edge
 *                             along the x radius.
 * @param {number} clickWidthY the width of the area that counts as being on the edge
 *                             along the y radius.
 * @returns {boolean} whether the click counts as being on the edge of the ellipse.
 */
const clickedOnEllipseEdge = (
  x,
  y,
  cx,
  cy,
  rx,
  ry,
  clickWidthX,
  clickWidthY
) => {
  // The formula to determine if something is inside or on the edge of an ellipse is:
  // (x - cx)^2/rx^2 + (y - cy)^2/ry^2 <= 1. If > 1, it's outside.
  // We make two ellipses, adjusting rx and ry with clickWidthX and clickWidthY
  // to allow for an area around the edge of the ellipse that can be clicked on.
  // If the click was outside the inner ellipse and inside the outer ellipse, return true.
  const inner =
    (x - cx) ** 2 / (rx - clickWidthX) ** 2 +
    (y - cy) ** 2 / (ry - clickWidthY) ** 2;
  const outer =
    (x - cx) ** 2 / (rx + clickWidthX) ** 2 +
    (y - cy) ** 2 / (ry + clickWidthY) ** 2;
  return inner >= 1 && outer <= 1;
};

/**
 * Get the distance between a point and a line defined by two other points.
 *
 * @param {number} x1 the x coordinate of the first point in the line
 * @param {number} y1 the y coordinate of the first point in the line
 * @param {number} x2 the x coordinate of the second point in the line
 * @param {number} y2 the y coordinate of the second point in the line
 * @param {number} x3 the x coordinate of the point for which the distance is found
 * @param {number} y3 the y coordinate of the point for which the distance is found
 * @returns {number} the distance between (x3,y3) and the line defined by
 *          (x1,y1) and (y1,y2)
 */
const distanceToLine = (x1, y1, x2, y2, x3, y3) => {
  // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line#Line_defined_by_two_points
  const num = Math.abs((y2 - y1) * x3 - (x2 - x1) * y3 + x2 * y1 - y2 * x1);
  const denom = getDistance(x1, y1, x2, y2);
  return num / denom;
};

/**
 * Get the point on the line defined by points a,b that is closest to point c
 *
 * @param {number} ax the x coordinate of point a
 * @param {number} ay the y coordinate of point a
 * @param {number} bx the x coordinate of point b
 * @param {number} by the y coordinate of point b
 * @param {number} cx the x coordinate of point c
 * @param {number} cy the y coordinate of point c
 * @returns {Array} a 2 element array that contains the x/y coords of the projected point
 */
const projection = (ax, ay, bx, by, cx, cy) => {
  // https://en.wikipedia.org/wiki/Vector_projection#Vector_projection_2
  const ab = [bx - ax, by - ay];
  const ac = [cx - ax, cy - ay];
  const scalar = dotProduct(ab, ac) / dotProduct(ab, ab);
  return [ax + scalar * ab[0], ay + scalar * ab[1]];
};

/**
 * Get the dot product of two vectors, represented by arrays of numbers.
 *
 * @param {Array} a the first vector
 * @param {Array} b the second vector
 * @returns {number} the dot product of a and b
 */
const dotProduct = (a, b) => {
  return a.reduce((prev, curr, i) => {
    return prev + curr * b[i];
  }, 0);
};

/**
 * Determine if the given x/y coords are above the given point.
 *
 * @param {number} x the x coordinate of the click
 * @param {number} y the y coordinate of the click
 * @param {number} pointX the x coordinate of the center of the point
 * @param {number} pointY the y coordinate of the center of the point
 * @param {number} radiusX the x radius of the point
 * @param {number} radiusY the y radius of the point
 * @returns {boolean} whether the click was on the point
 */
const clickedOnPoint = (x, y, pointX, pointY, radiusX, radiusY) => {
  return (
    x >= pointX - radiusX &&
    x <= pointX + radiusX &&
    y >= pointY - radiusY &&
    y <= pointY + radiusY
  );
};

const roundTo = (value, exp) => {
  // If the exp is undefined or zero...
  if (typeof exp === "undefined" || +exp === 0) {
    return Math.round(value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === "number" && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split("e");
  value = Math.round(+(value[0] + "e" + (value[1] ? +value[1] - exp : -exp)));
  // Shift back
  value = value.toString().split("e");
  return +(value[0] + "e" + (value[1] ? +value[1] + exp : exp));
};

exports.getDistance = getDistance;
exports.clickedOnEllipseEdge = clickedOnEllipseEdge;
exports.distanceToLine = distanceToLine;
exports.projection = projection;
exports.clickedOnPoint = clickedOnPoint;
exports.roundTo = roundTo;
