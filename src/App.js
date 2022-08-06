import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import particleVertex from './shaders/particle/vertex.glsl'
import particleFragment from './shaders/particle/fragment.glsl'
import grassVertexShader from './shaders/grass/vertex.glsl'
import grassFragmentShader from './shaders/grass/fragment.glsl'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js'
import {OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; 
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as dat from 'dat.gui'
import { Material } from 'three/build/three.module'
import { Vector3 } from 'three'


let container,camera, scene, htmlScene, renderer, htmlRenderer,particleAbsorb,clock,controls
let composer, effectFXAA, outlinePass
let keyboard = {}
let mixer = {}
let player = { height:2.0, speed:0.1, turnSpeed:Math.PI*0.02,direction :new THREE.Vector3() }

let uniforms ={
    summer:{
        uTime: { value: 0 },
        ucolor:{value:new THREE.Color('green')}
    },  
    winter:{
        uTime: { value: 0 },
        ucolor:{value:new THREE.Color('#cccccc')}
    },
    autume:{
        uTime: { value: 0 },
        ucolor:{value:new THREE.Color('orange')}
    },    
    rainy:{
        uTime: { value: 0 },
        ucolor:{value:new THREE.Vector3(0.05,0.05,0.05)}
    },  
    particle:{
        uTime: {value : 0}
    },
    hand: {
        uTime: {value : 0}
    }        
}


const gui = new dat.GUI()

let loadingScreen = {
	scene: new THREE.Scene(),
	camera: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100),
	box: new THREE.Mesh(
		new THREE.BoxGeometry(1.0,1.0,1.0),
		new THREE.MeshNormalMaterial({ wireframe : true })
	)
}
let loadingManager = null
let resourceLoaded = false
let matcapMaterial,normalMaterial


var models = {
	world: {
		obj:'/model/aliveworld.glb',
		mesh: null,
		animation:null
	},
	hand: {
		obj:'/model/static.glb',
		mesh: null
		
	}		
}


var objects = {}

const enterButton = document.getElementById( 'enterButton' );
enterButton.addEventListener( 'click', init );

//raycaster
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
clock = new THREE.Clock()


