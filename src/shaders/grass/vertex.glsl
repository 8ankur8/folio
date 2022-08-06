#define PI 3.14159265 
uniform vec2 ufrequency;
uniform float uTime;

varying vec2 vUv;
varying float vElevation;

//cnoise
float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

vec4 permute(vec4 x) 
{ 
    return mod(((x*34.0)+1.0)*x, 289.0);
}
vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 * 
    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

float getElevation(vec2 _position)
{
  float elevation = 0.0 ;

  for(float j = 0.1 ; j <= 2.0 ; j++)
  {
     float strength = 2.0 - length(uv - 0.5)*2.5;
     //elevation =   0.6*cnoise(vec2(_position.xy / j /2.0  )) + 0.5 * cnoise(vec2(_position.xy * j * 5.0 )) + 0.75 * random(vec2(_position.xy)) ;
     //elevation =   0.5 * cnoise(vec2(_position.xy * j * 5.0 )) + 0.75 * random(vec2(_position.xy)) ;
     elevation =   0.5 * cnoise(vec2(_position.xy / j ))  + 1.2 * random(vec2(_position.xy ) )  ;
     
     elevation *= (strength) - 0.75 * strength;
  }
  return elevation;
}

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    float elevation =getElevation(modelPosition.xz);
    modelPosition.y += elevation < 0.2 ? 0.0 : elevation;
    //modelPosition.y += elevation; 
    if (modelPosition.y >elevation*0.0){
      modelPosition.xz += sin(pow(modelPosition.y,1.5)  + uTime *1.0)*0.1;
      modelPosition.xz += sin(pow(modelPosition.y,1.5) - uTime *1.0)*0.1;
    }

    //modelPosition.y += abs(elevation) ; 

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
    
    vUv = uv;
    vElevation = elevation ;
    //gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0) ;
}