/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @ts-check

/**
 * @see {extractTextFromDOM} for a high level overview of this file.
 */

/**
 * @import { GetDOMOptions, DOMExtractionResult } from './PageExtractor.d.ts'
 */

const WHITESPACE_REGEX = /\s+/g;
const MARKDOWN_TEXT_ESCAPE_REGEX = /[\[\]()]/g;
const OPEN_PAREN_REGEX = /\(/g;
const CLOSE_PAREN_REGEX = /\)/g;

/**
 * The context for extracting text content from the DOM.
 */
class ExtractionContext {
  /**
   * Set of nodes that have already been processed, used to avoid duplicating text extraction.
   *
   * @type {Set<Node>}
   */
  #processedNodes = new Set();

  /**
   * The text-extraction options, provided at initialization.
   *
   * @type {GetDOMOptions}
   */
  #options;

  /**
   * The accumulated text content that has been extracted from the DOM.
   *
   * @type {string}
   */
  #textContent = "";

  /**
   * @type {Set<string>}
   */
  #links = new Set();

  /**
   * @type {Set<HTMLCanvasElement>}
   */
  #canvases = new Set();

  /**
   * @type {number}
   */
  #minCanvasSize;

  /**
   * @type {number}
   */
  #maxCanvasCount;

  /**
   * When extracting content just from the viewport, this value will be set.
   *
   * @type {{ top: number; left: number; right: number; bottom: number } | null}
   */
  #viewportRect = null;

