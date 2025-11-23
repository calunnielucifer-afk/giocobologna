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
  
  // Touch controls per mobile
  let joystickActive = false;
  let joystickVector = { x: 0, y: 0 };
  let touchStartPos = { x: 0, y: 0 };
  let joystickHandle = null;

  // Inizializza la scena three.js
  function initScene() {
    console.log('Inizializzazione scena Serena Open World...');

    // Scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Cielo azzurro
    scene.fog = new THREE.Fog(0x87CEEB, 10, 100);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 5); // Più vicina a Serena

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
      canvas: document.getElementById('openworldCanv'), 
      antialias: true,
      alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

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

    // Controlli tastiera e touch
    setupControls();

    // Setup touch joystick per mobile
    setupTouchJoystick();

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

  function setupTouchJoystick() {
    const joystickContainer = document.querySelector('.joystick-container');
    const joystickBase = document.querySelector('.joystick-base');
    joystickHandle = document.querySelector('.joystick-handle');
    
    if (!joystickContainer || !joystickHandle) return;
    
    // Touch events
    joystickBase.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Mouse events per testing su desktop
    joystickBase.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.target.getBoundingClientRect();
    touchStartPos.x = touch.clientX - rect.left - rect.width / 2;
    touchStartPos.y = touch.clientY - rect.top - rect.height / 2;
    joystickActive = true;
  }
  
  function handleTouchMove(e) {
    if (!joystickActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const joystickBase = document.querySelector('.joystick-base');
    const rect = joystickBase.getBoundingClientRect();
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 30;
    
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }
    
    joystickHandle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    joystickVector.x = deltaX / maxDistance;
    joystickVector.y = -deltaY / maxDistance; // Invert Y per coordinate 3D
    
    // Aggiorna controlli movimento
    moveForward = joystickVector.y > 0.3;
    moveBackward = joystickVector.y < -0.3;
    moveRight = joystickVector.x > 0.3;
    moveLeft = joystickVector.x < -0.3;
  }
  
  function handleTouchEnd(e) {
    if (!joystickActive) return;
    e.preventDefault();
    
    joystickActive = false;
    joystickVector.x = 0;
    joystickVector.y = 0;
    
    if (joystickHandle) {
      joystickHandle.style.transform = 'translate(0, 0)';
    }
    
    // Resetta controlli movimento
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
  }
  
  // Mouse events per testing
  function handleMouseDown(e) {
    const rect = e.target.getBoundingClientRect();
    touchStartPos.x = e.clientX - rect.left - rect.width / 2;
    touchStartPos.y = e.clientY - rect.top - rect.height / 2;
    joystickActive = true;
  }
  
  function handleMouseMove(e) {
    if (!joystickActive) return;
    
    const joystickBase = document.querySelector('.joystick-base');
    const rect = joystickBase.getBoundingClientRect();
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = e.clientX - centerX;
    let deltaY = e.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 30;
    
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }
    
    joystickHandle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    joystickVector.x = deltaX / maxDistance;
    joystickVector.y = -deltaY / maxDistance;
    
    moveForward = joystickVector.y > 0.3;
    moveBackward = joystickVector.y < -0.3;
    moveRight = joystickVector.x > 0.3;
    moveLeft = joystickVector.x < -0.3;
  }
  
  function handleMouseUp(e) {
    if (!joystickActive) return;
    
    joystickActive = false;
    joystickVector.x = 0;
    joystickVector.y = 0;
    
    if (joystickHandle) {
      joystickHandle.style.transform = 'translate(0, 0)';
    }
    
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
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
      camera.position.z = serenaModel.position.z + 5; // Più vicina
      camera.position.y = serenaModel.position.y + 3; // Altezza migliore
      camera.lookAt(serenaModel.position);
    }

    // Animazioni
    if (mixer) {
      // Aggiungi animazione di camminata base se Serena si muove
      if (moveForward || moveBackward || moveLeft || moveRight) {
        // Oscillazione leggera per simulare camminata
        serenaModel.rotation.y += Math.sin(Date.now() * 0.005) * 0.02;
      }
      mixer.update(clock.getDelta());
    }

    // Renderizza sempre la scena
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
