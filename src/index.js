import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js' 
//import { CameraControls } from './utils/CameraControls.js'
import { Fps } from 'three/examples/js/controls/FPS.js'
import particleVertex from './shaders/particle/vertex.glsl'
import particleFragment from './shaders/particle/fragment.glsl'
import grassVertexShader from './shaders/grass/vertex.glsl'
import grassFragmentShader from './shaders/grass/fragment.glsl'

import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';


let camera, scene, renderer, labelRenderer,controls, particleAbsorb,moon,matcapMaterial
let mixer ={}
let objects ={} 
let keyboard ={}
let player = { height:2.0, speed:0.1, turnSpeed:Math.PI*0.02,direction :new THREE.Vector3() }
let resourceLoaded = false
let loadingManager = null

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

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

let models = {
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


let loadingScreen = {
	scene: new THREE.Scene(),
	camera: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100),
	box: new THREE.Mesh(
		new THREE.BoxGeometry(1.0,1.0,1.0),
		new THREE.MeshNormalMaterial({ wireframe : true })
	)
}



const enterButton = document.getElementById( 'enterButton' );
enterButton.addEventListener( 'click', init );

const loadingCanvas = document.createElement( 'canvas' )
loadingCanvas.className="loadingScreen"

let overlay = document.getElementById( 'overlay' );

// LOADING MANAGER


