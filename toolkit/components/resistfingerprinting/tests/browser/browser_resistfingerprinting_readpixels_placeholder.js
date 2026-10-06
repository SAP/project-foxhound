/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Bug 1917607 - Testing canvas randomization with readpixels function of webgl.
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

const extractCanvas = async empty => {
  const canvas = new content.OffscreenCanvas(64, 64);
  const gl = canvas.getContext("webgl");
  if (!gl) {
    ok(true, "No webgl context, skipping test.");
    return -1;
  }

  if (!empty) {
    gl.disable(gl.DEPTH_TEST);

    content.document.body.innerHTML = `
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
        var elem = content.document.getElementById(id);
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

    const vertCoordArr1 = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertCoordArr2 = new Float32Array([1, -1, 1, -1, -1, 1, 1, 1]);

    draw("vs", "fs1", vertCoordArr1);
    draw("vs", "fs2", vertCoordArr2);
  }

  const pixels = new Uint8Array(
    gl.drawingBufferWidth * gl.drawingBufferHeight * 4
  );
  gl.readPixels(
    1,
    1,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  return pixels.join(",");
};

add_task(async function test_placeholder() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.fingerprintingProtection", true],
      [
        "privacy.fingerprintingProtection.overrides",
        "-AllTargets,+CanvasImageExtractionPrompt",
      ],
    ],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: emptyPage,
  });

  // Don't draw anything on the canvas
  // and read it, we should have a placeholder
  const placeholder1 = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [true],
    extractCanvas
  );

  const placeholder2 = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [true],
    extractCanvas
  );

  if (placeholder1 === -1 && placeholder2 === -1) {
    ok(true, "No webgl context, skipping test.");
    BrowserTestUtils.removeTab(tab);
    return;
  }

  ok(
    !placeholder1.split(",").every(v => v === "0"),
    "Read pixels successfully"
  );
  ok(
    !placeholder2.split(",").every(v => v === "0"),
    "Read pixels successfully"
  );

  isnot(placeholder1, placeholder2, "Both read pixels should be different");

  await SpecialPowers.popPrefEnv();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.fingerprintingProtection", true],
      [
        "privacy.fingerprintingProtection.overrides",
        "-AllTargets,+CanvasRandomization",
      ],
    ],
  });

  // Draw something on the canvas
  // and read it, we should have a randomized canvas
  // and the read pixels should be the same
  const randomized1 = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [false],
    extractCanvas
  );

  const randomized2 = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [false],
    extractCanvas
  );

  if (randomized1 === -1 && randomized2 === -1) {
    ok(true, "No webgl context, skipping test.");
    BrowserTestUtils.removeTab(tab);
    return;
  }

  ok(!randomized1.split(",").every(v => v === "0"), "Read pixels successfully");
  ok(!randomized2.split(",").every(v => v === "0"), "Read pixels successfully");

  is(
    randomized1,
    randomized2,
    "Read pixels should be the same after randomization with no placeholder"
  );

  await SpecialPowers.popPrefEnv();
  BrowserTestUtils.removeTab(tab);
});
