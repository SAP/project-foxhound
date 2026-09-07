/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// The namespaces from the specification at
// https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md#namespace
const OPENSEARCH_NS_10 = "http://a9.com/-/spec/opensearch/1.0/";
const OPENSEARCH_NS_11 = "http://a9.com/-/spec/opensearch/1.1/";

// Although the specification at gives the namespace names defined above, many
// existing OpenSearch engines are using the following versions. We therefore
// allow any one of these.
const OPENSEARCH_NAMESPACES = [
  OPENSEARCH_NS_11,
  OPENSEARCH_NS_10,
  "http://a9.com/-/spec/opensearchdescription/1.1/",
  "http://a9.com/-/spec/opensearchdescription/1.0/",
];

// The name of the element defining the OpenSearch definition.
const OPENSEARCH_LOCALNAME = "OpenSearchDescription";

// These were OpenSearch definitions for engines used internally by Mozilla.
// It may be possible to deprecate/remove these in future.
const MOZSEARCH_NS_10 = "http://www.mozilla.org/2006/browser/search/";
const MOZSEARCH_LOCALNAME = "SearchPlugin";

const URL_TYPE_SUGGEST_JSON = "application/x-suggestions+json";
const URL_TYPE_SEARCH = "text/html";

/**
 * @typedef {object} OpenSearchProperties
 * @property {string} name
 *   The display name of the engine.
 * @property {nsIURI} [installURL]
 *   The URL that the engine was initially loaded from.
 * @property {string} [queryCharset]
 *   The character set to use for encoding query values.
 * @property {string} [searchForm]
 *   Non-standard. The search form URL.
 * @property {string} [updateURL]
 *   Non-standard. The update URL for the engine.
 * @property {number} [updateInterval]
 *   Non-standard. The update interval for the engine.
 * @property {OpenSearchURL[]} urls
 *   An array of URLs associated with the engine.
 * @property {OpenSearchImage[]} images
 *   An array of images assocaiated with the engine.
 */

/**
 * @typedef {object} OpenSearchURL
 * @property {string} type
 *   The OpenSearch based type of the URL see SearchUtils.URL_TYPE.
 * @property {string} method
 *   The method of submission for the URL: GET or POST.
 * @property {string} template
 *   The template for the URL.
 * @property {object[]} params
 *   An array of additional properties of name/value pairs. These are not part
 *   of the OpenSearch specification, but were used in Firefox prior to Firefox 78.
 * @property {string[]} rels
 *   An array of strings that define the relationship of this URL.
 *
 * @see SearchUtils.URL_TYPE
 * @see https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md#url-rel-values
 */

/**
 * @typedef {object} OpenSearchImage
 * @property {string} url
 *   The source URL of the image.
 * @property {number} size
 *   The reported width and height of the image.
 */

/**
 * Utility class for parsing OpenSearch XML data into engine properties.
 */
export class OpenSearchParser {
  /**
   * Parses OpenSearch XML byte data into engine properties.
   *
   * @param {number[]} xmlData
   *   The loaded search engine XML data as an array of bytes.
   * @returns {{data: OpenSearchProperties}|{error: string}}
   */
  static parseXMLData(xmlData) {
    var parser = new DOMParser();
    var doc = parser.parseFromBuffer(xmlData, "text/xml");

    if (!doc?.documentElement) {
      return { error: "Could not parse file" };
    }

    let element = doc.documentElement;
    if (!hasExpectedNamespace(element)) {
      return { error: "Not a valid OpenSearch xml file" };
    }

    try {
      return { data: processXMLDocument(element) };
    } catch (ex) {
      return { error: ex.message };
    }
  }
}

/**
 * Extract search engine information from the given document into a form that
 * can be passed to an OpenSearchEngine.
 *
 * @param {Element} xmlDocument
 *   The document to examine.
 * @returns {OpenSearchProperties}
 *   The extracted engine properties.
 */
