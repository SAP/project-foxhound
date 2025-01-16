/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * @type {typeof import("../../content/translations-document.sys.mjs")}
 */
const { TranslationsDocument, LRUCache } = ChromeUtils.importESModule(
  "chrome://global/content/translations/translations-document.sys.mjs"
);
/**
 * @param {string} html
 * @param {{
 *  mockedTranslatorPort?: (message: string) => Promise<string>
 * }} [options]
 */
async function createDoc(html, options) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.translations.enable", true],
      ["browser.translations.logLevel", "All"],
    ],
  });

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  // For some reason, the document <body> here from the DOMParser is "display: flex" by
  // default. Ensure that it is "display: block" instead, otherwise the children of the
  // <body> will not be "display: inline".
  document.body.style.display = "block";

  const translate = () => {
    info("Creating the TranslationsDocument.");
    return new TranslationsDocument(
      document,
      "en",
      "EN",
      0, // This is a fake innerWindowID
      options?.mockedTranslatorPort ?? createMockedTranslatorPort(),
      () => {
        throw new Error("Cannot request a new port");
      },
      performance.now(),
      () => performance.now(),
      new LRUCache()
    );
  };

  /**
   * Test utility to check that the document matches the expected markup
   *
   * @param {string} html
   */
  async function htmlMatches(message, html) {
    const expected = naivelyPrettify(html);
    try {
      await waitForCondition(
        () => naivelyPrettify(document.body.innerHTML) === expected,
        "Waiting for HTML to match."
      );
      ok(true, message);
    } catch (error) {
      console.error(error);

      // Provide a nice error message.
      const actual = naivelyPrettify(document.body.innerHTML);
      ok(
        false,
        `${message}\n\nExpected HTML:\n\n${expected}\n\nActual HTML:\n\n${actual}\n\n`
      );
    }
  }

  function cleanup() {
    SpecialPowers.popPrefEnv();
  }

  return { htmlMatches, cleanup, translate, document };
}

add_task(async function test_translated_div_element() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      This is a simple translation.
    </div>
  `);

  translate();

  await htmlMatches(
    "A single element with a single text node is translated into uppercase.",
    /* html */ `
      <div>
        THIS IS A SIMPLE TRANSLATION.
      </div>
    `
  );

  cleanup();
});

add_task(async function test_translated_textnode() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    "This is a simple text translation."
  );

  translate();

  await htmlMatches(
    "A Text node at the root is translated into all caps",
    "THIS IS A SIMPLE TEXT TRANSLATION."
  );

  cleanup();
});

add_task(async function test_no_text_trees() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      <div></div>
      <span></span>
    </div>
  `);

  translate();

  await htmlMatches(
    "Trees with no text are not affected",
    /* html */ `
      <div>
        <div></div>
        <span></span>
      </div>
    `
  );

  cleanup();
});

add_task(async function test_no_text_trees() {
  const { translate, htmlMatches, cleanup } = await createDoc("");
  translate();
  await htmlMatches("No text is still no text", "");
  cleanup();
});

add_task(async function test_translated_title() {
  const { cleanup, document, translate } = await createDoc(/* html */ `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>This is an actual full page.</title>
    </head>
    <body>

    </body>
    </html>
  `);

  translate();

  const translatedTitle = "THIS IS AN ACTUAL FULL PAGE.";
  try {
    await waitForCondition(() => document.title === translatedTitle);
  } catch (error) {}
  is(document.title, translatedTitle, "The title was changed.");

  cleanup();
});

add_task(async function test_translated_nested_elements() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div class="menu-main-menu-container">
      <ul class="menu-list">
        <li class="menu-item menu-item-top-level">
          <a href="/">Latest Work</a>
        </li>
        <li class="menu-item menu-item-top-level">
          <a href="/category/interactive/">Creative Coding</a>
        </li>
        <li id="menu-id-categories" class="menu-item menu-item-top-level">
          <a href="#"><span class='category-arrow'>Categories</span></a>
        </li>
      </ul>
    </div>
  `);

  translate();

  await htmlMatches(
    "The nested elements are translated into all caps.",
    /* html */ `
      <div class="menu-main-menu-container">
        <ul class="menu-list">
          <li class="menu-item menu-item-top-level">
            <a href="/" data-moz-translations-id="0">
              LATEST WORK
            </a>
          </li>
          <li class="menu-item menu-item-top-level">
            <a href="/category/interactive/" data-moz-translations-id="0">
              CREATIVE CODING
            </a>
          </li>
          <li id="menu-id-categories" class="menu-item menu-item-top-level">
            <a href="#" data-moz-translations-id="0">
              <span class="category-arrow" data-moz-translations-id="1">
                CATEGORIES
              </span>
            </a>
          </li>
        </ul>
      </div>
    `
  );

  cleanup();
});

/**
 * Only translate elements with a matching "from" language.
 */
add_task(async function test_translated_language() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      <div>
        No lang property
      </div>
      <div lang="en">
        Language matches
      </div>
      <div lang="fr">
        Language mismatch is ignored.
      </div>
      <div lang="en-US">
        Language match with region.
      </div>
      <div lang="fr">
        <div>
          Language mismatch with
        </div>
        <div>
          nested elements.
        </div>
      </div>
    </div>
  `);

  translate();

  await htmlMatches(
    "Language matching of elements behaves as expected.",
    /* html */ `
    <div>
      <div>
        NO LANG PROPERTY
      </div>
      <div lang="en">
        LANGUAGE MATCHES
      </div>
      <div lang="fr">
        Language mismatch is ignored.
      </div>
      <div lang="en-US">
        LANGUAGE MATCH WITH REGION.
      </div>
      <div lang="fr">
        <div>
          Language mismatch with
        </div>
        <div>
          nested elements.
        </div>
      </div>
    </div>
    `
  );

  cleanup();
});

