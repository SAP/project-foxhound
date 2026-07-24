/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Bug 1917607 - Testing canvas randomization with readpixels function of webgl with getBufferSubData.
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

const extractCanvas = async () => {
  const w = typeof window !== "undefined" ? window : content;
  const canvas = new w.OffscreenCanvas(64, 64);
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return -1;
  }

  gl.disable(gl.DEPTH_TEST);

  w.document.body.innerHTML = `
      <script id="vs" type="x-shader/x-vertex">
        attribute vec2 aVertCoord;

        void main(void) {
          gl_Position = vec4(aVertCoord, 0.0, 1.0);
        }
        </script>

      <script id="fs1" type="x-shader/x-fragment">
        precision mediump float;

        void main(void) {
          gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
        }
      </script>

      <script id="fs2" type="x-shader/x-fragment">
        precision mediump float;

        void main(void) {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      </script>
    `;

  const draw = (vsId, fsId, vertCoordArr) => {
    function createShaderById(gl, id) {
      var elem = w.document.getElementById(id);
      if (!elem) {
        throw new Error(
          "Failed to create shader from non-existent id '" + id + "'."
        );
      }

      var src = elem.innerHTML.trim();

      var shader;
      if (elem.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
      } else if (elem.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
      } else {
        throw new Error(
          "Bad MIME type for shader '" + id + "': " + elem.type + "."
        );
      }

      gl.shaderSource(shader, src);
      gl.compileShader(shader);

      return shader;
    }

    function createProgramByIds(gl, vsId, fsId) {
      var vs = createShaderById(gl, vsId);
      var fs = createShaderById(gl, fsId);
      if (!vs || !fs) {
        return null;
      }

      var prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        var str = "Shader program linking failed:";
        str += "\nShader program info log:\n" + gl.getProgramInfoLog(prog);
        str += "\n\nVert shader log:\n" + gl.getShaderInfoLog(vs);
        str += "\n\nFrag shader log:\n" + gl.getShaderInfoLog(fs);
        console.error(str);
        return null;
      }

      return prog;
    }

    const prog = createProgramByIds(gl, vsId, fsId);
    if (!prog) {
      ok(false, "Program linking should succeed.");
      return;
    }

    prog.aVertCoord = gl.getAttribLocation(prog, "aVertCoord");

    const vertCoordBuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertCoordBuff);
    gl.bufferData(gl.ARRAY_BUFFER, vertCoordArr, gl.STATIC_DRAW);

    const indexArr = new Uint16Array([0, 1, 2, 3]);
    const indexBuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArr, gl.STATIC_DRAW);

    gl.useProgram(prog);
    gl.enableVertexAttribArray(prog.aVertCoord);
    gl.vertexAttribPointer(prog.aVertCoord, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const readPixels = () => {
    const pixels = new Uint8Array(
      gl.drawingBufferWidth *
        gl.drawingBufferHeight *
        4 *
        Uint8Array.BYTES_PER_ELEMENT
    );
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, pixels.byteLength, gl.STREAM_READ);
    gl.readPixels(
      1,
      1,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      0
    );
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pixels);
    return pixels;
  };

  const vertCoordArr1 = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const vertCoordArr2 = new Float32Array([1, -1, 1, -1, -1, 1, 1, 1]);

  draw("vs", "fs1", vertCoordArr1);
  draw("vs", "fs2", vertCoordArr2);

  return readPixels().join(",");
};

add_task(async function test_rfp_no_permission() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.fingerprintingProtection", true],
      [
        "privacy.fingerprintingProtection.overrides",
        "-AllTargets,+WebGLRandomization",
      ],
    ],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: emptyPage,
  });

  const randomized = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    extractCanvas
  );

  await SpecialPowers.popPrefEnv();

  const nonRandomized = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    extractCanvas
  );

  if (randomized === -1 && nonRandomized === -1) {
    ok(true, "No webgl context, skipping test.");
    BrowserTestUtils.removeTab(tab);
    return;
  }

  ok(!randomized.split(",").every(v => v === "0"), "Read pixels successfully");
  ok(
    !nonRandomized.split(",").every(v => v === "0"),
    "Read pixels successfully"
  );

  isnot(randomized, nonRandomized, "Canvas is randomized");

  BrowserTestUtils.removeTab(tab);
});