function init(){

	const overlay = document.getElementById( 'overlay' );
    overlay.remove()

	// Create a scene and camera

    container = document.createElement( 'div' )
	const htmlContainer = document.createElement( 'div' )

    document.body.appendChild( container )

	scene = new THREE.Scene();
	htmlScene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(50 , window.innerWidth / window.innerHeight, 0.1, 120);
	camera.rotation.order = 'YXZ'
	// A Mesh is made up of a geometry and a material.
	// Materials affect how the geometry looks, especially under lights.

    loadingScreen.box.position.set(0,0,5)
	loadingScreen.box.rotation.set(2.53,0.785,0)
	
	loadingScreen.camera.lookAt(loadingScreen.box.position)

	loadingScreen.scene.add(loadingScreen.box)

    loadingManager = new THREE.LoadingManager()

    loadingManager.onProgress = function(item, loaded, total){
		console.log(item, loaded, total);
	}
	
	loadingManager.onLoad = function(){
		console.log("loaded all resources");
		resourceLoaded = true;
		onResourceLoaded()
	}

	
	// texture
    const textureLoader = new THREE.TextureLoader(loadingManager)
    const matcapTexture = textureLoader.load('/images/matcap1.png')
	matcapMaterial =  new THREE.MeshMatcapMaterial({matcap:matcapTexture})
	normalMaterial = new THREE.MeshNormalMaterial()
    
	/*
	normalMaterial.onBeforeCompile = (shader) =>{
		console.log(shader)
		shader.vertexShader = shader.vertexShader.replace(
			'#include <beginnormal_vertex>',
			'#include <beginnormal_vertex>'
			
		)

	}
	*/

	// audio loader
	/*
    const audioLoader = new THREE.AudioLoader(loadingManager)

    const audioListener = new THREE.AudioListener()
    const globalSound = new THREE.Audio(audioListener)
    const environmentSound = audioLoader.load(
        'sound/bg.mp3',
        (buffer) =>{
            globalSound.setBuffer(buffer)
            globalSound.setLoop(true)
            globalSound.setVolume(.6)
            globalSound.play()
            
        }
    )
	*/
	// WORLD

	// PARICALS
	const pointstoupdate = []
 
    let pointMaterial 

    particleAbsorb = new THREE.Group()
    
    scene.add(particleAbsorb)

    const  pointGeometry = (pointCount) =>{

        const geometry = new THREE.BufferGeometry
        const positions = new Float32Array(pointCount * 3)
        const scale = new Float32Array(pointCount)
        const progressArray = new Float32Array(pointCount)
        //const color = new THREE.Color()
        
        for (let i=0; i< pointCount * 3 ; i++)
        {
            const i3 = i*3 
            
            positions[i3+0] =  (Math.random() - 0.5) * 50.0 // camera.position.x
            positions[i3+1] = (Math.random() - 0.25)  * 1.5//* camera.position.y
            positions[i3+2] = (Math.random() - 0.5) * 50.0 // camera.position.z
            

            progressArray[i] = Math.random()
            
            //scales
            scale[i] =Math.random() + 0.2
        }
        const positionAttributes = new THREE.BufferAttribute(positions,3)
        geometry.setAttribute('position', positionAttributes)
        const scaleAttributes = new THREE.BufferAttribute(scale,1)
        geometry.setAttribute('scale', scaleAttributes)
        
        geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progressArray, 1))

        
        
        pointMaterial = new THREE.ShaderMaterial({
            uniforms:uniforms.particle,
            vertexShader: particleVertex,
            fragmentShader: particleFragment,
            transparent:true,
            
            depthWrite:false
            
        })
        
        const points = new THREE.Points(geometry,pointMaterial)
        
        
        points.matrixAutoUpdate= false
        points.updateMatrix()
        particleAbsorb.add(points)
        pointstoupdate.push({points})
    }

    pointGeometry(200)

	// gltf
   
    let loader = new GLTFLoader(loadingManager)
    

	for (var _object in models){
		(function(object){
			//let loader = new GLTFLoader(loadingManager)
			loader.load(models[object].obj, function(gltf)
			{
				gltf.scene.traverse(function(node)
					{
				    if( node instanceof THREE.Mesh )
					{
						node.castShadow = true
						node.receiveShadow = true
						}
					})
					
				models[object].mesh = gltf.scene
				models[object].animation = gltf.animations			
			})
		})(_object)

	}	
	
    //seasonal world

    const grassGeometry= [
        [new THREE.PlaneBufferGeometry(2,2,400,400),10],
        [new THREE.PlaneBufferGeometry(2,2,100,100),15],
        [new THREE.PlaneBufferGeometry(2,2,50,50),25],
        [new THREE.PlaneBufferGeometry(2,2,25,25),50],
        [new THREE.PlaneBufferGeometry(2,2),100]
    ]

	const grass = (uniform,angle) =>{

		const grass = new THREE.Group()
		scene.add(grass)

		const Material = new THREE.ShaderMaterial({
			vertexShader:grassVertexShader,
			fragmentShader:grassFragmentShader,
			wireframe:false,
			uniforms:uniform,
			transparent:true
		//side:THREE.DoubleSide            
		})
		
	for ( let j = 0; j < 200; j ++ ){

		const lod  = new THREE.LOD()

		for(let i=0; i < grassGeometry.length ;i++)
			{
				const mesh = new THREE.Mesh( grassGeometry[i][0], Material );
				mesh.scale.x = mesh.scale.y = 2.0 + 2.0 * Math.random()
				mesh.rotation.x = - Math.PI/2;
				mesh.rotation.z = Math.random() * Math.PI
				mesh.updateMatrix()
				mesh.matrixAutoUpdate = false
				lod.addLevel( mesh, grassGeometry[ i ][ 1 ] )             
			}

		lod.position.set(500 *(Math.pow(Math.random() ,3)),0.0,500 *(Math.pow(Math.random() , 3)))
		lod.updateMatrix()
		lod.matrixAutoUpdate = false
		grass.add(lod)
		grass.rotation.y = angle

		}

	}

	grass(uniforms.summer,Math.PI*0.75)
	grass(uniforms.autume,Math.PI*0.25)
	grass(uniforms.rainy,-Math.PI*0.25)
	grass(uniforms.winter,-Math.PI*0.75)
	
	// Move the camera to 0,0,-5 (the Y axis is "up")
	camera.position.set(0, player.height, -12.0);
	camera.lookAt(new THREE.Vector3(0,player.height,0));
	
	function LinkElement (width,height,link,pos)
	{
		const element = document.createElement( 'a' );
		element.style.width = width + 'px';
		element.style.height = height + 'px';
		element.className= 'label';
		element.href = link;
		const object = new CSS3DObject( element );
		object.position.copy(pos)
        object.scale.set(0.01,0.01,0.01)
		scene.add(object)
	}

    LinkElement(15,15,"#",new THREE.Vector3(10,2,0))

    LinkElement(15,15,"https://www.google.co.in/",new THREE.Vector3(3,3,3))
   
	htmlRenderer = new CSS3DRenderer()
	htmlRenderer.setSize(window.innerWidth, window.innerHeight)
	htmlRenderer.domElement.style.position = 'absolute';
	htmlRenderer.domElement.style.top = '0px';
	htmlContainer.appendChild( htmlRenderer.domElement );



	// Creates the renderer with size 1280x720
	renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( Math.min(window.devicePixelRatio, 2));
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
	// Puts the "canvas" into our HTML page.
    container.appendChild( renderer.domElement );

	// postprocessing

	// composer = new EffectComposer( renderer );
	// const renderPass = new RenderPass( scene, camera );
	// composer.addPass( renderPass );

	// outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
	// composer.addPass( outlinePass )

	// effectFXAA = new ShaderPass( FXAAShader )
	
	// composer.addPass( effectFXAA )

	//----INTERACTION

	renderer.domElement.addEventListener( 'pointermove', onPointerMove );

	function onPointerMove( event ) {

		if ( event.isPrimary === false ) return

		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

		camera.rotation.y += (1.0 - event.movementX )/ window.innerWidth * Math.PI *1.25;
		camera.rotation.x -= event.movementY  /window.innerHeight * Math.PI *3;

	
		checkIntersection()

	}

	function checkIntersection() {

		raycaster.setFromCamera( mouse, camera );

		const intersects = raycaster.intersectObjects(objects["world"].children);

        for (const object of objects["world"].children) {

			object.traverse((child) => {
				if (child instanceof THREE.Mesh ) {        
					child.material = matcapMaterial
				}
			})
	   }
		for (const intersect of intersects)
		{
			intersect.object.material = normalMaterial
		}
	}	
	

	// controls = new FirstPersonControls( camera,	container )
    // controls.lookSpeed = 0.01
	// controls.rollSpeed = 0.5	//controls.mouseDragOn = true

	controls = new OrbitControls( camera,	container )
   
	
	animate()
	
}

