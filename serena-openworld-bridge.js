// Bridge per Serena Open World - Scena three.js semplice con controlli WASD
(function() {
  if (typeof window === 'undefined') return;

  let scene, camera, renderer, serenaModel = null;
  let mixer = null;
  let clock = new THREE.Clock();
  let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
  let prevTime = performance.now();
  let velocity = new THREE.Vector3();
  let direction = new THREE.Vector3();

  // Inizializza la scena three.js
  function initScene() {
    console.log('Inizializzazione scena Serena Open World...');

    // Scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Cielo azzurro
    scene.fog = new THREE.Fog(0x87CEEB, 10, 100);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('openworldCanv'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Terreno
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x3a5f3a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Alberi semplici
    for (let i = 0; i < 20; i++) {
      const tree = createTree();
      tree.position.set(
        (Math.random() - 0.5) * 100,
        0,
        (Math.random() - 0.5) * 100
      );
      scene.add(tree);
    }

    // Controlli tastiera
    setupControls();

    // Carica Serena
    loadSerena();

    // Loop di rendering
    animate();

    console.log('Scena inizializzata con successo!');
  }

  function createTree() {
    const group = new THREE.Group();
    
    // Tronco
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 4;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Fogliame
    const foliageGeometry = new THREE.SphereGeometry(4);
    const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 8;
    foliage.castShadow = true;
    group.add(foliage);
    
    return group;
  }

  function loadSerena() {
    console.log('Caricamento modello FBX di Serena...');
    
    const fbxLoader = new THREE.FBXLoader();
    fbxLoader.load(
      'openworld/modelpg/Lady in red dress/Lady in red dress.fbx',
      function(object) {
        serenaModel = object;
        object.scale.set(0.01, 0.01, 0.01);
        object.position.set(0, 0.5, 0);
        scene.add(object);

        // Log dei mesh
        console.log('Mesh nel modello Serena:');
        object.traverse(function(child) {
          if (child.isMesh) {
            console.log('Mesh:', child.name);
          }
        });

        // Applica texture
        applyTexturesToModel(object);

        // Animazioni
        mixer = new THREE.AnimationMixer(object);
        if (object.animations.length > 0) {
          const action = mixer.clipAction(object.animations[0]);
          action.play();
        }

        console.log('Serena caricata con successo!');
      },
      function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% caricato');
      },
      function(error) {
        console.error('Errore caricamento FBX:', error);
      }
    );
  }

  function applyTexturesToModel(model) {
    const textureLoader = new THREE.TextureLoader();
    const basePath = 'openworld/modelpg/Lady in red dress/textures/';

    model.traverse(function(child) {
      if (child.isMesh) {
        const name = child.name.toLowerCase();
        let material = null;

        console.log(`Applicando texture a: ${child.name}`);

        // Abito
        if (name.includes('miao_new_suit')) {
          const diffuse = textureLoader.load(basePath + 'QiPao_MetallicAlpha.png');
          material = new THREE.MeshStandardMaterial({ map: diffuse, skinning: true });
        }
        // Pelle
        else if (name.includes('cc_base_body')) {
          const diffuse = textureLoader.load(basePath + 'Std_Skin_Body_MetallicAlpha.png');
          material = new THREE.MeshStandardMaterial({ map: diffuse, skinning: true });
        }
        // Capelli
        else if (name.includes('long_bangs') || name.includes('messy_high')) {
          const diffuse = textureLoader.load(basePath + 'Hair_Transparency_MetallicAlpha.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse, 
            transparent: true, 
            alphaTest: 0.5,
            skinning: true 
          });
        }
        // Occhi
        else if (name.includes('cc_base_eye')) {
          material = new THREE.MeshStandardMaterial({ color: 0xffffff, skinning: true });
        }
        // Scarpe
        else if (name.includes('high_heels')) {
          material = new THREE.MeshStandardMaterial({ color: 0x000000, skinning: true });
        }
        // Default rosa
        else {
          material = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, skinning: true });
        }

        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  function setupControls() {
    document.addEventListener('keydown', function(event) {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight = true;
          break;
      }
    });

    document.addEventListener('keyup', function(event) {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight = false;
          break;
      }
    });

    // Window resize
    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // Movimento WASD
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

    if (serenaModel) {
      serenaModel.position.x += velocity.x * delta;
      serenaModel.position.z += velocity.z * delta;
      
      // Camera segue Serena
      camera.position.x = serenaModel.position.x;
      camera.position.z = serenaModel.position.z + 10;
      camera.position.y = serenaModel.position.y + 5;
      camera.lookAt(serenaModel.position);
    }

    // Animazioni
    if (mixer) mixer.update(clock.getDelta());

    renderer.render(scene, camera);
    prevTime = time;
  }

  // Inizializza quando la pagina è pronta
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
  } else {
    initScene();
  }

  console.log('Bridge Serena Open World inizializzato.');
})();
