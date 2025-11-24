// Bridge per Serena Open World - Scena three.js semplice con controlli WASD
(function() {
  if (typeof window === 'undefined') return;

  // Variabili globali
  let scene, camera, renderer;
  let serenaModel;
  let mixer;
  let clock = new THREE.Clock();
  let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
  let velocity = new THREE.Vector3();
  let direction = new THREE.Vector3();
  let joystickActive = false;
  let joystickVector = new THREE.Vector2();
  let touchStartPos = new THREE.Vector2();
  let joystickHandle;
  let lookTouchActive = false;
  let currentLookTouch = null;
  let lookTouchStart = new THREE.Vector2();
  
  // Animazioni Mixamo
  let walkAnimation;
  let walkAction;
  let idleAction;
  let currentAction;

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

    // Tavola da poker
    createPokerTable();
    
    // Controlli tastiera e touch
    setupControls();

    // Setup touch joystick per mobile
    setupTouchJoystick();

    // Carica Claire
    loadClaire();

    // Loop di rendering
    animate();

    console.log('Scena inizializzata con successo!');
  }

  function createPokerTable() {
    // Crea un piano per la tavola da poker
    const tableGeometry = new THREE.PlaneGeometry(8, 4);
    const tableMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x0d5f0d, // Verde poker
      side: THREE.DoubleSide
    });
    const pokerTable = new THREE.Mesh(tableGeometry, tableMaterial);
    
    // Posiziona la tavola più vicina all'area di spawn
    pokerTable.rotation.x = -Math.PI / 2;
    pokerTable.position.set(5, 0.01, 5); // più vicina e visibile
    
    // Aggiungi bordi in legno più alti per visibilità
    const borderGeometry = new THREE.BoxGeometry(8.2, 0.3, 4.2);
    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.set(5, 0.15, 5);
    
    // Aggiungi un indicatore luminoso sopra la tavola
    const indicatorGeometry = new THREE.BoxGeometry(1, 3, 1);
    const indicatorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(5, 2, 5);
    
    // Aggiungi luce sopra la tavola per renderla più visibile
    const tableLight = new THREE.PointLight(0xffd700, 1, 10);
    tableLight.position.set(5, 3, 5);
    scene.add(tableLight);
    
    // Rendi la tavola cliccabile
    pokerTable.userData = { isPokerTable: true, clickable: true };
    border.userData = { isPokerTable: true, clickable: true };
    indicator.userData = { isPokerTable: true, clickable: true };
    
    scene.add(pokerTable);
    scene.add(border);
    scene.add(indicator);
    
    // Aggiungi un testo 3D sopra la tavola
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = '#000000';
    context.fillRect(0, 0, 512, 128);
    context.fillStyle = '#ffffff';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.fillText('🎰 POKER 🎰', 256, 75);
    
    const texture = new THREE.CanvasTexture(canvas);
    const signGeometry = new THREE.PlaneGeometry(4, 1);
    const signMaterial = new THREE.MeshBasicMaterial({ 
      map: texture,
      side: THREE.DoubleSide
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(5, 3.5, 5);
    sign.rotation.y = Math.PI;
    scene.add(sign);
    
    console.log('Tavola da poker creata a posizione (5, 0, 5)');
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

  function createFallbackAnimations() {
    console.log('Creazione animazioni fallback immediate...');
    
    // Animazione idle semplice (fermo)
    const idleTracks = [];
    const idleDuration = 1.0;
    const idleTimes = [0, idleDuration];
    
    // Crea animazione idle vuota (nessun movimento)
    idleAnimation = new THREE.AnimationClip('Idle', idleDuration, idleTracks);
    idleAction = mixer.clipAction(idleAnimation);
    idleAction.setEffectiveWeight(1);
    idleAction.setEffectiveTimeScale(1);
    
    idleAction.play();
    currentAction = idleAction;
    
    console.log('Animazioni fallback create e attive');
  }

  function loadClaire() {
    console.log('Caricamento modello FBX di Claire...');
    
    const fbxLoader = new THREE.FBXLoader();
    fbxLoader.load(
      'openworld/modelpg/Lady_in_red_dress/claire@Walking.fbx',
      function(object) {
        serenaModel = object;
        
        // Scala appropriata per il mondo
        object.scale.set(0.01, 0.01, 0.01);
        
        // Posiziona Serena esattamente a terra (y = 0)
        object.position.set(0, 0, 0);
        
        // Correggi l'orientamento del modello
        object.rotation.x = 0; // Reset rotazione X
        object.rotation.y = Math.PI; // Girata verso la camera
        object.rotation.z = 0; // Reset rotazione Z
        
        // Assicurati che tutti i mesh siano orientati correttamente
        object.traverse(function(child) {
          if (child.isMesh) {
            child.rotation.x = 0;
            child.rotation.y = 0;
            child.rotation.z = 0;
            
            // Abilita cast shadow e receive shadow
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Log per debug
            console.log('Mesh:', child.name, 'Position:', child.position);
          }
        });
        
        // Calcola il bounding box per centrare il modello a terra
        const box = new THREE.Box3().setFromObject(object);
        const height = box.max.y - box.min.y;
        
        // Posiziona il modello così che i piedi toccano terra
        // FIX per Claire: aggiungi offset extra per evitare che sia sepolta
        object.position.y = (-box.min.y * object.scale.y) + 0.5;
        
        console.log('Altezza modello Claire:', height, 'Bounding box min Y:', box.min.y, 'Posizione Y:', object.position.y);
        
        scene.add(object);

        // Log dei mesh (rimosso bone logging per ridurre spam)
        object.traverse(function(child) {
          if (child.isMesh) {
            console.log('Mesh:', child.name, 'Vertices:', child.geometry ? child.geometry.attributes.position.count : 'N/A');
          }
        });

        // Applica texture
        applyTexturesToModel(object);

        // Animazioni con setup corretto
        mixer = new THREE.AnimationMixer(object);
        
        // Controlla se il modello contiene già animazioni
        if (object.animations.length > 0) {
          console.log('Animazioni trovate nel modello Claire:', object.animations.length);
          walkAnimation = object.animations[0];
          console.log('Walk animation name:', walkAnimation.name);
          console.log('Walk animation duration:', walkAnimation.duration);
          
          // Crea l'azione di camminata
          walkAction = mixer.clipAction(walkAnimation);
          walkAction.setEffectiveWeight(1);
          walkAction.setEffectiveTimeScale(1);
          walkAction.clampWhenFinished = true;
          
          console.log('Animazione Claire setup completata!');
        } else {
          console.log('Nessuna animazione nel modello, uso fallback');
        }
        
        // Crea subito animazioni di fallback per assicurarsi che funzionino
        createFallbackAnimations();

        console.log('Claire caricata con successo!');
      },
      function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% caricato');
      },
      function(error) {
        console.error('Errore caricamento FBX:', error);
        console.log('Tentativo caricamento DAE come fallback...');
        
        // Fallback: prova con DAE
        const colladaLoader = new THREE.ColladaLoader();
        colladaLoader.load(
          'openworld/modelpg/Lady_in_red_dress/claire.dae',
          function(collada) {
            serenaModel = collada.scene;
            
            // Scala appropriata per il mondo
            serenaModel.scale.set(0.01, 0.01, 0.01);
            
            // Posiziona a terra
            serenaModel.position.set(0, 0, 0);
            
            // Correggi orientamento
            serenaModel.rotation.x = 0;
            serenaModel.rotation.y = Math.PI;
            serenaModel.rotation.z = 0;
            
            // Calcola bounding box
            const box = new THREE.Box3().setFromObject(serenaModel);
            // FIX per Claire DAE: aggiungi offset extra
            serenaModel.position.y = (-box.min.y * serenaModel.scale.y) + 0.5;
            
            // Setup ombre
            serenaModel.traverse(function(child) {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            
            scene.add(serenaModel);
            
            // Animazioni fallback
            mixer = new THREE.AnimationMixer(serenaModel);
            createFallbackAnimations();
            
            console.log('Claire DAE caricata con successo!');
          },
          function(error) {
            console.error('Errore anche con DAE:', error);
          }
        );
      }
    );
  }

  function applyTexturesToModel(model) {
    const textureLoader = new THREE.TextureLoader();
    const basePath = 'openworld/modelpg/Lady_in_red_dress/textures/';

    model.traverse(function(child) {
      if (child.isMesh) {
        const name = child.name.toLowerCase();
        let material = null;

        console.log(`Applicando texture a: ${child.name}`);

        // Abito (Claire)
        if (name.includes('miao_new_suit') || name.includes('suit') || name.includes('dress')) {
          console.log('Caricando texture abito Claire...');
          const diffuse = textureLoader.load(basePath + 'Girl01_diffuse.jpg');
          const specular = textureLoader.load(basePath + 'Girl01_spec.jpg');
          const normal = textureLoader.load(basePath + 'Girl01_normal.jpg');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse, 
            roughnessMap: specular, // specularMap non esiste
            normalMap: normal,
            skinning: true 
          });
          console.log('Texture abito Claire applicate');
        }
        // Corpo Claire
        else if (name.includes('girl_body_geo')) {
          console.log('Caricando texture corpo Claire...');
          const diffuse = textureLoader.load(basePath + 'Girl01_FacialAnimMap.png');
          const normal = textureLoader.load(basePath + 'Girl01_normal.jpg');
          const specular = textureLoader.load(basePath + 'Girl01_spec.jpg');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse, 
            roughnessMap: specular,
            normalMap: normal,
            skinning: true 
          });
          console.log('Texture corpo Claire applicate');
        }
        // Occhi Claire
        else if (name.includes('girl_eyes_geo')) {
          console.log('Caricando texture occhi Claire...');
          const diffuse = textureLoader.load(basePath + 'Girl01_FacialAnimMap.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            skinning: true 
          });
          console.log('Texture occhi Claire applicate');
        }
        // Bocca Claire
        else if (name.includes('girl_mouth_geo')) {
          console.log('Caricando texture bocca Claire...');
          const diffuse = textureLoader.load(basePath + 'Girl01_FacialAnimMap.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            skinning: true 
          });
          console.log('Texture bocca Claire applicate');
        }
        // Sopracciglia Claire
        else if (name.includes('girl_brows_geo')) {
          console.log('Caricando texture sopracciglia Claire...');
          const diffuse = textureLoader.load(basePath + 'Girl01_FacialAnimMap.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            skinning: true 
          });
          console.log('Texture sopracciglia Claire applicate');
        }
        // Capelli
        else if (name.includes('long_bangs') || name.includes('messy_high') || name.includes('hair') || name.includes('ponytail')) {
          console.log('Caricando texture capelli...');
          const diffuse = textureLoader.load(basePath + 'Hair_Transparency_Diffuse.jpeg');
          const ao = textureLoader.load(basePath + 'Hair_Transparency_ao.png');
          const metallic = textureLoader.load(basePath + 'Hair_Transparency_metallic.png');
          const roughness = textureLoader.load(basePath + 'Hair_Transparency_roughness.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse, 
            aoMap: ao,
            metalnessMap: metallic,
            roughnessMap: roughness,
            transparent: true, 
            alphaTest: 0.5,
            skinning: true 
          });
          console.log('Texture capelli applicate');
        }
        // Occhi
        else if (name.includes('cc_base_eye')) {
          console.log('Caricando texture occhi...');
          const diffuse = textureLoader.load(basePath + 'Std_Eye_R_Diffuse.png');
          const normal = textureLoader.load(basePath + 'Std_Eye_R_Normal.png');
          const roughness = textureLoader.load(basePath + 'Std_Eye_R_roughness.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            normalMap: normal,
            roughnessMap: roughness,
            skinning: true 
          });
          console.log('Texture occhi applicate');
        }
        // Scarpe
        else if (name.includes('high_heels')) {
          console.log('Caricando texture scarpe...');
          const diffuse = textureLoader.load(basePath + 'High_Heels_Diffuse.jpeg');
          const normal = textureLoader.load(basePath + 'High_Heels_Normal.png');
          const metallic = textureLoader.load(basePath + 'High_Heels_metallic.png');
          const roughness = textureLoader.load(basePath + 'High_Heels_roughness.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            normalMap: normal,
            metalnessMap: metallic,
            roughnessMap: roughness,
            skinning: true 
          });
          console.log('Texture scarpe applicate');
        }
        // Denti superiori
        else if (name.includes('upper_teeth')) {
          console.log('Caricando texture denti superiori...');
          const diffuse = textureLoader.load(basePath + 'Std_Upper_Teeth_Diffuse.png');
          const normal = textureLoader.load(basePath + 'Std_Upper_Teeth_Normal.png');
          const ao = textureLoader.load(basePath + 'Std_Upper_Teeth_GradAO.jpg');
          const roughness = textureLoader.load(basePath + 'Std_Upper_Teeth_roughness.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            normalMap: normal,
            aoMap: ao,
            roughnessMap: roughness,
            skinning: true 
          });
          console.log('Texture denti superiori applicate');
        }
        // Denti inferiori
        else if (name.includes('lower_teeth')) {
          console.log('Caricando texture denti inferiori...');
          const diffuse = textureLoader.load(basePath + 'Std_Lower_Teeth_Diffuse.png');
          const normal = textureLoader.load(basePath + 'Std_Lower_Teeth_Normal.png');
          const ao = textureLoader.load(basePath + 'Std_Lower_Teeth_ao.png');
          const roughness = textureLoader.load(basePath + 'Std_Lower_Teeth_roughness.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            normalMap: normal,
            aoMap: ao,
            roughnessMap: roughness,
            skinning: true 
          });
          console.log('Texture denti inferiori applicate');
        }
        // Lingua
        else if (name.includes('tongue')) {
          console.log('Caricando texture lingua...');
          const diffuse = textureLoader.load(basePath + 'Std_Tongue_Diffuse.png');
          const normal = textureLoader.load(basePath + 'Std_Tongue_Normal.png');
          const ao = textureLoader.load(basePath + 'Std_Tongue_ao.png');
          const roughness = textureLoader.load(basePath + 'Std_Tongue_roughness.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            normalMap: normal,
            aoMap: ao,
            roughnessMap: roughness,
            skinning: true 
          });
          console.log('Texture lingua applicate');
        }
        // Ciglia
        else if (name.includes('eyelash')) {
          console.log('Caricando texture ciglia...');
          const diffuse = textureLoader.load(basePath + 'Std_Eyelash_Diffuse.jpeg');
          const ao = textureLoader.load(basePath + 'Std_Eyelash_ao.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            aoMap: ao,
            transparent: true,
            alphaTest: 0.1,
            skinning: true 
          });
          console.log('Texture ciglia applicate');
        }
        // Unghie
        else if (name.includes('nails')) {
          console.log('Caricando texture unghie...');
          const diffuse = textureLoader.load(basePath + 'Std_Nails_Diffuse.jpeg');
          const normal = textureLoader.load(basePath + 'Std_Nails_Normal.png');
          const ao = textureLoader.load(basePath + 'Std_Nails_ao.png');
          material = new THREE.MeshStandardMaterial({ 
            map: diffuse,
            normalMap: normal,
            aoMap: ao,
            skinning: true 
          });
          console.log('Texture unghie applicate');
        }
        // Fallback generico con texture Girl01 se disponibili
        else {
          console.log(`Mesh non riconosciuta: ${child.name}, uso fallback texture Girl01`);
          try {
            const diffuse = textureLoader.load(basePath + 'Girl01_diffuse.jpg');
            const normal = textureLoader.load(basePath + 'Girl01_normal.jpg');
            const specular = textureLoader.load(basePath + 'Girl01_spec.jpg');
            material = new THREE.MeshStandardMaterial({ 
              map: diffuse,
              normalMap: normal,
              roughnessMap: specular, // specularMap non esiste in MeshStandardMaterial
              skinning: true 
            });
            console.log(`Fallback Girl01 applicato a ${child.name}`);
          } catch (error) {
            console.log(`Fallback Girl01 fallito, uso colore rosa per ${child.name}`);
            material = new THREE.MeshStandardMaterial({ 
              color: 0xFFB6C1, 
              skinning: true 
            });
          }
        }

        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
        console.log(`Material applicato a ${child.name}`);
      }
    });
    console.log('Tutte le texture applicate al modello Serena');
  }

  function setupControls() {
    document.addEventListener('keydown', function(event) {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':  // FIX: W ora è forward (su)
          moveForward = true;
          break;
        case 'ArrowDown':
        case 'KeyS':  // RIMOSSO: S non fa nulla
          // Non fare nulla per S
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft = true;  // Corretto: A = sinistra
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight = true;  // Corretto: D = destra
          break;
      }
    });

    document.addEventListener('keyup', function(event) {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':  // FIX: W ora è forward (su)
          moveForward = false;
          break;
        case 'ArrowDown':
        case 'KeyS':  // RIMOSSO: S non fa nulla
          // Non fare nulla per S
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

    // Mouse look per guardarsi intorno
    let mouseX = 0, mouseY = 0;
    let isMouseDown = false;

    document.addEventListener('mousedown', function(event) {
      if (event.button === 0) { // Solo click sinistro
        isMouseDown = true;
        document.body.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mouseup', function() {
      isMouseDown = false;
      document.body.style.cursor = 'default';
    });

    document.addEventListener('mousemove', function(event) {
      if (isMouseDown) {
        const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const deltaY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        if (serenaModel) {
          // Ruota Serena con il mouse
          serenaModel.rotation.y -= deltaX * 0.005;
          
          // Aggiorna camera per guardarsi intorno
          const cameraAngle = serenaModel.rotation.y;
          const cameraDistance = 5;
          const cameraHeight = 3;
          
          camera.position.x = serenaModel.position.x - Math.sin(cameraAngle) * cameraDistance;
          camera.position.z = serenaModel.position.z - Math.cos(cameraAngle) * cameraDistance;
          camera.position.y = serenaModel.position.y + cameraHeight;
          camera.lookAt(serenaModel.position);
        }
      }
    });

    // Touch multi-touch per mobile - joystick + look
    document.addEventListener('touchstart', function(event) {
      // Gestisce ogni tocco separatamente
      for (let i = 0; i < event.touches.length; i++) {
        const touch = event.touches[i];
        const joystickBase = document.querySelector('.joystick-base');
        const joystickRect = joystickBase ? joystickBase.getBoundingClientRect() : null;
        
        // Verifica se il tocco è nell'area del joystick
        const isJoystickTouch = joystickRect && 
          touch.clientX >= joystickRect.left && 
          touch.clientX <= joystickRect.right &&
          touch.clientY >= joystickRect.top && 
          touch.clientY <= joystickRect.bottom;
        
        if (isJoystickTouch) {
          // Questo tocco gestisce il joystick (già gestito da handleTouchStart)
        } else if (!lookTouchActive && !currentLookTouch) {
          // Questo tocco gestisce il look
          lookTouchActive = true;
          currentLookTouch = touch.identifier;
          lookTouchStart.x = touch.clientX;
          lookTouchStart.y = touch.clientY;
        }
      }
    });

    document.addEventListener('touchmove', function(event) {
      event.preventDefault();
      
      // Gestisce il movimento per look
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        if (touch.identifier === currentLookTouch && lookTouchActive) {
          const deltaX = touch.clientX - lookTouchStart.x;
          const deltaY = touch.clientY - lookTouchStart.y;
          
          if (serenaModel) {
            // Ruota Serena orizzontalmente con lo slide orizzontale
            serenaModel.rotation.y -= deltaX * 0.01;
            
            // Aggiorna camera per guardarsi intorno
            const cameraAngle = serenaModel.rotation.y;
            const cameraDistance = 5;
            const cameraHeight = 3;
            
            camera.position.x = serenaModel.position.x - Math.sin(cameraAngle) * cameraDistance;
            camera.position.z = serenaModel.position.z - Math.cos(cameraAngle) * cameraDistance;
            camera.position.y = serenaModel.position.y + cameraHeight;
            camera.lookAt(serenaModel.position);
          }
          
          // Aggiorna il punto di partenza per movimento continuo
          lookTouchStart.x = touch.clientX;
          lookTouchStart.y = touch.clientY;
        }
      }
    });

    document.addEventListener('touchend', function(event) {
      // Controlla se il touch look è stato rilasciato
      for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];
        
        if (touch.identifier === currentLookTouch) {
          lookTouchActive = false;
          currentLookTouch = null;
        }
      }
    });

    // Click detection per tavola da poker (desktop)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    document.addEventListener('click', function(event) {
      // Calcola le coordinate del mouse
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Aggiorna il raycaster
      raycaster.setFromCamera(mouse, camera);
      
      // Controlla intersezioni con tutti gli oggetti nella scena
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      console.log('Click detected, checking intersections...', intersects.length);
      
      for (let intersect of intersects) {
        console.log('Intersected object:', intersect.object.name, intersect.object.userData);
        
        if (intersect.object.userData && intersect.object.userData.isPokerTable) {
          console.log('Poker table clicked! Opening window...');
          openPokerWindow();
          break;
        }
      }
    });
    
    // Aggiungi anche un test per verificare che la tavola sia stata creata
    setTimeout(() => {
      console.log('Verifica tavola da poker nella scena...');
      let tableFound = false;
      scene.traverse(function(child) {
        if (child.userData && child.userData.isPokerTable) {
          console.log('Tavola da poker trovata:', child.position);
          tableFound = true;
        }
      });
      if (!tableFound) {
        console.log('ERRORE: Tavola da poker non trovata nella scena!');
      }
    }, 1000);

    // Window resize
    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function openPokerWindow() {
    console.log('Apertura finestra poker...');
    
    // Rimuovi eventuali finestre poker esistenti
    const existingModal = document.getElementById('pokerModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }
    
    // Crea la finestra modal per il poker
    const pokerModal = document.createElement('div');
    pokerModal.id = 'pokerModal';
    pokerModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      backdrop-filter: blur(5px);
    `;
    
    // Contenuto della finestra poker
    const pokerContent = document.createElement('div');
    pokerContent.style.cssText = `
      background: #1a1a1a;
      border: 4px solid #ffd700;
      border-radius: 15px;
      padding: 20px;
      width: 90%;
      max-width: 800px;
      height: 90%;
      max-height: 600px;
      position: relative;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
      overflow: auto;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Aggiungi animazione CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-50px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
    
    pokerContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: white; margin: 0;">🎰 Poker Room 🎰</h2>
        <button id="closePoker" style="
          background: #ff4444;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">✖ Chiudi</button>
      </div>
      
      <div style="background: #2a2a2a; border-radius: 10px; padding: 20px; height: calc(100% - 80px); overflow-y: auto;">
        <div style="text-align: center; color: white;">
          <h3>🃏 Texas Hold'em Poker 🃏</h3>
          
          <div style="background: rgba(255,215,0,0.15); border: 2px solid #ffd700; border-radius: 10px; padding: 15px; margin: 15px 0;">
            <div style="color: #ffd700; font-weight: bold; margin-bottom: 10px;">🔗 Invita un amico al tavolo:</div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input id="inviteLink" type="text" readonly value="${window.location.origin}${window.location.pathname}#poker-table-ABC123" style="
                flex: 1;
                background: rgba(0,0,0,0.7);
                color: white;
                border: 1px solid #ffd700;
                padding: 8px;
                border-radius: 5px;
                font-family: monospace;
              ">
              <button id="copyLink" style="
                background: #ffd700;
                color: black;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
              ">📋 Copia</button>
            </div>
            <div id="copySuccess" style="color: #4CAF50; margin-top: 5px; display: none;">✅ Link copiato negli appunti!</div>
            <div style="color: #ccc; font-size: 12px; margin-top: 5px;">📱 Condividi questo link per invitare amici al tavolo</div>
          </div>
          
          <div style="background: rgba(139,69,19,0.4); border: 2px solid #8B4513; border-radius: 10px; padding: 15px; margin: 15px 0;">
            <div style="color: #ffd700; font-weight: bold; margin-bottom: 10px;">🤖 Dealer Bot Attivo</div>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #8B4513, #D2691E);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
                border: 3px solid #ffd700;
              ">🎩</div>
              <div style="text-align: left;">
                <div style="color: white;">🎰 <strong>Max Dealer</strong></div>
                <div style="color: #ccc; font-size: 14px;">Stato: Pronto a distribuire</div>
                <div style="color: #4CAF50; font-size: 12px;">● Online</div>
              </div>
            </div>
          </div>
          
          <div style="display: flex; justify-content: center; gap: 20px; margin: 20px 0;">
            <div style="background: white; color: black; padding: 10px; border-radius: 5px; font-size: 24px;">A♠</div>
            <div style="background: white; color: black; padding: 10px; border-radius: 5px; font-size: 24px;">K♥</div>
          </div>
          <p style="font-size: 18px; margin: 20px 0;">Tavolo: $100/$200</p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">
              <div style="color: #ffd700;">👤 Giocatore 1</div>
              <div>Fiches: $5,000</div>
              <div style="color: #4CAF50; font-size: 12px;">● In attesa</div>
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; border: 2px solid #ffd700;">
              <div style="color: #ffd700;">👤 Tu</div>
              <div>Fiches: $2,500</div>
              <div style="color: #ff9800; font-size: 12px;">● Tuo turno</div>
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;">
              <div style="color: #ffd700;">🤖 Dealer Bot</div>
              <div>Fiches: $10,000</div>
              <div style="color: #f44336; font-size: 12px;">● Pensando...</div>
            </div>
          </div>
          <div style="margin-top: 20px;">
            <button style="
              background: #4CAF50;
              color: white;
              border: none;
              padding: 15px 30px;
              margin: 5px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            ">✋ Check</button>
            <button style="
              background: #ff9800;
              color: white;
              border: none;
              padding: 15px 30px;
              margin: 5px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            ">📈 Raise $200</button>
            <button style="
              background: #f44336;
              color: white;
              border: none;
              padding: 15px 30px;
              margin: 5px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            ">🛑 Fold</button>
          </div>
          <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px;">
            <strong>Pot:</strong> $1,200 | <strong>Turno:</strong> Il tuo turno | <strong>Round:</strong> Pre-Flop
          </div>
        </div>
      </div>
    `;
    
    pokerModal.appendChild(pokerContent);
    document.body.appendChild(pokerModal);
    
    // Event listener per chiudere
    document.getElementById('closePoker').addEventListener('click', function() {
      document.body.removeChild(pokerModal);
    });
    
    // Event listener per copiare link
    document.getElementById('copyLink').addEventListener('click', function() {
      const inviteLink = document.getElementById('inviteLink');
      inviteLink.select();
      document.execCommand('copy');
      
      // Mostra messaggio di successo
      const successMsg = document.getElementById('copySuccess');
      successMsg.style.display = 'block';
      
      // Nascondi dopo 3 secondi
      setTimeout(() => {
        successMsg.style.display = 'none';
      }, 3000);
    });
    
    // Simula comportamento del Dealer Bot
    let dealerAction = null;
    const dealerStates = ['Pensando...', 'Distribuisse carte...', 'Analizza...', 'Decide...'];
    
    function simulateDealerBot() {
      // Trova lo stato del dealer bot nel DOM
      const dealerElements = pokerModal.querySelectorAll('div');
      let dealerStatus = null;
      
      for (let element of dealerElements) {
        if (element.textContent.includes('Dealer Bot') && element.textContent.includes('●')) {
          dealerStatus = element;
          break;
        }
      }
      
      if (dealerStatus) {
        // Cicla tra gli stati del dealer
        let stateIndex = 0;
        const dealerInterval = setInterval(() => {
          if (!document.body.contains(pokerModal)) {
            clearInterval(dealerInterval);
            return;
          }
          
          dealerStatus.innerHTML = `<div style="color: #ffd700;">🤖 Dealer Bot</div>
            <div>Fiches: $10,000</div>
            <div style="color: #f44336; font-size: 12px;">● ${dealerStates[stateIndex]}</div>`;
          stateIndex = (stateIndex + 1) % dealerStates.length;
          
          // Dopo qualche ciclo, il dealer fa un'azione
          if (Math.random() > 0.7 && stateIndex === 0) {
            clearInterval(dealerInterval);
            dealerStatus.innerHTML = `<div style="color: #ffd700;">🤖 Dealer Bot</div>
              <div>Fiches: $10,000</div>
              <div style="color: #f44336; font-size: 12px;">● Ha fatto Fold</div>`;
            
            // Resetta dopo un po'
            setTimeout(() => {
              if (document.body.contains(pokerModal)) {
                dealerStatus.innerHTML = `<div style="color: #ffd700;">🤖 Dealer Bot</div>
                  <div>Fiches: $10,000</div>
                  <div style="color: #4CAF50; font-size: 12px;">● In attesa</div>`;
                simulateDealerBot(); // Ricomincia il ciclo
              }
            }, 3000);
          }
        }, 1500);
      }
    }
    
    // Avvia il dealer bot
    simulateDealerBot();
    
    // Chiudi anche cliccando fuori
    pokerModal.addEventListener('click', function(e) {
      if (e.target === pokerModal) {
        document.body.removeChild(pokerModal);
      }
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
    const delta = (time - (animate.prevTime || time)) * 0.001;
    animate.prevTime = time;

    // Movimento WASD basato sulla direzione della camera (dove guarda l'utente)
    // Reset velocity per evitare accumulo
    velocity.x = 0;
    velocity.z = 0;

    if (moveForward || moveBackward || moveLeft || moveRight) {
      // Calcola la direzione della camera (dove guarda l'utente)
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      // Proietta la direzione della camera sul piano XZ (ignora Y)
      cameraDirection.y = 0;
      cameraDirection.normalize();
      
      // Calcola la direzione perpendicolare per movimento laterale
      const rightDirection = new THREE.Vector3();
      rightDirection.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
      rightDirection.normalize();
      
      // Calcola la velocità direttamente invece di accumulare
      const moveSpeed = 8.0; // Velocità costante
      
      if (moveForward) velocity.addScaledVector(cameraDirection, moveSpeed);
      if (moveBackward) velocity.addScaledVector(cameraDirection, -moveSpeed);
      if (moveRight) velocity.addScaledVector(rightDirection, moveSpeed);
      if (moveLeft) velocity.addScaledVector(rightDirection, -moveSpeed);
    }
    
    // Muovi Serena basandosi sulla velocity calcolata
    if (serenaModel) {
      serenaModel.position.x += velocity.x * delta;
      serenaModel.position.z += velocity.z * delta;
      
      // Fai ruotare il modello nella direzione del movimento
      if (moveForward || moveBackward || moveLeft || moveRight) {
        // Calcola la direzione del movimento
        const moveDirection = new THREE.Vector3(velocity.x, 0, velocity.z);
        if (moveDirection.length() > 0.1) {
          moveDirection.normalize();
          // Calcola l'angolo di rotazione per far girare il modello verso la direzione
          const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
          // Applica la rotazione smoothly
          serenaModel.rotation.y = THREE.MathUtils.lerp(serenaModel.rotation.y, targetAngle, 0.1);
        }
      }
      
      // Ground detection per mantenere Serena a terra
      const groundLevel = 0;
      if (serenaModel.position.y > groundLevel) {
        serenaModel.position.y -= 0.05; // Legale gravità
      }
      if (serenaModel.position.y < groundLevel) {
        serenaModel.position.y = groundLevel; // Non andare sotto terra
      }

      // Camera che segue Serena (visuale terza persona ravvicinata over-the-shoulder)
      const cameraAngle = serenaModel.rotation.y;
      const cameraDistance = 3; // Ridotto da 8 a 3 per visuale ravvicinata
      const cameraHeight = 2.2; // Ridotto da 4 a 2.2 per altezza spalle
      const shoulderOffset = 0.5; // Slight offset to the right for over-the-shoulder
      
      camera.position.x = serenaModel.position.x - Math.sin(cameraAngle) * cameraDistance + Math.cos(cameraAngle) * shoulderOffset;
      camera.position.z = serenaModel.position.z - Math.cos(cameraAngle) * cameraDistance + Math.sin(cameraAngle) * shoulderOffset;
      camera.position.y = serenaModel.position.y + cameraHeight;
      camera.lookAt(serenaModel.position);
      
      // Animazioni migliorate
      if (mixer) {
        // Velocità di movimento per animazione
        const moveSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const isMoving = moveSpeed > 0.1;
        
        // Debug: stato animazioni
        if (Math.random() < 0.01) { // Solo occasionalmente per non spam
          console.log('Animazioni - walkAction:', !!walkAction, 'idleAction:', !!idleAction, 'isMoving:', isMoving, 'moveSpeed:', moveSpeed);
        }
        
        // Sistema di animazione completo
        if (walkAction && idleAction) {
          if (isMoving && currentAction !== walkAction) {
            // Transizione a camminata
            console.log('Transizione a camminata - velocità:', moveSpeed);
            idleAction.fadeOut(0.3);
            walkAction.reset().fadeIn(0.3).play();
            walkAction.setEffectiveTimeScale(Math.min(moveSpeed * 0.5, 2));
            currentAction = walkAction;
          } else if (!isMoving && currentAction !== idleAction) {
            // Transizione a idle
            console.log('Transizione a idle');
            walkAction.fadeOut(0.3);
            idleAction.reset().fadeIn(0.3).play();
            currentAction = idleAction;
          } else if (isMoving && currentAction === walkAction) {
            // Aggiusta velocità camminata
            walkAction.setEffectiveTimeScale(Math.min(moveSpeed * 0.5, 2));
          }
        } else {
          // Fallback: oscillazione semplice se le animazioni non sono caricate
          if (isMoving) {
            const time = Date.now() * 0.005;
            serenaModel.position.y = Math.sin(time) * 0.15;
            serenaModel.rotation.x = Math.sin(time * 2) * 0.05;
            serenaModel.rotation.z = Math.sin(time * 1.5) * 0.03;
          } else {
            serenaModel.position.y = 0;
            serenaModel.rotation.x = 0;
            serenaModel.rotation.z = 0;
          }
        }
        
        mixer.update(clock.getDelta());
      }
    }

    // Renderizza sempre la scena
    renderer.render(scene, camera);
  }

  // Inizializza quando la pagina è pronta
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
  } else {
    initScene();
  }
  
  // Controlla se c'è un hash URL per il poker
  window.addEventListener('load', function() {
    if (window.location.hash === '#poker-table-ABC123') {
      console.log('Link d\'invito poker rilevato! Apro la finestra poker...');
      // Apri la finestra poker dopo un piccolo ritardo per assicurarsi che la scena sia pronta
      setTimeout(() => {
        openPokerWindow();
      }, 2000);
    }
  });
  
  // Gestisci il pulsante di chiusura del pannello info
  function setupCloseInfoButton() {
    const closeInfoBtn = document.getElementById('closeInfo');
    const infoPanel = document.getElementById('info');
    
    if (closeInfoBtn && infoPanel) {
      console.log('Pulsante chiudi info trovato, setup eventi...');
      
      // Rimuovi eventi precedenti per evitare duplicazioni
      closeInfoBtn.removeEventListener('click', hideInfoPanel);
      closeInfoBtn.removeEventListener('touchstart', hideInfoPanel);
      closeInfoBtn.removeEventListener('touchend', hideInfoPanel);
      
      // Funzione unificata per nascondere il pannello
      function hideInfoPanel(e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        infoPanel.style.display = 'none';
        console.log('Pannello info nascosto - evento:', e ? e.type : 'direct');
      }
      
      // Event listener per click (desktop)
      closeInfoBtn.addEventListener('click', hideInfoPanel);
      
      // Event listener per touch (mobile) - usa touchend per maggiore compatibilità
      closeInfoBtn.addEventListener('touchend', hideInfoPanel);
      
      // Fallback con touchstart
      closeInfoBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        setTimeout(hideInfoPanel, 100); // Piccolo ritardo per assicurarsi che il touch sia completato
      });
      
      console.log('Eventi pulsante chiudi info configurati');
    } else {
      console.log('Pulsante chiudi info o pannello non trovati');
    }
  }
  
  // Chiama la funzione sia al DOMContentLoaded che dopo un ritardo per mobile
  document.addEventListener('DOMContentLoaded', setupCloseInfoButton);
  
  // Fallback per mobile - controlla anche dopo un ritardo
  setTimeout(setupCloseInfoButton, 1000);
  setTimeout(setupCloseInfoButton, 3000);

  console.log('Bridge Serena Open World inizializzato.');
})();
