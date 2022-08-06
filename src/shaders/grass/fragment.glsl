varying vec2 vUv;
varying float vElevation;
uniform vec3 ucolor;

uniform float uTime;

void main()
{
    
    
    vec3 blackcolor = vec3(pow(vElevation,2.0) * 0.25);
    //vec3 uvcolor = vec3((1.0 - vUv),0.5) ;
    //vec3 
    //vec3 uvcolor = vec3((1.0 - vUv),0.5)  ;
    //vec3 mixedcolor = mix(blackcolor,uvcolor,0.9);
    gl_FragColor = vec4(blackcolor*3.0*ucolor,vElevation*2.5);
    
    //gl_FragColor = vec4(blackcolor*3.0*ucolor,1);
}    