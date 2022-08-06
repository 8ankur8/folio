
import './style/main.css'
import * as THREE from 'three'
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Octree } from 'three/examples/jsm/math/Octree.js'
import { Capsule } from 'three/examples/jsm/math/Capsule.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { XYZLoader } from 'three/examples/jsm/loaders/XYZLoader.js'
import grassVertexShader from './shaders/grass/vertex.glsl'
import grassFragmentShader from './shaders/grass/fragment.glsl'
import particleVertex from './shaders/particle/vertex.glsl'
import particleFragment from './shaders/particle/fragment.glsl'
import * as dat from 'dat.gui'
import { AxesHelper, Mesh, Vector3 } from 'three';
import { nextPowerOfTwo } from 'three/src/math/MathUtils';


let container 
let camera, scene, renderer,particleAbsorb,player
let clock

let mixer
let playerOnFloor = false
let helix = []
var objects = {}

const playerCollider = new Capsule( new THREE.Vector3( 0, 0.1,20 ), new THREE.Vector3( 0, 1.75, 20 ), 0.15 )
const playerVelocity = new THREE.Vector3()
const playerDirection = new THREE.Vector3()

const keyStates = {}

var uniforms ={
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
    }
             
}

var models = {
	world: {
		obj:'/model/holloworld.glb',
		mesh: null,
		animation:null
	},
	hand: {
		obj:'/model/static.glb',
		mesh: null
		
	}
		
}


//DEBUG GUI
const gui = new dat.GUI()

// * LOADING SCREEN

//const enterButton = document.getElementById( 'enterButton' );
//enterButton.addEventListener( 'click', init );


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
let matcapMaterial
const worldOctree = new Octree()