function processXMLDocument(xmlDocument) {
  /** @type {OpenSearchProperties} */
  let result = { name: "", urls: [], images: [] };

  for (let i = 0; i < xmlDocument.children.length; ++i) {
    var child = xmlDocument.children[i];
    switch (child.localName) {
      case "ShortName":
        result.name = child.textContent;
        break;
      case "Url":
        try {
          result.urls.push(parseURL(child));
        } catch (ex) {
          // Parsing of the element failed, just skip it.
          console.error("Failed to parse URL child:", ex);
        }
        break;
      case "Image": {
        let imageData = parseImage(child);
        if (imageData) {
          result.images.push(imageData);
        }
        break;
      }
      case "InputEncoding":
        // If this is not specified we fallback to the SearchEngine constructor
        // which currently uses SearchUtils.DEFAULT_QUERY_CHARSET which is
        // UTF-8 - the same as for OpenSearch.
        result.queryCharset = child.textContent;
        break;

      // Non-OpenSearch elements
      case "SearchForm":
        result.searchForm = child.textContent;
        break;
      case "UpdateUrl":
        result.updateURL = child.textContent;
        break;
      case "UpdateInterval":
        result.updateInterval = parseInt(child.textContent);
        break;
    }
  }
  if (!result.name || !result.urls.length) {
    throw new Error("No name, or missing URL for search engine");
  }
  if (!result.urls.find(url => url.type == URL_TYPE_SEARCH)) {
    throw new Error("Missing text/html result type in URLs for search engine");
  }
  return result;
}

/**
 * Extracts data from an OpenSearch URL element and creates an object which can
 * be used to create an OpenSearchEngine's URL.
 *
 * @param {Element} element
 *   The OpenSearch URL element.
 * @returns {OpenSearchURL}
 *   The extracted URL data.
 * @throws NS_ERROR_FAILURE if a URL object could not be created.
 *
 * @see https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md#the-url-element
 */
function parseURL(element) {
  var type = element.getAttribute("type");
  // According to the spec, method is optional, defaulting to "GET" if not
  // specified.
  var method = element.getAttribute("method") || "GET";
  var template = element.getAttribute("template");

  let rels = [];
  if (element.hasAttribute("rel")) {
    rels = element.getAttribute("rel").toLowerCase().split(/\s+/);
  }

  // Support an alternate suggestion type, see bug 1425827 for details.
  if (type == "application/json" && rels.includes("suggestions")) {
    type = URL_TYPE_SUGGEST_JSON;
  }

  let url = {
    type,
    method,
    template,
    params: [],
    rels,
  };

  // Non-standard. Used to be for Mozilla search engine files.
  for (var i = 0; i < element.children.length; ++i) {
    var param = element.children[i];
    if (param.localName == "Param") {
      url.params.push({
        name: param.getAttribute("name"),
        value: param.getAttribute("value"),
      });
    }
  }

  return url;
}

/**
 * Extracts an icon from an OpenSearch Image element.
 *
 * @param {Element} element
 *   The OpenSearch Image element.
 * @returns {OpenSearchImage|null}
 *   The properties of the image, or null if invalid.
 * @see https://github.com/dewitt/opensearch/blob/master/opensearch-1-1-draft-6.md#the-image-element
 */
function parseImage(element) {
  let width = parseInt(element.getAttribute("width"), 10);
  let height = parseInt(element.getAttribute("height"), 10);

  if (isNaN(width) || isNaN(height) || width <= 0 || width != height) {
    console.warn(
      "OpenSearch image element must have equal and positive width and height."
    );
    return null;
  }

  return {
    url: element.textContent,
    size: width,
  };
}

/**
 * Confirms if the document has the expected namespace.
 *
 * @param {Element} element
 *   The document to check.
 * @returns {boolean}
 *   True if the document matches the namespace.
 */
function hasExpectedNamespace(element) {
  return (
    (element.localName == MOZSEARCH_LOCALNAME &&
      element.namespaceURI == MOZSEARCH_NS_10) ||
    (element.localName == OPENSEARCH_LOCALNAME &&
      OPENSEARCH_NAMESPACES.includes(element.namespaceURI))
  );
}
