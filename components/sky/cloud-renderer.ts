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
  pulse: [number, number, number, number];
}

// Screen-space currents shared below; gas parcels and stars drift through them.
export function scatterDrift(dx: number, dy: number): [number, number] {
  const length = Math.sqrt(dx * dx + dy * dy + 8100);
  const rx = dx / length,
    ry = dy / length;
  const nx = Math.sin(dy * 0.021 + Math.sin(dx * 0.009) * 2);
  const ny = Math.cos(dx * 0.019 - Math.sin(dy * 0.011) * 2);
  return [rx * 55 - ry * nx * 10 + nx * 12, ry * 55 + rx * nx * 10 + ny * 12];
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
uniform vec4 pulse;
uniform float time;
vec2 scatterDrift(vec2 delta) {
  vec2 radial = delta / sqrt(dot(delta, delta) + 8100.0);
  vec2 noise = vec2(sin(delta.y * 0.021 + sin(delta.x * 0.009) * 2.0),
                    cos(delta.x * 0.019 - sin(delta.y * 0.011) * 2.0));
  return radial * 55.0 + vec2(-radial.y, radial.x) * noise.x * 10.0 + noise * 12.0;
}
void main() {
  vec2 px = uv * size;
  vec2 relative = (px - focus.xy) / 220.0;
  float influence = exp(-dot(relative, relative) * 2.0) * focus.z;
  vec2 textureUV = (uv - 0.5) * cover + 0.5 + offset;
  // Bounded, overlapping currents keep gas flowing even without a pointer.
  // Advect the fine dust with the broad current instead of moving a flat image.
  vec2 current = vec2(sin(textureUV.y * 7.0 + time * 0.13),
                      cos(textureUV.x * 6.0 - time * 0.10)) * 0.018;
  vec2 dustUV = textureUV + current;
  textureUV += current + vec2(sin(dustUV.y * 19.0 - time * 0.18),
                             cos(dustUV.x * 15.0 + time * 0.15)) * 0.007;
  textureUV -= wind / size * cover * 0.45;
  textureUV -= (relative + vec2(relative.y, -relative.x) * 0.45) * influence * 0.025 * cover;
  vec2 pulseDelta = px - pulse.xy;
  vec2 pulseRelative = pulseDelta / max(pulse.w, 1.0);
  float pulseField = exp(-dot(pulseRelative, pulseRelative) * 2.4) * pulse.z;
  vec3 color = texture2D(nebula, clamp(textureUV, 0.001, 0.999)).rgb;
  vec3 sky = vec3(5.0, 7.0, 12.0) / 255.0;
  vec3 gas = max(color - sky, 0.0);
  if (pulse.z > 0.001 && pulseField > 0.005) {
    vec2 screenDelta = vec2(pulseDelta.x, -pulseDelta.y);
    vec3 dispersedGas = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 parcel = i == 0 ? vec2(-0.5, -0.35) : i == 1 ? vec2(0.5, -0.35)
                  : i == 2 ? vec2(-0.4, 0.5) : vec2(0.45, 0.5);
      vec2 drift = scatterDrift(parcel * pulse.w) * pulse.z;
      vec2 sourceUV = textureUV - vec2(drift.x, -drift.y) / size * cover;
      vec2 maskUV = vec2(0.5) + (screenDelta - drift) / max(pulse.w, 1.0) * 0.6;
      float grain = clamp((texture2D(nebula, clamp(maskUV, 0.001, 0.999)).b - sky.b) * 10.0 + 0.25, 0.0, 1.0);
      vec4 distance = vec4(grain) - vec4(0.125, 0.375, 0.625, 0.875);
      vec4 portions = exp(-distance * distance * 8.0);
      portions /= dot(portions, vec4(1.0));
      float part = i == 0 ? portions.x : i == 1 ? portions.y : i == 2 ? portions.z : portions.w;
      dispersedGas += max(texture2D(nebula, clamp(sourceUV, 0.001, 0.999)).rgb - sky, 0.0) * part;
    }
    // Independently translate complementary gas parcels; never scale the image.
    color += (dispersedGas * 0.9 - gas) * pulseField;
    gas = max(color - sky, 0.0);
  }
  vec2 trail = (px - flash.xy) / 150.0;
  float illumination = exp(-dot(trail, trail) * 2.0) * flash.z;
  // Reveal the existing gas, leaving empty space dark rather than a round glow.
  color += gas * (influence * 0.85 + illumination * 1.1 + pulseField * 0.15);
  gl_FragColor = vec4(color, 1.0);
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
    const locations = Object.fromEntries(
      [
        "size",
        "cover",
        "offset",
        "wind",
        "focus",
        "flash",
        "pulse",
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
        gl.uniform4f(
          locations.pulse,
          frame.pulse[0],
          frame.height - frame.pulse[1],
          frame.pulse[2],
          frame.pulse[3],
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
    };
  } catch {
    dispose();
    return null;
  }
}