window.addEventListener( 'resize', onWindowResize )

function onResourceLoaded(){
	
	// Clone models into objects.
	
	objects["world"] = models.world.mesh.clone()
	objects["hand"] = models.hand.mesh.clone()
	
	
	// Reposition individual meshes, then add meshes to scene
	
	objects["world"].position.set(0, 0.002 ,0);
	objects["world"].rotation.set(0,Math.PI,0)
	scene.add(objects["world"])
	/*
	objects["world"].traverse((child) => {
        if (child instanceof THREE.Mesh ) {        
			child.material = matcapMaterial
			
			child.geometry.computeBoundingSphere()
	    	
		}
	})
	*/
	
	mixer = new THREE.AnimationMixer(objects["world"])
        for(let i=0;i < models.world.animation.length ;i++)
			{
               	const action = mixer.clipAction(models.world.animation[i]) 
               	action.play()
			} 
	
	
	objects["hand"].scale.set(1.2, 1.2, 1.2)
	
	scene.add(objects["hand"]);

	objects["hand"].traverse((_child) => {

		if ( _child instanceof THREE.Mesh ) {

			_child.geometry.center()
			_child.geometry.computeBoundingSphere()
			

			_child.receiveShadow = true;
			_child.castShadow = true;

			_child.material = new THREE.MeshPhongMaterial( { color: 0xffff00 } )
			
			_child.material = new THREE.ShaderMaterial({
				uniforms : uniforms.hand,
				vertexShader:`

				varying vec3 fNormal;
				varying vec3 fPosition;
				varying vec2 fUv;

				void main()
				{
					fNormal = normalize(normalMatrix * normal);
					fPosition =  (modelViewMatrix * vec4(position,1.0)).xyz;
					fUv = uv;
					gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0) ;
				}
				`,
				fragmentShader: `
				varying vec3 fPosition;
				varying vec3 fNormal;
				uniform float uTime;

				vec3 hsv2rgb(vec3 c) {
					vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
					vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
					return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
				  }

				void main()
				{
					vec3 color = hsv2rgb(vec3( sin(uTime) * 0.1 ,1.0,1.0)) ;
					vec3 normal = fNormal;
  					vec3 eye = normalize(-fPosition.xyz);
  					float rim = smoothstep(0.2, 1.0, 1.0 - dot(normal, eye));
					gl_FragColor = vec4(clamp(rim * rim , 0.02, 1.0) * color *7.5 , 0.5 );
				}
				`,
				transparent:true,
				opacity : 0.5,
				depthWrite:true
			})
				
		} 
		
		
	})
	
}

