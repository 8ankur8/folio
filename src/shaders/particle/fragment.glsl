
void main()
{
    float toCenter = distance(gl_PointCoord , vec2(0.5));
    float strength = 0.1 / toCenter - 0.2; 
    gl_FragColor = vec4(gl_PointCoord * 2.0, 1.0,strength);
}