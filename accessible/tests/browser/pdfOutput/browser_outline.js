/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

addPdfOutlineTest(
  "testBasic",
  `
<p>p</p>
<h1>1.</h1>
<p>p</p>
<h1>2.</h1>
<h2>2.1.</h2>
<h3>2.1.1.</h3>
<p>p</p>
<h2>2.2</h2>
<section>
  <div role="heading" aria-level="1">3.</div>
</section>
<h2 aria-label="3.1.">x</h2>
<h4>h4 skipping h3</h4>
<p>p</p>
  `,
  [
    { title: "1.", items: [] },
    {
      title: "2.",
      items: [
        {
          title: "2.1.",
          items: [{ title: "2.1.1.", items: [] }],
        },
        { title: "2.2", items: [] },
      ],
    },
    {
      title: "3.",
      items: [
        { title: "3.1.", items: [{ title: "h4 skipping h3", items: [] }] },
      ],
    },
  ],
  { chrome: true, topLevel: true }
);

addPdfOutlineTest(
  "testIframeWithSurroundingContent",
  `
<h1>1.</h1>
<iframe src="data:text/html,<h2>1.1.</h2>"></iframe>
<h1>2.</h1>
  `,
  [
    { title: "1.", items: [{ title: "1.1.", items: [] }] },
    { title: "2.", items: [] },
  ]
);
