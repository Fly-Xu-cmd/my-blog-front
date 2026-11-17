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
  view: [number, number];
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
uniform sampler2D surfaces;
uniform vec2 size;
uniform vec2 cover;
uniform vec2 offset;
uniform vec2 wind;
uniform vec3 focus;
uniform vec3 flash;
uniform vec2 currents[6];
uniform vec2 displacements[6];
uniform vec2 view;
uniform vec2 lights[2];
uniform float time;
void main() {
  vec2 px = uv * size;
  vec2 relative = (px - focus.xy) / 220.0;
  float influence = exp(-dot(relative, relative) * 2.0) * focus.z;
  // Overscan gives the slow travelling currents room at the viewport edges.
  vec2 textureUV = (uv - 0.5) * cover * 0.78 + 0.5 + offset;
  textureUV -= wind / size * cover * 0.45;
  textureUV -= (relative + vec2(relative.y, -relative.x) * 0.45) * influence * 0.025 * cover;
  vec3 color = vec3(0.0);
  float opacity = 0.0;
  vec3 sheetColor = vec3(0.0);
  float sheetOpacity = 0.0;
  vec2 toward0 = (lights[0] - px) / max(size.x, size.y);
  vec2 toward1 = (lights[1] - px) / max(size.x, size.y);
  vec3 light0 = normalize(vec3(toward0 * 3.0, 0.45));
  vec3 light1 = normalize(vec3(toward1 * 3.0, 0.45));
  float reach0 = exp(-dot(toward0, toward0) * 5.0) * 0.9;
  float reach1 = exp(-dot(toward1, toward1) * 5.0) * 0.9;
  vec2 trail = (px - flash.xy) / 160.0;
  float meteorLight = exp(-dot(trail, trail) * 2.0) * flash.z;
  for (int i = 0; i < 6; i++) {
    float layer = i < 2 ? 0.0 : i < 4 ? 1.0 : 2.0;
    float depth = 0.16 + layer * 0.4;
    vec2 travel = vec2(currents[i].x, -currents[i].y);
    vec2 displacement = vec2(displacements[i].x, -displacements[i].y);
    vec2 parallax = vec2(view.x, -view.y) * depth;
    vec2 sourceScreen = uv - (travel + displacement + parallax) / size;
    vec2 sourceUV = textureUV - (travel + displacement + parallax) / size * cover * 0.78;
    // Dust rolls within the travelling current, rather than wobbling in place.
    sourceUV += vec2(sin(sourceUV.y * 12.0 + time * 0.055),
                     cos(sourceUV.x * 10.0 - time * 0.04)) * 0.003;
    vec2 atlasUV = vec2((clamp(sourceUV.x, 0.002, 0.998) + layer) / 3.0,
                        clamp(sourceUV.y, 0.002, 0.998));
    vec3 parcelGas = texture2D(nebula, atlasUV).rgb;
    vec3 surface = texture2D(surfaces, atlasUV).rgb;
    float density = surface.b;
    vec2 slope = surface.rg * 2.0 - 1.0;
    vec3 normal = normalize(vec3(slope, sqrt(max(0.15, 1.0 - dot(slope, slope)))));
    // The overlapping masks travel with their parcels. No radial image warp:
    // differently directed cloud patches part instead of magnifying the scene.
    sourceScreen += vec2(sin(parcelGas.b * 30.0), cos(parcelGas.r * 35.0)) * 0.055;
    float horizontal = smoothstep(0.2, 0.8, sourceScreen.x);
    float side = i == 0 || i == 2 || i == 4 ? 1.0 - horizontal : horizontal;
    // Thin surfaces transmit light; thick foreground dust remains dark.
    vec3 illumination = vec3(0.6) + (
      vec3(0.76, 0.87, 1.0) * max(0.0, dot(normal, light0)) * reach0 +
      vec3(1.0, 0.87, 0.7) * max(0.0, dot(normal, light1)) * reach1
    ) * (1.0 - density * 0.7);
    illumination += vec3(0.7, 0.82, 1.0) * meteorLight * 0.65;
    illumination += vec3(0.2, 0.25, 0.3) * influence * depth;
    sheetColor += parcelGas * illumination * density * side;
    sheetOpacity += density * side;
    if (i == 1 || i == 3 || i == 5) {
      float alpha = clamp(sheetOpacity, 0.0, 0.9);
      color = color * (1.0 - alpha) + sheetColor;
      opacity = opacity + alpha * (1.0 - opacity);
      sheetColor = vec3(0.0);
      sheetOpacity = 0.0;
    }
  }
  // Premultiplied front-over-back gas attenuates the actual stars behind it.
  gl_FragColor = vec4(color, opacity);
}
`;

export function createCloudRenderer(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  surfaceImage: HTMLImageElement,
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  if (
    image.naturalWidth % 3 ||
    surfaceImage.naturalWidth % 3 ||
    image.naturalWidth > gl.getParameter(gl.MAX_TEXTURE_SIZE) ||
    surfaceImage.naturalWidth > gl.getParameter(gl.MAX_TEXTURE_SIZE)
  )
    return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const surfaceTexture = gl.createTexture();
  const anchors = [
    [0.25, 0.78],
    [0.75, 0.22],
    [0.25, 0.78],
    [0.75, 0.22],
    [0.25, 0.78],
    [0.75, 0.22],
  ];
  const currents = new Float32Array(12);
  const displacements = new Float32Array(12);
  const dispose = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    gl.deleteTexture(texture);
    gl.deleteTexture(surfaceTexture);
  };
  try {
    if (!program || !buffer || !texture || !surfaceTexture)
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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "nebula"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, surfaceTexture);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      surfaceImage,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "surfaces"), 1);
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
        "view",
        "lights[0]",
        "time",
      ].map((key) => [key, gl.getUniformLocation(program, key)]),
    );
    return {
      dispose,
      draw(frame: SkyFrame) {
        const scale = Math.max(
          frame.width / (image.width / 3),
          frame.height / image.height,
        );
        const cx = frame.width / ((image.width / 3) * scale);
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
        gl.uniform2f(locations.view, frame.view[0], frame.view[1]);
        gl.uniform2fv(
          locations["lights[0]"],
          new Float32Array([
            frame.width * 0.73 + frame.view[0] * 0.04,
            frame.height * 0.7 - frame.view[1] * 0.04,
            frame.width * 0.25 + frame.view[0] * 0.04,
            frame.height * 0.3 - frame.view[1] * 0.04,
          ]),
        );
        anchors.forEach(([u, v], i) => {
          const layer = Math.floor(i / 2);
          const depth = [0.16, 0.56, 0.96][layer];
          const drift = ambientDrift(
            frame.time * [0.25, 0.5, 0.8][layer],
            i * 0.2,
          );
          const displacement = frame.motion.sample(
            u + drift[0] / frame.width,
            v + drift[1] / frame.height,
          );
          currents[i * 2] = drift[0] * depth;
          currents[i * 2 + 1] = drift[1] * depth;
          const response = [0.04, 0.38, 1][layer];
          displacements[i * 2] = displacement[0] * response;
          displacements[i * 2 + 1] = displacement[1] * response;
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
