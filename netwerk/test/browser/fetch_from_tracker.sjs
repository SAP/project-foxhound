/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function handleRequest(request, response) {
  let params = new URLSearchParams(request.queryString);
  response.setHeader("Content-Type", "text/javascript; charset=UTF-8", false);
  let rand = params.get("rand");

  let fetchScript = `
    results.fetch = "PENDING";
    fetch("http://localhost:21555/?type=fetch&rand=${rand}")
      .then(_res => {
        results.fetch = "OK";
      })
      .catch(_err => {
        results.fetch = "FAIL";
      });
  `;

  let xhrScript = `
    results.xhr = "PENDING";
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "http://localhost:21555/?type=xhr&rand=${rand}");
    xhr.onload = () => results.xhr = xhr.status === 200 ? "OK" : "FAIL";
    xhr.onerror = () => results.xhr = "FAIL";
    xhr.send();
  `;

  let imgScript = `
    results.img = "PENDING";
    const img = document.createElement('img');
    img.src = 'http://localhost:21555/?type=img&rand=${rand}';
    img.alt = 'Injected Image';
    img.onload = () => results.img = "OK";
    img.onerror = () => results.img = "FAIL";
    document.body.appendChild(img);
  `;

  let cssScript = `
    results.css = "PENDING";
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'http://localhost:21555/?type=css&rand=${rand}';
    link.onload = () => results.css = "OK";
    link.onerror = () => results.css = "FAIL";
    document.head.appendChild(link);
  `;

  let videoScript = `
    results.video = "PENDING";
    const video = document.createElement('video');
    video.src = 'http://localhost:21555/?type=video&rand=${rand}';
    video.onloadeddata = () => results.video = "OK";
    video.onerror = () => results.video = "FAIL";
    document.body.appendChild(video);
  `;

  let audioScript = `
    results.audio = "PENDING";
    const audio = document.createElement('audio');
    audio.src = 'http://localhost:21555/?type=audio&rand=${rand}';
    audio.onloadeddata = () => results.audio = "OK";
    audio.onerror = () => results.audio = "FAIL";
    document.body.appendChild(audio);
  `;

  let iframeScript = `
    results.iframe = "PENDING";
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:21555/?type=iframe&rand=${rand}';
    iframe.onload = () => results.iframe = "OK";
    iframe.onerror = () => results.iframe = "FAIL";
    document.body.appendChild(iframe);
  `;

  let scriptScript = `
    results.script = "PENDING";
    const script = document.createElement('script');
    script.src = 'http://localhost:21555/?type=script&rand=${rand}';
    script.onload = () => results.script = "OK";
    script.onerror = () => results.script = "FAIL";
    document.head.appendChild(script);
  `;

  let fontScript = `
    results.font = "PENDING";
    const font = new FontFace('TestFont', 'url(http://localhost:21555/?type=font&rand=${rand})');
    font.load().then(() => {
      document.fonts.add(font);
      results.font = "OK";
    }).catch(() => {
      results.font = "FAIL";
    });
  `;

  let websocketScript = `
    results.websocket = "PENDING";
    try {
      const ws = new WebSocket("ws://localhost:21555/?type=websocket&rand=${rand}");
      ws.onopen = () => results.websocket = "OK";
      ws.onerror = () => results.websocket = "FAIL";
    } catch (e) {
      results.websocket = "FAIL";
    }
  `;

  let workerFetchScript = `
    results.workerFetch = "PENDING";
    const w = new Worker("worker_lna.js");
    w.postMessage({ type: "worker-fetch", rand: "${rand}" });
    w.onmessage = (e) => results.workerFetch = e.data.status;
    w.onerror = () => results.workerFetch = "FAIL";
  `;

  let workerXhrScript = `
    results.workerXhr = "PENDING";
    const w = new Worker("worker_lna.js");
    w.postMessage({ type: "worker-xhr", rand: "${rand}" });
    w.onmessage = (e) => results.workerXhr = e.data.status;
    w.onerror = () => results.workerXhr = "FAIL";
  `;

  let sharedWorkerFetchScript = `
    results.sharedWorkerFetch = "PENDING";
    const sw = new SharedWorker("shared_worker_lna.js");
    sw.port.start();
    sw.port.postMessage({ type: "shared-worker-fetch", rand: "${rand}" });
    sw.port.onmessage = (e) => results.sharedWorkerFetch = e.data.status;
    sw.onerror = () => results.sharedWorkerFetch = "FAIL";
  `;

  let sharedWorkerXhrScript = `
    results.sharedWorkerXhr = "PENDING";
    const sw = new SharedWorker("shared_worker_lna.js");
    sw.port.start();
    sw.port.postMessage({ type: "shared-worker-xhr", rand: "${rand}" });
    sw.port.onmessage = (e) => results.sharedWorkerXhr = e.data.status;
    sw.onerror = () => results.sharedWorkerXhr = "FAIL";
  `;

  let serviceWorkerFetchScript = `
    results.serviceWorkerFetch = "PENDING";
    navigator.serviceWorker.register("service_worker_lna.sjs", { scope: "./" })
      .then(reg => {
        return navigator.serviceWorker.ready;
      })
      .then(reg => {
        navigator.serviceWorker.onmessage = (e) => {
          results.serviceWorkerFetch = e.data.status;
        };
        reg.active.postMessage({ type: "service-worker-fetch", rand: "${rand}" });
      })
      .catch((e) => {
        results.serviceWorkerFetch = "FAIL";
      });
  `;

  switch (params.get("test")) {
    case "fetch":
      response.write(fetchScript);
      return;
    case "xhr":
      response.write(xhrScript);
      return;
    case "img":
      response.write(imgScript);
      return;
    case "css":
      response.write(cssScript);
      return;
    case "video":
      response.write(videoScript);
      return;
    case "audio":
      response.write(audioScript);
      return;
    case "iframe":
      response.write(iframeScript);
      return;
    case "script":
      response.write(scriptScript);
      return;
    case "font":
      response.write(fontScript);
      return;
    case "websocket":
      response.write(websocketScript);
      return;
    case "worker-fetch":
      response.write(workerFetchScript);
      return;
    case "worker-xhr":
      response.write(workerXhrScript);
      return;
    case "shared-worker-fetch":
      response.write(sharedWorkerFetchScript);
      return;
    case "shared-worker-xhr":
      response.write(sharedWorkerXhrScript);
      return;
    case "service-worker-fetch":
      response.write(serviceWorkerFetchScript);
      return;
  }
  response.write(`console.log("unknown test type")`);
}
