/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import {
  getFilename,
  getTruncatedFileName,
  getFileURL,
  getDisplayPath,
  getSourceLineCount,
  isJavaScript,
  isDescendantOfRoot,
  removeThreadActorId,
  isUrlExtension,
  getLineText,
} from "../source.js";

import {
  makeMockSource,
  makeMockSourceWithContent,
  makeMockSourceAndContent,
  makeMockWasmSourceWithContent,
  makeMockThread,
  makeFullfilledMockSourceContent,
} from "../test-mockup";
import { isFulfilled } from "../async-value.js";

describe("sources", () => {
  const unicode = "\u6e2c";
  const encodedUnicode = encodeURIComponent(unicode);

  describe("getFilename", () => {
    it("should give us a default of (index)", () => {
      expect(
        getFilename(makeMockSource("http://localhost.com:7999/increment/"))
      ).toBe("(index)");
    });
    it("should give us the filename", () => {
      expect(
        getFilename(
          makeMockSource("http://localhost.com:7999/increment/hello.html")
        )
      ).toBe("hello.html");
    });
    it("should give us the readable Unicode filename if encoded", () => {
      expect(
        getFilename(
          makeMockSource(
            `http://localhost.com:7999/increment/${encodedUnicode}.html`
          )
        )
      ).toBe(`${unicode}.html`);
    });
    it("should give us the filename excluding the query strings", () => {
      expect(
        getFilename(
          makeMockSource(
            "http://localhost.com:7999/increment/hello.html?query_strings"
          )
        )
      ).toBe("hello.html");
    });
    it("should give us the proper filename for pretty files", () => {
      expect(
        getFilename(
          makeMockSource(
            "http://localhost.com:7999/increment/hello.html:formatted"
          )
        )
      ).toBe("hello.html");
    });
  });

  describe("getTruncatedFileName", () => {
    it("should truncate the file name when it is more than 30 chars", () => {
      expect(
        getTruncatedFileName(
          makeMockSource(
            "really-really-really-really-really-really-long-name.html"
          ),
          "",
          30
        )
      ).toBe("really-really…long-name.html");
    });
    it("should first decode the filename and then truncate it", () => {
      expect(
        getTruncatedFileName(
          makeMockSource(`${encodedUnicode.repeat(30)}.html`),
          "",
          30
        )
      ).toBe("測測測測測測測測測測測測測…測測測測測測測測測.html");
    });
  });

  describe("getDisplayPath", () => {
    it("should give us the path for files with same name", () => {
      const sources = [
        makeMockSource("http://localhost.com:7999/increment/xyz/hello.html"),
        makeMockSource("http://localhost.com:7999/increment/abc/hello.html"),
        makeMockSource("http://localhost.com:7999/increment/hello.html"),
      ];
      expect(
        getDisplayPath(
          makeMockSource("http://localhost.com:7999/increment/abc/hello.html"),
          sources
        )
      ).toBe("abc");
    });

    it(`should give us the path for files with same name
      in directories with same name`, () => {
      const sources = [
        makeMockSource(
          "http://localhost.com:7999/increment/xyz/web/hello.html"
        ),
        makeMockSource(
          "http://localhost.com:7999/increment/abc/web/hello.html"
        ),
        makeMockSource("http://localhost.com:7999/increment/hello.html"),
      ];
      expect(
        getDisplayPath(
          makeMockSource(
            "http://localhost.com:7999/increment/abc/web/hello.html"
          ),
          sources
        )
      ).toBe("abc/web");
    });

    it("should give no path for files with unique name", () => {
      const sources = [
        makeMockSource("http://localhost.com:7999/increment/xyz.html"),
        makeMockSource("http://localhost.com:7999/increment/abc.html"),
        makeMockSource("http://localhost.com:7999/increment/hello.html"),
      ];
      expect(
        getDisplayPath(
          makeMockSource("http://localhost.com:7999/increment/abc/web.html"),
          sources
        )
      ).toBe(undefined);
    });
    it("should not show display path for pretty file", () => {
      const sources = [
        makeMockSource("http://localhost.com:7999/increment/abc/web/hell.html"),
        makeMockSource(
          "http://localhost.com:7999/increment/abc/web/hello.html"
        ),
        makeMockSource(
          "http://localhost.com:7999/increment/xyz.html:formatted"
        ),
      ];
      expect(
        getDisplayPath(
          makeMockSource(
            "http://localhost.com:7999/increment/abc/web/hello.html:formatted"
          ),
          sources
        )
      ).toBe(undefined);
    });
    it(`should give us the path for files with same name when both
      are pretty and different path`, () => {
      const sources = [
        makeMockSource(
          "http://localhost.com:7999/increment/xyz/web/hello.html:formatted"
        ),
        makeMockSource(
          "http://localhost.com:7999/increment/abc/web/hello.html:formatted"
        ),
        makeMockSource(
          "http://localhost.com:7999/increment/hello.html:formatted"
        ),
      ];
      expect(
        getDisplayPath(
          makeMockSource(
            "http://localhost.com:7999/increment/abc/web/hello.html:formatted"
          ),
          sources
        )
      ).toBe("abc/web");
    });
  });

  describe("getFileURL", () => {
    it("should give us the file url", () => {
      expect(
        getFileURL(
          makeMockSource("http://localhost.com:7999/increment/hello.html")
        )
      ).toBe("http://localhost.com:7999/increment/hello.html");
    });
    it("should truncate the file url when it is more than 50 chars", () => {
      expect(
        getFileURL(
          makeMockSource("http://localhost-long.com:7999/increment/hello.html")
        )
      ).toBe("…ttp://localhost-long.com:7999/increment/hello.html");
    });
    it("should first decode the file URL and then truncate it", () => {
      expect(
        getFileURL(makeMockSource(`http://${encodedUnicode.repeat(39)}.html`))
      ).toBe(`…ttp://${unicode.repeat(39)}.html`);
    });
  });

  describe("isJavaScript", () => {
    it("is not JavaScript", () => {
      {
        const source = makeMockSourceAndContent("foo.html", undefined, "");
        expect(isJavaScript(source, source.content)).toBe(false);
      }
      {
        const source = makeMockSourceAndContent(
          undefined,
          undefined,
          "text/html"
        );
        expect(isJavaScript(source, source.content)).toBe(false);
      }
    });

    it("is JavaScript", () => {
      {
        const source = makeMockSourceAndContent("foo.js");
        expect(isJavaScript(source, source.content)).toBe(true);
      }
      {
        const source = makeMockSourceAndContent("bar.jsm");
        expect(isJavaScript(source, source.content)).toBe(true);
      }
      {
        const source = makeMockSourceAndContent(
          undefined,
          undefined,
          "text/javascript"
        );
        expect(isJavaScript(source, source.content)).toBe(true);
      }
      {
        const source = makeMockSourceAndContent(
          undefined,
          undefined,
          "application/javascript"
        );
        expect(isJavaScript(source, source.content)).toBe(true);
      }
    });
  });

  describe("getSourceLineCount", () => {
    it("should give us the amount bytes for wasm source", () => {
      const { content } = makeMockWasmSourceWithContent({
        binary: "\x00asm\x01\x00\x00\x00",
      });
      expect(getSourceLineCount(content.value)).toEqual(8);
    });

    it("should give us the amout of lines for js source", () => {
      const { content } = makeMockSourceWithContent(
        undefined,
        undefined,
        "text/javascript",
        "function foo(){\n}"
      );
      if (!content || !isFulfilled(content)) {
        throw new Error("Unexpected content value");
      }
      expect(getSourceLineCount(content.value)).toEqual(2);
    });
  });

  describe("isDescendantOfRoot", () => {
    const threads = [
      makeMockThread({ actor: "server0.conn1.child1/thread19" }),
    ];

    it("should detect normal source urls", () => {
      const source = makeMockSource(
        "resource://activity-stream/vendor/react.js"
      );
      const rootWithoutThreadActor = removeThreadActorId(
        "resource://activity-stream",
        threads
      );
      expect(isDescendantOfRoot(source, rootWithoutThreadActor)).toBe(true);
    });

    it("should detect source urls under chrome:// as root", () => {
      const source = makeMockSource(
        "chrome://browser/content/contentSearchUI.js"
      );
      const rootWithoutThreadActor = removeThreadActorId("chrome://", threads);
      expect(isDescendantOfRoot(source, rootWithoutThreadActor)).toBe(true);
    });

    it("should detect source urls if root is a thread actor Id", () => {
      const source = makeMockSource(
        "resource://activity-stream/vendor/react-dom.js"
      );
      const rootWithoutThreadActor = removeThreadActorId(
        "server0.conn1.child1/thread19",
        threads
      );
      expect(isDescendantOfRoot(source, rootWithoutThreadActor)).toBe(true);
    });
  });

  describe("isUrlExtension", () => {
    it("should detect mozilla extension", () => {
      expect(isUrlExtension("moz-extension://id/js/content.js")).toBe(true);
    });
    it("should detect chrome extension", () => {
      expect(isUrlExtension("chrome-extension://id/js/content.js")).toBe(true);
    });
    it("should return false for non-extension assets", () => {
      expect(isUrlExtension("https://example.org/init.js")).toBe(false);
    });
  });

  describe("getLineText", () => {
    it("first line", () => {
      const text = getLineText(
        "fake-source",
        makeFullfilledMockSourceContent("aaa\nbbb\nccc"),
        1
      );

      expect(text).toEqual("aaa");
    });

    it("last line", () => {
      const text = getLineText(
        "fake-source",
        makeFullfilledMockSourceContent("aaa\nbbb\nccc"),
        3
      );

      expect(text).toEqual("ccc");
    });

    it("one line", () => {
      const text = getLineText(
        "fake-source",
        makeFullfilledMockSourceContent("aaa"),
        1
      );

      expect(text).toEqual("aaa");
    });

    it("bad line", () => {
      const text = getLineText(
        "fake-source",
        makeFullfilledMockSourceContent("aaa\nbbb\nccc"),

        5
      );

      expect(text).toEqual("");
    });
  });
});
