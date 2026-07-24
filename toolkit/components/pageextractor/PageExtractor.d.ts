/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export type GetTextOptions = Partial<{
  // The length of extracted text that is sufficient for the purpose.
  // When set, extraction will stop when the text meets or exceeds this length.
  // When unset, the lenghth of the extracted text is unbounded.
  sufficientLength: number;
  // Just include the viewport content.
  justViewport: boolean;
  // Skip canvases smaller than this dimension
  minCanvasSize: number;
  // Max canvases to collect
  maxCanvasCount: number;
  // Enable canvas capture
  includeCanvasSnapshots: boolean;
  // Max width/height for captured canvases
  maxCanvasDimension: number;
  // WebP quality 0-1
  canvasQuality: number;
}>;

export type GetDOMOptions = GetTextOptions;

export type CanvasSnapshot = {
  blob: Blob;
  width: number;
  height: number;
};

export type DOMExtractionResult = {
  text: string;
  links: string[];
  canvases: HTMLCanvasElement[];
};

export type ExtractionResult = {
  text: string;
  links: string[];
  canvasSnapshots: CanvasSnapshot[];
};
