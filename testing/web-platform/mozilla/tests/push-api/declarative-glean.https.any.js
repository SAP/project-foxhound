// META: global=window-module
// META: script=/_mozilla/resources/GleanTest.js
// META: script=/resources/testdriver.js
// META: script=/resources/testdriver-vendor.js
// META: script=/notifications/resources/helpers.js

import { encrypt } from "/push-api/resources/helpers.js"

let registration;
let subscription;

promise_setup(async (t) => {
  await trySettingPermission("granted");
  registration = await prepareActiveServiceWorker("push-sw.js");
  subscription = await registration.pushManager.subscribe();
});

async function pushAndReceiveMessage(t, message) {
  await GleanTest.testResetFOG();

  const result = await encrypt(
    new TextEncoder().encode(message),
    subscription.getKey("p256dh"),
    subscription.getKey("auth")
  );

  const { promise, resolve } = Promise.withResolvers();
  const controller = new AbortController();
  navigator.serviceWorker.addEventListener("message", ev => {
    if (ev.data.data !== message) {
      return;
    }
    controller.abort();
    resolve();
  }, { signal: controller.signal });

  await fetch(subscription.endpoint, {
    method: "post",
    ...result
  });

  await promise;
  await GleanTest.flush();
}

promise_test(async (t) => {
  await pushAndReceiveMessage(t, "hello");

  const notify = await GleanTest.webPush.apiNotify.testGetValue();
  const dwp = await GleanTest.webPush.declarative.testGetValue();
  const mutable = await GleanTest.webPush.declarativeMutable.testGetValue();

  assert_equals(notify, 1, "notify should always increment for valid push messages");
  assert_equals(dwp, null, "declarative should not increment on non-DWP");
  assert_equals(mutable, null, "declarativeMutable should not increment on non-DWP");
}, "Non-declarative web push");

promise_test(async (t) => {
  await pushAndReceiveMessage(t, `{ "web_push": 8030 }`);

  const notify = await GleanTest.webPush.apiNotify.testGetValue();
  const dwp = await GleanTest.webPush.declarative.testGetValue();
  const mutable = await GleanTest.webPush.declarativeMutable.testGetValue();

  assert_equals(notify, 1, "notify should always increment for valid push messages");
  assert_equals(dwp, 1, "declarative should increment on DWP");
  assert_equals(mutable, null, "declarativeMutable should increment on DWP");
}, "Declarative web push");

promise_test(async (t) => {
  await pushAndReceiveMessage(t, `{ "web_push": 8030, "mutable": true }`);

  const notify = await GleanTest.webPush.apiNotify.testGetValue();
  const dwp = await GleanTest.webPush.declarative.testGetValue();
  const mutable = await GleanTest.webPush.declarativeMutable.testGetValue();

  assert_equals(notify, 1, "notify should always increment for valid push messages");
  assert_equals(dwp, 1, "declarative should increment on mutable DWP");
  assert_equals(mutable, 1, "declarativeMutable should increment on mutable DWP");
}, "Declarative web push with mutable: true");
