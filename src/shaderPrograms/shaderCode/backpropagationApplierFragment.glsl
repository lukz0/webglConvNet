precision highp float;

uniform sampler2D cost_deriv;
uniform sampler2D texture_old;
uniform float texture_height;
uniform float texture_width;

uniform float significance;

void main() {
  vec2 pos = gl_FragCoord.xy / vec2(texture_width, texture_height);
  gl_FragColor =
      texture2D(texture_old, pos) - texture2D(cost_deriv, pos) * significance;
}