/**
 * Test elements that have been marked as ignored.
 */
add_task(async function test_ignored_translations() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div translate="yes">
      This is translated.
    </div>
    <div translate="no">
      This is not translated.
    </div>
    <div class="notranslate">
      This is not translated.
    </div>
    <div class="class-before notranslate class-after">
      This is not translated.
    </div>
    <div contenteditable>
      This is not translated.
    </div>
    <div contenteditable="true">
      This is not translated.
    </div>
    <div contenteditable="false">
      This is translated.
    </div>
  `);

  translate();

  await htmlMatches(
    "Language matching of elements behaves as expected.",
    /* html */ `
    <div translate="yes">
      THIS IS TRANSLATED.
    </div>
    <div translate="no">
      This is not translated.
    </div>
    <div class="notranslate">
      This is not translated.
    </div>
    <div class="class-before notranslate class-after">
      This is not translated.
    </div>
    <div contenteditable="">
      This is not translated.
    </div>
    <div contenteditable="true">
      This is not translated.
    </div>
    <div contenteditable="false">
      THIS IS TRANSLATED.
    </div>
    `
  );

  cleanup();
});

/**
 * Test excluded tags.
 */
add_task(async function test_excluded_tags() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      This is translated.
    </div>
    <code>
      This is ignored
    </code>
    <script>
      This is ignored
    </script>
    <textarea>
      This is ignored
    </textarea>
  `);

  translate();

  await htmlMatches(
    "EXCLUDED_TAGS are not translated",
    /* html */ `
    <div>
      THIS IS TRANSLATED.
    </div>
    <code>
      This is ignored
    </code>
    <script>
      This is ignored
    </script>
    <textarea>
      This is ignored
    </textarea>
    `
  );

  cleanup();
});

