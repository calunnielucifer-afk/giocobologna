// Bridge per Serena Open World - Scena three.js semplice con controlli WASD
(function() {
  'use strict';

  // Funzioni di input per il nuovo sistema
function onKeyDown(event) {
    // Gestisci prima l'interazione con E
    if (event.code === 'KeyE') {
        if (nearbyInteractable) {
            console.log('E pressed - interacting with:', nearbyInteractable.userData);
            if (nearbyInteractable.userData.isPokerTable) {
                openPokerWindow();
            }
        } else {
            console.log('E pressed - no nearby interactable object');
        }
        return;
    }
    
    // Gestisci X per raccogliere bigliettini d'amore
    if (event.code === 'KeyX') {
        if (window.closeLoveMessage) {
            // Chiudi il messaggio d'amore
            window.closeLoveMessage();
        } else if (playerController && playerController instanceof AdvancedPlayerController) {
            // Raccogli il bigliettino
            playerController.collectLoveNote();
        }
        return;
    }
    
    // Gestisci WASD con il nuovo controller se disponibile
    if (playerController && playerController instanceof AdvancedPlayerController) {
        switch (event.code) {
            case 'KeyW':
                playerController.keys.w = true;
                break;
            case 'KeyA':
                playerController.keys.a = true;
                break;
            case 'KeyS':
                playerController.keys.s = true;
                break;
            case 'KeyD':
                playerController.keys.d = true;
                break;
            // FRECCE per camera rotation
            case 'ArrowLeft':
                console.log('⬅️ FRECCIA SINISTRA PREMUTA!');
                if (playerController && playerController.updateCameraAngle) {
                    playerController.updateCameraAngle(-50); // Rotazione sinistra veloce
                }
                break;
            case 'ArrowRight':
                console.log('➡️ FRECCIA DESTRA PREMUTA!');
                if (playerController && playerController.updateCameraAngle) {
                    playerController.updateCameraAngle(50); // Rotazione destra veloce
                }
                break;
        }
    }
}

function onKeyUp(event) {
    // Gestisci WASD con il nuovo controller se disponibile
    if (playerController && playerController instanceof AdvancedPlayerController) {
        switch (event.code) {
            case 'KeyW':
                playerController.keys.w = false;
                break;
            case 'KeyA':
                playerController.keys.a = false;
                break;
            case 'KeyS':
                playerController.keys.s = false;
                break;
            case 'KeyD':
                playerController.keys.d = false;
                break;
        }
    }
}

  // Sistema Controller Stile Fortnite
  class AdvancedPlayerController {
    constructor(playerMesh, camera) {
      this.player = playerMesh;
      this.camera = camera;
      this.keys = { w: false, a: false, s: false, d: false };
      this.velocity = new THREE.Vector3();
      this.speed = 5; // Unità al secondo
      this.rotationSpeed = 10; // Gradi al secondo
      this.cameraOffset = new THREE.Vector3(0, 2, -5); // Offset relativo al giocatore
      this.cameraDistance = 5;
      this.cameraHeight = 3; // Camera più alta
      this.cameraAngle = 0; // Angolo orbitale della camera
      this.mouseSensitivity = 0.001; // Sensibilità normale (ridotto da 0.002)
      this.isMoving = false;
    }
    
    update(deltaTime) {
      // 1. Calcola la Direzione di Movimento basata sulla camera
      const forwardVector = new THREE.Vector3();
      const rightVector = new THREE.Vector3();
      
      // Usa la direzione della camera per movimento WASD
      this.camera.getWorldDirection(forwardVector);
      forwardVector.y = 0; // Mantieni movimento sul piano orizzontale
      forwardVector.normalize();
      
      // Calcola vettore destra per movimento laterale
      rightVector.crossVectors(forwardVector, new THREE.Vector3(0, 1, 0));
      
      let moveDirection = new THREE.Vector3(0, 0, 0);
      
      // WASD intelligence stile Fortnite - ASD funzionano anche senza W
      if (this.keys.w) {
        moveDirection.add(forwardVector);
        console.log('W pressed - moving forward');
      }
      if (this.keys.s) {
        moveDirection.sub(forwardVector);
        console.log('S pressed - moving backward');
      }
      // A/D funzionano INDIPENDENTEMENTE da W (richiesto dall'utente)
      if (this.keys.a) {
        moveDirection.sub(rightVector);
        console.log('A pressed - moving left (independent)');
      }
      if (this.keys.d) {
        moveDirection.add(rightVector);
        console.log('D pressed - moving right (independent)');
      }
      
      // Normalizza per evitare movimento diagonale più veloce
      if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        
        // 2. Rotazione Morbida del Personaggio (slerp)
        const targetQuaternion = new THREE.Quaternion();
        const angle = Math.atan2(moveDirection.x, moveDirection.z);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        
        // Interpolazione sferica per rotazione fluida
        this.player.quaternion.slerp(targetQuaternion, this.rotationSpeed * deltaTime);
        
        // 3. Traslazione del Personaggio
        this.player.position.addScaledVector(moveDirection, this.speed * deltaTime);
        
        this.isMoving = true;
        console.log('MOVEMENT ACTIVE - isMoving = true');
      } else {
        this.isMoving = false;
        console.log('MOVEMENT STOPPED - isMoving = false');
      }
      
      // 4. Posizionamento Third-Person Camera Smooth
      this.updateThirdPersonCamera(deltaTime);
      
      // 5. Aggiorna animazioni basate sul movimento
      this.updateAnimations();
      
      // 6. Check prossimità bigliettini d'amore
      this.checkLoveNoteProximity();
    }
    
    updateThirdPersonCamera(deltaTime) {
      // TOGGLE FOLLOW CAMERA - SEMPRE ATTIVA
      if (!followCameraEnabled) return;
      
      // Posizione target della camera: dietro la testa di Serena
      const playerPosition = this.player.position.clone();
      playerPosition.y += this.cameraHeight; // Altezza testa
      
      // Calcola offset della camera (dietro e sopra) - DISTANZA STATICA
      const cameraOffset = new THREE.Vector3();
      cameraOffset.x = Math.sin(this.cameraAngle) * this.cameraDistance;
      cameraOffset.y = -1.5; // Guarda leggermente dall'alto
      cameraOffset.z = Math.cos(this.cameraAngle) * this.cameraDistance;
      
      // Posizione target della camera
      const targetCameraPosition = playerPosition.clone().add(cameraOffset);
      
      // Look target: leggermente sopra la testa di Serena
      const lookTarget = playerPosition.clone();
      lookTarget.y += 0.2; // Guarda leggermente verso l'alto
      
      // FOLLOWING ISTANTANEO - stessa velocità di Serena, nessun ritardo
      this.camera.position.copy(targetCameraPosition);
      this.camera.lookAt(lookTarget);
    }
    
    updateAnimations() {
      if (!window.poseAction || !window.walkAction) {
        console.log('Animation actions not available - poseAction:', !!window.poseAction, 'walkAction:', !!window.walkAction);
        return;
      }
      
      // Aggiungi hysteresis per evitare switch continui
      const moveThreshold = 0.3;
      const stopThreshold = 0.1;
      
      console.log('Animation check - isMoving:', this.isMoving, 'currentAction:', currentAction === window.walkAction ? 'walk' : 'pose');
      
      if (this.isMoving) {
        // Transizione a camminata solo se supera la soglia
        if (currentAction !== window.walkAction) {
          console.log('Transizione a camminata stile Fortnite - MOVIMENTO DETECTED');
          
          window.poseAction.fadeOut(0.2);
          window.walkAction.reset().fadeIn(0.2).setEffectiveTimeScale(1.0);
          
          // Inizia da un punto casuale per evitare sincronizzazione visibile del loop
          const randomStart = Math.random() * walkAnimation.duration;
          window.walkAction.time = randomStart;
          
          window.walkAction.play();
          
          currentAction = window.walkAction;
        }
      } else {
        // Transizione a pose solo se sotto la soglia di stop
        if (currentAction !== window.poseAction) {
          console.log('Transizione a pose stile Fortnite - FERMO');
          
          window.walkAction.fadeOut(0.15);
          window.poseAction.reset().fadeIn(0.15);
          window.poseAction.play();
          
          currentAction = window.poseAction;
        }
      }
    }
    
    setKey(key, pressed) {
      if (key in this.keys) {
        this.keys[key] = pressed;
      }
    }
    
    updateCameraAngle(deltaX) {
      console.log('🎥 updateCameraAngle chiamato con deltaX:', deltaX, 'cameraAngle attuale:', this.cameraAngle);
      this.cameraAngle += deltaX * this.mouseSensitivity;
      console.log('🎥 Camera angle aggiornato - nuovo angolo:', this.cameraAngle.toFixed(4), 'deltaX:', deltaX.toFixed(4));
    }
    
    toggleFollowCamera() {
      // La camera segue SEMPRE Serena - toggle solo per logica futura
      followCameraEnabled = !followCameraEnabled;
      console.log('Follow camera toggled:', followCameraEnabled ? 'ON' : 'OFF');
      return followCameraEnabled;
    }
    
    isFollowCameraEnabled() {
      return followCameraEnabled;
    }
    
    checkLoveNoteProximity() {
      if (!loveNotes || loveNotes.length === 0) return;
      
      const playerPosition = this.player.position;
      const interactionDistance = 2.0; // Distanza per interagire
      
      nearbyNote = null;
      
      for (let note of loveNotes) {
        if (note.userData.collected) continue;
        
        const distance = playerPosition.distanceTo(note.position);
        if (distance < interactionDistance) {
          nearbyNote = note;
          break;
        }
      }
    }
    
    collectLoveNote() {
      if (!nearbyNote || nearbyNote.userData.collected) return false;
      
      // Rimuovi il bigliettino dalla scena
      scene.remove(nearbyNote);
      nearbyNote.userData.collected = true;
      collectedNotes++;
      
      // Mostra il messaggio d'amore
      this.showLoveMessage(nearbyNote.userData.message);
      
      console.log(`Bigliettino d'amore raccolto! (${collectedNotes}/${loveNotes.length})`);
      return true;
    }
    
    showLoveMessage(message) {
      // Crea un elemento HTML per mostrare il messaggio
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(255, 182, 193, 0.95), rgba(255, 218, 224, 0.95));
        color: #8B0000;
        padding: 30px 40px;
        border-radius: 20px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 10px 30px rgba(139, 0, 0, 0.3);
        border: 3px solid #ff69b4;
        max-width: 400px;
        animation: loveMessage 0.5s ease-out;
      `;
      messageDiv.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 15px;">💕 Bigliettino d'Amore 💕</div>
        <div style="line-height: 1.5;">${message}</div>
        <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">Premi X per chiudere</div>
      `;
      
      // Aggiungi animazione CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes loveMessage {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(messageDiv);
      
      // Funzione per chiudere il messaggio
      window.closeLoveMessage = function() {
        if (messageDiv.parentNode) {
          document.body.removeChild(messageDiv);
        }
        if (style.parentNode) {
          document.head.removeChild(style);
        }
        delete window.closeLoveMessage;
      };
      
      // Auto-chiusura dopo 10 secondi
      setTimeout(window.closeLoveMessage, 10000);
    }
  }
  
  // Variabili globali
  let scene, camera, renderer, serenaModel, mixer;
  let playerController = null; // Nuovo sistema - usa solo AdvancedPlayerController
  let clock = new THREE.Clock();
  
  // Toggle follow camera system
  let followCameraEnabled = true; // SEMPRE ATTIVA
  
  // Love notes system
  let loveNotes = [];
  let collectedNotes = 0;
  let nearbyNote = null;
  
  // Dual joystick system
  let movementJoystickActive = false;
  let cameraJoystickActive = false;
  let movementVector = new THREE.Vector2();
  let cameraVector = new THREE.Vector2();
  let movementStartPos = new THREE.Vector2();
  let cameraStartPos = new THREE.Vector2();
  
  let joystickActive = false;
  let joystickVector = new THREE.Vector2();
  let touchStartPos = new THREE.Vector2();
  let joystickHandle;
  let lookTouchActive = false;
  let currentLookTouch = null;
  let lookTouchStart = new THREE.Vector2();
  
  // Mouse orbitale senza click
  let mouseX = 0, mouseY = 0;
  let isMouseOrbiting = false;
  const edgeThreshold = 50; // Pixel dal bordo per attivare l'orbitale
  
  // Sistema di interazione con E
  let interactableObjects = [];
  let nearbyInteractable = null;
  
  // Animazioni Mixamo
  let walkAnimation;
  let poseAnimation;
  let walkAction;
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
    renderer.outputEncoding = THREE.sRGBEncoding; // r128 API
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

    // Alberi semplici - aumentati per nascondere meglio i bigliettini
    for (let i = 0; i < 50; i++) { // Da 20 a 50 alberi
      const tree = createTree();
      tree.position.set(
        (Math.random() - 0.5) * 150, // Aumentato area di spawn
        0,
        (Math.random() - 0.5) * 150
      );
      scene.add(tree);
    }
    
    // Aggiungi siepi per nascondere meglio i bigliettini
    for (let i = 0; i < 30; i++) { // 30 siepi
      const hedge = createHedge();
      hedge.position.set(
        (Math.random() - 0.5) * 120,
        0,
        (Math.random() - 0.5) * 120
      );
      hedge.rotation.y = Math.random() * Math.PI * 2;
      scene.add(hedge);
    }

    // Tavola da poker
    createPokerTable();
    
    // Bigliettini d'amore
    createLoveNotes();
    
    // Controlli tastiera e touch
    setupControls();

    // Setup touch joystick per mobile
    setupTouchJoystick();

    // Carica Claire
    loadClaire();

    // Inizializza il controller Fortnite con retry loop finché tutto è pronto
    function initializeAdvancedPlayerController() {
      if (serenaModel && camera && window.poseAction && window.walkAction) {
        // Usa il nuovo sistema AdvancedPlayerController
        playerController = new AdvancedPlayerController(serenaModel, camera);
        console.log('AdvancedPlayerController inizializzato con tutte le animazioni!');
        
        // Adesso setup il controller Fortnite con retry loop finché tutto è pronto
      } else {
        console.log('AdvancedPlayerController non ancora pronto - elementi mancanti:', {
          serenaModel: !!serenaModel,
          camera: !!camera,
          poseAction: !!window.poseAction,
          walkAction: !!window.walkAction
        });
        
        // Riprova tra 500ms
        setTimeout(initializeAdvancedPlayerController, 500);
      }
    }
    
    // Avvia il retry loop dopo 1 secondo
    setTimeout(initializeAdvancedPlayerController, 1000);

    // Loop di rendering
    animate();

    console.log('Scena inizializzata con successo!');
  }

  function createLoveNotes() {
    console.log('Creazione bigliettini d\'amore sparsi nella mappa...');
    
    // Frasi d'amore tipo biscotti cinesi
    const loveMessages = [
      "🌸 Il tuo sorriso illumina il mondo come un fiore di ciliegio",
      "💕 Ogni passo con te è una danza nel cuore della primavera",
      "🌙 La tua bellezza supera quella di mille notti stellate",
      "🦋 Sei la farfalla che colora il giardino del mio cuore",
      "🌺 Il tuo amore è il fiore più raro di questo mondo",
      "✨ Nelle tue occhi trovi tutta la magia dell'universo",
      "🌸 Tu sei la primavera che portava nel mio cuore",
      "💖 Il tuo nome è la melodia più dolce che conosco",
      "🌷 Insieme a te, ogni momento è un fiore che sboccia",
      "🦢 Sei il cigno che nuova eleganza nel lago del mio anima"
    ];
    
    // Posizioni nascoste nella mappa - più distanti e randomiche su tutta l'area
    const notePositions = [];
    const minDistance = 15; // Distanza minima tra bigliettini
    
    // Genera posizioni randomiche con distanza minima
    while (notePositions.length < 10) {
      const newPos = {
        x: (Math.random() - 0.5) * 140, // Area più grande
        z: (Math.random() - 0.5) * 140,
        rotation: Math.random() * Math.PI * 2
      };
      
      // Verifica distanza minima dagli altri bigliettini
      let tooClose = false;
      for (let pos of notePositions) {
        const distance = Math.sqrt(
          Math.pow(newPos.x - pos.x, 2) + 
          Math.pow(newPos.z - pos.z, 2)
        );
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      // Verifica che non sia troppo vicino all'area di spawn (0,0)
      const spawnDistance = Math.sqrt(newPos.x * newPos.x + newPos.z * newPos.z);
      if (spawnDistance < 10) tooClose = true;
      
      if (!tooClose) {
        notePositions.push(newPos);
      }
    }
    
    notePositions.forEach((pos, index) => {
      // Crea il bigliettino - più piccolo e meno visibile
      const noteGeometry = new THREE.PlaneGeometry(0.2, 0.15); // Più piccolo
      const noteMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffe6e6, // Rosa chiaro
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7 // Meno visibile
      });
      
      const note = new THREE.Mesh(noteGeometry, noteMaterial);
      note.position.set(pos.x, 0.3, pos.z); // Più basso per nasconderlo meglio
      note.rotation.y = pos.rotation;
      note.userData = {
        isLoveNote: true,
        message: loveMessages[index],
        id: index,
        collected: false
      };
      
      // Aggiungi un piccolo bordo dorato - più sottile
      const borderGeometry = new THREE.EdgesGeometry(noteGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffd700, 
        linewidth: 1 
      });
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);
      note.add(border);
      
      // Aggiungi animazione fluttuante - più lenta e delicata
      note.userData.floatOffset = Math.random() * Math.PI * 2;
      note.userData.floatSpeed = 0.5 + Math.random() * 0.3; // Più lenta
      
      scene.add(note);
      loveNotes.push(note);
    });
    
    console.log('✅ Creati', loveNotes.length, 'bigliettini d\'amore sparsi nella mappa!');
  }
  
  function showLoveNoteIndicator() {
    if (!nearbyNote || nearbyNote.userData.collected) return;
    
    // Crea indicatore "Premi X"
    let indicator = document.getElementById('loveNoteIndicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'loveNoteIndicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 105, 180, 0.9);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: bold;
        z-index: 1000;
        animation: pulse 1s infinite;
        border: 2px solid #ff69b4;
        box-shadow: 0 5px 15px rgba(255, 105, 180, 0.4);
      `;
      document.body.appendChild(indicator);
      
      // Aggiungi animazione pulse
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    }
    
    indicator.innerHTML = `💕 Premi X per raccogliere il bigliettino d'amore 💕`;
  }
  
  function hideLoveNoteIndicator() {
    const indicator = document.getElementById('loveNoteIndicator');
    if (indicator) {
      document.body.removeChild(indicator);
    }
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

  function createHedge() {
    const group = new THREE.Group();
    
    // Crea una siepe composta da più sfere di foglie
    const hedgeColors = [0x228B22, 0x2E7D32, 0x388E3C, 0x43A047]; // Vari toni di verde
    
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const foliageGeometry = new THREE.SphereGeometry(1.5 + Math.random() * 0.5);
        const foliageMaterial = new THREE.MeshLambertMaterial({ 
          color: hedgeColors[Math.floor(Math.random() * hedgeColors.length)]
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        
        foliage.position.set(
          (i - 2) * 1.2 + (Math.random() - 0.5) * 0.5,
          1.5 + j * 1.2,
          (Math.random() - 0.5) * 1.5
        );
        foliage.castShadow = true;
        group.add(foliage);
      }
    }
    
    return group;
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
    
    // Crea il mixer se non esiste
    if (!mixer && serenaModel) {
      mixer = new THREE.AnimationMixer(serenaModel);
      console.log('Mixer creato per il placeholder');
    }
    
    if (!mixer) {
      console.error('Impossibile creare animazioni - mixer o serenaModel mancanti');
      return;
    }
    
    // Animazione pose semplice (fermo)
    const poseTracks = [];
    const poseDuration = 1.0;
    const poseTimes = [0, poseDuration];
    
    // Crea animazione pose vuota (nessun movimento)
    poseAnimation = new THREE.AnimationClip('Pose', poseDuration, poseTracks);
    let poseAction = mixer.clipAction(poseAnimation);
    poseAction.setEffectiveWeight(1);
    poseAction.setEffectiveTimeScale(1);
    
    // Salva anche in window.poseAction per consistenza
    window.poseAction = poseAction;
    
    poseAction.play();
    currentAction = poseAction;
    
    console.log('Animazioni fallback create e attive');
  }

  function loadClaire() {
    console.log('Caricamento modello Serena pose FBX 7.4 di default...');
    
    // FALLBACK IMMEDIATO - crea un placeholder geometrico per testare movement
    if (!serenaModel) {
      console.log('Creazione placeholder geometrico per Serena...');
      const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 8);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xff69b4, // Rosa
        metalness: 0.1,
        roughness: 0.7
      });
      serenaModel = new THREE.Mesh(geometry, material);
      serenaModel.position.set(0, 0.9, 0); // Metà altezza
      serenaModel.castShadow = true;
      serenaModel.receiveShadow = true;
      scene.add(serenaModel);
      
      console.log('Placeholder Serena aggiunto alla scena!');
      
      // Crea animazioni di fallback immediate
      createFallbackAnimations();
    }
    
    const fbxLoader = new THREE.FBXLoader();
    
    // Carica il modello SERENA POSE FBX 7.4 come default
    console.log('🔍 Inizio caricamento FBX da:', 'openworld/modelpg/Lady_in_red_dress/SerenaPose.fbx');
    fbxLoader.load(
      'openworld/modelpg/Lady_in_red_dress/SerenaPose.fbx',
      function(object) {
        console.log('✅ FBX SerenaPose caricato con successo!', object);
        
        // Rimuovi il placeholder se esiste
        if (serenaModel && serenaModel.isMesh) {
          console.log('🔄 Rimuovendo placeholder Serena...');
          scene.remove(serenaModel);
        }
        
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
          }
        });
        
        // Calcola il bounding box per centrare il modello a terra
        const box = new THREE.Box3().setFromObject(object);
        object.position.y = (-box.min.y * object.scale.y) + 0.5;
        
        scene.add(object);
        
        console.log('✅ Modello FBX Serena caricato e sostituito al placeholder!');

        // Animazioni - setup per pose (modello di default)
        mixer = new THREE.AnimationMixer(object);
        
        if (object.animations.length > 0) {
          console.log('Animazione Serena pose FBX 7.4 trovata:', object.animations.length);
          poseAnimation = object.animations[0];
          
          // Crea l'azione pose
          const poseAction = mixer.clipAction(poseAnimation);
          poseAction.setEffectiveWeight(1);
          poseAction.setEffectiveTimeScale(1);
          poseAction.clampWhenFinished = false;
          poseAction.setLoop(THREE.LoopRepeat);
          
          // Salva il riferimento
          window.poseAction = poseAction;
          
          // Avvia la pose di default
          poseAction.play();
          currentAction = poseAction;
          
          console.log('Animazione Serena pose FBX 7.4 avviata di default!');
        }
        
        // Carica il modello walking per quando cammina
        loadWalkingModel();
        
        console.log('Serena pose FBX 7.4 caricata con successo!');
      },
      function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% caricato');
      },
      function(error) {
        console.error('❌ Errore caricamento FBX Serena pose:', error);
        console.error('❌ Dettagli errore:', error.message, error.stack);
      }
    );
  }
  
  function loadWalkingModel() {
    console.log('Caricamento modello Serena walking FBX 7.4 per movimento...');
    
    const fbxLoader = new THREE.FBXLoader();
    fbxLoader.load(
      'openworld/modelpg/Lady_in_red_dress/SerenaWalking.fbx',
      function(walkingObject) {
        // Salva il modello walking e la sua animazione
        window.walkingModel = walkingObject;
        
        if (walkingObject.animations.length > 0) {
          console.log('Animazione Serena walking FBX 7.4 trovata:', walkingObject.animations.length);
          walkAnimation = walkingObject.animations[0];
          
          // ACCORCIA DURATA ANIMAZIONE del 20% per eliminare mezzo passo in più
          walkAnimation.duration = walkAnimation.duration * 0.8;
          
          // Rendi il loop seamless - elimina discontinuità
          walkAnimation.clampWhenFinished = false;
          
          // Crea l'azione walking nel mixer del modello pose
          walkAction = mixer.clipAction(walkAnimation);
          walkAction.setEffectiveWeight(1);
          walkAction.setEffectiveTimeScale(1); // Torna a velocità normale
          walkAction.clampWhenFinished = false;
          walkAction.setLoop(THREE.LoopRepeat, Infinity); // Loop infinito seamless
          
          // IMPOSTAZIONE CRUCIALE: Abilita zero threshold per loop continuo
          walkAction.zeroSlopeAtEnd = true; // Evita salto alla fine
          walkAction.zeroSlopeAtStart = true; // Evita salto all'inizio
          
          // Imposta zero threshold per evitare salti al loop
          walkAction.fadeIn(0.1); // Fade in più smooth
          
          // Rendi walkAction globale come poseAction
          window.walkAction = walkAction;
          
          console.log('Animazione Serena walking FBX 7.4 caricata nel mixer!');
        }
      },
      function(xhr) {
        console.log('Serena walking FBX 7.4 model: ' + (xhr.loaded / xhr.total * 100) + '% caricato');
      },
      function(error) {
        console.error('Errore caricamento Serena walking FBX 7.4 model:', error);
      }
    );
  }
  
  function createPoseAnimationWithSameMechanism() {
    console.log('Creazione animazione pose con stesso meccanismo della camminata...');
    
    // Crea un'animazione vuota (nessuna track = nessun movimento)
    const poseTracks = [];
    const poseDuration = 1.0; // Durata come la camminata
    
    // Crea animation clip vuota esattamente come viene fatto per la camminata
    poseAnimation = new THREE.AnimationClip('Pose', poseDuration, poseTracks);
    console.log('Pose animation name:', poseAnimation.name);
    console.log('Pose animation duration:', poseAnimation.duration);
    
    // Crea l'azione pose esattamente come walkAction
    const poseAction = mixer.clipAction(poseAnimation);
    poseAction.setEffectiveWeight(1);
    poseAction.setEffectiveTimeScale(1);
    poseAction.clampWhenFinished = false; // Non clamp per loop continuo
    poseAction.setLoop(THREE.LoopRepeat); // Loop infinito
    
    // Salva il riferimento esattamente come per walkAction
    window.poseAction = poseAction;
    
    console.log('Animazione pose setup completata con stesso meccanismo!');
  }

  function applyTexturesToModel(model) {
    const textureLoader = new THREE.TextureLoader();
    const basePath = 'modelpg/Lady_in_red_dress/textures/';

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
    // Sistema unificato globale - usa solo AdvancedPlayerController
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

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

    // Sistema di proximity detection per interazione con E
    function checkInteractableProximity() {
      if (!serenaModel) return;
      
      const interactionDistance = 3; // Distanza di interazione
      nearbyInteractable = null;
      
      // Controlla tutti gli oggetti interagibili
      for (let obj of interactableObjects) {
        const distance = serenaModel.position.distanceTo(obj.position);
        if (distance < interactionDistance) {
          nearbyInteractable = obj;
          console.log('Nearby interactable found:', obj.userData, 'distance:', distance.toFixed(2));
          
          // Mostra提示 per l'utente (potrebbe essere un UI element)
          if (!document.getElementById('interactionHint')) {
            const hint = document.createElement('div');
            hint.id = 'interactionHint';
            hint.style.cssText = `
              position: fixed;
              bottom: 100px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              font-family: Arial;
              font-size: 16px;
              z-index: 1000;
            `;
            hint.textContent = 'Premi E per interagire';
            document.body.appendChild(hint);
          }
          break;
        }
      }
      
      // Rimuovi il提示 se non ci sono oggetti vicini
      if (!nearbyInteractable) {
        const hint = document.getElementById('interactionHint');
        if (hint) {
          document.body.removeChild(hint);
        }
      }
    }
    
    // Aggiungi il proximity check nel loop di animazione
    function addProximityToAnimate() {
      const originalAnimate = animate;
      animate = function() {
        originalAnimate();
        checkInteractableProximity();
      };
    }
    addProximityToAnimate();
    
    // Setup oggetti interagibili
    setTimeout(() => {
      console.log('Setup oggetti interagibili...');
      interactableObjects = [];
      
      scene.traverse(function(child) {
        if (child.userData && child.userData.isPokerTable) {
          interactableObjects.push(child);
          console.log('Oggetto interagibile aggiunto:', child.userData, 'position:', child.position);
        }
      });
      
      console.log('Totale oggetti interagibili:', interactableObjects.length);
    }, 2000);
    
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
    console.log('Apertura finestra poker - blocco controlli mondo...');
    
    // BLOCCA i controlli del mondo (nuovo sistema)
    if (playerController && playerController instanceof AdvancedPlayerController) {
      playerController.keys.w = false;
      playerController.keys.a = false;
      playerController.keys.s = false;
      playerController.keys.d = false;
    }
    
    // Rimuovi eventuali finestre poker esistenti
    const existingModal = document.getElementById('pokerModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }
    
    // Crea la finestra modal per il poker - GIOCO A SE
    const pokerModal = document.createElement('div');
    pokerModal.id = 'pokerModal';
    pokerModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0d5f0d 0%, #1a1a1a 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      backdrop-filter: blur(10px);
    `;
    
    // Contenuto della finestra poker
    const pokerContent = document.createElement('div');
    pokerContent.style.cssText = `
      background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
      border: 4px solid #ffd700;
      border-radius: 20px;
      padding: 30px;
      width: 95%;
      max-width: 900px;
      height: 95%;
      max-height: 700px;
      position: relative;
      box-shadow: 0 0 50px rgba(255, 215, 0, 0.9), inset 0 0 20px rgba(255, 215, 0, 0.2);
      overflow: hidden;
      animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    // Header con titolo e pulsante chiudi
    const pokerHeader = document.createElement('div');
    pokerHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #ffd700;
    `;
    
    const pokerTitle = document.createElement('h2');
    pokerTitle.textContent = ' POKER CHAMPIONSHIP ';
    pokerTitle.style.cssText = `
      color: #ffd700;
      font-size: 28px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      margin: 0;
    `;
    
    // Pulsante chiudi migliorato
    const closeButton = document.createElement('button');
    closeButton.textContent = ' CHIUDI';
    closeButton.style.cssText = `
      background: linear-gradient(145deg, #ff4444, #cc0000);
      color: white;
      border: 2px solid #ffd700;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    `;
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'linear-gradient(145deg, #ff6666, #ff0000)';
      closeButton.style.transform = 'scale(1.05)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'linear-gradient(145deg, #ff4444, #cc0000)';
      closeButton.style.transform = 'scale(1)';
    });
    
    closeButton.addEventListener('click', closePokerWindow);
    
    pokerHeader.appendChild(pokerTitle);
    pokerHeader.appendChild(closeButton);
    
    // Area di gioco placeholder
    const gameArea = document.createElement('div');
    gameArea.style.cssText = `
      background: radial-gradient(ellipse at center, #0d5f0d 0%, #063006 100%);
      border: 3px solid #ffd700;
      border-radius: 15px;
      height: calc(100% - 80px);
      display: flex;
      justify-content: center;
      align-items: center;
      color: #ffd700;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    `;
    gameArea.innerHTML = `
      <div>
        <div style="font-size: 48px; margin-bottom: 20px;">🃏</div>
        <div>POKER GAME</div>
        <div style="font-size: 18px; margin-top: 20px; opacity: 0.8;">Premi CHIUDI per tornare nel mondo</div>
      </div>
    `;
    
    // Assembla la finestra
    pokerContent.appendChild(pokerHeader);
    pokerContent.appendChild(gameArea);
    pokerModal.appendChild(pokerContent);
    document.body.appendChild(pokerModal);
    
    // Aggiungi animazione CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: scale(0.5) rotate(-10deg);
        }
        to {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
      }
    `;
    document.head.appendChild(style);
    
    console.log('Finra poker aperta - controlli mondo bloccati');
  }
  
  function closePokerWindow() {
    console.log('Chiusura finestra poker - ripristino controlli mondo...');
    
    // Rimuovi la finestra
    const pokerModal = document.getElementById('pokerModal');
    if (pokerModal) {
      document.body.removeChild(pokerModal);
    }
    
    // RIPRISTINA i controlli del mondo (nuovo sistema)
    if (playerController && playerController instanceof AdvancedPlayerController) {
      playerController.keys.w = false;
      playerController.keys.a = false;
      playerController.keys.s = false;
      playerController.keys.d = false;
    }
    
    console.log('Finestra poker chiusa - controlli mondo ripristinati');
  }

  function setupTouchJoystick() {
    const movementJoystick = document.querySelector('#movementJoystick .joystick-base');
    const movementHandle = document.querySelector('#movementJoystick .joystick-handle');
    const xButton = document.getElementById('xButton');
    
    // Setup event listeners per movement joystick
    movementJoystick.addEventListener('touchstart', handleTouchStart, { passive: false });
    movementJoystick.addEventListener('touchmove', handleTouchMove, { passive: false });
    movementJoystick.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Fallback mouse events per testing desktop
    movementJoystick.addEventListener('mousedown', handleMouseDown);
    movementJoystick.addEventListener('mousemove', handleMouseMove);
    movementJoystick.addEventListener('mouseup', handleMouseUp);
    movementJoystick.addEventListener('mouseleave', handleMouseUp);
    
    // Setup pulsante X per interagire
    if (xButton) {
      xButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (window.closeLoveMessage) {
          window.closeLoveMessage();
        } else if (playerController && playerController instanceof AdvancedPlayerController) {
          playerController.collectLoveNote();
        }
      });
      
      xButton.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.closeLoveMessage) {
          window.closeLoveMessage();
        } else if (playerController && playerController instanceof AdvancedPlayerController) {
          playerController.collectLoveNote();
        }
      });
    }
    
    // Setup touch per rotazione camera su tutto lo schermo
    let touchStartX = 0;
    let isRotatingCamera = false;
    
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1 && !movementJoystickActive) {
        touchStartX = e.touches[0].clientX;
        isRotatingCamera = true;
      }
    });
    
    document.addEventListener('touchmove', function(e) {
      if (isRotatingCamera && e.touches.length === 1 && playerController) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - touchStartX;
        playerController.updateCameraAngle(deltaX * 0.01);
        touchStartX = e.touches[0].clientX;
      }
    });
    
    document.addEventListener('touchend', function(e) {
      isRotatingCamera = false;
    });
  }
  
  function handleTouchStart(e) {
    e.preventDefault();
    
    const touch = e.touches[0];
    const joystickBase = document.querySelector('#movementJoystick .joystick-base');
    const rect = joystickBase.getBoundingClientRect();
    
    touchStartPos.x = touch.clientX - rect.left - rect.width / 2;
    touchStartPos.y = touch.clientY - rect.top - rect.height / 2;
    joystickActive = true;
  }

  function handleTouchMove(e) {
    if (!joystickActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const joystickBase = document.querySelector('#movementJoystick .joystick-base');
    const joystickHandle = document.querySelector('#movementJoystick .joystick-handle');
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
    
    // Aggiorna controlli movimento WASD
    if (playerController && playerController instanceof AdvancedPlayerController) {
      playerController.keys.w = joystickVector.y > 0.3;
      playerController.keys.s = joystickVector.y < -0.3;
      playerController.keys.a = joystickVector.x < -0.3;
      playerController.keys.d = joystickVector.x > 0.3;
    }
  }
  
  function handleTouchEnd(e) {
    if (!joystickActive) return;
    e.preventDefault();
    
    const joystickHandle = document.querySelector('#movementJoystick .joystick-handle');
    
    joystickActive = false;
    joystickVector.x = 0;
    joystickVector.y = 0;
    
    if (joystickHandle) {
      joystickHandle.style.transform = 'translate(0, 0)';
    }
    
    // Resetta controlli movimento WASD
    if (playerController && playerController instanceof AdvancedPlayerController) {
      playerController.keys.w = false;
      playerController.keys.a = false;
      playerController.keys.s = false;
      playerController.keys.d = false;
    }
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
    
    handleTouchMove(e);
  }
  
  function handleMouseUp(e) {
    handleTouchEnd(e);
  }

  function animate() {
    requestAnimationFrame(animate);
    
    // Calcola il deltaTime usando THREE.Clock per consistenza
    const deltaTime = clock.getDelta();

    // Aggiorna il mixer per le animazioni FBX
    if (mixer) {
      // GESTIONE LOOP SEAMLESS PER WALKING
      if (window.walkAction && currentAction === window.walkAction && walkAnimation) {
        // Quando l'animazione sta per finire, assicurati che il loop sia fluido
        if (window.walkAction.time >= walkAnimation.duration * 0.95) {
          // Riavvia l'animazione leggermente prima che finisca per evitare il salto
          window.walkAction.time = walkAnimation.duration * 0.05;
        }
      }
      
      mixer.update(deltaTime);
    }

    // Sistema unificato - usa solo AdvancedPlayerController
    if (playerController && playerController instanceof AdvancedPlayerController) {
      playerController.update(deltaTime);
    }
    
    // Animazione fluttuante bigliettini d'amore - più sottile
    if (loveNotes && loveNotes.length > 0) {
      const time = clock.getElapsedTime();
      loveNotes.forEach(note => {
        if (!note.userData.collected) {
          // Fluttuazione molto delicata
          const floatY = Math.sin(time * note.userData.floatSpeed + note.userData.floatOffset) * 0.05; // Più sottile
          note.position.y = 0.3 + floatY;
          
          // Rotazione molto leggera
          note.rotation.y += 0.002; // Più lenta
        }
      });
      
      // Mostra/nascondi indicatore bigliettino
      if (nearbyNote) {
        showLoveNoteIndicator();
      } else {
        hideLoveNoteIndicator();
      }
    }
    
    // Rendering
    renderer.render(scene, camera);
  }

  // Inizializza quando la pagina è pronta
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
  } else {
    initScene();
  }
  
  // Setup toggle camera button
  function setupToggleCameraButton() {
    const toggleBtn = document.getElementById('toggleCameraBtn');
    if (toggleBtn && playerController) {
      toggleBtn.addEventListener('click', function() {
        const isEnabled = playerController.toggleFollowCamera();
        toggleBtn.textContent = isEnabled ? '📷 Camera: ON' : '📷 Camera: OFF';
        toggleBtn.style.background = isEnabled ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
      });
    }
  }
  
  // Chiama dopo che il player controller è inizializzato
  setTimeout(setupToggleCameraButton, 3000);
  
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
