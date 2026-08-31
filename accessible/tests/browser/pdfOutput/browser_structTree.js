/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

addPdfStructTreeTest(
  "testBasic",
  `
<h1>h1</h1>
<p>p1</p>
<div role="heading" aria-level="2">h2</div>
<ul>
  <li>uli1</li>
  <li>uli2</li>
</ul>
<ol>
  <li>oli</li>
</ol>
<table>
  <tr><th>tc1</th><th>tc2</th></tr>
  <tr><th>tc3</th><td>tc4</td></tr>
</table>
  `,
  [
    {
      role: "Root",
      children: [
        {
          role: "Document",
          children: [
            {
              role: "H1",
              children: [
                { role: "NonStruct", children: [{ content: ["h1"] }] },
              ],
            },
            {
              role: "P",
              children: [
                { role: "NonStruct", children: [{ content: ["p1"] }] },
              ],
            },
            {
              role: "H2",
              children: [
                { role: "NonStruct", children: [{ content: ["h2"] }] },
              ],
            },
            {
              role: "L",
              children: [
                {
                  role: "LI",
                  children: [
                    { role: "Lbl", children: [{ content: ["•"] }] },
                    {
                      role: "NonStruct",
                      children: [{ content: [" ", "uli1"] }],
                    },
                  ],
                },
                {
                  role: "LI",
                  children: [
                    { role: "Lbl", children: [{ content: ["•"] }] },
                    {
                      role: "NonStruct",
                      children: [{ content: [" ", "uli2"] }],
                    },
                  ],
                },
              ],
            },
            {
              role: "L",
              children: [
                {
                  role: "LI",
                  children: [
                    { role: "Lbl", children: [{ content: ["1."] }] },
                    {
                      role: "NonStruct",
                      children: [{ content: [" ", "oli"] }],
                    },
                  ],
                },
              ],
            },
            {
              role: "Table",
              children: [
                {
                  role: "TR",
                  children: [
                    {
                      // XXX pdf.js doesn't support attributes yet, so we can't
                      // test scope, headers, col/row span, etc.
                      role: "TH",
                      children: [
                        { role: "NonStruct", children: [{ content: ["tc1"] }] },
                      ],
                    },
                    {
                      role: "TH",
                      children: [
                        {
                          role: "NonStruct",
                          children: [{ content: [" ", "tc2"] }],
                        },
                      ],
                    },
                  ],
                },
                {
                  role: "TR",
                  children: [
                    {
                      role: "TH",
                      children: [
                        { role: "NonStruct", children: [{ content: ["tc3"] }] },
                      ],
                    },
                    {
                      role: "TD",
                      children: [
                        {
                          role: "NonStruct",
                          children: [{ content: [" ", "tc4"] }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  { chrome: true, topLevel: true }
);

addPdfStructTreeTest(
  "testIframe",
  `<h1>inside</h1>`,
  [
    {
      role: "Root",
      children: [
        {
          role: "Document",
          children: [
            {
              role: "NonStruct", // iframe
              children: [
                // XXX We render an empty marked content sequence before an
                // iframe document for some unknown reason. This is inconsequential.
                { content: [] },
                {
                  role: "Document",
                  children: [
                    {
                      role: "H1",
                      children: [
                        {
                          role: "NonStruct",
                          children: [{ content: ["inside"] }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  { topLevel: false, iframe: true, remoteIframe: true }
);

addPdfStructTreeTest(
  "testIframeWithSurroundingContent",
  `
<h1>before</h1>
<iframe src="data:text/html,<h2>inside</h2>"></iframe>
<h3>after</h3>
  `,
  [
    {
      role: "Root",
      children: [
        {
          role: "Document",
          children: [
            {
              role: "H1",
              children: [
                { role: "NonStruct", children: [{ content: ["before"] }] },
              ],
            },
            {
              role: "NonStruct", // iframe
              children: [
                { content: [] },
                {
                  role: "Document",
                  children: [
                    {
                      role: "H2",
                      children: [
                        {
                          role: "NonStruct",
                          children: [{ content: ["inside"] }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              role: "H3",
              children: [
                { role: "NonStruct", children: [{ content: ["after"] }] },
              ],
            },
          ],
        },
      ],
    },
  ]
);

addPdfStructTreeTest(
  "testAriaOwns",
  `
<div aria-owns="h3 h2 h1">
  <h1 id="h1">h1</h1>
  <h2 id="h2">h2</h2>
</div>
<h3 id="h3">h3</h3>
  `,
  [
    {
      role: "Root",
      children: [
        {
          role: "Document",
          children: [
            {
              role: "NonStruct", // div
              children: [
                {
                  role: "H3",
                  children: [
                    { role: "NonStruct", children: [{ content: ["h3"] }] },
                  ],
                },
                {
                  role: "H2",
                  children: [
                    { role: "NonStruct", children: [{ content: ["h2"] }] },
                  ],
                },
                {
                  role: "H1",
                  children: [
                    { role: "NonStruct", children: [{ content: ["h1"] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  { chrome: true, topLevel: true }
);