add_task(async function test_comments() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <!-- Comments don't make it to the DOM -->
    <div>
      <!-- These will be ignored in the translation. -->
      This is translated.
    </div>
  `);

  translate();

  await htmlMatches(
    "Comments do not affect things.",
    /* html */ `
    <div>
      <!-- These will be ignored in the translation. -->
      THIS IS TRANSLATED.
    </div>
    `
  );

  cleanup();
});

/**
 * Test the batching behavior on what is sent in for a translation.
 */
add_task(async function test_translation_batching() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <div>
        This is a simple section.
      </div>
      <div>
        <span>This entire</span> section continues in a <b>batch</b>.
      </div>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "Batching",
    /* html */ `
    <div>
      aaaa aa a aaaaaa aaaaaaa.
    </div>
    <div>
      <span data-moz-translations-id="0">
        bbbb bbbbbb
      </span>
      bbbbbbb bbbbbbbbb bb b
      <b data-moz-translations-id="1">
        bbbbb
      </b>
      .
    </div>
    `
  );

  cleanup();
});

/**
 * Test the inline/block behavior on what is sent in for a translation.
 */
add_task(async function test_translation_inline_styling() {
  const { document, translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      Bare text is sent in a batch.
      <span>
        Inline text is sent in a <b>batch</b>.
      </span>
      <span id="spanAsBlock">
        Display "block" overrides the inline designation.
      </span>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  info("Setting a span as display: block.");
  const span = document.getElementById("spanAsBlock");
  span.style.display = "block";
  is(span.ownerGlobal.getComputedStyle(span).display, "block");

  translate();

  await htmlMatches(
    "Span as a display: block",
    /* html */ `
      aaaa aaaa aa aaaa aa a aaaaa.
      <span>
        bbbbbb bbbb bb bbbb bb b
        <b data-moz-translations-id="0">
          bbbbb
        </b>
        .
      </span>
      <span id="spanAsBlock" style="display: block;">
        ccccccc "ccccc" ccccccccc ccc cccccc ccccccccccc.
      </span>
    `
  );

  cleanup();
});

/**
 * Test what happens when there are many inline elements.
 */
add_task(async function test_many_inlines() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <div>
        <span>
          This is a
        </span>
        <span>
          much longer
        </span>
        <span>
          section that includes
        </span>
        <span>
          many span elements
        </span>
        <span>
          to test what happens
        </span>
        <span>
          in cases like this.
        </span>
      </div>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "Batching",
    /* html */ `
    <div>
      <span data-moz-translations-id="0">
        aaaa aa a
      </span>
      <span data-moz-translations-id="1">
        aaaa aaaaaa
      </span>
      <span data-moz-translations-id="2">
        aaaaaaa aaaa aaaaaaaa
      </span>
      <span data-moz-translations-id="3">
        aaaa aaaa aaaaaaaa
      </span>
      <span data-moz-translations-id="4">
        aa aaaa aaaa aaaaaaa
      </span>
      <span data-moz-translations-id="5">
        aa aaaaa aaaa aaaa.
      </span>
    </div>
    `
  );

  cleanup();
});

/**
 * Test what happens when there are many inline elements.
 */
add_task(async function test_many_inlines() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <div>
        <div>
          This is a
        </div>
        <div>
          much longer
        </div>
        <div>
          section that includes
        </div>
        <div>
          many div elements
        </div>
        <div>
          to test what happens
        </div>
        <div>
          in cases like this.
        </div>
      </div>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "Batching",
    /* html */ `
    <div>
      <div>
        aaaa aa a
      </div>
      <div>
        bbbb bbbbbb
      </div>
      <div>
        ccccccc cccc cccccccc
      </div>
      <div>
        dddd ddd dddddddd
      </div>
      <div>
        ee eeee eeee eeeeeee
      </div>
      <div>
        ff fffff ffff ffff.
      </div>
    </div>
    `
  );

  cleanup();
});

/**
 * Test a mix of inline text and block elements.
 */
add_task(async function test_presumed_inlines1() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <div>
        Text node
        <div>Block element</div>
      </div>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "Mixing a text node with block elements will send in two batches.",
    /* html */ `
    <div>
      aaaa aaaa
      <div>
        bbbbb bbbbbbb
      </div>
    </div>
    `
  );

  cleanup();
});

/**
 * Test what happens when there are many inline elements.
 */
add_task(async function test_presumed_inlines2() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <div>
        Text node
        <span>Inline</span>
        <div>Block Element</div>
      </div>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "A mix of inline and blocks will be sent in separately.",
    /* html */ `
    <div>
      aaaa aaaa
      <span>
        bbbbbb
      </span>
      <div>
        ccccc ccccccc
      </div>
    </div>
    `
  );

  cleanup();
});

add_task(async function test_presumed_inlines3() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <div>
        Text node
        <span>Inline</span>
        <div>Block Element</div>
        <div>Block Element</div>
        <div>Block Element</div>
      </span>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "Conflicting inlines will be sent in as separate blocks if there are more block elements",
    /* html */ `
    <div>
      aaaa aaaa
      <span>
        bbbbbb
      </span>
      <div>
        ccccc ccccccc
      </div>
      <div>
        ddddd ddddddd
      </div>
      <div>
        eeeee eeeeeee
      </div>
    </div>
    `
  );

  cleanup();
});

add_task(async function test_chunking_large_text() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <pre>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque fermentum est ante, ut porttitor enim molestie et. Nam mattis ullamcorper justo a ultrices. Ut ac sodales lorem. Sed feugiat ultricies lacus. Proin dapibus sit amet nunc a ullamcorper. Donec leo purus, convallis quis urna non, semper pulvinar augue. Nulla placerat turpis arcu, sit amet imperdiet sapien tincidunt ut. Donec sit amet luctus lorem, sed consectetur lectus. Pellentesque est nisi, feugiat et ipsum quis, vestibulum blandit nulla.

        Proin accumsan sapien ut nibh mattis tincidunt. Donec facilisis nibh sodales, mattis risus et, malesuada lorem. Nam suscipit lacinia venenatis. Praesent ac consectetur ante. Vestibulum pulvinar ut massa in viverra. Nunc tincidunt tortor nunc. Vivamus sit amet hendrerit mi. Aliquam posuere velit non ante facilisis euismod. In ullamcorper, lacus vel hendrerit tincidunt, dui justo iaculis nulla, sit amet tincidunt nisl magna et urna. Sed varius tincidunt ligula. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nam sed gravida ligula. Donec tincidunt arcu eros, ac maximus magna auctor eu. Vivamus suscipit neque velit, in ullamcorper elit pulvinar et. Morbi auctor tempor risus, imperdiet placerat velit gravida vel. Duis ultricies accumsan libero quis molestie.

        Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Etiam nec arcu dapibus enim vulputate vulputate aliquet a libero. Nam hendrerit pulvinar libero, eget posuere quam porta eu. Pellentesque dignissim justo eu leo accumsan, sit amet suscipit ante gravida. Vivamus eu faucibus orci. Quisque sagittis tortor eget orci venenatis porttitor. Quisque mollis ipsum a dignissim dignissim.

        Aenean sagittis nisi lectus, non lacinia orci dapibus viverra. Donec diam lorem, tincidunt sed massa vel, vulputate tincidunt metus. In quam felis, egestas et faucibus faucibus, vestibulum quis tortor. Morbi odio mi, suscipit vitae leo in, consequat interdum augue. Quisque purus velit, dictum ac ante eget, volutpat dapibus ante. Suspendisse quis augue vitae velit elementum dictum nec aliquet nisl. Maecenas vestibulum quam augue, eu maximus urna blandit eu. Donec nunc risus, elementum id ligula nec, ultrices venenatis libero. Suspendisse ullamcorper ex ante, malesuada pulvinar sem placerat vel.

        In hac habitasse platea dictumst. Duis vulputate tellus arcu, at posuere ligula viverra luctus. Fusce ultrices malesuada neque vitae vehicula. Aliquam blandit nisi sed nibh facilisis, non varius turpis venenatis. Vestibulum ut velit laoreet, sagittis leo ac, pharetra ex. Aenean mollis risus sed nibh auctor, et feugiat neque iaculis. Fusce fermentum libero metus, at consectetur massa euismod sed. Mauris ut metus sit amet leo porttitor mollis. Vivamus tincidunt lorem non purus suscipit sollicitudin. Maecenas ut tristique elit. Ut eu volutpat turpis. Suspendisse nec tristique augue. Nullam faucibus egestas volutpat. Sed tempor eros et mi ultrices, nec feugiat eros egestas.
      </pre>
    `,
    { mockedTranslatorPort: createBatchedMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "Large chunks of text can be still sent in for translation in one big pass, " +
      "this could be slow bad behavior for the user.",
    /* html */ `
    <pre>
        aaaaa aaaaa aaaaa aaa aaaa, aaaaaaaaaaa aaaaaaaaaa aaaa. aaaaaaa aaaaaaaaa aaa aaaa, aa aaaaaaaaa aaaa aaaaaaaa aa. aaa aaaaaa aaaaaaaaaaa aaaaa a aaaaaaaa. aa aa aaaaaaa aaaaa. aaa aaaaaaa aaaaaaaaa aaaaa. aaaaa aaaaaaa aaa aaaa aaaa a aaaaaaaaaaa. aaaaa aaa aaaaa, aaaaaaaaa aaaa aaaa aaa, aaaaaa aaaaaaaa aaaaa. aaaaa aaaaaaaa aaaaaa aaaa, aaa aaaa aaaaaaaaa aaaaaa aaaaaaaaa aa. aaaaa aaa aaaa aaaaaa aaaaa, aaa aaaaaaaaaaa aaaaaa. aaaaaaaaaaaa aaa aaaa, aaaaaaa aa aaaaa aaaa, aaaaaaaaaa aaaaaaa aaaaa.

        aaaaa aaaaaaaa aaaaaa aa aaaa aaaaaa aaaaaaaaa. aaaaa aaaaaaaaa aaaa aaaaaaa, aaaaaa aaaaa aa, aaaaaaaaa aaaaa. aaa aaaaaaaa aaaaaaa aaaaaaaaa. aaaaaaaa aa aaaaaaaaaaa aaaa. aaaaaaaaaa aaaaaaaa aa aaaaa aa aaaaaaa. aaaa aaaaaaaaa aaaaaa aaaa. aaaaaaa aaa aaaa aaaaaaaaa aa. aaaaaaa aaaaaaa aaaaa aaa aaaa aaaaaaaaa aaaaaaa. aa aaaaaaaaaaa, aaaaa aaa aaaaaaaaa aaaaaaaaa, aaa aaaaa aaaaaaa aaaaa, aaa aaaa aaaaaaaaa aaaa aaaaa aa aaaa. aaa aaaaaa aaaaaaaaa aaaaaa. aaaaaaaa aa aaaaaaaaa aaaaa aa aaaa aaaaa aaaaaa aa aaaaaaaa. aaa aaa aaaaaaa aaaaaa. aaaaa aaaaaaaaa aaaa aaaa, aa aaaaaaa aaaaa aaaaaa aa. aaaaaaa aaaaaaaa aaaaa aaaaa, aa aaaaaaaaaaa aaaa aaaaaaaa aa. aaaaa aaaaaa aaaaaa aaaaa, aaaaaaaaa aaaaaaaa aaaaa aaaaaaa aaa. aaaa aaaaaaaaa aaaaaaaa aaaaaa aaaa aaaaaaaa.

        aaaaaaaaaa aaaa aaaaa aaaaaa aa aaaaaaaa aaaa aaaaaa aa aaaaaaaa aaaaaaa aaaaaaa aaaaa; aaaaa aaa aaaa aaaaaaa aaaa aaaaaaaaa aaaaaaaaa aaaaaaa a aaaaaa. aaa aaaaaaaaa aaaaaaaa aaaaaa, aaaa aaaaaaa aaaa aaaaa aa. aaaaaaaaaaaa aaaaaaaaa aaaaa aa aaa aaaaaaaa, aaa aaaa aaaaaaaa aaaa aaaaaaa. aaaaaaa aa aaaaaaaa aaaa. aaaaaaa aaaaaaaa aaaaaa aaaa aaaa aaaaaaaaa aaaaaaaaa. aaaaaaa aaaaaa aaaaa a aaaaaaaaa aaaaaaaaa.

        aaaaaa aaaaaaaa aaaa aaaaaa, aaa aaaaaaa aaaa aaaaaaa aaaaaaa. aaaaa aaaa aaaaa, aaaaaaaaa aaa aaaaa aaa, aaaaaaaaa aaaaaaaaa aaaaa. aa aaaa aaaaa, aaaaaaa aa aaaaaaaa aaaaaaaa, aaaaaaaaaa aaaa aaaaaa. aaaaa aaaa aa, aaaaaaaa aaaaa aaa aa, aaaaaaaaa aaaaaaaa aaaaa. aaaaaaa aaaaa aaaaa, aaaaaa aa aaaa aaaa, aaaaaaaa aaaaaaa aaaa. aaaaaaaaaaa aaaa aaaaa aaaaa aaaaa aaaaaaaaa aaaaaa aaa aaaaaaa aaaa. aaaaaaaa aaaaaaaaaa aaaa aaaaa, aa aaaaaaa aaaa aaaaaaa aa. aaaaa aaaa aaaaa, aaaaaaaaa aa aaaaaa aaa, aaaaaaaa aaaaaaaaa aaaaaa. aaaaaaaaaaa aaaaaaaaaaa aa aaaa, aaaaaaaaa aaaaaaaa aaa aaaaaaaa aaa.

        aa aaa aaaaaaaaa aaaaaa aaaaaaaa. aaaa aaaaaaaaa aaaaaa aaaa, aa aaaaaaa aaaaaa aaaaaaa aaaaaa. aaaaa aaaaaaaa aaaaaaaaa aaaaa aaaaa aaaaaaaa. aaaaaaa aaaaaaa aaaa aaa aaaa aaaaaaaaa, aaa aaaaaa aaaaaa aaaaaaaaa. aaaaaaaaaa aa aaaaa aaaaaaa, aaaaaaaa aaa aa, aaaaaaaa aa. aaaaaa aaaaaa aaaaa aaa aaaa aaaaaa, aa aaaaaaa aaaaa aaaaaaa. aaaaa aaaaaaaaa aaaaaa aaaaa, aa aaaaaaaaaaa aaaaa aaaaaaa aaa. aaaaaa aa aaaaa aaa aaaa aaa aaaaaaaaa aaaaaa. aaaaaaa aaaaaaaaa aaaaa aaa aaaaa aaaaaaaa aaaaaaaaaaaa. aaaaaaaa aa aaaaaaaaa aaaa. aa aa aaaaaaaa aaaaaa. aaaaaaaaaaa aaa aaaaaaaaa aaaaa. aaaaaa aaaaaaaa aaaaaaa aaaaaaaa. aaa aaaaaa aaaa aa aa aaaaaaaa, aaa aaaaaaa aaaa aaaaaaa.
    </pre>
    `
  );

  cleanup();
});

