#define PI 3.14159265

attribute float pointVertex; 
attribute vec3 pointColor; 

//uniform sampler2D texturePosition;
//uniform sampler2D textureVelocity;
uniform float uTime;

attribute float aProgress;
attribute float scale;

void main()
{
    float progress = mod(aProgress + uTime * 0.05, 1.0);
    
    vec3 particlePosition =  position * (1.01 - progress); 

    vec4 modelPosition = modelMatrix * vec4(particlePosition, 1.0);
    modelPosition.x -= 0.015;
    modelPosition.xz += sin(uTime*scale - scale ) *0.01 ;
    
    
    
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;
    //gl_Position =  projectionMatrix * modelPosition;

    gl_PointSize = 35.0 * scale;
    gl_PointSize *= (1.0 / - viewPosition.z);

}
