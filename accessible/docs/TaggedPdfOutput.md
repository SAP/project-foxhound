# Tagged PDF Output
Tagged PDF embeds a semantic structure tree alongside the graphical content in a PDF, enabling screen readers and other assistive technology to interpret the document.
Firefox generates tagged PDFs by leveraging its accessibility engine and Skia's SkPDF backend.

The feature is toggled by the pref `accessibility.tagged_pdf_output.enabled`.

## High Level Architecture
The implementation spans several modules:

- **`accessible/base/DocManager`**: `NotifyOfPrintDocument` bootstraps the accessibility engine and builds accessibility trees for print documents.
- **`accessible/base/nsAccessibilityService`**: provides an `ePdfOutput` consumer mode that allows the accessibility engine to run in a stripped-down mode purely for PDF generation.
- **`accessible/pdf/PdfStructTreeBuilder`**: translates the Gecko accessibility tree into an `SkPDF::StructureElementNode` tree for Skia and maps accessibility node IDs to SkPDF node IDs.
- **`gfx/thebes/PrintTargetSkPDF`**: the Skia PDF print target, which calls `PdfStructTreeBuilder` to obtain the structure tree and passes it to `SkPDF::MakeDocument`.
- **`layout/generic/nsIFrame`** + **`layout/painting/nsDisplayList`**: layout emits `nsDisplayAccessibleId` display items to associate painted content with accessibility nodes.
- **`gfx/2d/DrawTarget`** + **`gfx/2d/DrawTargetSkia`**: the `AccessibleId` draw command propagates the association down to Skia, where `SkPDF::SetNodeId` tags subsequent drawing commands.

