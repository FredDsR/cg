const vs = `#version 300 es

in vec4 a_position;
in vec4 a_color;

uniform mat4 u_matrix;

out vec4 v_color;

void main() {
  gl_Position = u_matrix * a_position;

  v_color = a_color;
}
`;

const fs = `#version 300 es
precision highp float;

in vec4 v_color;

uniform vec4 u_colorMult;

out vec4 outColor;

void main() {
   outColor = v_color * u_colorMult;
}
`;

function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  twgl.setAttributePrefix("a_");

  const sphereBufferInfo = flattenedPrimitives.createSphereBufferInfo(gl, 10, 12, 6);
  const cubeBufferInfo   = flattenedPrimitives.createCubeBufferInfo(gl, 20);
  const coneBufferInfo   = flattenedPrimitives.createTruncatedConeBufferInfo(gl, 10, 0, 20, 12, 1, true, false);

  const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  const sphereVAO = twgl.createVAOFromBufferInfo(gl, programInfo, sphereBufferInfo);
  const cubeVAO   = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);
  const coneVAO   = twgl.createVAOFromBufferInfo(gl, programInfo, coneBufferInfo);

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  function rand(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return Math.random() * (max - min) + min;
  }

  function emod(x, n) {
    return x >= 0 ? (x % n) : ((n - (-x % n)) % n);
  }

  const fieldOfViewRadians = degToRad(60);

  const shapes = [
    { bufferInfo: sphereBufferInfo, vertexArray: sphereVAO, },
    { bufferInfo: cubeBufferInfo,   vertexArray: cubeVAO, },
    { bufferInfo: coneBufferInfo,   vertexArray: coneVAO, },
  ];

  const objectsToDraw = [];

  const objects = [];

  const baseHue = rand(360);

  objects.push({
    uniforms: {
      u_colorMult: chroma.hsv(emod(baseHue + rand(120), 360), rand(0.5, 1), rand(0.5, 1)).gl(),
      u_matrix: m4.identity(),
    },
  },
  {
    uniforms: {
      u_colorMult: chroma.hsv(emod(baseHue + rand(120), 360), rand(0.5, 1), rand(0.5, 1)).gl(),
      u_matrix: m4.identity(),
    },
  });

  let shape;
  objects.forEach((object => {
    shape = shapes[rand(shapes.length) | 0];

    objectsToDraw.push({
      programInfo: programInfo,
      bufferInfo: shape.bufferInfo,
      vertexArray: shape.vertexArray,
      uniforms: object.uniforms,
    });
  }))

  function computeMatrix(viewProjectionMatrix, translation, rotation, scale) {
    let matrix = m4.translate(viewProjectionMatrix,
        translation[0],
        translation[1],
        translation[2]);
    matrix = m4.xRotate(matrix, rotation[0]);
    matrix = m4.yRotate(matrix, rotation[1]);
    matrix = m4.zRotate(matrix, rotation[2]);
    matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);

    return matrix;
  }

  let then = 0;
  let deltatime;
  let translationSpeed = 10;
  let rotationSpeed = 5;
