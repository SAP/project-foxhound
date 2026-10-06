# Architecture

This document provides a high-level overview of how the accessibility code is structured. See [the Document Accessibility Lifecycle page](DocumentAccessibilityLifecycle.md#docaccessible-creation) for a lower level description of the code.

## Process Model

The accessibility component spans multiple processes. In the parent process, it creates an accessibility tree of the Firefox UI and responds to requests from accessibility clients such as screen readers, magnifiers and voice control tools. In content processes, the accessibility component creates accessibility trees from web content.

To respond to accessibility client requests quickly, the accessibility tree from each content process is cached in the parent process.

## Accessibility Trees

Accessibility trees can carry different kinds of information: informally, there are "local trees" that represent a document in the current process and "remote trees" that mirror a local tree created in a separate process.

A local tree can only contain nodes in the current process, i.e. you can visit any node in the tab document and its in-process iframes. However, out-of-process iframes appear as a separate local tree in a different process.

A remote tree, on the other hand, unifies these trees: you can visit any node in the tab document and both its in-process and out-of-process iframes.

This means there are multiple accessibility trees for a single tab: one local tree in the content process, one local tree for each out-of-process iframe, and one remote tree in the parent process that mirrors these local trees. The Firefox UI is represented by a single local tree in the parent process.

An accessibility client communicates only with the parent process.
It sees the local tree for the Firefox UI and the remote trees for tabs and iframes as a single, unified tree.

### Tree Nodes

An accessibility tree is composed of nodes represented by the `Accessible` class and its subtypes. Below is an example local accessibility tree from [example.com](https://example.com), as printed by `a11y::logging::Tree` (unfortunately, without type information):

<!-- This isn't very accessible, at least in VoiceOver on Safari: VoiceOver only navigates between each word and I'm not sure if it's even possible to skip the whole block. Ideally, we can improve it. -->

```
A11Y TREE: Initial subtree; 44:14.388
  {
    : 0x107077a00; role: document, name: 'Example Domain', idx: 0, node: 0x105f84800, #document
      : 0x105fb8b30; role: heading, name: 'Example Domain', idx: 0, node: 0x107b048b0, h1
        : 0x105fb8c90; role: text leaf, name: 'Example Domain', idx: 0, node: 0x107b05600, #text
      : 0x105fb8d40; role: paragraph, idx: 1, node: 0x107b04940, p
        : 0x105fb8df0; role: text leaf, name: 'This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.', idx: 0, node: 0x107b05700, #text
      : 0x105fb8ea0; role: paragraph, idx: 2, node: 0x107b049d0, p
        : 0x107922030; role: link, name: 'More information...', idx: 0, node: 0x107b030e0, a [ href="https://www.iana.org/domains/example" ]
          : 0x1079220e0; role: text leaf, name: 'More information...', idx: 0, node: 0x107b05800, #text
  }
```

<!-- Accessible is not in a code block because VoiceOver (on Safari) will not read full paragraphs if they start with <code> for an unknown reason. -->
Accessible has a direct subtype for different kinds of accessibility trees: `LocalAccessible` for nodes of local trees and `RemoteAccessible` for nodes of remote trees. For example, `LocalAccessible` can be used in content processes for web content and in the parent process for the Firefox UI. The descendants of these two types diverge.

<!-- LocalAccessible is intentionally not in a code block: see above. -->
LocalAccessible's direct descendant is `AccessibleWrap`. By convention, a class that ends in `Wrap` is a platform-specific implementation so `AccessibleWrap` contains the platform-specific implementations of `Accessible` and `LocalAccessible`. `AccessibleWrap's` direct and indirect subtypes are representations of HTML and XUL nodes such as `HTMLButtonAccessible` and `HTMLListBulletAccessible`. The Document and the root node of the accessibility tree are also represented by the `Accessible` class: `DocAccessible` and `DocAccessibleWrap` as well as `RootAccessible` and `RootAccessibleWrap` extend `AccessibleWrap`.

<!-- RemoteAccessible is intentionally not in a code block: see above. -->
RemoteAccessible doesn’t have such an extensive type hierarchy. Its primary descendant is `DocAccessibleParent` which is the Document node of a remote tree located in the parent process: its local tree counterpart in a content process is `DocAccessible`.

Below is a graph that displays the same relationships described above. In the graph, solid lines represent direct descendants while dotted lines represent indirect descendants:

```{mermaid}
flowchart TD
accTitle: Graph of the class hierarchy described above
Accessible --> LocalAccessible[LocalAccessible: local tree] & RemoteAccessible[RemoteAccessible: remote tree]
LocalAccessible --> AccessibleWrap[AccessibleWrap: platform-specific implementation]
AccessibleWrap -.-> DocAccessible & HTMLButtonAccessible & HTMLListBulletAccessible
DocAccessible --> DocAccessibleWrap --> RootAccessible --> RootAccessibleWrap
RemoteAccessible -.-> DocAccessibleParent
```

### Platform-Specific Behavior

Accessibility trees differ by platform. The platform-independent tree, composed of types like `LocalAccessible` and `RemoteAccessible`, is marshalled into a platform-specific tree that makes it easier to implement the platform's accessibility API (or APIs). The platform tree is composed of the following node types:

- Windows: [MsaaAccessible], [ia2Accessible] and [uiaRawElmProvider]
- macOS: [mozAccessible]
- Linux: [ATKObjects and MaiAtkObjects](https://searchfox.org/mozilla-central/rev/d7d2cc647772de15c4c5aa47f74d25d0e379e404/accessible/atk/nsMai.h#87)

[MsaaAccessible]: https://searchfox.org/mozilla-central/rev/d7d2cc647772de15c4c5aa47f74d25d0e379e404/accessible/windows/msaa/MsaaAccessible.h
[ia2Accessible]: https://searchfox.org/mozilla-central/rev/d7d2cc647772de15c4c5aa47f74d25d0e379e404/accessible/windows/ia2/ia2Accessible.h#21
[uiaRawElmProvider]: https://searchfox.org/firefox-main/rev/dab03896ede1413be148884e054b311767bcf1a0/accessible/windows/uia/uiaRawElmProvider.h#34
[mozAccessible]: https://searchfox.org/mozilla-central/rev/d7d2cc647772de15c4c5aa47f74d25d0e379e404/accessible/mac/mozAccessible.mm
