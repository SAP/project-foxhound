/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Request 2x longer timeout for this test.
 * There are lot of test cases in this file, but they are all of the same nature,
 * and it makes the most sense to have them all in this single test file.
 */
requestLongerTimeout(2);

add_task(
  async function test_direction_ltr_to_rtl_basic_content_not_attributes() {
    const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
      /* html */ `
      <div id="content" title="A translated title">
        This block of content should get RTL direction.
      </div>
      <input id="onlyPlaceholder" type="text" placeholder="A translated placeholder">
      <div id="onlyTitle" title="Only a translated title"></div>
      <div>
        Div text.
        <span>Span within a div.</span>
      </div>
      <span>
        Span text.
        <div>Div within a span.</div>
      </span>
    `,
      { sourceLanguage: "en", targetLanguage: "ar" }
    );

    translate();

    await htmlMatches(
      'LTR to RTL (basic): content elements get dir="rtl", but attribute-only elements do not.',
      /* html */ `
      <div id="content" title="A TRANSLATED TITLE" dir="rtl">
        THIS BLOCK OF CONTENT SHOULD GET RTL DIRECTION.
      </div>
      <input id="onlyPlaceholder" type="text" placeholder="A TRANSLATED PLACEHOLDER">
      <div id="onlyTitle" title="ONLY A TRANSLATED TITLE"></div>
      <div dir="rtl">
        DIV TEXT.
        <span>
          SPAN WITHIN A DIV.
        </span>
      </div>
      <span dir="rtl">
        SPAN TEXT.
        <div dir="rtl">
          DIV WITHIN A SPAN.
        </div>
      </span>
    `
    );

    cleanup();
  }
);

add_task(async function test_direction_ltr_to_rtl_lists_ul_basic() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ul>
      <li>List item.</li>
    </ul>
    <ul>
      <li>
        Span within list item.
        <span>Span inside list item.</span>
      </li>
    </ul>
    <ul>
      <li>
        Div within list item.
        <div>Div inside list item.</div>
      </li>
    </ul>
    `,
    { sourceLanguage: "en", targetLanguage: "ar" }
  );

  translate();

  await htmlMatches(
    "LTR to RTL (UL basic): <ul> and <li> with simple nested inline/block content.",
    /* html */ `
    <ul dir="rtl">
      <li dir="rtl">
        LIST ITEM.
      </li>
    </ul>
    <ul dir="rtl">
      <li dir="rtl">
        SPAN WITHIN LIST ITEM.
        <span>
          SPAN INSIDE LIST ITEM.
        </span>
      </li>
    </ul>
    <ul dir="rtl">
      <li dir="rtl">
        DIV WITHIN LIST ITEM.
        <div dir="rtl">
          DIV INSIDE LIST ITEM.
        </div>
      </li>
    </ul>
    `
  );

  cleanup();
});

add_task(async function test_direction_ltr_to_rtl_lists_ul_nested_combos() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ul>
      <li>
        Span within div within list item.
        <div>
          <span>Span inside div inside list item.</span>
        </div>
      </li>
    </ul>
    <ul>
      <li>
        Div within span within list item.
        <span>
          <div>Div inside span inside list item.</div>
        </span>
      </li>
    </ul>
    `,
    { sourceLanguage: "en", targetLanguage: "ar" }
  );

  translate();

  await htmlMatches(
    "LTR to RTL (UL nested combos): nested inline/block permutations.",
    /* html */ `
    <ul dir="rtl">
      <li dir="rtl">
        SPAN WITHIN DIV WITHIN LIST ITEM.
        <div dir="rtl">
          <span>
            SPAN INSIDE DIV INSIDE LIST ITEM.
          </span>
        </div>
      </li>
    </ul>
    <ul dir="rtl">
      <li dir="rtl">
        DIV WITHIN SPAN WITHIN LIST ITEM.
        <span>
          <div dir="rtl">
            DIV INSIDE SPAN INSIDE LIST ITEM.
          </div>
        </span>
      </li>
    </ul>
    `
  );

  cleanup();
});

