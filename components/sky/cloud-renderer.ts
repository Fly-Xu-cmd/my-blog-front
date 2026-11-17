import type { SkyMotion } from "./sky-motion";
import { ambientDrift } from "./sky-motion";

export interface SkyMeteor {
  id: number;
  left: string;
  top: string;
  createdAt: number;
  interactive: boolean;
}

export interface SkyFrame {
  width: number;
  height: number;
  time: number;
  wind: [number, number];
  focus: [number, number, number];
  flash: [number, number, number];
  motion: SkyMotion;
}

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform sampler2D nebula;
uniform vec2 size;
uniform vec2 cover;
uniform vec2 offset;
uniform vec2 wind;
uniform vec3 focus;
uniform vec3 flash;
uniform vec2 currents[6];
uniform vec2 displacements[6];
uniform float time;
void main() {
  vec2 px = uv * size;
  vec2 relative = (px - focus.xy) / 220.0;
  float influence = exp(-dot(relative, relative) * 2.0) * focus.z;
  // Overscan gives the slow travelling currents room at the viewport edges.
  vec2 textureUV = (uv - 0.5) * cover * 0.78 + 0.5 + offset;
  textureUV -= wind / size * cover * 0.45;
  textureUV -= (relative + vec2(relative.y, -relative.x) * 0.45) * influence * 0.025 * cover;
  vec3 sky = vec3(5.0, 7.0, 12.0) / 255.0;
  vec3 gas = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    vec2 travel = vec2(currents[i].x, -currents[i].y);
    vec2 displacement = vec2(displacements[i].x, -displacements[i].y);
    vec2 sourceScreen = uv - (travel + displacement) / size;
    vec2 sourceUV = textureUV - (travel + displacement) / size * cover * 0.78;
    // Dust rolls within the travelling current, rather than wobbling in place.
    sourceUV += vec2(sin(sourceUV.y * 12.0 + time * 0.055),
                     cos(sourceUV.x * 10.0 - time * 0.04)) * 0.003;
    vec3 parcelGas = max(texture2D(nebula, clamp(sourceUV, 0.001, 0.999)).rgb - sky, 0.0);
    // The overlapping masks travel with their parcels. No radial image warp:
    // differently directed cloud patches part instead of magnifying the scene.
    sourceScreen += vec2(sin(parcelGas.b * 30.0), cos(parcelGas.r * 35.0)) * 0.055;
    float horizontal = smoothstep(0.2, 0.8, sourceScreen.x);
    float lower = 1.0 - smoothstep(0.14, 0.53, sourceScreen.y);
    float upper = smoothstep(0.47, 0.86, sourceScreen.y);
    float vertical = i < 2 ? lower : i < 4 ? 1.0 - lower - upper : upper;
    float side = i == 0 || i == 2 || i == 4 ? 1.0 - horizontal : horizontal;
    float part = side * vertical;
    gas += parcelGas * part;
  }
  vec2 trail = (px - flash.xy) / 150.0;
  float illumination = exp(-dot(trail, trail) * 2.0) * flash.z;
  // Reveal the existing gas, leaving empty space dark rather than a round glow.
  gas *= 1.0 + influence * 0.6 + illumination * 0.75;
  gl_FragColor = vec4(sky + gas, 1.0);
}
`;

export function createCloudRenderer(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const anchors = [
    [0.25, 0.82],
    [0.75, 0.82],
    [0.25, 0.5],
    [0.75, 0.5],
    [0.25, 0.18],
    [0.75, 0.18],
  ];
  const currents = new Float32Array(12);
  const displacements = new Float32Array(12);
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
  };
  try {
    if (!program || !buffer || !texture)
      throw new Error("Unavailable graphics resources");
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unavailable shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error("Unsupported shader");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Unsupported graphics program");
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "nebula"), 0);
    const locations = Object.fromEntries(
      [
        "size",
        "cover",
        "offset",
        "wind",
        "focus",
        "flash",
        "currents[0]",
        "displacements[0]",
        "time",
      ].map((key) => [key, gl.getUniformLocation(program, key)]),
    );
    return {
      dispose,
      draw(frame: SkyFrame) {
        const scale = Math.max(
          frame.width / image.width,
          frame.height / image.height,
        );
        const cx = frame.width / (image.width * scale);
        const cy = frame.height / (image.height * scale);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(locations.size, frame.width, frame.height);
        gl.uniform2f(locations.cover, cx, cy);
        gl.uniform2f(
          locations.offset,
          (1 - cx) * (frame.width <= 640 ? 0.1 : 0),
          0,
        );
        gl.uniform2f(locations.wind, frame.wind[0], -frame.wind[1]);
        gl.uniform3f(
          locations.focus,
          frame.focus[0],
          frame.height - frame.focus[1],
          frame.focus[2],
        );
        gl.uniform3f(
          locations.flash,
          frame.flash[0],
          frame.height - frame.flash[1],
          frame.flash[2],
        );
        gl.uniform1f(locations.time, frame.time);
        anchors.forEach(([u, v], i) => {
          const drift = ambientDrift(frame.time, i * 0.3);
          const displacement = frame.motion.sample(
            u + drift[0] / frame.width,
            v + drift[1] / frame.height,
          );
          currents[i * 2] = drift[0];
          currents[i * 2 + 1] = drift[1];
          displacements[i * 2] = displacement[0];
          displacements[i * 2 + 1] = displacement[1];
        });
        gl.uniform2fv(locations["currents[0]"], currents);
        gl.uniform2fv(locations["displacements[0]"], displacements);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
    };
  } catch {
    dispose();
    return null;
  }
}