add_task(async function test_reordering() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      <span>
        B - This was first.
      </span>
      <span>
        A - This was second.
      </span>
      <span>
        C - This was third.
      </span>
    `,
    { mockedTranslatorPort: createdReorderingMockedTranslatorPort() }
  );

  translate();

  await htmlMatches(
    "Nodes can be re-ordered by the translator",
    /* html */ `
      <span data-moz-translations-id="1">
        A - THIS WAS SECOND.
      </span>
      <span data-moz-translations-id="0">
        B - THIS WAS FIRST.
      </span>
      <span data-moz-translations-id="2">
        C - THIS WAS THIRD.
      </span>
    `
  );

  cleanup();
});

add_task(async function test_reordering2() {
  const { translate, htmlMatches, cleanup } = await createDoc(
    /* html */ `
      B - This was first.
      <span>
        A - This was second.
      </span>
      C - This was third.
    `,
    { mockedTranslatorPort: createdReorderingMockedTranslatorPort() }
  );

  translate();

  // Note: ${"      "} is used below to ensure that the whitespace is not stripped from
  // the test.
  await htmlMatches(
    "Text nodes can be re-ordered.",
    /* html */ `
      <span data-moz-translations-id="0">
        A - THIS WAS SECOND.
      </span>
      B - THIS WAS FIRST.
${"      "}
      C - THIS WAS THIRD.
    `
  );

  cleanup();
});

add_task(async function test_mutations() {
  const { translate, htmlMatches, cleanup, document } =
    await createDoc(/* html */ `
    <div>
      This is a simple translation.
    </div>
  `);

  translate();

  await htmlMatches(
    "It translates.",
    /* html */ `
      <div>
        THIS IS A SIMPLE TRANSLATION.
      </div>
    `
  );

  info('Trigger the "childList" mutation.');
  const div = document.createElement("div");
  div.innerText = "This is an added node.";
  document.body.appendChild(div);

  await htmlMatches(
    "The added node gets translated.",
    /* html */ `
      <div>
        THIS IS A SIMPLE TRANSLATION.
      </div>
      <div>
        THIS IS AN ADDED NODE.
      </div>
    `
  );

  info('Trigger the "characterData" mutation.');
  document.querySelector("div").firstChild.nodeValue =
    "This is a changed node.";

  await htmlMatches(
    "The changed node gets translated",
    /* html */ `
      <div>
        THIS IS A CHANGED NODE.
      </div>
      <div>
        THIS IS AN ADDED NODE.
      </div>
    `
  );
  cleanup();
});

add_task(async function test_svgs() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      <div>Text before is translated</div>
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <style>.myText { font-family: sans-serif; }</style>
        <rect x="10" y="10" width="80" height="60" class="myRect" />
        <circle cx="150" cy="50" r="30" class="myCircle" />
        <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" class="myText">
          Text inside of the SVG is untranslated.
        </text>
      </svg>
      <div>Text after is translated</div>
    </div>
  `);

  translate();

  await htmlMatches(
    "SVG text gets translated, and style elements are left alone.",
    /* html */ `
    <div>
      <div>
        TEXT BEFORE IS TRANSLATED
      </div>
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <style>
          .myText { font-family: sans-serif; }
        </style>
        <rect x="10" y="10" width="80" height="60" class="myRect">
        </rect>
        <circle cx="150" cy="50" r="30" class="myCircle">
        </circle>
        <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" class="myText">
          TEXT INSIDE OF THE SVG IS UNTRANSLATED.
        </text>
      </svg>
      <div>
        TEXT AFTER IS TRANSLATED
      </div>
    </div>
    `
  );

  await cleanup();
});