function onWindowResize() {

    renderer.setSize( window.innerWidth, window.innerHeight )
	htmlRenderer.setSize( window.innerWidth, window.innerHeight )
	composer.setSize( window.innerWidth, window.innerHeight )
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

}


function animate(){
	

	const delta = clock.getDelta()
	const elapsedTime = clock.getElapsedTime()
	

	if( resourceLoaded == false ){
		requestAnimationFrame(animate);
		loadingScreen.box.rotation.y -= 0.005 ;
		renderer.render(loadingScreen.scene, loadingScreen.camera);
		return; // Stop the function here.
	}
    
	requestAnimationFrame(animate);

	

	//composer.render()

    //if(particleAbsorb)
      // particleAbsorb.lookAt(camera.rotation)WWWWW

	 // Tells the browser to smoothly render at 60Hz
	
	//model animation
	if(mixer) mixer.update(delta);

	uniforms.hand['uTime'].value += delta
	uniforms.particle['uTime'].value += delta
	uniforms.summer['uTime'].value += delta
	uniforms.winter['uTime'].value += delta
	uniforms.rainy['uTime'].value += delta
	uniforms.autume['uTime'].value += delta

	
    //controls
    if(keyboard[87]){ // W key
		camera.position.x -= Math.sin(camera.rotation.y) * player.speed;
		camera.position.z -= Math.cos(camera.rotation.y) * player.speed;
	}
	if(keyboard[83]){ // S key
		camera.position.x += Math.sin(camera.rotation.y) * player.speed;
		camera.position.z += Math.cos(camera.rotation.y) * player.speed;
	}
	if(keyboard[65]){ // A key
		// Redirect motion by 90 degrees
		camera.position.x -= Math.sin(camera.rotation.y + Math.PI/2) * player.speed;
		camera.position.z -= Math.cos(camera.rotation.y + Math.PI/2) * player.speed;
	}
	if(keyboard[68]){ // D key
		camera.position.x += Math.sin(camera.rotation.y + Math.PI/2) * player.speed
		camera.position.z -= Math.cos(camera.rotation.y - Math.PI/2) * player.speed;
	}

	 //
	controls.update(delta * 5.0) 



	
	// position the hand in front of the camera
	
	objects["hand"].position.copy( camera.position );
	objects["hand"].rotation.copy(camera.rotation)
	objects["hand"].translateZ(-1)
	objects["hand"].translateY(-0.4 )
	objects["hand"].translateX(-0.25)
	objects["hand"].rotateY(Math.PI)
	objects["hand"].position.y += Math.sin(elapsedTime*4 + camera.position.x + camera.position.z)*0.01 
	objects["hand"].rotation.z -= Math.sin(elapsedTime) * 0.1

	particleAbsorb.position.copy(objects["hand"].position)
	particleAbsorb.position.y = objects["hand"].position.y + 0.2
	
	//html
	
   // Draw the scene from the perspective of the camera.
	renderer.render(scene, camera);

	htmlRenderer.render( htmlScene, camera );
}

function keyDown(event){
        keyboard[event.keyCode] = true;
    }
    
function keyUp(event){
        keyboard[event.keyCode] = false;
    }  
window.addEventListener('keydown', keyDown)
window.addEventListener('keyup', keyUp)
//init()
//window.onload = init