## Triggering Tagged PDF Generation
When a print job starts, [`nsPrintJob::SetupToPrintContent`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/layout/printing/nsPrintJob.cpp#903) calls [`a11y::DocManager::NotifyOfPrintDocument(doc)`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/DocManager.cpp#203).

`NotifyOfPrintDocument` calls [`GetOrCreateAccService(nsAccessibilityService::ePdfOutput)`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/nsAccessibilityService.h#553) to ensure the accessibility service is running, then creates a `DocAccessible` for the print document (a static clone of the live document, so `aAllowStatic=true` is passed), and immediately calls [`DoInitialUpdate()`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/generic/DocAccessible.cpp#1835) to build the accessibility tree synchronously.
In-process iframes embedded in the document are also initialized here in the same way.

For a parent process document, `NotifyOfPrintDocument` calls [`PdfStructTreeBuilder::Init`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#36) directly.
For remote documents in content processes, after the local accessibility tree is built, `NotifyOfPrintDocument` arranges for `PdfStructTreeBuilder::Init(browsingContext)` to be called in the parent process (see the next section on IPC).

## IPC: Remote Top Level Documents and OOP Iframes
Content can live in content processes, but a PDF can only be generated in the parent process, regardless of where the content lives or where the print job is initiated.
There are two IPC cases.

### Remote Top Level Document
`nsPrintJob` runs in whatever process owns the document, so for a remote tab, `NotifyOfPrintDocument` runs in the content process.
After building the accessibility tree locally and sending it to the parent process via `PDocAccessible`, [a `PDocAccessible::Printing` IPDL message is sent to the parent process](https://searchfox.org/firefox-main/rev/f3695d1fd8d9f7419576d8e0366069bf2cc576ac/accessible/base/DocManager.cpp#245).
[`DocAccessibleParent::RecvPrinting`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/ipc/DocAccessibleParent.cpp#1500) handles this message and calls `PdfStructTreeBuilder::Init` in the parent process.

### OOP Iframes
Once `PdfStructTreeBuilder::Init` runs in the parent process for the top level document as described above, [`InitInternal`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#138) walks all descendant `BrowserParent`s and sends a `PBrowser::RequestDocAccessibleForPrint` IPDL message to each.
In the content process, [`BrowserChild::RecvRequestDocAccessibleForPrint`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/dom/ipc/BrowserChild.cpp#4248) calls `NotifyOfPrintDocument`.
As above, this builds the accessibility tree, sends it to the parent process, sends `PDocAccessible::Printing` and thus calls `PdfStructTreeBuilder::Init` in the parent process.

`PdfStructTreeBuilder` tracks how many OOP iframes are pending via `mPendingOopIframes`.
Each time an OOP iframe's accessibility tree arrives and is registered with the builder via a further call to `InitInternal`, the counter is decremented.
When it reaches zero, a `ReadyPromise` is resolved.
[The print job awaits this promise before proceeding](https://searchfox.org/firefox-main/rev/f3695d1fd8d9f7419576d8e0366069bf2cc576ac/layout/printing/ipc/RemotePrintJobParent.cpp#45).

SkPDF requires the complete structure tree at the time the document is opened, so this waiting is necessary before `SkPDF::MakeDocument` can be called.

## Building the Structure Tree
Once the `ReadyPromise` resolves, [`PrintTargetSkPDF::BeginPrinting`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/gfx/thebes/PrintTargetSkPDF.cpp#211) calls [`PdfStructTreeBuilder::BuildStructTree`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#170).
This walks the accessibility tree rooted at the top document — using `DocAccessible` for in-process documents and `DocAccessibleParent` for remote ones — and recursively builds a tree of `SkPDF::StructureElementNode` objects.

For each accessible, [`BuildStructSubtree`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#210):
- Assigns an SkPDF integer node ID (via [`GeneratePdfId`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#190)) and records the mapping in `mAccToPdf`.
- Maps the Gecko accessibility role to the corresponding PDF structure type; e.g. `roles::HEADING` → `"H1"`–`"H6"` or `"H"`, `roles::PARAGRAPH` → `"P"`, `roles::TABLE` → `"Table"`, etc.
- Depending on the role, maps Gecko accessibility properties to PDF attributes such as table row/column span, header associations and alt text for figures and headings.

The completed struct tree root is stored in `SkPDF::Metadata::fStructureElementTreeRoot` before `SkPDF::MakeDocument` is called.
SkPDF also derives a PDF bookmark outline from heading nodes; headings' accessible names are set as `fAlt` to provide this text, since Gecko provides glyph indices rather than text runs when drawing.

## Associating Painted Content with Structure Nodes
The struct tree alone is not sufficient: each drawing command in the content stream must be tagged with the SkPDF node ID of the structure element it belongs to.

### Layout: Emitting `nsDisplayAccessibleId`
During display list construction for a print document, [`nsIFrame::BuildDisplayListForChild`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/layout/generic/nsIFrame.cpp#4238) calls the local helper [`MaybeAddAccId`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/layout/generic/nsIFrame.cpp#4223) for each child frame.
`MaybeAddAccId` calls [`PdfStructTreeBuilder::GetAccId(frame)`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#105) which looks up the `Accessible` for the frame's content node and returns a `{browsingContextId, accessibleId}` pair.
If one is found, an [`nsDisplayAccessibleId`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/layout/painting/nsDisplayList.h#6854) display item is prepended to the content list for that frame.

### Painting: The `DrawTarget::AccessibleId` Command
[`nsDisplayAccessibleId::Paint`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/layout/painting/nsDisplayList.cpp#8737) calls [`DrawTarget::AccessibleId(browsingContextId, accId)`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/gfx/2d/2D.h#1459).
For parent process content rendered directly to a `DrawTargetSkia` backed by an SkPDF canvas, [`DrawTargetSkia::AccessibleId`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/gfx/2d/DrawTargetSkia.cpp#2259) translates the Gecko IDs to a SkPDF integer via [`PdfStructTreeBuilder::GetPdfId`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#88), then calls `SkPDF::SetNodeId(mCanvas, pdfId)`.
All drawing commands issued to the canvas after this point are tagged with that node in the PDF.

### Content Process: `DrawTargetRecording`
When content is painted in a content process, it goes through `DrawTargetRecording`.
[`DrawTargetRecording::AccessibleId`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/gfx/2d/DrawTargetRecording.cpp#991) emits a [`RecordedAccessibleId`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/gfx/2d/RecordedEventImpl.h#1880) event into the recording stream .
When the recording is replayed in the parent process on a `DrawTargetSkia`, `RecordedAccessibleId::PlayEvent` calls `DrawTargetSkia::AccessibleId` and the same SkPDF tagging occurs as described above.

## Stripped-Down Accessibility Engine (`ePdfOutput` Mode)
Without a dedicated PDF output mode, tagged PDF generation would require an AT client to already be running (or the engine to be force enabled), because normal accessibility engine startup does significant work that is only needed to serve AT clients: walking all existing documents, initialising platform accessibility APIs and activating the service in every content process.
None of this work is necessary to build an accessibility tree for a single document being printed.
The [`ePdfOutput`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/nsAccessibilityService.h#405) consumer mode allows the engine to start in a lightweight mode when the only reason it is needed is to generate a tagged PDF.

### `ePdfOutput` Consumer Flag
`nsAccessibilityService` has a bitmask of active consumers.
If only the `ePdfOutput` bit is set, this indicates that the only reason the service is running is to support PDF generation.
[`nsAccessibilityService::IsOnlyForPdfOutput()`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/nsAccessibilityService.h#413) returns true in this case.

### Skipped Initialization
When `GetOrCreateAccService(ePdfOutput)` starts the engine and no other consumer is active, [`nsAccessibilityService::Init`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/nsAccessibilityService.cpp#1650) **skips** three steps that are deferred into [`FullInit`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/nsAccessibilityService.cpp#1724):

1. [`ApplicationAccessible::CreateInitialDocs`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/generic/ApplicationAccessible.cpp#113): forces creation of `DocAccessible`s for all already-open windows.
2. [`PlatformInit`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/Platform.h#73): initializes platform accessibility APIs (IAccessible2/UIA on Windows, ATK on Linux, etc.).
3. Activating the accessibility service in every content process.

The `a11y-init-or-shutdown` notification is fired with the value `"pdf"` instead of `"1"` to let observers distinguish this limited startup from a full one.

### Suppressing Unrelated `DocAccessible` Creation
While `IsOnlyForPdfOutput()`, [creation of `DocAccessible`s is suppressed](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/DocManager.cpp#519) for any document that was not explicitly passed to `NotifyOfPrintDocument`.
This prevents ordinary browsing documents from consuming resources they do not need.

### Promotion to Full Service
If a real AT consumer (e.g. a screen reader) causes `GetOrCreateAccService` to be called while the service is already running in `ePdfOutput`-only mode, [`PromoteFromPdfOutput`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/base/nsAccessibilityService.cpp#1745) is called to perform the deferred `FullInit` work: creating initial document accessibles, running `PlatformInit` and notifying content processes.

### Cache Domains
Print documents use a specific set of cache domains (requested per-document via [`DocAccessible`](https://searchfox.org/firefox-main/rev/f3695d1fd8d9f7419576d8e0366069bf2cc576ac/accessible/generic/DocAccessible.cpp#396)/[`DocAccessibleParent`](https://searchfox.org/firefox-main/rev/f3695d1fd8d9f7419576d8e0366069bf2cc576ac/accessible/ipc/DocAccessibleParent.cpp#78)) rather than the global `gCacheDomains`.
This is done so that PDF output does not inadvertently widen the cache domains in use by any other running clients.
This also avoids pushing unnecessary domains for PDF when another client requires a wider set of domains.
Note that a print document is a static clone of the original DOM document, so this doesn't impact the original document being printed.

### Lifecycle
When the last print document is removed, [the `ePdfOutput` consumer bit is cleared](https://searchfox.org/firefox-main/rev/f3695d1fd8d9f7419576d8e0366069bf2cc576ac/accessible/base/DocManager.cpp#137).
If no other consumers remain, the accessibility service shuts down normally.
[`PdfStructTreeBuilder::Done`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/accessible/pdf/PdfStructTreeBuilder.cpp#75) is called from [`nsDeviceContext::EndDocument`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/gfx/src/nsDeviceContext.cpp#269)/[`AbortDocument`](https://searchfox.org/firefox-main/rev/2e7b2a02b5198ae72c06debc5cc1c2ac527fd742/gfx/src/nsDeviceContext.cpp#306) to clean up the builder instance after printing completes or is aborted.

## Data Flow Summary
```
nsPrintJob::Print
  → DocManager::NotifyOfPrintDocument(doc)                   [content or parent process]
      → GetOrCreateAccService(ePdfOutput)                    // start engine (stripped-down if no other consumer)
      → CreateDocOrRootAccessible(doc, allowStatic)          // build a11y tree for print doc
      → DoInitialUpdate()                                    // sync tree construction
      → ipcDoc->SendPrinting()                               // if remote tab: notify parent process
          → DocAccessibleParent::RecvPrinting()              [parent process]
              → PdfStructTreeBuilder::Init(bc)
      → PdfStructTreeBuilder::Init(bc)                       // if parent-process doc: call directly
          → send RequestDocAccessibleForPrint IPC to each OOP iframe BrowserParent
          → wait (ReadyPromise) until all OOP iframe DocAccessibleParents arrive
  → [await ReadyPromise]
  → PrintTargetSkPDF::BeginPrinting(bcId, ...)
      → PdfStructTreeBuilder::BuildStructTree(structRoot)
          → walk DocAccessible / DocAccessibleParent tree
          → produce SkPDF::StructureElementNode tree
          → populate mAccToPdf id map
      → SkPDF::MakeDocument(stream, metadata{structRoot})
  → [per page] paint display list
      → nsIFrame::BuildDisplayListForChild
          → MaybeAddAccId → nsDisplayAccessibleId{bcId, accId}
      → nsDisplayAccessibleId::Paint
          → DrawTarget::AccessibleId(bcId, accId)
              → (content process) DrawTargetRecording → RecordedAccessibleId replayed in parent
              → DrawTargetSkia::AccessibleId
                  → PdfStructTreeBuilder::GetPdfId(bcId, accId) → pdfId
                  → SkPDF::SetNodeId(canvas, pdfId)
  → PrintTargetSkPDF::EndPrinting → SkDocument::close()
  → PdfStructTreeBuilder::Done(bcId)
```