add_task(async function test_svgs_more() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <foreignObject x="20" y="20" width="160" height="160">
        <div xmlns="http://www.w3.org/1999/xhtml">
          This is a div inside of an SVG.
        </div>
      </foreignObject>
    </svg>
  `);

  translate();

  await htmlMatches(
    "Foreign objects get translated",
    /* html */ `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <foreignObject x="20" y="20" width="160" height="160">
        <div xmlns="http://www.w3.org/1999/xhtml">
          THIS IS A DIV INSIDE OF AN SVG.
        </div>
      </foreignObject>
    </svg>
    `
  );

  await cleanup();
});

add_task(async function test_tables() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <table>
      <tr>
        <th>Table header 1</th>
        <th>Table header 2</th>
      </tr>
      <tr>
        <td>Table data 1</td>
        <td>Table data 2</td>
      </tr>
    </table>
  `);

  translate();

  await htmlMatches(
    "Tables are correctly translated.",
    /* html */ `
      <table>
        <tbody>
          <tr>
            <th>
              TABLE HEADER 1
            </th>
            <th>
              TABLE HEADER 2
            </th>
          </tr>
          <tr>
            <td>
              TABLE DATA 1
            </td>
            <td>
              TABLE DATA 2
            </td>
          </tr>
        </tbody>
      </table>
    `
  );

  cleanup();
});