//  let animate = 1;
  //let animatationDuration = 5;
  let timeTracker = 0;

  const state = {
    shouldAnimate: false,
    shouldAnimateCamera: false,
    animationDuration: 5,
    cameraAnimationDuration: 10,
  };

  const object1 = {
    translationX: 30,
    translationY: 0,
    translationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  };

  const object2 = {
    translationX: -40,
    translationY: 0,
    translationZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  };

  const gui = new dat.GUI();
  gui.add(state, "shouldAnimate")
  gui.add(state, "shouldAnimateCamera")
  gui.add(state, "animationDuration", 0, 10, 1);
  gui.add(state, "cameraAnimationDuration", 0, 10, 1);

  const object1Folder = gui.addFolder("Object 1");
  object1Folder.add(object1, "translationX", -50, 50, 1);
  object1Folder.add(object1, "translationY", -50, 50, 1);
  object1Folder.add(object1, "translationZ", -50, 50, 1);
  object1Folder.add(object1, "rotationX", -50, 50, 1);
  object1Folder.add(object1, "rotationY", -50, 50, 1);
  object1Folder.add(object1, "rotationZ", -50, 50, 1);
  object1Folder.add(object1, "scaleX", 1, 50, 1);
  object1Folder.add(object1, "scaleY", 1, 50, 1);
  object1Folder.add(object1, "scaleZ", 1, 50, 1);

  const object2Folder = gui.addFolder("Object 2");
  object2Folder.add(object2, "translationX", -50, 50, 1);
  object2Folder.add(object2, "translationY", -50, 50, 1);
  object2Folder.add(object2, "translationZ", -50, 50, 1);
  object2Folder.add(object2, "rotationX", -50, 50, 1);
  object2Folder.add(object2, "rotationY", -50, 50, 1);
  object2Folder.add(object2, "rotationZ", -50, 50, 1);
  object2Folder.add(object2, "scaleX", 1, 50, 1);
  object2Folder.add(object2, "scaleY", 1, 50, 1);
  object2Folder.add(object2, "scaleZ", 1, 50, 1);

  // Camera params
  const cameraPoints = [
    [-100, -100, 0],
    [-100, 100, 0],
    [100, 100, 0],
    [100, -100, 0],
  ];
  let cameraIdx = 0;
  let nextCameraIdx = cameraIdx + 1;
  let cameraPosition = [-100, -100, 0];
  const target = [0, 0, 0];
  const up = [0, 1, 0];
  let cameraPointsDistance = 200;  

  function roundCoord(a) {
    return [parseInt(a[0]), parseInt(a[1]), parseInt(a[2])]
  }

  function coordIsEqual(a, b) {
    return a[0] == b[0] && a[1] == b[1] && a[2] == b[2]
  }

  function drawScene(now) {
    now *= 0.001;
    deltatime = now - then;
    then = now;

    if (state.shouldAnimate) {
      if (now - timeTracker > state.animationDuration) {
        translationSpeed *= -1;
        timeTracker = now;
      }

      object1.translationX += (translationSpeed * deltatime);
      object1.rotationX += (rotationSpeed * deltatime);
      object2.translationY += (translationSpeed * deltatime);
      object2.rotationY += (rotationSpeed * deltatime);
    }

    twgl.resizeCanvasToDisplaySize(gl.canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix =
        m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    if (state.shouldAnimateCamera) {
      let cameraDeslocation = (cameraPointsDistance * deltatime) / state.cameraAnimationDuration;
      if (!coordIsEqual(roundCoord(cameraPosition), cameraPoints[nextCameraIdx])) {
        if (cameraIdx == 0) {
          cameraPosition[1] < cameraPoints[nextCameraIdx][1] ? cameraPosition[1] += cameraDeslocation : cameraPosition[1] = cameraPoints[nextCameraIdx][1];
        } else if (cameraIdx == 1) {
          cameraPosition[0] < cameraPoints[nextCameraIdx][0] ? cameraPosition[0] += cameraDeslocation : cameraPosition[0] = cameraPoints[nextCameraIdx][0];
        } else if (cameraIdx == 2) {
          cameraPosition[1] > cameraPoints[nextCameraIdx][1] ? cameraPosition[1] -= cameraDeslocation : cameraPosition[1] = cameraPoints[nextCameraIdx][1];
        } else if (cameraIdx == 3) {
          cameraPosition[0] > cameraPoints[nextCameraIdx][0] ? cameraPosition[0] -= cameraDeslocation : cameraPosition[0] = cameraPoints[nextCameraIdx][0];
        }
      } else {
        cameraIdx = nextCameraIdx;
        cameraIdx == 3 ? nextCameraIdx = 0 : nextCameraIdx += 1;
      }
      console.log(cameraPoints[cameraIdx], roundCoord(cameraPosition), cameraPoints[nextCameraIdx])
      console.log(cameraIdx, nextCameraIdx, cameraDeslocation)
    }
   

    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    const viewMatrix = m4.inverse(cameraMatrix);

    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    objects[0].uniforms.u_matrix = computeMatrix(
      viewProjectionMatrix,
      [object1.translationX, object1.translationY, object1.translationZ],
      [object1.rotationX, object1.rotationY, object1.rotationZ],
      [object1.scaleX, object1.scaleY, object1.scaleZ]);

    objects[1].uniforms.u_matrix = computeMatrix(
      viewProjectionMatrix,
      [object2.translationX, object2.translationY, object2.translationZ],
      [object2.rotationX, object2.rotationY, object2.rotationZ],
      [object2.scaleX, object2.scaleY, object2.scaleZ]);  
    // ------ Draw the objects --------

    let lastUsedProgramInfo = null;
    let lastUsedVertexArray = null;

    objectsToDraw.forEach(function(object) {
      let programInfo = object.programInfo;
      let vertexArray = object.vertexArray;

      if (programInfo !== lastUsedProgramInfo) {
        lastUsedProgramInfo = programInfo;
        gl.useProgram(programInfo.program);
      }

      // Setup all the needed attributes.
      if (lastUsedVertexArray !== vertexArray) {
        lastUsedVertexArray = vertexArray;
        gl.bindVertexArray(vertexArray);
      }

      twgl.setUniforms(programInfo, object.uniforms);

      twgl.drawBufferInfo(gl, object.bufferInfo);
    });

    requestAnimationFrame(drawScene);
  }

  requestAnimationFrame(drawScene);
}

main();