init()
function init() {
    
    const overlay = document.getElementById( 'overlay' );
	overlay.remove();

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    //loading
    loadingManager = new THREE.LoadingManager()

    loadingManager.onProgress = function(item, loaded, total){
		console.log(item, loaded, total);
	}
	
	loadingManager.onLoad = function(){
		console.log("loaded all resources");
		resourceLoaded = true;
		onResourceLoaded()
	}


    // camera

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 120 );
    camera.position.set(0,1.8,25)
    camera.rotation.order = 'YXZ'

    // scene
    clock = new THREE.Clock()

    scene = new THREE.Scene();
    scene.background = new THREE.Color().setHSL( 0.9, 0.4, 0.01 );
    scene.fog = new THREE.Fog( 0xffffff, 1, 250);

    //helpers
    
    
    
    // texture
    const textureLoader = new THREE.TextureLoader(loadingManager)
    const matcapTexture = textureLoader.load('/images/matcap1.png')

    //raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    //document.addEventListener( 'mousemove', onDocumentMouseMove );
    
    // sound

    // audio loader
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

    // * IMPORT MODEL with ANIMATION
         
    // world


    // ----------------particles---------------


    const pointstoupdate = []
 
    let pointMaterial 

    particleAbsorb = new THREE.Group()
    player = new THREE.Group()
    scene.add(particleAbsorb , player)

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
            positions[i3+1] = (Math.random() - 0.25)  * 1.25//* camera.position.y
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

    pointGeometry(300)


    //materials
    
    const matcapMaterial =  new THREE.MeshMatcapMaterial({matcap:matcapTexture})
    matcapMaterial.wireframe = false

    // gltf
   
    const loader = new GLTFLoader(loadingManager)
    
    for (var _object in models){
		(function(object){
			
			loader.load(models[object].obj, function(gltf)
			{
                worldOctree.fromGraphNode(gltf.scene)

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
    
    //XYZ
    

    const xyzLoader = new XYZLoader(loadingManager)
	xyzLoader.load( '/model/helix_201.xyz', function ( geometry ) {

		geometry.center()
        //geometry.scale.set(10.0,10.0,10.0)
		//const vertexColors = ( geometry.hasAttribute( 'color' ) === true )

		const material = new THREE.PointsMaterial( { size: 0.25 ,alphaMap : matcapTexture, transparent:true} )

		helix[0] = new THREE.Points( geometry, material )
        helix[1] = new THREE.Points( geometry, material )
        helix[2] = new THREE.Points( geometry, material )
        helix[3] = new THREE.Points( geometry, material )

        helix[0].scale.set(30,30,30)
        helix[1].scale.set(30,-30,30)
        helix[2].scale.set(-30,30,30)
        helix[3].scale.set(30,30,30)

        helix[1].rotation.y = Math.PI/2
        helix[2].rotation.x = - Math.PI
        helix[3].rotation.set(Math.PI/2,-Math.PI/2,Math.PI/2)
        
		scene.add(helix[0],helix[1])
        scene.add(helix[2] ,helix[3])

		} )
    
      
    //seasonal world

    const grassGeometry= [
        [new THREE.PlaneBufferGeometry(2,2,200,200),8],
        [new THREE.PlaneBufferGeometry(2,2,100,100),12],
        [new THREE.PlaneBufferGeometry(2,2,50,50),25],
        [new THREE.PlaneBufferGeometry(2,2,25,25),50],
        [new THREE.PlaneBufferGeometry(2,2),100]
    ]
       
    const summerWorld = new THREE.Group()
    const autumeWorld = new THREE.Group()
    const rainyWorld = new THREE.Group()
    const winterWorld = new THREE.Group()
    
    scene.add(summerWorld,autumeWorld,rainyWorld,winterWorld)
    
    //summerSeason

    const summerMaterial = new THREE.ShaderMaterial({
            vertexShader:grassVertexShader,
            fragmentShader:grassFragmentShader,
            wireframe:false,
            uniforms:uniforms.summer,
            transparent:true
            //side:THREE.DoubleSide            
        })
            
    for ( let j = 0; j < 200; j ++ ){
    
        const lod  = new THREE.LOD()

        for(let i=0; i < grassGeometry.length ;i++)
            {
                const mesh = new THREE.Mesh( grassGeometry[i][0], summerMaterial );
                mesh.scale.x = mesh.scale.y = 2.0 + 2.0 * Math.random()
                mesh.rotation.x = - Math.PI/2;
                mesh.rotation.z = Math.random() * Math.PI;
                mesh.updateMatrix()
                mesh.matrixAutoUpdate = false
                lod.addLevel( mesh, grassGeometry[ i ][ 1 ] )             
            }
            lod.position.set(500 *(Math.pow(Math.random() ,2.5)),0.0,500 *(Math.pow(Math.random() , 2.5)))
            lod.updateMatrix()
            lod.matrixAutoUpdate = false
            summerWorld.add(lod)
            summerWorld.rotation.y = -Math.PI/4

    }    
    //winterSeason
    
    const winterMaterial = new THREE.ShaderMaterial({
            vertexShader:grassVertexShader,
            fragmentShader:grassFragmentShader,
            wireframe:false,
            uniforms:uniforms.winter,
            transparent:true
            //side:THREE.DoubleSide            
        })
            
 
    for ( let j = 0; j < 300; j ++ ){
    
        const lod  = new THREE.LOD()

        for(let i=0; i < grassGeometry.length ;i++)
            {
                const mesh = new THREE.Mesh( grassGeometry[i][0], winterMaterial );
                mesh.scale.x = mesh.scale.y = 2.0 + 3.0 * Math.random()
                mesh.rotation.x = - Math.PI/2;
                mesh.rotation.z = Math.random() * Math.PI;
                mesh.updateMatrix()
                mesh.matrixAutoUpdate = false
                lod.addLevel( mesh, grassGeometry[ i ][ 1] )             
            }
            lod.position.set(500 *(Math.pow(Math.random() , 2.5)),0.0,500 *(Math.pow(Math.random() , 2.5)))
            lod.updateMatrix()
            lod.matrixAutoUpdate = false
            winterWorld.add(lod)
            winterWorld.rotation.y = Math.PI/4 

    } 
        
    //autumeSeason

    const autumeMaterial = new THREE.ShaderMaterial({
            vertexShader:grassVertexShader,
            fragmentShader:grassFragmentShader,
            wireframe:false,
            uniforms:uniforms.autume,
            transparent:true
            //side:THREE.DoubleSide            
        })
            
 
   for ( let j = 0; j < 300; j ++ ){
    
        const lod  = new THREE.LOD()

        for(let i=0; i < grassGeometry.length ;i++)
            {
                const mesh = new THREE.Mesh( grassGeometry[i][0], autumeMaterial );
                mesh.scale.x = mesh.scale.y = 2.0 + 3.0 * Math.random()
                mesh.rotation.x = - Math.PI/2;
                mesh.rotation.z = Math.random() * Math.PI;
                mesh.updateMatrix()
                mesh.matrixAutoUpdate = false
                lod.addLevel( mesh, grassGeometry[ i ][ 1 ] )             
            }
            lod.position.set(500 *(Math.pow(Math.random() , 2.5)),0.0,500 *(Math.pow(Math.random(), 2.5)))
            lod.updateMatrix()
            lod.matrixAutoUpdate = false
            autumeWorld.add(lod)
            autumeWorld.rotation.y = -Math.PI * 0.75
    } 
        
    //rainySeason

    const rainyMaterial = new THREE.ShaderMaterial({
            vertexShader:grassVertexShader,
            fragmentShader:grassFragmentShader,
            wireframe:false,
            uniforms:uniforms.rainy,
            transparent:true,
            depthWrite :false
            //side:THREE.DoubleSide            
        })
            
 
    for ( let j = 0; j < 300; j ++ ){
    
        const lod  = new THREE.LOD()

        for(let i=0; i < grassGeometry.length ;i++)
            {
                const mesh = new THREE.Mesh( grassGeometry[i][0], rainyMaterial );
                mesh.scale.x = mesh.scale.y = 2.0 + 3.0 * Math.random()
                mesh.rotation.x = - Math.PI/2;
                mesh.rotation.z = Math.random() * Math.PI;
                mesh.updateMatrix()
                mesh.matrixAutoUpdate = false
                lod.addLevel( mesh, grassGeometry[ i ][ 1 ] )             
            }
            lod.position.set(500 *(Math.pow(Math.random() , 2.5)),0.0,500 *(Math.pow(Math.random() , 2.5)))
            lod.updateMatrix()
            lod.matrixAutoUpdate = false
            rainyWorld.add(lod)
            rainyWorld.rotation.y = Math.PI * 0.75

    } 
 
    

    // renderer

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( Math.min(window.devicePixelRatio, 2));
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild( renderer.domElement );

    //initComputeRenderer();
    /*
    controls = new FirstPersonControls( camera, renderer.domElement );

    controls.movementSpeed = 7.5;  
    controls.lookSpeed = 0.03;
    controls.noFly = true;
    //controls.autoForward = false;
    controls.lookVertical = false;
    
    //controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping =true
    */
    
        

    // events

    //WINDOWS FUNCTIONS
    window.addEventListener( 'resize', onWindowResize );

    animate()
 
}


//
    //fps mode
    //
 
    document.addEventListener( 'keydown', ( event ) => {

        keyStates[ event.code ] = true
    
        } )
    
    document.addEventListener( 'keyup', ( event ) => {
    
        keyStates[ event.code ] = false
    
        } )
    
    document.addEventListener( 'dblclick', () => {
    
        if(!document.fullscreenElement)
        {
        container.requestFullscreen()
        document.body.requestPointerLock()
        }
        else
        {
        document.exitFullscreen()
        }
    
    } )
    
    document.body.addEventListener( 'mousemove', ( event ) => {
    
        if ( document.pointerLockElement === document.body ) {
    
            camera.rotation.y -= event.movementX / 500
            camera.rotation.x -= event.movementY / 500
    
            }
    
        })

    function playerCollitions() {

            const result = worldOctree.capsuleIntersect( playerCollider )
        
            playerOnFloor = false

            if ( result ) {
                console.log(playerOnFloor)
                playerOnFloor = result.normal.y > 0
                    if ( ! playerOnFloor ) {
                    console.log(playerOnFloor)
                playerVelocity.addScaledVector( result.normal, - result.normal.dot( playerVelocity ) )
        
                }
        
            playerCollider.translate( result.normal.multiplyScalar( result.depth ) )
        
        }
        
    } 
    
    function updatePlayer( deltaTime ) {

        if ( playerOnFloor ) {
    
            const damping = Math.exp( - 3 * deltaTime ) - 1
            playerVelocity.addScaledVector( playerVelocity, damping )
    
        } else {
    
            playerVelocity.y -= 1.5 * deltaTime
    
        }
    
        const deltaPosition = playerVelocity.clone().multiplyScalar( deltaTime ) 
        playerCollider.translate( deltaPosition )
    
        playerCollitions()
    
        camera.position.copy( playerCollider.end )    
    }

    function getForwardVector() {

        camera.getWorldDirection( playerDirection )
        playerDirection.y = 0
        playerDirection.normalize()
        return playerDirection
    
    }

    function getSideVector() {

        camera.getWorldDirection( playerDirection )
        playerDirection.y = 0
        playerDirection.normalize()
        playerDirection.cross( camera.up )
        return playerDirection
    
    }

    function controls( deltaTime ) {

        const speed = 7.5
    
        if ( playerOnFloor ) {
    
            if ( keyStates[ 'KeyW' ] ) {
    
                playerVelocity.add( getForwardVector().multiplyScalar( speed * deltaTime ) );
    
            }
    
            if ( keyStates[ 'KeyS' ] ) {
    
                playerVelocity.add( getForwardVector().multiplyScalar( - speed * deltaTime ) );
    
            }
    
            if ( keyStates[ 'KeyA' ] ) {
    
                playerVelocity.add( getSideVector().multiplyScalar( - speed * deltaTime ) );
    
            }
    
            if ( keyStates[ 'KeyD' ] ) {
    
                playerVelocity.add( getSideVector().multiplyScalar( speed * deltaTime ) );
    
            }
    
            if ( keyStates[ 'Space' ] ) {
    
                playerVelocity.y =2.5
    
            }
    
        }
    
    }


function onResourceLoaded(){
	
	// Clone models into objects.
	
	objects["world"] = models.world.mesh.clone()
	objects["hand"] = models.hand.mesh.clone()
	
	
	// Reposition individual meshes, then add meshes to scene
	objects["world"].position.set(0, 0.002 ,0);
	objects["world"].rotation.set(0,Math.PI,0)
	scene.add(objects["world"])
	objects["world"].traverse((child) => {
                
		child.material = matcapMaterial
	   
	})
	
	mixer = new THREE.AnimationMixer(objects["world"])
        for(let i=0;i < models.world.animation.length ;i++)
			{
               	const action = mixer.clipAction(models.world.animation[i]) 
               	action.play()
			} 
	
	
	objects["hand"].scale.set(1.5, 1.5, 1.5)
	scene.add(objects["hand"]);
	objects["hand"].traverse((_child) => {
                
		_child.material = new THREE.ShaderMaterial({
			vertexShader:`
			void main()
			{
				gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0) ;
				//gl_Position =  vec4(position.x - 0.8,position.y ,position.z,2.0);
			}
			`,
			fragmentShader: `
			void main()
			{
				gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
			}
			`,
			transparent:true,
			opacity : 0.5,
			depthWrite:true
		})
	   
	})
	
}


function onWindowResize() {

    renderer.setSize( window.innerWidth, window.innerHeight );

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

}

function animate() {

    
    requestAnimationFrame( animate );
    
    render();

}

function render() {

    const delta = clock.getDelta();

    const elapsedTime = clock.getElapsedTime()

    particleAbsorb.position.copy(camera.position)
    if(particleAbsorb.children[1])
       particleAbsorb.children[1].lookAt(camera.rotation)
       
    
    //grassMaterial.uniforms.uTime.value = elapsedTime
    
    //
    //fps update controls
    //
    for ( let i = 0 ; i < 3 ; i ++ ) 
    { 
        controls( delta )
        updatePlayer( delta)
    }

    
    
    uniforms.summer['uTime'].value += delta
    uniforms.winter['uTime'].value += delta
    uniforms.autume['uTime'].value += delta
    uniforms.rainy['uTime'].value += delta
    uniforms.particle['uTime'].value += delta

    if(mixer) mixer.update(delta);
   

    for( const helixs of helix) helixs.rotation.z += delta * 0.1

    
    renderer.render( scene, camera );

}

//gui.hide(true)

/**
 * Sizes
 
const sizes = {}
sizes.width = window.innerWidth
sizes.height = window.innerHeight

window.addEventListener('resize', () =>
{
    // Save sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
})
*/



/**
 * Loop

const loop = () =>
{
    const elapsedTime = clock.getElapsedTime()
    // Update
    cube.rotation.y= 0.05 *  elapsedTime 
    // Render
    renderer.render(scene, camera)

    // Keep looping
    window.requestAnimationFrame(loop)
}
 */