// Attribute translation for title and placeholder
add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <label title="Titles are user visible">Enter information:</label>
    <input type="text" placeholder="This is a placeholder">
  `);

  translate();

  // This is what this test should assert:
  // eslint-disable-next-line no-unused-vars
  const actualExpected = /* html */ `
    <label title="TITLES ARE USER VISIBLE">
      ENTER INFORMATION:
    </label>
    <input type="text" placeholder="THIS IS A PLACEHOLDER" >
  `;

  await htmlMatches(
    "Placeholders support added",
    /* html */ `
      <label title="TITLES ARE USER VISIBLE">
        ENTER INFORMATION:
      </label>
      <input type="text" placeholder="THIS IS A PLACEHOLDER">
    `
  );

  cleanup();
});

add_task(async function test_html_attributes() {
  const { translate, document, cleanup } = await createDoc(/* html */ `
    <!DOCTYPE html>
    <html lang="en" >
    <head>
      <meta charset="utf-8" />
    </head>
    <body>
    </body>
    </html>
  `);

  translate();

  try {
    await waitForCondition(() => document.documentElement.lang === "EN");
  } catch (error) {}
  is(document.documentElement.lang, "EN", "The lang attribute was changed");

  cleanup();
});

// Attribute translation for title
add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div title="Titles are user visible">
    </div>
  `);

  translate();

  await htmlMatches(
    "Attribute translation for title",
    /* html */ `
      <div title="TITLES ARE USER VISIBLE">
    </div>
    `
  );

  cleanup();
});

