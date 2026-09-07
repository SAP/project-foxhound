function hasChildNodes() {
  // Recurse so we get close to the stack limit.
  try {
    hasChildNodes();
  } catch {
    // Ignore over-recursion error.
  }

  // RegExp with child nodes.
  return RegExp(".|.").test("");
}
hasChildNodes();

function hasLeafNode() {
  // Recurse so we get close to the stack limit.
  try {
    hasLeafNode();
  } catch {
    // Ignore over-recursion error.
  }

  // RegExp consisting of a single leaf node.
  return RegExp(".").test("");
}
hasLeafNode();
