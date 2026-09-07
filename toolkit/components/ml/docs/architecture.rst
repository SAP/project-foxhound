.. _inference-architecture:

Architecture
============

The Firefox AI Runtime supports multiple inference backends, including the ONNX runtime
with the Transformers.js library, the wllama WebAssembly backend for Llama-based models,
a native llama.cpp backend, and an OpenAI-compatible API backend. The translations
inference engine lives in the inference process, but
`has its own separate architecture <https://firefox-source-docs.mozilla.org/toolkit/components/translations>`_
that is not considered here.

.. mermaid::

   flowchart TD
      CreateEngine["Create Engine"] -- engineId -->  MLEngineParent

      subgraph ParentProcess
         MLEngineParent
      end

      subgraph InferenceProcess
         MLEngineChild --> ChromeWorker
         ChromeWorker --> Backend[ML Backends]
      end

      MLEngineParent -- JSActor IPC --> MLEngineChild

The runtime lives in its own Inference process. This process contains a SpiderMonkey
JavaScript engine so that JavaScript-compatible builds of inference libraries can be run.
The inference engines backends are are all isolated in this separate process as they can
be quite performance and memory hungry.

On Android the OS may choose to kill a process that is consuming too many resources.
In this case, it's better to kill the inference tasks rather than the whole browser.
There is also a security constraint of running these engines with the minimal set of
privileges to perform the inference.

Inference Process
-----------------

.. mermaid::

   flowchart LR
      MLEngineChild --> ChromeWorker
      ChromeWorker --> Backends

      subgraph Backends
         direction LR
         B1["onnx (wasm)"]       --> T1[("DOM Worker ×N")]
         B2["onnx-native"]       --> T2[("onnx_worker threads ×N")]
         B4["wllama"]            --> T4[("DOM Worker ×N")]
         B3["llama.cpp"]         --> T3[("llama.cpp threads ×N")]
         B5["openai"]            --> T5[("MLPA server endpoint<br/>(Or custom configurations)")]
         B6["static-embeddings"] --> T6[("Single Threaded")]
      end

Wasm Backends
~~~~~~~~~~~~~

For backends that are powered by Wasm, the binaries are referenced in the Remote Settings
``ml-onnx-runtime`` collection (`dashboard <https://firefox-ai.github.io/runtime-tools/ml-onnx-runtime/>`__, `searchfox <https://searchfox.org/firefox-main/search?q=%22ml-onnx-runtime%22>`__).
The collection holds only metadata — the CDN URL, filename, hash, and size. On first use
the parent process fetches the binary from the Remote Settings CDN, verifies its hash,
and caches it in OPFS under ``directoryHandle.getDirectoryHandle("mlRuntimeFiles")``.
On subsequent uses the cached copy is read directly from OPFS.

.. mermaid::

   flowchart TD

      subgraph ParentProcess["Parent Process"]
         MLEngineParent
         subgraph RemoteSettings["Remote Settings"]
            RSCollection[(<code>ml-onnx-runtime</code><br/>collection)]
            RSCDN[(Attachment CDN)]
         end
         OPFS[("OPFS")]

         MLEngineParent <-- download records<br/>(metadata) --> RSCollection
         MLEngineParent <-- cache to ./mlRuntimeFiles/ --> OPFS
         MLEngineParent <-- download wasm<br/>(blobs) --> RSCDN
      end

The resulting ``ArrayBuffer`` is transferred (not copied) over the JSActor boundary into
the inference process and then into the ChromeWorker, where it is handed to the backend.

.. mermaid::

   flowchart TD

      subgraph ParentProcess
         MLEngineParent["MLEngineParent<br/> <i>(load ArrayBuffer)</i>"]
      end

      subgraph InferenceProcess
         MLEngineChild
         ChromeWorker
         MLEngineChild -- "transfer ArrayBuffer" --> ChromeWorker
      end

      MLEngineParent -- transfer via JSActor IPC --> MLEngineChild


Wasm backends should be fully buildable in a reproducible way from the Firefox source code,
but the resulting binaries are shipped outside of the main Firefox packaging to reduce
the size of the initial download for users. The emscripten bindings layer, which is
JavaScript code, is checked in. This layer is tightly coupled to the Wasm blobs that we
ship.