add_task(async function test_direction_ltr_to_rtl_lists_ol_basic() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ol>
      <li>List item.</li>
    </ol>
    <ol>
      <li>
        Span within list item.
        <span>Span inside list item.</span>
      </li>
    </ol>
    <ol>
      <li>
        Div within list item.
        <div>Div inside list item.</div>
      </li>
    </ol>
    `,
    { sourceLanguage: "en", targetLanguage: "ar" }
  );

  translate();

  await htmlMatches(
    "LTR to RTL (OL basic): <ol> and <li> with simple nested inline/block content.",
    /* html */ `
    <ol dir="rtl">
      <li dir="rtl">
        LIST ITEM.
      </li>
    </ol>
    <ol dir="rtl">
      <li dir="rtl">
        SPAN WITHIN LIST ITEM.
        <span>
          SPAN INSIDE LIST ITEM.
        </span>
      </li>
    </ol>
    <ol dir="rtl">
      <li dir="rtl">
        DIV WITHIN LIST ITEM.
        <div dir="rtl">
          DIV INSIDE LIST ITEM.
        </div>
      </li>
    </ol>
    `
  );

  cleanup();
});

add_task(async function test_direction_ltr_to_rtl_lists_ol_nested_combos() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ol>
      <li>
        Span within div within list item.
        <div>
          <span>Span inside div inside list item.</span>
        </div>
      </li>
    </ol>
    <ol>
      <li>
        Div within span within list item.
        <span>
          <div>Div inside span inside list item.</div>
        </span>
      </li>
    </ol>
    `,
    { sourceLanguage: "en", targetLanguage: "ar" }
  );

  translate();

  await htmlMatches(
    "LTR to RTL (OL nested combos): nested inline/block permutations.",
    /* html */ `
    <ol dir="rtl">
      <li dir="rtl">
        SPAN WITHIN DIV WITHIN LIST ITEM.
        <div dir="rtl">
          <span>
            SPAN INSIDE DIV INSIDE LIST ITEM.
          </span>
        </div>
      </li>
    </ol>
    <ol dir="rtl">
      <li dir="rtl">
        DIV WITHIN SPAN WITHIN LIST ITEM.
        <span>
          <div dir="rtl">
            DIV INSIDE SPAN INSIDE LIST ITEM.
          </div>
        </span>
      </li>
    </ol>
    `
  );

  cleanup();
});

add_task(
  async function test_direction_rtl_to_ltr_basic_content_not_attributes() {
    const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
      /* html */ `
      <div id="content" title="A translated title">
        This block of content should get LTR direction.
      </div>
      <input id="onlyPlaceholder" type="text" placeholder="A translated placeholder">
      <div id="onlyTitle" title="Only a translated title"></div>
      <div>
        Div text.
        <span>Span within a div.</span>
      </div>
      <span>
        Span text.
        <div>Div within a span.</div>
      </span>
    `,
      { sourceLanguage: "ar", targetLanguage: "en" }
    );

    translate();

    await htmlMatches(
      'RTL to LTR (basic): content elements get dir="ltr", but attribute-only elements do not.',
      /* html */ `
      <div id="content" title="A TRANSLATED TITLE" dir="ltr">
        THIS BLOCK OF CONTENT SHOULD GET LTR DIRECTION.
      </div>
      <input id="onlyPlaceholder" type="text" placeholder="A TRANSLATED PLACEHOLDER">
      <div id="onlyTitle" title="ONLY A TRANSLATED TITLE"></div>
      <div dir="ltr">
        DIV TEXT.
        <span>
          SPAN WITHIN A DIV.
        </span>
      </div>
      <span dir="ltr">
        SPAN TEXT.
        <div dir="ltr">
          DIV WITHIN A SPAN.
        </div>
      </span>
    `
    );

    cleanup();
  }
);

