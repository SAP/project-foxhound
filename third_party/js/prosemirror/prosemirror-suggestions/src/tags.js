/**
 * @type {NodeSpec}
 */
export const tagNodeSpec = {
  attrs: {
    id: {},
  },

  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  /**
   * @param {Node} node
   */
  toDOM: node => ['span', {
    'class': 'tag',
    'data-tag-id': node.attrs.id,
  }, node.attrs.id],

  parseDOM: [{
    tag: 'span[data-tag-id]',

    /**
     * @param {Element} dom
     * @returns {{id: string}}
     */
    getAttrs: dom => {
      const id = dom.getAttribute('data-tag-id');

      return { id };
    },
  }],
};

/**
 * @param {OrderedMap} nodes
 * @returns {OrderedMap}
 */
export function addTagNodes(nodes) {
  return nodes.append({
    tag: tagNodeSpec,
  });
}
