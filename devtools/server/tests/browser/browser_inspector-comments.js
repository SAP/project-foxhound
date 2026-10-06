/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that comment nodes are properly handled in the inspector.

add_task(async function testCommentNodeVisibility() {
  const testHTML = `
    <div>Text</div>
    <!-- First comment -->
    <video></video>
    <!-- Second comment -->
  `;

  info("Test that comment nodes are shown by default");
  let { walker } = await initInspectorFront(
    "data:text/html;charset=utf-8," + encodeURIComponent(testHTML)
  );
  let body = await walker.querySelector(walker.rootNode, "body");
  let bodyChildren = await walker.children(body);
  is(
    bodyChildren.nodes.length,
    4,
    "Body has 4 children (2 comments + div + video)"
  );
  const firstComment = bodyChildren.nodes[1];
  is(
    firstComment.nodeType,
    Node.COMMENT_NODE,
    "First child after div is a comment node"
  );
  const secondComment = bodyChildren.nodes[3];
  is(secondComment.nodeType, Node.COMMENT_NODE, "Last child is a comment node");

  info("Test that comment nodes are hidden when preference is set to false");
  await SpecialPowers.pushPrefEnv({
    set: [["devtools.markup.showComments", false]],
  });
  ({ walker } = await initInspectorFront(
    "data:text/html;charset=utf-8," + encodeURIComponent(testHTML)
  ));
  body = await walker.querySelector(walker.rootNode, "body");
  bodyChildren = await walker.children(body);
  is(
    bodyChildren.nodes.length,
    2,
    "Body has 2 children when comments are hidden"
  );
  ok(
    bodyChildren.nodes.every(node => node.nodeType !== Node.COMMENT_NODE),
    "No comment nodes are returned from walker"
  );

  info("Test that comment nodes are shown again when preference is enabled");
  await SpecialPowers.pushPrefEnv({
    set: [["devtools.markup.showComments", true]],
  });
  ({ walker } = await initInspectorFront(
    "data:text/html;charset=utf-8," + encodeURIComponent(testHTML)
  ));
  body = await walker.querySelector(walker.rootNode, "body");
  bodyChildren = await walker.children(body);
  is(bodyChildren.nodes.length, 4, "Body has 4 children again");
  ok(
    bodyChildren.nodes.some(node => node.nodeType === Node.COMMENT_NODE),
    "Comment nodes are returned from walker"
  );
});
