// eslint-disable-next-line no-unused-vars
import * as _chatAssistantError from "chrome://browser/content/aiwindow/components/chat-assistant-error.mjs";

(async () => {
  await customElements.whenDefined("chat-assistant-error");
  const el = document.createElement("chat-assistant-error");
  document.body.appendChild(el);
})();
