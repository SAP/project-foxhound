package mozilla.components.lib.bookmark.parser.jsoup

/**
 * Sample HTML strings in Netscape Bookmark format for use in parser tests.
 */
object TestData {

    /** Single bookmark with url, title, and timestamps. */
    val SINGLE_BOOKMARK = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="https://example.com" ADD_DATE="1000" LAST_MODIFIED="2000">Example</A>
        </DL>
    """.trimIndent()

    /** Single bookmark without ADD_DATE or LAST_MODIFIED attributes. */
    val BOOKMARK_WITHOUT_TIMESTAMPS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="https://example.com">Example</A>
        </DL>
    """.trimIndent()

    /** Bookmark with an empty href attribute. */
    val BOOKMARK_EMPTY_HREF = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="">No URL</A>
        </DL>
    """.trimIndent()

    /** Bookmark with an empty text node. */
    val BOOKMARK_EMPTY_TEXT = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="https://example.com"></A>
        </DL>
    """.trimIndent()

    /** Multiple bookmarks at the same level. */
    val MULTIPLE_BOOKMARKS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="https://one.com" ADD_DATE="100" LAST_MODIFIED="200">One</A>
          <DT><A HREF="https://two.com" ADD_DATE="300" LAST_MODIFIED="400">Two</A>
          <DT><A HREF="https://three.com" ADD_DATE="500" LAST_MODIFIED="600">Three</A>
        </DL>
    """.trimIndent()

    /** Multiple bookmarks, folders, separators, and nesting levels. */
    val MULTIPLE_BOOKMARKS_FOLDERS_SEPARATORS_LEVELS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="https://top.com">Top Bookmark</A>
          <HR>
          <DT><H3>Level 1</H3>
          <DL><p>
            <DT><A HREF="https://one.com">One</A>
            <DT><H3>Level 2</H3>
            <DL><p>
              <DT><H3>Level 3</H3>
              <DL><p>
                <DT><A HREF="https://bottom.com">Bottom</A>
              </DL><p>
              <HR>
              <DT><A HREF="https://two.com">Two</A>
            </DL><p>
          </DL><p>
          <DT><A HREF="https://last.com">Last Bookmark</A>
        </DL>
    """.trimIndent()

    /** A folder containing a single bookmark, with timestamps on the folder. */
    val FOLDER_WITH_BOOKMARK = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><H3 ADD_DATE="100" LAST_MODIFIED="200">My Folder</H3>
          <DL><p>
            <DT><A HREF="https://example.com" ADD_DATE="300" LAST_MODIFIED="400">Example</A>
          </DL><p>
        </DL>
    """.trimIndent()

    /** A folder with no timestamps. */
    val FOLDER_WITHOUT_TIMESTAMPS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><H3>Timeless Folder</H3>
          <DL><p>
            <DT><A HREF="https://example.com">Example</A>
          </DL><p>
        </DL>
    """.trimIndent()

    /** An empty folder (no children). */
    val EMPTY_FOLDER = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><H3 ADD_DATE="100" LAST_MODIFIED="200">Empty</H3>
          <DL><p>
          </DL><p>
        </DL>
    """.trimIndent()

    /** Two levels of nested folders. */
    val NESTED_FOLDERS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><H3 ADD_DATE="10" LAST_MODIFIED="20">Outer</H3>
          <DL><p>
            <DT><H3 ADD_DATE="30" LAST_MODIFIED="40">Inner</H3>
            <DL><p>
              <DT><A HREF="https://deep.com" ADD_DATE="50" LAST_MODIFIED="60">Deep Link</A>
            </DL><p>
          </DL><p>
        </DL>
    """.trimIndent()

    /** Three levels of nesting. */
    val DEEPLY_NESTED_FOLDERS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><H3>Level 1</H3>
          <DL><p>
            <DT><H3>Level 2</H3>
            <DL><p>
              <DT><H3>Level 3</H3>
              <DL><p>
                <DT><A HREF="https://bottom.com">Bottom</A>
              </DL><p>
            </DL><p>
          </DL><p>
        </DL>
    """.trimIndent()

    /** Separator between two bookmarks. */
    val SEPARATOR_BETWEEN_BOOKMARKS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="https://before.com">Before</A>
          <HR>
          <DT><A HREF="https://after.com">After</A>
        </DL>
    """.trimIndent()

    /** Separator with timestamps. */
    val SEPARATOR_WITH_TIMESTAMPS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <HR ADD_DATE="1000" LAST_MODIFIED="2000">
        </DL>
    """.trimIndent()

    /** Separator without timestamps. */
    val SEPARATOR_WITHOUT_TIMESTAMPS = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <HR>
        </DL>
    """.trimIndent()

    /** Mix of bookmarks, a folder, and a separator at the same level. */
    val MIXED_CONTENT = """
        <!DOCTYPE NETSCAPE-Bookmark-file-1>
        <HTML>
        <DL><p>
          <DT><A HREF="https://first.com" ADD_DATE="10" LAST_MODIFIED="20">First</A>
          <DT><H3 ADD_DATE="30" LAST_MODIFIED="40">A Folder</H3>
          <DL><p>
            <DT><A HREF="https://inside.com">Inside</A>
          </DL><p>
          <HR>
          <DT><A HREF="https://last.com" ADD_DATE="50" LAST_MODIFIED="60">Last</A>
        </DL>
    """.trimIndent()

    /** Invalid bookmark HTML content **/
    val INVALID_HTML_CONTENT = """
        "content" : {
          "body": "hi this is a json file"
        }
    """.trimIndent()

    /** Valid HTML content, but not a Netscape format **/
    val VALID_HTML_BUT_INVALID_BOOKMARK_CONTENT = """
        <!DOCTYPE html>
        <html>
        <head><title>Just a regular page</title></head>
        <body>
          <p>This is a normal HTML page, not a bookmarks file.</p>
        </body>
        </html>
    """.trimIndent()
}