add_task(async function test_direction_rtl_to_ltr_lists_ul_basic() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ul>
      <li>List item.</li>
    </ul>
    <ul>
      <li>
        Span within list item.
        <span>Span inside list item.</span>
      </li>
    </ul>
    <ul>
      <li>
        Div within list item.
        <div>Div inside list item.</div>
      </li>
    </ul>
    `,
    { sourceLanguage: "ar", targetLanguage: "en" }
  );

  translate();

  await htmlMatches(
    "RTL to LTR (UL basic): <ul> and <li> with simple nested inline/block content.",
    /* html */ `
    <ul dir="ltr">
      <li dir="ltr">
        LIST ITEM.
      </li>
    </ul>
    <ul dir="ltr">
      <li dir="ltr">
        SPAN WITHIN LIST ITEM.
        <span>
          SPAN INSIDE LIST ITEM.
        </span>
      </li>
    </ul>
    <ul dir="ltr">
      <li dir="ltr">
        DIV WITHIN LIST ITEM.
        <div dir="ltr">
          DIV INSIDE LIST ITEM.
        </div>
      </li>
    </ul>
    `
  );

  cleanup();
});

add_task(async function test_direction_rtl_to_ltr_lists_ul_nested_combos() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ul>
      <li>
        Span within div within list item.
        <div>
          <span>Span inside div inside list item.</span>
        </div>
      </li>
    </ul>
    <ul>
      <li>
        Div within span within list item.
        <span>
          <div>Div inside span inside list item.</div>
        </span>
      </li>
    </ul>
    `,
    { sourceLanguage: "ar", targetLanguage: "en" }
  );

  translate();

  await htmlMatches(
    "RTL to LTR (UL nested combos): nested inline/block permutations.",
    /* html */ `
    <ul dir="ltr">
      <li dir="ltr">
        SPAN WITHIN DIV WITHIN LIST ITEM.
        <div dir="ltr">
          <span>
            SPAN INSIDE DIV INSIDE LIST ITEM.
          </span>
        </div>
      </li>
    </ul>
    <ul dir="ltr">
      <li dir="ltr">
        DIV WITHIN SPAN WITHIN LIST ITEM.
        <span>
          <div dir="ltr">
            DIV INSIDE SPAN INSIDE LIST ITEM.
          </div>
        </span>
      </li>
    </ul>
    `
  );

  cleanup();
});

add_task(async function test_direction_rtl_to_ltr_lists_ol_basic() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ol>
      <li>List item.</li>
    </ol>
    <ol>
      <li>
        Span within list item.
        <span>Span inside list item.</span>
      </li>
    </ol>
    <ol>
      <li>
        Div within list item.
        <div>Div inside list item.</div>
      </li>
    </ol>
    `,
    { sourceLanguage: "ar", targetLanguage: "en" }
  );

  translate();

  await htmlMatches(
    "RTL to LTR (OL basic): <ol> and <li> with simple nested inline/block content.",
    /* html */ `
    <ol dir="ltr">
      <li dir="ltr">
        LIST ITEM.
      </li>
    </ol>
    <ol dir="ltr">
      <li dir="ltr">
        SPAN WITHIN LIST ITEM.
        <span>
          SPAN INSIDE LIST ITEM.
        </span>
      </li>
    </ol>
    <ol dir="ltr">
      <li dir="ltr">
        DIV WITHIN LIST ITEM.
        <div dir="ltr">
          DIV INSIDE LIST ITEM.
        </div>
      </li>
    </ol>
    `
  );

  cleanup();
});

add_task(async function test_direction_rtl_to_ltr_lists_ol_nested_combos() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <ol>
      <li>
        Span within div within list item.
        <div>
          <span>Span inside div inside list item.</span>
        </div>
      </li>
    </ol>
    <ol>
      <li>
        Div within span within list item.
        <span>
          <div>Div inside span inside list item.</div>
        </span>
      </li>
    </ol>
    `,
    { sourceLanguage: "ar", targetLanguage: "en" }
  );

  translate();

  await htmlMatches(
    "RTL to LTR (OL nested combos): nested inline/block permutations.",
    /* html */ `
    <ol dir="ltr">
      <li dir="ltr">
        SPAN WITHIN DIV WITHIN LIST ITEM.
        <div dir="ltr">
          <span>
            SPAN INSIDE DIV INSIDE LIST ITEM.
          </span>
        </div>
      </li>
    </ol>
    <ol dir="ltr">
      <li dir="ltr">
        DIV WITHIN SPAN WITHIN LIST ITEM.
        <span>
          <div dir="ltr">
            DIV INSIDE SPAN INSIDE LIST ITEM.
          </div>
        </span>
      </li>
    </ol>
    `
  );

  cleanup();
});

