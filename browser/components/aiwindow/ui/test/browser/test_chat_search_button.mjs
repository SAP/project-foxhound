// eslint-disable-next-line no-unused-vars
import * as _aiChatMessage from "chrome://browser/content/aiwindow/components/ai-chat-message.mjs";

(async () => {
  await customElements.whenDefined("ai-chat-message");

  const el = document.createElement("ai-chat-message");
  el.role = "user";
  el.message = "testing...";
  document.body.appendChild(el);
})();