Build scripts for each backend live in the :searchfox:`toolkit/components/ml/vendor`
directory and use Docker for reproducibility:

- **onnx (wasm)**: :searchfox:`toolkit/components/ml/vendor/transformers`
  — bundles onnxruntime-web and a patched Transformers.js; built with ``./build.sh``.
- **wllama**: :searchfox:`toolkit/components/ml/vendor/wllama`
  — builds wllama from source with release mode and Firefox-specific patches; built with ``bash build.sh``.

Native Backends
~~~~~~~~~~~~~~~

Native backends are compiled C++ libraries rather than Wasm binaries.

- **llama.cpp**: Vendored in :searchfox:`third_party/llama.cpp/`
  and compiled as part of the standard Firefox build via ``moz.build``. When updating
  the vendored llama.cpp version, run ``generate_sources_mozbuild.sh`` to regenerate
  ``sources.mozbuild``.
- **onnx-native**: Not vendored in-tree. Built as a pre-compiled native shared library
  by CI via :searchfox:`taskcluster/scripts/misc/build-onnxruntime.sh`
  and fetched as a toolchain artifact during the Firefox build.

Downloading Models
~~~~~~~~~~~~~~~~~~

Model files are not distributed via Remote Settings. The ``ml-inference-options`` collection
(`dashboard <https://firefox-ai.github.io/runtime-tools/ml-inference-options/>`__,
`searchfox <https://searchfox.org/firefox-main/search?q=%22ml-inference-options%22>`__)
provides default pipeline configuration — ``modelId``, ``revision``, ``dtype``, and
so on — but the actual files come from the Model Hub (Mozilla or Hugging Face). The
parent process owns a ``ModelHub`` instance that checks OPFS for a cached copy before
going to the network. The file is downloaded and stored in the local OPFS cache.
File metadata (ETag, size, revision) is tracked in an IndexedDB database named
`"modelFiles" <https://searchfox.org/firefox-main/search?q=modelFiles&path=ModelHub.sys.mjs&case=false&regexp=false>`_
(in :searchfox:`ModelHub.sys.mjs toolkit/components/ml/content/ModelHub.sys.mjs`)
so that cache freshness can be validated without a full download.

When a model file is needed the request originates inside the inference process inside
the ChromeWorker. The parent resolves the file from OPFS, downloads the file if it
is needed,and returns a string of the file path. The model bytes themselves never cross
the IPC boundary — the worker opens the OPFS file directly using
`Response <https://developer.mozilla.org/en-US/docs/Web/API/Response>`. This ``Response``
is passed to the backend where it can be streamed into memory.

.. mermaid::

   flowchart TD

      subgraph RemoteSettings["Remote Settings"]
         MLInferenceOptions[(<code>ml-inference-options</code>)]
      end

      subgraph ModelHub["Model Hub"]
         direction LR
         Allowed["Allowed hubs"]
         Allowed --> MH["model-hub.mozilla.org"]
         Allowed --> HF1["huggingface.co/Mozilla"]
         Allowed --> HF2["huggingface.co/Xenova"]
         Allowed --> ETC["..."]
      end

      subgraph ParentProcess["Parent Process"]
         MLEngineParent
         ModelHubSys[ModelHub.sys.mjs]


         MLEngineParent -- getModelFile (path) --> ModelHubSys
         ModelHubSys    <--> OPFS
         OPFS           <-- download files --> Allowed
         MLEngineParent <-- getInferenceOptions --> MLInferenceOptions

         %%  ModelHubSys --> ModelHub
         %%  IndexedDB -- validate cache freshness --> OPFS

         %%  MLEngineParent <-- fetch options<br/>(modelId, revision, dtype) --> RemoteSettings
         %%  MLEngineParent -- resolve model files --> ModelHubSys
      end

      subgraph OPFS["OPFS Model File Store"]
         OPFSCache[("OPFS<br/>(cached files)")]
         IndexedDB[("IndexedDB<br/>(model metadata)")]
      end

      subgraph InferenceProcess
         MLEngineChild
         ChromeWorker
         OPFSWorker[(OPFS)]
         Response["Streaming Response"]
         Backend

         MLEngineChild <--> ChromeWorker
         ChromeWorker <--> Response
         Response <-- model file handle --> OPFSWorker
         Response --> Backend
      end

      MLEngineChild <-- request model file path --> MLEngineParent