//  Attribute translation for title with innerHTML
add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div title="Titles are user visible">
    Simple translation.
    </div>
  `);

  translate();

  await htmlMatches(
    "translation for title with innerHTML",
    /* html */ `
    <div title="TITLES ARE USER VISIBLE">
    SIMPLE TRANSLATION.
    </div>
    `
  );

  cleanup();
});

// Attribute translation for title and placeholder in same element
add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
        <input type="text" placeholder="This is a placeholder" title="Titles are user visible">
  `);

  translate();

  await htmlMatches(
    "title and placeholder together",
    /* html */ `
        <input type="text" placeholder="THIS IS A PLACEHOLDER" title="TITLES ARE USER VISIBLE">
    `
  );
  cleanup();
});

// Attribute translation for placeholder
add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
        <input type="text" placeholder="This is a placeholder">
  `);

  translate();

  await htmlMatches(
    "Attribute translation for placeholder",
    /* html */ `
        <input type="text" placeholder="THIS IS A PLACEHOLDER">
    `
  );
  cleanup();
});

add_task(async function test_translated_title() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div title="The title is translated" class="do-not-translate-this">
      Inner text is translated.
    </div>
  `);

  translate();

  await htmlMatches(
    "Language matching of elements behaves as expected.",
    /* html */ `
    <div title="THE TITLE IS TRANSLATED" class="do-not-translate-this">
      INNER TEXT IS TRANSLATED.
    </div>
    `
  );

  cleanup();
});

add_task(async function test_title_attribute_subnodes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      <span>Span text 1</span>
      <span>Span text 2</span>
      <span>Span text 3</span>
      <span>Span text 4</span>
      <span>Span text 5</span>
      This is text.
    </div>
  `);

  translate();

  await htmlMatches(
    "Titles are translated",
    /* html */ `
      <div>
        <span data-moz-translations-id="0">SPAN TEXT 1</span>
        <span data-moz-translations-id="1">SPAN TEXT 2</span>
        <span data-moz-translations-id="2">SPAN TEXT 3</span>
        <span data-moz-translations-id="3">SPAN TEXT 4</span>
        <span data-moz-translations-id="4">SPAN TEXT 5</span>
        THIS IS TEXT.
      </div>
    `
  );

  cleanup();
});

add_task(async function test_title_attribute_subnodes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div title="Title in div">
      <span title="Title 1">Span text 1</span>
      <span title="Title 2">Span text 2</span>
      <span title="Title 3">Span text 3</span>
      <span title="Title 4">Span text 4</span>
      <span title="Title 5">Span text 5</span>
      This is text.
    </div>
  `);

  translate();

  await htmlMatches(
    "Titles are translated",
    /* html */ `
      <div title="TITLE IN DIV">
        <span title="TITLE 1" data-moz-translations-id="0">SPAN TEXT 1</span>
        <span title="TITLE 2" data-moz-translations-id="1">SPAN TEXT 2</span>
        <span title="TITLE 3" data-moz-translations-id="2">SPAN TEXT 3</span>
        <span title="TITLE 4" data-moz-translations-id="3">SPAN TEXT 4</span>
        <span title="TITLE 5" data-moz-translations-id="4">SPAN TEXT 5</span>
        THIS IS TEXT.
      </div>
    `
  );

  cleanup();
});

