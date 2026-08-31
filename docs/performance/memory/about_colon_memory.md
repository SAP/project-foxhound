# about:memory

about:memory is a special page within Firefox that lets you view, save,
load, and diff detailed measurements of Firefox's memory usage. It also
lets you do other memory-related operations like trigger GC and CC, dump
GC & CC logs, and dump DMD reports. It is present in all builds and does
not require any preparation to be used.

## How to generate memory reports

Let's assume that you want to measure Firefox's memory usage. Perhaps
you want to investigate it yourself, or perhaps someone has asked you to
use about:memory to generate "memory reports" so they can investigate
a problem you are having. Follow these steps.

- At the moment of interest (e.g. once Firefox's memory usage has
  gotten high) open a new tab and type "about:memory" into the
  address bar and hit "Enter".
- If you are using a communication channel where files can be sent,
  such as Bugzilla or email, click on the "Measure and save..."
  button. This will open a file dialog that lets you save the memory
  reports to a file of your choosing. (The filename will have a
  `.json.gz` suffix.) You can then attach or upload the file
  appropriately. The recipients will be able to view the contents of
  this file within about:memory in their own Firefox instance.
- If you are using a communication channel where only text can be
  sent, such as a comment thread on a website, click on the
  "Measure..." button. This will cause a tree-like structure to be
  generated text within about:memory. This structure is just text, so
  you can copy and paste some or all of this text into any kind of
  text buffer. (You don't need to take a screenshot.) This text
  contains fewer measurements than a memory reports file, but is often
  good enough to diagnose problems. Don't click "Measure..."
  repeatedly, because that will cause the memory usage of about:memory
  itself to rise, due to it discarding and regenerating large numbers
  of DOM nodes.

Note that in both cases the generated data contains privacy-sensitive
details such as the full list of the web pages you have open in other
tabs. If you do not wish to share this information, you can select the
"anonymize" checkbox before clicking on "Measure and save..." or
"Measure...". This will cause the privacy-sensitive data to be
stripped out, but it may also make it harder for others to investigate
the memory usage.

## Loading memory reports from file

The easiest way to load memory reports from file is to use the
"Load..." button. You can also use the "Load and diff..." button
to get the difference between two memory report files.

Single memory report files can also be loaded automatically when
about:memory is loaded by appending a `file` query string, for example:

    about:memory?file=/home/username/reports.json.gz

This is most useful when loading memory reports files obtained from a
Firefox OS device.

Memory reports are saved to file as gzipped JSON. These files can be
loaded as is, but they can also be loaded after unzipping.

## Interpreting memory reports

Almost everything you see in about:memory has an explanatory tool-tip.
Hover over any button to see a description of what it does. Hover over
any measurement to see a description of what it means.

### [Measurement basics]

Most measurements use bytes as their unit, but some are counts or
percentages.

Most measurements are presented within trees. For example:

     585 (100.0%) -- preference-service
     └──585 (100.0%) -- referent
        ├──493 (84.27%) ── strong
        └───92 (15.73%) -- weak
            ├──92 (15.73%) ── alive
            └───0 (00.00%) ── dead

Leaf nodes represent actual measurements; the value of each internal
node is the sum of all its children.

The use of trees allows measurements to be broken down into further
categories, sub-categories, sub-sub-categories, etc., to arbitrary
depth, as needed. All the measurements within a single tree are
non-overlapping.

Tree paths can be written using \'/\' as a separator. For example,
`preference/referent/weak/dead` represents the path to the final leaf
node in the example tree above.

Sub-trees can be collapsed or expanded by clicking on them. If you find
any particular tree overwhelming, it can be helpful to collapse all the
sub-trees immediately below the root, and then gradually expand the
sub-trees of interest.

### [Sections]

Memory reports are displayed on a per-process basis, with one process
per section. Within each process's measurements, there are the
following subsections.

#### Explicit Allocations

This section contains a single tree, called "explicit", that measures
all the memory allocated via explicit calls to heap allocation functions
(such as `malloc` and `new`) and to non-heap allocations functions (such
as `mmap` and `VirtualAlloc`).

Here is an example for a browser session where tabs were open to
cnn.com, techcrunch.com, and arstechnica.com. Various sub-trees have
been expanded and others collapsed for the sake of presentation.

    191.89 MB (100.0%) -- explicit
    ├───63.15 MB (32.91%) -- window-objects
    │   ├──24.57 MB (12.80%) -- top(http://edition.cnn.com/, id=8)
    │   │  ├──20.18 MB (10.52%) -- active
    │   │  │  ├──10.57 MB (05.51%) -- window(http://edition.cnn.com/)
    │   │  │  │  ├───4.55 MB (02.37%) ++ js-compartment(http://edition.cnn.com/)
    │   │  │  │  ├───2.60 MB (01.36%) ++ layout
    │   │  │  │  ├───1.94 MB (01.01%) ── style-sheets
    │   │  │  │  └───1.48 MB (00.77%) -- (2 tiny)
    │   │  │  │      ├──1.43 MB (00.75%) ++ dom
    │   │  │  │      └──0.05 MB (00.02%) ── property-tables
    │   │  │  └───9.61 MB (05.01%) ++ (18 tiny)
    │   │  └───4.39 MB (02.29%) -- js-zone(0x7f69425b5800)
    │   ├──15.75 MB (08.21%) ++ top(http://techcrunch.com/, id=20)
    │   ├──12.85 MB (06.69%) ++ top(http://arstechnica.com/, id=14)
    │   ├───6.40 MB (03.33%) ++ top(chrome://browser/content/browser.xul, id=3)
    │   └───3.59 MB (01.87%) ++ (4 tiny)
    ├───45.74 MB (23.84%) ++ js-non-window
    ├───33.73 MB (17.58%) ── heap-unclassified
    ├───22.51 MB (11.73%) ++ heap-overhead
    ├────6.62 MB (03.45%) ++ images
    ├────5.82 MB (03.03%) ++ workers/workers(chrome)
    ├────5.36 MB (02.80%) ++ (16 tiny)
    ├────4.07 MB (02.12%) ++ storage
    ├────2.74 MB (01.43%) ++ startup-cache
    └────2.16 MB (01.12%) ++ xpconnect

Some expertise is required to understand the full details here, but
there are various things worth pointing out.

- This "explicit" value at the root of the tree represents all the
  memory allocated via explicit calls to allocation functions.
- The "window-objects" sub-tree represents all JavaScript `window`
  objects, which includes the browser tabs and UI windows. For
  example, the "top(<http://edition.cnn.com/>, id=8)" sub-tree
  represents the tab open to cnn.com, and
  "top(chrome://browser/content/browser.xul, id=3)" represents the
  main browser UI window.
- Within each window's measurements are sub-trees for JavaScript
  ("js-compartment(...)" and "js-zone(...)"), layout,
  style-sheets, the DOM, and other things.
- It's clear that the cnn.com tab is using more memory than the
  techcrunch.com tab, which is using more than the arstechnica.com
  tab.
- Sub-trees with names like "(2 tiny)" are artificial nodes inserted
  to allow insignificant sub-trees to be collapsed by default. If you
  select the "verbose" checkbox before measuring, all trees will be
  shown fully expanded and no artificial nodes will be inserted.
- The "js-non-window" sub-tree represents JavaScript memory usage
  that doesn't come from windows, but from the browser core.
- The "heap-unclassified" value represents heap-allocated memory
  that is not measured by any memory reporter. This is typically
  10--20% of "explicit". If it gets higher, it indicates that
  additional memory reporters should be added.
  [DMD](./dmd.md)
  can be used to determine where these memory reporters should be
  added.
- There are measurements for other content such as images and workers,
  and for browser subsystems such as the startup cache and XPConnect.

Some add-on memory usage is identified, as the following example shows.

    ├───40,214,384 B (04.17%) -- add-ons
    │   ├──21,184,320 B (02.20%) ++ {d10d0bf8-f5b5-c8b4-a8b2-2b9879e08c5d}/js-non-window/zones/zone(0x100496800)/compartment([System Principal], jar:file:///Users/njn/Library/Application%20Support/Firefox/Profiles/puna0zr8.new/extensions/%7Bd10d0bf8-f5b5-c8b4-a8b2-2b9879e08c5d%7D.xpi!/bootstrap.js (from: resource://gre/modules/addons/XPIProvider.jsm:4307))
    │   ├──11,583,312 B (01.20%) ++ jid1-xUfzOsOFlzSOXg@jetpack/js-non-window/zones/zone(0x100496800)
    │   ├───5,574,608 B (00.58%) -- {59c81df5-4b7a-477b-912d-4e0fdf64e5f2}
    │   │   ├──5,529,280 B (00.57%) -- window-objects
    │   │   │  ├──4,175,584 B (00.43%) ++ top(chrome://chatzilla/content/chatzilla.xul, id=4293)
    │   │   │  └──1,353,696 B (00.14%) ++ top(chrome://chatzilla/content/output-window.html, id=4298)
    │   │   └─────45,328 B (00.00%) ++ js-non-window/zones/zone(0x100496800)/compartment([System Principal], file:///Users/njn/Library/Application%20Support/Firefox/Profiles/puna0zr8.new/extensions/%7B59c81df5-4b7a-477b-912d-4e0fdf64e5f2%7D/components/chatzilla-service.js)
    │   └───1,872,144 B (00.19%) ++ treestyletab@piro.sakura.ne.jp/js-non-window/zones/zone(0x100496800)

More things worth pointing out are as follows.

- Some add-ons are identified by a name, such as Tree Style Tab.
  Others are identified only by a hexadecimal identifier. You can look
  in about:support to see which add-on a particular identifier belongs
  to. For example, `59c81df5-4b7a-477b-912d-4e0fdf64e5f2` is
  Chatzilla.
- All JavaScript memory usage for an add-on is measured separately and
  shown in this sub-tree.
- For add-ons that use separate windows, such as Chatzilla, the memory
  usage of those windows will show up in this sub-tree.
- For add-ons that use XUL overlays, such as AdBlock Plus, the memory
  usage of those overlays will not show up in this sub-tree; it will
  instead be in the non-add-on sub-trees and won't be identifiable as
  being caused by the add-on.

#### Other Measurements

This section contains multiple trees, includes many that cross-cut the
measurements in the "explicit" tree. For example, in the "explicit"
tree all DOM and layout measurements are broken down by window by
window, but in "Other Measurements" those measurements are aggregated
into totals for the whole browser, as the following example shows.

    26.77 MB (100.0%) -- window-objects
    ├──14.59 MB (54.52%) -- layout
    │  ├───6.22 MB (23.24%) ── style-sets
    │  ├───4.00 MB (14.95%) ── pres-shell
    │  ├───1.79 MB (06.68%) ── frames
    │  ├───0.89 MB (03.33%) ── style-contexts
    │  ├───0.62 MB (02.33%) ── rule-nodes
    │  ├───0.56 MB (02.10%) ── pres-contexts
    │  ├───0.47 MB (01.75%) ── line-boxes
    │  └───0.04 MB (00.14%) ── text-runs
    ├───6.53 MB (24.39%) ── style-sheets
    ├───5.59 MB (20.89%) -- dom
    │   ├──3.39 MB (12.66%) ── element-nodes
    │   ├──1.56 MB (05.84%) ── text-nodes
    │   ├──0.54 MB (02.03%) ── other
    │   └──0.10 MB (00.36%) ++ (4 tiny)
    └───0.06 MB (00.21%) ── property-tables

Some of the trees in this section measure things that do not cross-cut
the measurements in the "explicit" tree, such as those in the
"preference-service" example above.

Finally, at the end of this section are individual measurements, as the
following example shows.

        0.00 MB ── canvas-2d-pixels
        5.38 MB ── gfx-surface-xlib
        0.00 MB ── gfx-textures
        0.00 MB ── gfx-tiles-waste
              0 ── ghost-windows
      109.22 MB ── heap-allocated
            164 ── heap-chunks
        1.00 MB ── heap-chunksize
      114.51 MB ── heap-committed
      164.00 MB ── heap-mapped
          4.84% ── heap-overhead-ratio
              1 ── host-object-urls
        0.00 MB ── imagelib-surface-cache
        5.27 MB ── js-main-runtime-temporary-peak
              0 ── page-faults-hard
        203,349 ── page-faults-soft
      274.99 MB ── resident
      251.47 MB ── resident-unique
    1,103.64 MB ── vsize

Some measurements of note are as follows.

- "resident". Physical memory usage. If you want a single
  measurement to summarize memory usage, this is probably the best
  one.
- "vsize". Virtual memory usage. This is often much higher than any
  other measurement (particularly on Mac). It only really matters on
  32-bit platforms such as Win32. There is also
  "vsize-max-contiguous" (not measured on all platforms, and not
  shown in this example), which indicates the largest single chunk of
  available virtual address space. If this number is low, it's likely
  that memory allocations will fail due to lack of virtual address
  space quite soon.
- Various graphics-related measurements ("gfx-*"). The measurements
  taken vary between platforms. Graphics is often a source of high
  memory usage, and so these measurements can be helpful for detecting
  such cases.
