/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://webmachinelearning.github.io/webmcp/
 *
 */

callback ToolExecuteCallback = Promise<any> (object input, ModelContextClient client);

dictionary ToolAnnotations {
  boolean readOnlyHint;
};

dictionary ModelContextTool {
  required DOMString name;
  required DOMString description;
  object inputSchema;
  required ToolExecuteCallback execute;
  ToolAnnotations annotations;
};

[GenerateConversionToJS]
dictionary ModelContextToolDefinition {
  required DOMString name;
  required DOMString description;
  object? inputSchema;
  ToolAnnotations annotations;
};

dictionary InvokeToolOptions {
  AbortSignal signal;
};

[Exposed=Window, SecureContext, Pref="dom.modelcontext.enabled"]
interface ModelContext {
  [Throws] undefined registerTool(ModelContextTool tool);
  [Throws] undefined unregisterTool(DOMString toolName);

  [Pref="dom.modelcontext.testing.enabled", Throws]
  sequence<ModelContextTool> getTools();

  [Pref="dom.modelcontext.testing.enabled", Throws]
  Promise<any> invokeTool(DOMString toolName,
                          optional any input,
                          optional InvokeToolOptions options = {});
};


[Exposed=Window, SecureContext, Pref="dom.modelcontext.enabled"]
interface ModelContextClient {
  [Throws] Promise<any> requestUserInteraction(UserInteractionCallback callback);
};

callback UserInteractionCallback = Promise<any> ();
