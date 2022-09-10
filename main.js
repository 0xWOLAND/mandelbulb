var since = 0;
var mousepos = [0,0]
const canvas = document.querySelector("#canvas");
const gl = canvas.getContext("webgl");
var datInput = {
  renderSmoothen: 1000
};
var gui;
function main() {
  gui = initializeGUI();
  if (!gl) {
    return;
  }
  const vs = `
    attribute vec4 a_position;
    void main() {
      gl_Position = a_position;
    }
  `;
  var fs = `
    precision highp float;
    void main() {
      gl_FragColor = vec4(fract(gl_FragCoord.xy / 50.0), 0, 1);
    }
  `;
  fs = `
    precision highp float;
#define march_iter 64 
#define m_step 0.5
#define z_near 0.1
#define z_far 3.0
#define z_max 1.5
#define mandlebrot_iters 64
uniform vec3      iResolution;           
uniform float     iTime;                 
uniform vec4      iMouse;                
vec3 colorMap( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{
    return a + b*cos( 6.28318*(c*t+(b*d/a)) );
}
vec3 colorPallete (float t) {
    return colorMap( t, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(0.01,0.01,0.01),vec3(0.00, 0.15, 0.20) );
}
vec2 DE(vec3 pos) {
  float pwr = 3.0+4.0*(sin(iTime/30.0)+1.0);
	vec3 z = pos;
	float dr = 1.0;
	float r = 0.0;
	for (int i = 0; i < mandlebrot_iters ; i++) {
		r = length(z);
		if (r>z_max) break;
		float theta = acos(z.z/r);
		float phi = atan(z.y,z.x);
		dr =  pow( r, pwr-1.0)*pwr*dr + 1.0;
		float zr = pow( r,pwr);
		theta = theta*pwr;
		phi = phi*pwr;
		z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
		z+=pos;
	}
	return vec2(0.5*log(r)*r/dr,50.0*pow(dr,0.128/float(march_iter)));
}
vec2 map( in vec3 p )
{
   	vec2 d = DE(p);
   	return d;
}
vec2 tr  (vec3 origin, vec3 ray) {
    float t =0.0;
    float c = 0.0;
    for (int i=0; i<march_iter; i++) {
    	vec3 path = origin + ray * t;	
    	vec2 dist = map(path);
        t += m_step * dist.x;
        c += dist.y;
        if (dist.y < z_near) break;
    }
    return vec2(t,c);
}
void main()
{
  vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord/iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    vec3 ray = normalize(vec3 (uv,1.0));
    float rotAngle = 0.4+iTime/40.0 + 6.28*iMouse.x / iResolution.x;
    ray.xz *= mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));
    float camDist = z_far * iMouse.y / iResolution.y;
    if (iMouse.xy==vec2(0)) camDist = z_far*0.55;
    vec3 origin = vec3 (camDist * sin(rotAngle),0.0,-camDist *cos(rotAngle));           
	vec2 depth = tr(origin,ray);
	float fog = 1.0 / (1.0 + depth.x * depth.x * 0.1);
    vec3 fc = vec3(fog);
    gl_FragColor = vec4(colorPallete(depth.y)*fog,1.0);
}
  `
  const program = webglUtils.createProgramFromSources(gl, [vs, fs]);
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
  ]), gl.DYNAMIC_DRAW);
  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(program);
  var resolution = gl.getUniformLocation(program, 'iResolution');
  var time = gl.getUniformLocation(program, 'iTime');
  var mouse = gl.getUniformLocation(program, 'iMouse');
  function render(deltaMS) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(resolution, [gl.canvas.width, gl.canvas.height, 0]);
    deltaMS /= datInput.renderSmoothen;
    gl.uniform1f(time, deltaMS);
    gl.uniform4fv(mouse, [mousepos[0], mousepos[1], 0, 0]);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
      positionAttributeLocation,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );
    gl.drawArrays(
      gl.TRIANGLES,
      0,
      6,
    );
    window.requestAnimationFrame(render);
  }
  window.requestAnimationFrame(render);
}
main();
canvas.addEventListener('mousemove', (e) => {
  mousepos = [e.clientX, Math.max(300, e.clientY)];
});
function initializeGUI() {
  var g = new dat.GUI({ name: "Controls" });
  var inputFolder = g.addFolder("Input");
  inputFolder.add(datInput, "renderSmoothen", 1, 1000);
}