add_task(async function test_direction_ltr_to_rtl_tables_basic() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <table>
      <tbody>
        <tr>
          <td>Cell text.</td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <td>
            Span within cell.
            <span>Span inside cell.</span>
          </td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <td>
            Div within cell.
            <div>Div inside cell.</div>
          </td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <th>Header cell.</th>
        </tr>
      </tbody>
    </table>
    `,
    { sourceLanguage: "en", targetLanguage: "ar" }
  );

  translate();

  await htmlMatches(
    "LTR to RTL (TABLE basic): <table> and <td>/<th> with simple nested inline/block content.",
    /* html */ `
    <table dir="rtl">
      <tbody dir="rtl">
        <tr dir="rtl">
          <td dir="rtl">
            CELL TEXT.
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="rtl">
      <tbody dir="rtl">
        <tr dir="rtl">
          <td dir="rtl">
            SPAN WITHIN CELL.
            <span>
              SPAN INSIDE CELL.
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="rtl">
      <tbody dir="rtl">
        <tr dir="rtl">
          <td dir="rtl">
            DIV WITHIN CELL.
            <div dir="rtl">
              DIV INSIDE CELL.
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="rtl">
      <tbody dir="rtl">
        <tr dir="rtl">
          <th dir="rtl">
            HEADER CELL.
          </th>
        </tr>
      </tbody>
    </table>
    `
  );

  cleanup();
});

add_task(async function test_direction_ltr_to_rtl_tables_nested_combos() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <table>
      <tbody>
        <tr>
          <td>
            Span within div within cell.
            <div>
              <span>Span inside div inside cell.</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <td>
            Div within span within cell.
            <span>
              <div>Div inside span inside cell.</div>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    `,
    { sourceLanguage: "en", targetLanguage: "ar" }
  );

  translate();

  await htmlMatches(
    "LTR to RTL (TABLE nested combos): nested inline/block permutations.",
    /* html */ `
    <table dir="rtl">
      <tbody dir="rtl">
        <tr dir="rtl">
          <td dir="rtl">
            SPAN WITHIN DIV WITHIN CELL.
            <div dir="rtl">
              <span>
                SPAN INSIDE DIV INSIDE CELL.
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="rtl">
      <tbody dir="rtl">
        <tr dir="rtl">
          <td dir="rtl">
            DIV WITHIN SPAN WITHIN CELL.
            <span>
              <div dir="rtl">
                DIV INSIDE SPAN INSIDE CELL.
              </div>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    `
  );

  cleanup();
});

add_task(async function test_direction_rtl_to_ltr_tables_basic() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <table>
      <tbody>
        <tr>
          <td>Cell text.</td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <td>
            Span within cell.
            <span>Span inside cell.</span>
          </td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <td>
            Div within cell.
            <div>Div inside cell.</div>
          </td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <th>Header cell.</th>
        </tr>
      </tbody>
    </table>
    `,
    { sourceLanguage: "ar", targetLanguage: "en" }
  );

  translate();

  await htmlMatches(
    "RTL to LTR (TABLE basic): <table> and <td>/<th> with simple nested inline/block content.",
    /* html */ `
    <table dir="ltr">
      <tbody dir="ltr">
        <tr dir="ltr">
          <td dir="ltr">
            CELL TEXT.
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="ltr">
      <tbody dir="ltr">
        <tr dir="ltr">
          <td dir="ltr">
            SPAN WITHIN CELL.
            <span>
              SPAN INSIDE CELL.
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="ltr">
      <tbody dir="ltr">
        <tr dir="ltr">
          <td dir="ltr">
            DIV WITHIN CELL.
            <div dir="ltr">
              DIV INSIDE CELL.
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="ltr">
      <tbody dir="ltr">
        <tr dir="ltr">
          <th dir="ltr">
            HEADER CELL.
          </th>
        </tr>
      </tbody>
    </table>
    `
  );

  cleanup();
});

add_task(async function test_direction_rtl_to_ltr_tables_nested_combos() {
  const { translate, htmlMatches, cleanup } = await createTranslationsDoc(
    /* html */ `
    <table>
      <tbody>
        <tr>
          <td>
            Span within div within cell.
            <div>
              <span>Span inside div inside cell.</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <table>
      <tbody>
        <tr>
          <td>
            Div within span within cell.
            <span>
              <div>Div inside span inside cell.</div>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    `,
    { sourceLanguage: "ar", targetLanguage: "en" }
  );

  translate();

  await htmlMatches(
    "RTL to LTR (TABLE nested combos): nested inline/block permutations.",
    /* html */ `
    <table dir="ltr">
      <tbody dir="ltr">
        <tr dir="ltr">
          <td dir="ltr">
            SPAN WITHIN DIV WITHIN CELL.
            <div dir="ltr">
              <span>
                SPAN INSIDE DIV INSIDE CELL.
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <table dir="ltr">
      <tbody dir="ltr">
        <tr dir="ltr">
          <td dir="ltr">
            DIV WITHIN SPAN WITHIN CELL.
            <span>
              <div dir="ltr">
                DIV INSIDE SPAN INSIDE CELL.
              </div>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    `
  );

  cleanup();
});