  /**
   * Constructs a new extraction context with the provided options.
   *
   * @param {Document} document
   * @param {GetDOMOptions} options
   */
  constructor(document, options) {
    this.#options = options;
    this.#minCanvasSize = options.minCanvasSize ?? 50;
    this.#maxCanvasCount = options.includeCanvasSnapshots
      ? (options.maxCanvasCount ?? 10)
      : 0;

    if (options.justViewport) {
      const { visualViewport } = document.defaultView;
      const { offsetTop, offsetLeft, width, height } = visualViewport;
      this.#viewportRect = {
        top: offsetTop,
        left: offsetLeft,
        right: offsetLeft + width,
        bottom: offsetTop + height,
      };
    }
  }

  /**
   * Accumulated text content produced during traversal.
   *
   * @returns {string}
   */
  get textContent() {
    return this.#textContent;
  }

  /**
   * @returns {string[]}
   */
  get links() {
    return Array.from(this.#links);
  }

  /**
   * @returns {HTMLCanvasElement[]}
   */
  get canvases() {
    return Array.from(this.#canvases);
  }

  /**
   * @param {string} href
   */
  maybeAddLink(href) {
    this.#links.add(href);
  }

  /**
   * @param {HTMLCanvasElement} canvas
   */
  #maybeAddCanvas(canvas) {
    const canvasSet = this.#canvases;

    if (canvasSet.has(canvas)) {
      return;
    }

    if (canvasSet.size >= this.#maxCanvasCount) {
      return;
    }

    const minSize = this.#minCanvasSize;
    if (canvas.width < minSize || canvas.height < minSize) {
      return;
    }

    if (isNodeHidden(canvas) || this.maybeOutOfViewport(canvas)) {
      return;
    }

    canvasSet.add(canvas);
  }

  /**
   * If this node is an anchor element, add its href to the links set.
   * Used for container nodes that will be subdivided, to capture anchors
   * that wrap block-level content.
   *
   * @param {Node} node
   */
  addLinkIfAnchor(node) {
    const element = asElement(node);
    if (element?.nodeName === "A") {
      const href = /** @type {HTMLAnchorElement} */ (element).href;
      if (href) {
        this.maybeAddLink(href);
      }
    }
  }

  /**
   * Extract all links from a node using querySelector.
   * Should only be called on leaf/accepted blocks, not on containers
   * that will be subdivided.
   *
   * @param {Node} node
   */
  extractLinksFromBlock(node) {
    const element = asElement(node);
    if (!element) {
      return;
    }

    // If the node itself is an anchor, add its href
    if (element.nodeName === "A") {
      // Check raw attribute first to avoid URL resolution if not needed
      if (element.hasAttribute("href")) {
        const href = /** @type {HTMLAnchorElement} */ (element).href;
        if (href) {
          this.maybeAddLink(href);
        }
      }
    } else {
      // Check ancestor anchors (for anchors wrapping block content)
      // Skip for top-level elements that can't be inside anchors
      const { nodeName } = element;
      if (nodeName !== "BODY" && nodeName !== "HTML") {
        const ancestorAnchor = element.closest("a");
        if (ancestorAnchor?.hasAttribute("href")) {
          const href = ancestorAnchor.href;
          if (href) {
            this.maybeAddLink(href);
          }
        }
      }
    }

    // Extract links from anchor descendants
    const anchors = element.getElementsByTagName("a");
    for (let i = 0, len = anchors.length; i < len; i++) {
      const anchor = anchors[i];
      // Check raw attribute first to avoid URL resolution if not needed
      if (anchor.hasAttribute("href")) {
        const href = anchor.href;
        if (href) {
          this.maybeAddLink(href);
        }
      }
    }
  }

  /**
   * Extract all canvases from a node.
   *
   * @param {Node} node
   */
  extractCanvasesFromBlock(node) {
    const canvasSet = this.#canvases;
    const maxCount = this.#maxCanvasCount;

    if (canvasSet.size >= maxCount) {
      return;
    }

    const element = asElement(node);
    if (!element) {
      return;
    }

    if (element.tagName === "CANVAS") {
      this.#maybeAddCanvas(/** @type {HTMLCanvasElement} */ (element));
      return;
    }

    const canvases = element.getElementsByTagName("canvas");
    const len = canvases.length;

    if (len === 0) {
      return;
    }

    for (let i = 0; i < len; i++) {
      if (canvasSet.size >= maxCount) {
        break;
      }
      this.#maybeAddCanvas(canvases[i]);
    }
  }

  /**
   * Returns true if a condition has been met such that the text
   * extraction should stop early, otherwise false.
   *
   * @returns {boolean}
   */
  shouldStopExtraction() {
    const { sufficientLength } = this.#options;

    if (
      sufficientLength !== undefined &&
      this.#textContent.length >= sufficientLength
    ) {
      return true;
    }

    return false;
  }

  /**
   * Returns true if this node or its ancestor's text content has
   * already been extracted from the DOM.
   *
   * @param {Node} node
   */
  #isNodeProcessed(node) {
    if (this.#processedNodes.has(node)) {
      return true;
    }

    for (const ancestor of getAncestorsIterator(node)) {
      if (this.#processedNodes.has(ancestor)) {
        return true;
      }
    }
    return false;
  }

  /**
   * When capturing content only in the viewport, skip nodes that are outside of it.
   *
   * @param {Node} node
   */
  maybeOutOfViewport(node) {
    if (!this.#viewportRect) {
      // We don't have a viewport rect, so skip this check.
      return false;
    }
    const element = getHTMLElementForStyle(node);
    if (!element) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    if (!rect) {
      return false;
    }

    return (
      rect.bottom <= this.#viewportRect.top ||
      rect.top >= this.#viewportRect.bottom ||
      rect.right <= this.#viewportRect.left ||
      rect.left >= this.#viewportRect.right
    );
  }

  /**
   * Append the node's text content to the accumulated text only if the node
   * itself as well as no ancestor of the node has already been processed.
   *
   * @param {Node} node
   */
  maybeAppendTextContent(node) {
    if (this.#isNodeProcessed(node)) {
      return;
    }

    this.#processedNodes.add(node);

    if (isNodeHidden(node)) {
      return;
    }

    if (this.maybeOutOfViewport(node)) {
      // This only can return true when we're capturing just the viewport nodes.
      return;
    }

    const element = asHTMLElement(node);
    const text = asTextNode(node);
    let innerText = "";

    if (element) {
      if (this.#hasInlineAnchors(element)) {
        innerText = this.#extractTextWithMarkdownLinks(element);
      } else {
        innerText = element.innerText.trim();
      }
    } else if (text?.nodeValue) {
      innerText = text.nodeValue.trim();
    }

    if (innerText) {
      this.#textContent += "\n" + innerText;
    }
  }

  /**
   * Check if a block contains any inline anchors that should be formatted as markdown.
   * Anchors that wrap block content are excluded since they will be handled by
   * the block splitting strategy.
   *
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  #hasInlineAnchors(element) {
    if (element.nodeName === "A") {
      return !this.#wrapsBlockContent(element);
    }

    const anchors = element.querySelectorAll("a");
    for (const anchor of anchors) {
      if (!this.#wrapsBlockContent(anchor)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract text from an element, formatting inline anchors as markdown.
   * Uses a TreeWalker to traverse the content in document order without
   * cloning or modifying the DOM.
   *
   * @param {HTMLElement} element
   * @returns {string}
   */
  #extractTextWithMarkdownLinks(element) {
    // Handle the simple case where the element itself is an inline anchor
    if (element.nodeName === "A" && !this.#wrapsBlockContent(element)) {
      return this.#formatAnchorAsMarkdown(element);
    }

    const parts = [];
    this.#walkAndExtract(element, parts);
    // Normalize whitespace for clean output
    return parts.join("").replace(WHITESPACE_REGEX, " ").trim();
  }

  /**
   * Recursively walk the DOM and extract text, formatting inline anchors as markdown.
   *
   * @param {Node} node
   * @param {string[]} parts
   */
  #walkAndExtract(node, parts) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? "";
      if (text) {
        parts.push(text);
      }
      return;
    }

    const element = asElement(node);
    if (!element) {
      return;
    }

    // If this is an anchor, check if it wraps block content
    if (element.nodeName === "A") {
      if (this.#wrapsBlockContent(element)) {
        // Anchor wraps block content - extract children normally without markdown
        for (const child of element.childNodes) {
          this.#walkAndExtract(child, parts);
        }
      } else {
        // Inline anchor - format as markdown
        parts.push(this.#formatAnchorAsMarkdown(element));
      }
      return;
    }

    // For other elements, recurse into children
    for (const child of element.childNodes) {
      this.#walkAndExtract(child, parts);
    }
  }

  /**
   * Format an anchor element as markdown [text](url).
   * Uses the resolved href property for the URL to get absolute URLs.
   *
   * @param {HTMLAnchorElement} anchor
   * @returns {string}
   */
  #formatAnchorAsMarkdown(anchor) {
    // Normalize whitespace in link text for clean markdown output
    // e.g., <a>Some \n  text</a> becomes [Some text](url)
    let linkText = (anchor.textContent ?? "")
      .replace(WHITESPACE_REGEX, " ")
      .trim();

    // For image-only anchors, use alt text if available
    if (!linkText) {
      const img = anchor.querySelector("img");
      if (img) {
        linkText = (img.alt ?? "").trim();
      }
    }

    // No text means we can't produce meaningful markdown
    if (!linkText) {
      return "";
    }

    // Use anchor.href which provides the resolved (absolute) URL.
    // Empty href resolves to the current document URL, which is valid.
    const href = anchor.href;
    if (!href) {
      return linkText;
    }

    // Escape brackets and parentheses in link text, and parentheses in URL for valid markdown
    const escapedText = linkText.replace(MARKDOWN_TEXT_ESCAPE_REGEX, "\\$&");
    const escapedHref = href
      .replace(OPEN_PAREN_REGEX, "%28")
      .replace(CLOSE_PAREN_REGEX, "%29");
    return `[${escapedText}](${escapedHref})`;
  }

  /**
   * Check if an anchor element wraps block-level content.
   * Such anchors should not be formatted as markdown since their
   * content will be extracted separately by the block splitting strategy.
   * Checks recursively to handle cases like <a><span><div>...</div></span></a>.
   *
   * @param {Element} element
   * @returns {boolean}
   */
  #wrapsBlockContent(element) {
    for (const child of element.childNodes) {
      const childElement = asElement(child);
      if (!childElement) {
        continue;
      }
      if (getIsBlockLike(childElement)) {
        return true;
      }
      // Recursively check inline children for nested block content
      if (this.#wrapsBlockContent(childElement)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Extracts visible text content from the DOM.
 * By default, this extracts content from the entire page.
 *
 * Callers may specify filters for the extracted text via
 * the supported options @see {GetTextOptions}.
 *
 * @param {Document} document
 * @param {GetDOMOptions} options
 *
 * @returns {DOMExtractionResult}
 *
 * In-depth documentation:
 *
 * Webpages are complicated documents. There are many different semantic structures
 * like <article>, aria controls or even specifications like schema.org. The DOMExtractor
 * can use these as hints, but ultimately the goal is to extract the user visible text
 * from a webpage in the same way it is presented to the user. Text in layout is done
 * through inline elements that go through reflow within a block. The intent of this
 * algorithm is to collect all of the blocks on the screen, and convert each block into
 * a paragraph of plain text that is representative of the information that is displayed
 * on the screen.
 *
 * For example:
 *
 *   <article>
 *     <div>
 *       This <span>is an example</span> of a block with inline elements.
 *     </div>
 *     <span style="display: block">
 *       The <div style="display: inline">computed style</div> is respected for extraction.
 *     </span>
 *     <div style="display: none">
 *       Only visible text will be extracted.
 *     </div>
 *   </article>
 *
 * If extraction is run on this document you will get the following lines:
 *
 *   ```
 *   This is an example of a block with inline elements.\n
 *   The computed style is respected for extraction.\n
 *   ```
 *
 * This text should be formatted in a way that a language model can infer the meaning
 * of the page, and work efficiently with the returned structure. A user reads and
 * understands the content of the page based on how it's displayed to them. Therefore
 * a language model should get plain text that as closely resembles that.
 *
 * The DOMExtractor supports different modes to limit the amount of content, or provide
 * only information that is in the viewport. Ultimately it should be able to take any
 * type of request from things like the get_page_content tool call, and fulfill that
 * request in an efficient way that returns content as much as possible as how a user
 * would actually experience it once rendered to the page.
 *
 * This strategy differs from more traditional scraping methods, as the browser has
 * access to the full styled page. We can measure the computed style of elements to
 * determine visibility and the actually computed block status (e.g. "display: block"
 * and "display: inline")
 */
export function extractTextFromDOM(document, options) {
  const context = new ExtractionContext(document, options);

  subdivideAndExtractText(document.body, context);

  return {
    text: context.textContent.trim(),
    links: context.links,
    canvases: context.canvases,
  };
}

/**
 * Tags excluded from text extraction.
 */
const CONTENT_EXCLUDED_TAGS = new Set([
  // TODO - We should add this and write some tests.
  "CODE",

  // The following are deprecated tags.
  "DIR",
  "APPLET",

  // The following are embedded elements, and are not supported (yet).
  "MATH",
  "EMBED",
  "OBJECT",
  "IFRAME",

  // This is an SVG tag that can contain arbitrary XML, ignore it.
  "METADATA",

  // These are elements that are treated as opaque by Firefox which causes their
  // innerHTML property to be just the raw text node behind it. Any text that is sent as
  // HTML must be valid, and there is no guarantee that the innerHTML is valid.
  "NOSCRIPT",
  "NOEMBED",
  "NOFRAMES",

  // Do not parse the HEAD tag.
  "HEAD",

  // These are not user-visible tags.
  "STYLE",
  "SCRIPT",
  "TEMPLATE",
]);

const CONTENT_EXCLUDED_NODE_SELECTOR = [...CONTENT_EXCLUDED_TAGS].join(",");

/**
 * Get the ShadowRoot from the chrome-only openOrClosedShadowRoot API.
 * This allows for extracting the content from WebComponents, which is not
 * normally feasible in non-privileged contexts.
 *
 * @param {Node} node
 *
 * @returns {ShadowRoot | null}
 */
function getShadowRoot(node) {
  return asElement(node)?.openOrClosedShadowRoot ?? null;
}

/**
 * Determines if a node is ready for text extraction, or if it should be subdivided
 * further. It doesn't check if the node has already been processed. This id done
 * at the block level.
 *
 * @param {Node} node
 * @returns {number} - NodeFilter acceptance status.
 */
function determineBlockStatus(node) {
  if (!node) {
    return NodeFilter.FILTER_REJECT;
  }
  if (getShadowRoot(node)) {
    return NodeFilter.FILTER_ACCEPT;
  }

  const canvasElement = asElement(node);
  if (canvasElement?.tagName === "CANVAS") {
    return NodeFilter.FILTER_ACCEPT;
  }

  if (isExcludedNode(node)) {
    // This is an explicit.
    return NodeFilter.FILTER_REJECT;
  }

  if (
    containsExcludedNode(node, CONTENT_EXCLUDED_NODE_SELECTOR) &&
    !hasNonWhitespaceTextNodes(node)
  ) {
    // Skip this node, and dig deeper into its tree to cut off smaller pieces to extract.
    return NodeFilter.FILTER_SKIP;
  }

  if (nodeNeedsSubdividing(node)) {
    // Skip this node, and dig deeper into its tree to cut off smaller pieces
    // to extract. It is presumed to be a wrapper of block elements.
    return NodeFilter.FILTER_SKIP;
  }

  // This textContent call is fairly expensive.
  if (!node.textContent?.trim().length) {
    // Check if this is an anchor with an image.
    // Accept these anchors so their links are captured, even without alt text.
    const anchorElement = asElement(node);
    if (anchorElement?.nodeName === "A") {
      const img = anchorElement.querySelector("img");
      if (img) {
        return NodeFilter.FILTER_ACCEPT;
      }
    }

    // Do not use subtrees that are empty of text.
    return !node.hasChildNodes()
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_SKIP;
  }

  // This node can be treated as entire block and is ready for text extraction.
  return NodeFilter.FILTER_ACCEPT;
}
/**
 * Determine if this element is an inline element or a block element.
 *
 * @param {Node} node
 * @returns {boolean}
 */
function nodeNeedsSubdividing(node) {
  const element = asElement(node);
  if (!element) {
    // Only elements need to be further subdivided.
    return false;
  }

  for (let childNode of element.childNodes) {
    if (!childNode) {
      continue;
    }
    switch (childNode.nodeType) {
      case Node.TEXT_NODE: {
        // Keep checking for more inline or text nodes.
        continue;
      }
      case Node.ELEMENT_NODE: {
        if (getIsBlockLike(childNode)) {
          // This node is a block node, so it needs further subdividing.
          return true;
        } else if (nodeNeedsSubdividing(childNode)) {
          // This non-block-like node may contain other block-like nodes.
          return true;
        }

        // Keep checking for more inline or text nodes.
        continue;
      }
      default: {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns true if a node is hidden based on factors such as collapsed state and
 * computed style, otherwise false.
 *
 * @param {Node} node
 * @returns {boolean}
 */
function isNodeHidden(node) {
  const element = getHTMLElementForStyle(node);

  if (!element) {
    // If we cannot get an HTMLElement to check visibility, we should not
    // consider the node hidden. This can happen with cross-compartment
    // elements where HTMLElement.isInstance fails.
    return false;
  }

  // This is a cheap and easy check that will not compute style or force reflow.
  if (element.hidden) {
    // The element is explicitly hidden.
    return true;
  }

  // Handle open/closed <details> elements. This will also not compute style or force reflow.
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details
  if (
    // The element is within a closed <details>
    element.closest("details:not([open])") &&
    // The element is not part of the <summary> of the <details>, which is always visible, even when closed.
    !element.closest("summary")
  ) {
    // The element is within a closed <details> and is not part of the <summary>, therefore it is not visible.
    return true;
  }

  // This forces reflow, which has a performance cost, but this is also what JQuery uses for its :hidden and :visible.
  // https://github.com/jquery/jquery/blob/bd6b453b7effa78b292812dbe218491624994526/src/css/hiddenVisibleSelectors.js#L1-L10
  if (
    !(
      element.offsetWidth ||
      element.offsetHeight ||
      element.getClientRects().length
    )
  ) {
    return true;
  }

  // The element may still have a zero-sized bounding client rectangle.
  const boundingClientRect = element.getBoundingClientRect();
  if (
    boundingClientRect &&
    (boundingClientRect.width === 0 || boundingClientRect.height === 0)
  ) {
    return true;
  }

  const { ownerGlobal } = element;
  if (!ownerGlobal) {
    // We cannot compute the style without ownerGlobal, so we will assume it is not visible.
    return true;
  }

  // This flushes the style, which is a performance cost.
  const style = ownerGlobal.getComputedStyle(element);
  if (!style) {
    // We were unable to compute the style, so we will assume it is not visible.
    return true;
  }

  // This is an issue with the DOM library generation.
  const { display, visibility, opacity } = style;

  return (
    display === "none" ||
    visibility === "hidden" ||
    visibility === "collapse" ||
    opacity === "0"
  );
}

/**
 * @param {Node} node
 */
function isExcludedNode(node) {
  // Property access be expensive, so destructure required properties so they are
  // not accessed multiple times.
  const { nodeType } = node;

  if (nodeType === Node.TEXT_NODE) {
    // Text nodes are never excluded.
    return false;
  }
  const element = asElement(node);
  if (!element) {
    // Only elements and and text nodes should be considered.
    return true;
  }

  const { nodeName } = element;

  if (CONTENT_EXCLUDED_TAGS.has(nodeName.toUpperCase())) {
    // SVG tags can be lowercased, so ensure everything is uppercased.
    // This is an excluded tag.
    return true;
  }

  return false;
}

/**
 * Like `#isExcludedNode` but looks at the full subtree. Used to see whether
 * we can consider a subtree, or whether we should split it into smaller
 * branches first to try to exclude more of the content.
 *
 * @param {Node} node
 * @param {string} excludedNodeSelector
 *
 * @returns {boolean}
 */
function containsExcludedNode(node, excludedNodeSelector) {
  return Boolean(asElement(node)?.querySelector(excludedNodeSelector));
}

/**
 * Test whether any of the direct child text nodes of are non-whitespace text nodes.
 *
 * For example:
 *   - `<p>test</p>`: yes
 *   - `<p> </p>`: no
 *   - `<p><b>test</b></p>`: no
 *
 * @param {Node} node
 *
 * @returns {boolean}
 */
function hasNonWhitespaceTextNodes(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    // Only check element nodes.
    return false;
  }

  for (const child of node.childNodes) {
    const textNode = asTextNode(child);
    if (textNode) {
      if (!textNode.textContent?.trim()) {
        // This is just whitespace.
        continue;
      }
      // A text node with content was found.
      return true;
    }
  }

  // No text nodes were found.
  return false;
}

/**
 * Start walking down through a node's subtree and decide which nodes to extract content
 * from. This first node is the root of the page.
 *
 * The nodes go through a process of subdivision until an appropriate sized chunk
 * of inline text can be found.
 *
 * @param {Node} node
 * @param {ExtractionContext} context
 */
function subdivideAndExtractText(node, context) {
  if (context.shouldStopExtraction()) {
    return;
  }

  switch (determineBlockStatus(node)) {
    case NodeFilter.FILTER_REJECT: {
      // This node is rejected as it shouldn't be used for text extraction.
      return;
    }

    // Either a shadow host or a block element
    case NodeFilter.FILTER_ACCEPT: {
      const shadowRoot = getShadowRoot(node);
      if (shadowRoot) {
        processSubdivide(shadowRoot, context);
      } else {
        context.extractLinksFromBlock(node);
        context.extractCanvasesFromBlock(node);
        context.maybeAppendTextContent(node);
      }
      break;
    }

    case NodeFilter.FILTER_SKIP: {
      // This node may have text to extract, but it needs to be subdivided into smaller
      // pieces. Create a TreeWalker to walk the subtree, and find the subtrees/nodes
      // that contain enough inline elements to extract.
      // Only check if this node itself is an anchor (for anchors wrapping block content).
      // Don't scan descendants here - they'll be processed when child blocks are accepted.
      context.addLinkIfAnchor(node);
      processSubdivide(node, context);
      break;
    }
  }
}

/**
 * Add qualified nodes to have their text content extracted by recursively walking
 * through the DOM tree of nodes, including elements in the Shadow DOM.
 *
 * @param {Node} node
 * @param {ExtractionContext} context
 */
function processSubdivide(node, context) {
  if (context.shouldStopExtraction()) {
    return;
  }

  const { ownerDocument } = node;
  if (!ownerDocument) {
    return;
  }

  // This iterator will contain each node that has been subdivided enough to have its
  // text extracted.
  const nodeIterator = ownerDocument.createTreeWalker(
    node,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    determineBlockStatus
  );

  let currentNode;
  while ((currentNode = nodeIterator.nextNode())) {
    const shadowRoot = getShadowRoot(currentNode);
    if (shadowRoot) {
      processSubdivide(shadowRoot, context);
    } else {
      context.extractLinksFromBlock(currentNode);
      context.extractCanvasesFromBlock(currentNode);
      context.maybeAppendTextContent(currentNode);
    }
    if (context.shouldStopExtraction()) {
      return;
    }
  }
}

/**
 * Returns an iterator of a node's ancestors.
 *
 * @param {Node} node
 *
 * @yields {Node}
 */
function* getAncestorsIterator(node) {
  const document = node.ownerDocument;
  if (!document) {
    return;
  }
  for (
    let parent = node.parentNode;
    parent && parent !== document.documentElement;
    parent = parent.parentNode
  ) {
    yield parent;
  }
}

/**
 * Reads the elements computed style and determines if the element is a block-like
 * element or not. Every element that lays out like a block should be used as a unit
 * for text extraction.
 *
 * @param {Node} node
 * @returns {boolean}
 */
function getIsBlockLike(node) {
  const element = asElement(node);
  if (!element) {
    return false;
  }

  const { ownerGlobal } = element;
  if (!ownerGlobal) {
    return false;
  }

  if (element.namespaceURI === "http://www.w3.org/2000/svg") {
    // SVG elements will report as inline, but there is no block layout in SVG.
    // Treat every SVG element as being block so that every node will be subdivided.
    return true;
  }

  /** @type {Record<string, string>} */
  // @ts-expect-error - This is a workaround for the CSSStyleDeclaration not being indexable.
  const style = ownerGlobal.getComputedStyle(element) ?? { display: null };

  return style.display !== "inline" && style.display !== "none";
}

/**
 * Use TypeScript to determine if the Node is an Element.
 *
 * @param {Node | null | undefined} node
 * @returns {Element | null}
 */
function asElement(node) {
  if (node?.nodeType === Node.ELEMENT_NODE) {
    return /** @type {HTMLElement} */ (node);
  }
  return null;
}

/**
 * Use TypeScript to determine if the Node is an Element.
 *
 * @param {Node | null} node
 *
 * @returns {Text | null}
 */
function asTextNode(node) {
  if (node?.nodeType === Node.TEXT_NODE) {
    return /** @type {Text} */ (node);
  }
  return null;
}

/**
 * Use TypeScript to determine if the Node is an HTMLElement.
 *
 * @param {Node | null} node
 *
 * @returns {HTMLElement | null}
 */
function asHTMLElement(node) {
  if (HTMLElement.isInstance(node)) {
    return node;
  }
  return null;
}

/**
 * This function returns the correct element to determine the
 * style of node.
 *
 * @param {Node} node
 *
 * @returns {HTMLElement | null}
 */
function getHTMLElementForStyle(node) {
  const element = asHTMLElement(node);
  if (element) {
    return element;
  }

  if (node.parentElement) {
    return asHTMLElement(node.parentElement);
  }

  // For cases like text node where its parent is ShadowRoot,
  // we'd like to use flattenedTreeParentNode
  if (node.flattenedTreeParentNode) {
    return asHTMLElement(node.flattenedTreeParentNode);
  }

  // If the text node is not connected or doesn't have a frame.
  return null;
}