function init() {

    overlay.remove()

    camera = new THREE.PerspectiveCamera(50 , window.innerWidth / window.innerHeight, 0.1, 120);
	camera.rotation.order = 'YXZ'
    camera.position.set(0, player.height, -12.0);
	camera.lookAt(new THREE.Vector3(0,player.height,0));
    
    scene = new THREE.Scene();
 
    ///loading screen
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
    const matcapTexture = textureLoader.load('/images/12.png')
	matcapMaterial =  new THREE.MeshMatcapMaterial({matcap:matcapTexture})
	
    // audio Loader
	// const listener = new THREE.AudioListener()
    // const audioLoader = new THREE.AudioLoader()
    // const sound = new THREE.Audio(listener)
	// audioLoader.load('sound/bg.mp3',(buffer) =>{
	// 	window.setTimeout(
    //         () => {
    //             sound.setBuffer(buffer)
	// 			sound.setVolume(0.6)
	// 			sound.setLoop(true)
	// 			sound.play()
    //         },2000
	// 	)
	// })
	
	
    /*
    ///WORLD
    */

    // PARICALS
	const pointstoupdate = []
    particleAbsorb = new THREE.Group()
    scene.add(particleAbsorb)

    const  pointGeometry = (pointCount) =>{

        const geometry = new THREE.BufferGeometry
        const positions = new Float32Array(pointCount * 3)
        const scale = new Float32Array(pointCount)
        const progressArray = new Float32Array(pointCount)
        
        for (let i=0; i< pointCount * 3 ; i++)
        {
            const i3 = i*3 
            positions[i3+0] =  (Math.random() - 0.5) * 50.0 // camera.position.x
            positions[i3+1] = (Math.random() - 0.25)  * 1.5//* camera.position.y
            positions[i3+2] = (Math.random() - 0.5) * 50.0 // camera.position.z
            //progress
            progressArray[i] = Math.random()
            //scales
            scale[i] =Math.random() + 0.2
        }
    
        geometry.setAttribute('position',  new THREE.BufferAttribute(positions,3))
        geometry.setAttribute('scale', new THREE.BufferAttribute(scale,1))
        geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progressArray, 1))

        const pointMaterial = new THREE.ShaderMaterial({
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

    //models

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
        [new THREE.PlaneBufferGeometry(2,2,300,300),10],
        [new THREE.PlaneBufferGeometry(2,2,100,100),15],
        [new THREE.PlaneBufferGeometry(2,2,50,50),25],
        [new THREE.PlaneBufferGeometry(2,2,25,25),50],
        [new THREE.PlaneBufferGeometry(2,2),100]
    ]

	const grass = (uniform,angle) =>{
        let grassGroup = new THREE.Group()
	    scene.add(grassGroup)

		const Material = new THREE.ShaderMaterial({
			vertexShader:grassVertexShader,
			fragmentShader:grassFragmentShader,
			wireframe:false,
			uniforms:uniform,
			transparent:true          
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
		grassGroup.add(lod)
		grassGroup.rotation.y = angle
		}
	}

    grass(uniforms.summer,Math.PI*0.75)
	grass(uniforms.autume,Math.PI*0.25)
	grass(uniforms.rainy,-Math.PI*0.25)
	grass(uniforms.winter,-Math.PI*0.75)


    function LinkElement (width,height,link,pos,x,y,z)
	{
		const element = document.createElement( 'a' );
		element.style.width = width + 'px';
		element.style.height = height + 'px';
		element.className= 'label';
		element.href = link;
		const object = new CSS3DObject( element );
		object.position.copy(pos)
		object.rotation.set(x,y,z)
        object.scale.set(0.01,0.01,0.01)
		scene.add(object)
	}

    LinkElement(25,25,"#",new THREE.Vector3(45,1.2,-15),-0.5,-0.78,1)
	LinkElement(25,25,"#",new THREE.Vector3(45,1.2,15),0.5,0.78,1)
	LinkElement(7,7,"https://www.linkedin.com/in/ankur-gurjar-385918174",new THREE.Vector3(-1.19,1.276,100.139),1,0,0)
	LinkElement(7,7,"https://twitter.com/a_liveankur",new THREE.Vector3(-1.65,1.361,100.370),1,0,-0.5)
	LinkElement(7,7,"#",new THREE.Vector3(-0.9,1.347,100.557),1,0,0)
	LinkElement(8,8,"#",new THREE.Vector3(-1.104,1.65,100.902),0.2,0,0)
	LinkElement(8,8,"#",new THREE.Vector3(-1.9,1.7,100.7),0,0,0)
    //LinkElement(15,15,"https://www.google.co.in/",new THREE.Vector3(10,2,0))
   
    

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild( renderer.domElement );

    labelRenderer = new CSS3DRenderer();
    labelRenderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    document.body.appendChild( labelRenderer.domElement );

    controls = new Fps(camera,labelRenderer.domElement )
    controls.lookSpeed = 0.01
	controls.rollSpeed = 0.5

    //
    window.addEventListener( 'resize', onWindowResize )

    animate();

}

function onResourceLoaded(){
	
	objects["world"] = models.world.mesh.clone()
	objects["hand"] = models.hand.mesh.clone()

    //world
	objects["world"].position.set(0, 0.002 ,0);
	objects["world"].rotation.set(0,Math.PI,0)
	
	mixer = new THREE.AnimationMixer(objects["world"])
    for(let i=0;i < models.world.animation.length ;i++)
	{
        const action = mixer.clipAction(models.world.animation[i]) 
        action.play()
	} 

    objects["world"].traverse((child) => {
        if (child instanceof THREE.Mesh ) {        
			child.material = matcapMaterial
			child.geometry.computeBoundingSphere()
		}
	})

    scene.add(objects["world"])
	
	// hand

	objects["hand"].scale.set(1.2, 1.2, 1.2)
	objects["hand"].traverse((_child) => {

		if ( _child instanceof THREE.Mesh ) {

			_child.geometry.center()
			_child.geometry.computeBoundingSphere()
		
			_child.material = new THREE.ShaderMaterial({
				uniforms : uniforms.hand,
				vertexShader:`
				varying vec3 fNormal;
				varying vec3 fPosition;
				varying vec2 fUv;

				void main()
				{
					fNormal = normalize(normalMatrix * normal);
					fPosition =(modelViewMatrix * vec4(position,1.0)).xyz;
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
    scene.add(objects["hand"]);	
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.setSize( window.innerWidth, window.innerHeight );

}


function animate() {

    requestAnimationFrame( animate );

    const delta = clock.getDelta()
    const elapsedTime = clock.getElapsedTime();

    if( resourceLoaded == false ){
	//requestAnimationFrame(animate)
	//loadingScreen.box.rotation.y -= 0.005 
		return; // Stop the function here.
	}

    
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
    //controls.update(elapsed*0.001)

    renderer.render( scene, camera );
    labelRenderer.render( scene, camera );

}

function keyDown(event){
    keyboard[event.keyCode] = true;
}

function keyUp(event){
    keyboard[event.keyCode] = false;
}  
window.addEventListener('keydown', keyDown)
window.addEventListener('keyup', keyUp)

//