// Attribute translation for nested text
add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      This is the outer div
      <label>
        Enter information:
        <input type="text">
      </label>
    </div>
  `);

  translate();

  await htmlMatches(
    "translation for Nested with text",
    /* html */ `
      <div>
      THIS IS THE OUTER DIV
      <label data-moz-translations-id="0">
      ENTER INFORMATION:
        <input type="text" data-moz-translations-id="1">
      </label>
    </div>
    `
  );

  cleanup();
});

// Attribute translation  Nested Attributes
add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div title="Titles are user visible">
      This is the outer div
      <label>
        Enter information:
        <input type="text" placeholder="This is a placeholder">
      </label>
    </div>
  `);

  translate();

  await htmlMatches(
    "Translations: Nested Attributes",
    /* html */ `
      <div title="TITLES ARE USER VISIBLE">
      THIS IS THE OUTER DIV
      <label data-moz-translations-id="0">
      ENTER INFORMATION:
        <input type="text" placeholder="THIS IS A PLACEHOLDER" data-moz-translations-id="1">
      </label>
    </div>
    `
  );

  cleanup();
});

add_task(async function test_attributes() {
  const { translate, htmlMatches, cleanup } = await createDoc(/* html */ `
    <div>
      This is the outer div
      <label>
        Enter information 1:
        <label>
          Enter information 2:
        </label>
      </label>
    </div>
  `);

  translate();

  await htmlMatches(
    "Translations: Nested elements",
    /* html */ `
      <div>
        THIS IS THE OUTER DIV
        <label data-moz-translations-id="0">
          ENTER INFORMATION 1:
          <label data-moz-translations-id="1">
            ENTER INFORMATION 2:
          </label>
        </label>
    </div>
    `
  );

  cleanup();
});

add_task(async function test_mutations_with_attributes() {
  const { translate, htmlMatches, cleanup, document } =
    await createDoc(/* html */ `
    <div>
      This is a simple translation.
    </div>
  `);

  translate();

  await htmlMatches(
    "It translates.",
    /* html */ `
      <div>
        THIS IS A SIMPLE TRANSLATION.
      </div>
    `
  );

  info('Trigger the "childList" mutation.');
  const div = document.createElement("div");
  div.innerText = "This is an added node.";
  div.setAttribute("title", "title is added");
  document.body.appendChild(div);

  await htmlMatches(
    "The added node gets translated.",
    /* html */ `
      <div>
        THIS IS A SIMPLE TRANSLATION.
      </div>
      <div title="TITLE IS ADDED">
        THIS IS AN ADDED NODE.
      </div>
    `
  );

  info('Trigger the "characterData" mutation.');
  document.querySelector("div").firstChild.nodeValue =
    "This is a changed node.";

  await htmlMatches(
    "The changed node gets translated",
    /* html */ `
      <div>
        THIS IS A CHANGED NODE.
      </div>
      <div title="TITLE IS ADDED">
        THIS IS AN ADDED NODE.
      </div>
    `
  );

  info('Trigger the "childList" mutation.');
  const inp = document.createElement("input");
  inp.setAttribute("placeholder", "input placeholder is added");
  document.body.appendChild(inp);

  await htmlMatches(
    "The placeholder in input node gets translated.",
    /* html */ `
      <div>
          THIS IS A CHANGED NODE.
      </div>
      <div title="TITLE IS ADDED">
        THIS IS AN ADDED NODE.
      </div>
      <input placeholder="INPUT PLACEHOLDER IS ADDED">
    `
  );

  info("Trigger attribute mutation.");
  // adding attribute to first div
  document.querySelector("div").setAttribute("title", "New attribute");
  document.querySelector("input").setAttribute("title", "New attribute input");

  await htmlMatches(
    "The new attribute gets translated.",
    /* html */ `
      <div title="NEW ATTRIBUTE">
          THIS IS A CHANGED NODE.
      </div>
      <div title="TITLE IS ADDED">
        THIS IS AN ADDED NODE.
      </div>
      <input placeholder="INPUT PLACEHOLDER IS ADDED" title="NEW ATTRIBUTE INPUT">
    `
  );

  cleanup();
});

add_task(async function test_mutations_subtree_attributes() {
  const { translate, htmlMatches, cleanup, document } =
    await createDoc(/* html */ `
    <div>
      This is a simple translation.
    </div>
  `);

  translate();

  await htmlMatches(
    "It translates.",
    /* html */ `
      <div>
        THIS IS A SIMPLE TRANSLATION.
      </div>
    `
  );

  info('Trigger the "childList" mutation.');
  const div = document.createElement("div");
  div.innerHTML = /* html */ `
    <div title="This is an outer node">
      This is some inner text.
      <input placeholder="This is a placeholder" />
    </div>
  `;
  document.body.appendChild(div.children[0]);

  await htmlMatches(
    "The added node gets translated.",
    /* html */ `
      <div>
        THIS IS A SIMPLE TRANSLATION.
      </div>
      <div title="THIS IS AN OUTER NODE">
        THIS IS SOME INNER TEXT.
        <input placeholder="THIS IS A PLACEHOLDER">
      </div>
    `
  );

  cleanup();
});
