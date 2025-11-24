// Bridge per Serena Open World - Scena three.js semplice con controlli WASD
(function() {
  'use strict';

  // Tracking primo passo per notifica principe
  let firstStepNotified = false;

  // Counter bigliettini d'amore
  let collectedLoveNotes = 0;
  let totalLoveNotes = 15; // 10 normali + 2 statue + 3 reconditi
  let loveNoteCounterElement = null;

  // Funzioni di input per il nuovo sistema
function onKeyDown(event) {
    // Gestisci prima l'interazione con X
    if (event.code === 'KeyX') {
        if (nearbyInteractable) {
            console.log('X pressed - interacting with:', nearbyInteractable.userData);
            if (nearbyInteractable.userData.isPokerTable) {
                openPokerWindow();
            }
        } else {
            console.log('X pressed - no nearby interactable object');
        }
        return;
    }
    
    // Gestisci X per raccogliere bigliettini d'amore (se non c'è interazione)
    if (event.code === 'KeyE') {
      if (window.closeWeddingMessage) {
        // Chiudi il messaggio di nozze
        window.closeWeddingMessage();
      } else if (window.closeLoveMessage) {
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
        
        // Controlla primo passo per notifica principe
        if (!firstStepNotified) {
          firstStepNotified = true;
          console.log('🚶‍♀️ PRIMO PASSO RILEVATO! Avvio notifica principe...');
          setTimeout(() => {
            showPrinceMessage();
            playNotificationSound();
          }, 500);
        }
        
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
      collectedLoveNotes++;
      
      // Mostra il counter al primo bigliettino
      if (collectedLoveNotes === 1) {
        showLoveNoteCounter();
      }
      
      // Aggiorna il counter
      updateLoveNoteCounter();
      
      // Mostra il messaggio d'amore
      this.showLoveMessage(nearbyNote.userData.message);
      
      console.log(`Bigliettino d'amore raccolto! (${collectedNotes}/${loveNotes.length})`);
      
      // Controlla se ha raccolto tutti i bigliettini
      if (collectedNotes === loveNotes.length) {
        this.showWeddingCongratulations();
        // Nascondi il counter dopo il messaggio finale
        setTimeout(() => {
          hideLoveNoteCounter();
        }, 15000); // Aspetta 15 secondi (durata messaggio finale)
      }
      
      return true;
    }
    
    showWeddingCongratulations() {
      // Crea un elemento HTML per il messaggio finale
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 182, 193, 0.95));
        color: #8B0000;
        padding: 40px 50px;
        border-radius: 25px;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 15px 40px rgba(139, 0, 0, 0.4);
        border: 4px solid #ffd700;
        max-width: 500px;
        animation: weddingMessage 1s ease-out;
      `;
      messageDiv.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 20px;">🎺🎉 COMPLIMENTI SERENA! 🎉🎺</div>
        <div style="line-height: 1.6; margin-bottom: 20px;">Il tuo viaggio di nozze è sempre più vicino...</div>
        <div style="font-size: 18px; opacity: 0.9;">Hai raccolto tutti i 10 bigliettini d'amore! 💕</div>
        <div style="margin-top: 25px; font-size: 16px; opacity: 0.8;">Premi X per chiudere</div>
      `;
      
      // Aggiungi animazione CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes weddingMessage {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(messageDiv);
      
      // Suona le trombe con Audio API interno
      this.playTrumpetSound();
      
      // Funzione per chiudere il messaggio
      window.closeWeddingMessage = function() {
        if (messageDiv.parentNode) {
          document.body.removeChild(messageDiv);
        }
        if (style.parentNode) {
          document.head.removeChild(style);
        }
        delete window.closeWeddingMessage;
      };
      
      // Auto-chiusura dopo 15 secondi
      setTimeout(window.closeWeddingMessage, 15000);
    }
    
    playTrumpetSound() {
      try {
        // Crea contesto audio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        console.log('🎵🎉 JINGLE FESTOSO AVVIATO! 🎉🎵');
        
        // JINGLE COMPLETO - 3 parti con strumenti diversi
        
        // PARTE 1: Fanfare trombe iniziale
        const fanfareNotes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        fanfareNotes.forEach((frequency, index) => {
          setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'square'; // Tromba
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.6);
          }, index * 150);
        });
        
        // PARTE 2: Melodia festosa con campane
        setTimeout(() => {
          const melodyNotes = [
            783.99, 659.25, 523.25, 659.25,  // G5, E5, C5, E5
            783.99, 880.00, 987.77, 1046.50   // G5, A5, B5, C6
          ];
          
          melodyNotes.forEach((frequency, index) => {
            setTimeout(() => {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.type = 'sine'; // Campane cristalline
              oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
              
              gainNode.gain.setValueAtTime(0, audioContext.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            }, index * 120);
          });
        }, 800);
        
        // PARTE 3: Armonia finale con coro
        setTimeout(() => {
          // Suono coro/organ per finale maestoso
          const chordFrequencies = [523.25, 659.25, 783.99, 1046.50]; // Maggiore C
          
          chordFrequencies.forEach((frequency) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'triangle'; // Suono organ/chorus
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1.0);
          });
          
          // Aggiungi un suono di piatti/cimbali per il finale
          const cymbalOscillator = audioContext.createOscillator();
          const cymbalGain = audioContext.createGain();
          const cymbalFilter = audioContext.createBiquadFilter();
          
          cymbalOscillator.connect(cymbalFilter);
          cymbalFilter.connect(cymbalGain);
          cymbalGain.connect(audioContext.destination);
          
          cymbalFilter.type = 'highpass';
          cymbalFilter.frequency.setValueAtTime(3000, audioContext.currentTime);
          
          cymbalOscillator.type = 'sawtooth';
          cymbalOscillator.frequency.setValueAtTime(8000, audioContext.currentTime);
          
          cymbalGain.gain.setValueAtTime(0.3, audioContext.currentTime);
          cymbalGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          cymbalOscillator.start(audioContext.currentTime);
          cymbalOscillator.stop(audioContext.currentTime + 0.5);
          
        }, 2000);
        
        // RITMO: Batteria leggera festosa
        this.addFestiveDrums(audioContext);
        
      } catch (error) {
        console.log('🎵 Errore jingle festoso:', error);
        // Fallback: mostra un messaggio visivo animato
        this.showFestiveVisualFallback();
      }
    }
    
    addFestiveDrums(audioContext) {
      // Aggiungi un ritmo leggero di batteria festosa
      const kickPattern = [0, 500, 1000, 1500]; // Pattern bass drum
      
      kickPattern.forEach((time) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          oscillator.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(100, audioContext.currentTime);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(60, audioContext.currentTime); // Bass drum
          
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        }, time);
      });
    }
    
    showFestiveVisualFallback() {
      const visualFallback = document.createElement('div');
      visualFallback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24);
        color: white;
        padding: 30px 40px;
        border-radius: 20px;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        z-index: 10002;
        animation: festivePulse 1s ease-out infinite;
        box-shadow: 0 10px 30px rgba(255, 107, 107, 0.5);
      `;
      visualFallback.innerHTML = '🎵🎉 JINGLE FESTOSO! 🎉🎵';
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes festivePulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(visualFallback);
      
      setTimeout(() => {
        if (visualFallback.parentNode) {
          document.body.removeChild(visualFallback);
        }
        if (style.parentNode) {
          document.head.removeChild(style);
        }
      }, 2000);
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
    
    // Aggiungi 2 bigliettini su statue con minacce al principe
    const statuePositions = [
      { x: 25, y: 1.5, z: 25 }, // Statua 1 - angolo remoto
      { x: -20, y: 1.5, z: -15 } // Statua 2 - area isolata
    ];
    
    const statueThreatMessages = [
      "Il principe Stefano morirà se osa toccare Serena... La mia gelosia non ha limiti!",
      "Un pazzo innamorato scrive: Stefano, stai lontano da Serena o sarai la tua fine!"
    ];
    
    statuePositions.forEach((pos, index) => {
      // Crea la statua
      const statueGeometry = new THREE.ConeGeometry(1.5, 4, 8); // Cono per sembrare statua
      const statueMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888, // Grigio pietra
        emissive: 0x222222,
        shininess: 10
      });
      const statue = new THREE.Mesh(statueGeometry, statueMaterial);
      statue.position.set(pos.x, pos.y, pos.z);
      statue.castShadow = true;
      statue.receiveShadow = true;
      scene.add(statue);
      
      // Aggiungi bigliettino sulla statua
      const noteGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.05);
      const noteMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        emissive: 0xff0000, // Rosso sangue per le minacce
        emissiveIntensity: 0.3
      });
      const note = new THREE.Mesh(noteGeometry, noteMaterial);
      note.position.set(pos.x, pos.y + 2.2, pos.z);
      note.rotation.y = Math.random() * Math.PI * 2;
      
      note.userData = {
        isLoveNote: true,
        collected: false,
        message: statueThreatMessages[index],
        type: 'statue_threat'
      };
      
      // Aggiungi bordo rosso sangue
      const borderGeometry = new THREE.EdgesGeometry(noteGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000, // Rosso sangue
        linewidth: 2 
      });
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);
      note.add(border);
      
      note.userData.floatOffset = Math.random() * Math.PI * 2;
      note.userData.floatSpeed = 0.3; // Fluttuazione più lenta e inquietante
      
      scene.add(note);
      loveNotes.push(note);
    });
    
    // Aggiungi 3 bigliettini verdi negli angoli più reconditi con messaggi criptici
    const hiddenCornerMessages = [
      "Il vero amore non si urla, si sussurra... ma Stefano non sa ascoltare...",
      "Tra le righe di questo bigliettino c'è un segreto: Serena ama, ma chi?",
      "Il matrimonio è un inizio, ma di chi? Forse la risposta è nel vento..."
    ];
    
    const hiddenCornerPositions = [
      { x: 35, y: 0.3, z: -30 }, // Angolo estremo nord-est
      { x: -30, y: 0.3, z: 35 },  // Angolo estremo sud-ovest  
      { x: 30, y: 0.3, z: 30 }    // Angolo estremo sud-est
    ];
    
    hiddenCornerPositions.forEach((pos, index) => {
      const noteGeometry = new THREE.BoxGeometry(0.7, 0.5, 0.05);
      const noteMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x90EE90, // Verde chiaro prato
        emissive: 0x228B22, // Verde foresta
        emissiveIntensity: 0.2
      });
      const note = new THREE.Mesh(noteGeometry, noteMaterial);
      note.position.set(pos.x, pos.y, pos.z);
      note.rotation.y = Math.random() * Math.PI * 2;
      
      note.userData = {
        isLoveNote: true,
        collected: false,
        message: hiddenCornerMessages[index],
        type: 'hidden_corner'
      };
      
      // Aggiungi bordo verde
      const borderGeometry = new THREE.EdgesGeometry(noteGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({ 
        color: 0x228B22, // Verde foresta
        linewidth: 1 
      });
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);
      note.add(border);
      
      note.userData.floatOffset = Math.random() * Math.PI * 2;
      note.userData.floatSpeed = 0.4; // Fluttuazione molto delicata
      
      scene.add(note);
      loveNotes.push(note);
    });
    
    console.log('✅ Creati', loveNotes.length, 'bigliettini d\'amore totali (10 normali + 2 statue + 3 reconditi)!');
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
    
    // Crea una siepe composta da più sfere di foglie - più piccole e verde scuro
    const hedgeColors = [0x1B5E20, 0x2E7D32, 0x388E3C, 0x004D40]; // Verde scuro
    
    for (let i = 0; i < 3; i++) { // Ridotto da 5 a 3
      for (let j = 0; j < 2; j++) { // Ridotto da 3 a 2
        const foliageGeometry = new THREE.SphereGeometry(0.8 + Math.random() * 0.3); // Più piccolo
        const foliageMaterial = new THREE.MeshLambertMaterial({ 
          color: hedgeColors[Math.floor(Math.random() * hedgeColors.length)]
        });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        
        foliage.position.set(
          (i - 1) * 0.8 + (Math.random() - 0.5) * 0.3, // Più compatto
          0.8 + j * 0.8, // Più basso
          (Math.random() - 0.5) * 0.8
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
    
    // Event listener per pulsante anteprima finale
    const previewFinalBtn = document.getElementById('previewFinalBtn');
    if (previewFinalBtn) {
      previewFinalBtn.addEventListener('click', function() {
        console.log('🎺 ANTEPRIMA FINALE ATTIVATA!');
        if (playerController && playerController.showWeddingCongratulations) {
          playerController.showWeddingCongratulations();
        }
      });
    }
    
    // Funzioni globali per controlli esterni
    window.openPokerWindow = openPokerWindow;
    window.closePokerWindow = closePokerWindow;
    
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

  // Controlla se c'è un hash URL per accesso diretto alla stanza poker
  function checkDirectPokerAccess() {
    if (window.location.hash && window.location.hash.length > 1) {
      const hashRoomCode = window.location.hash.substring(1);
      console.log('🔗 Rilevato accesso diretto alla sala poker:', hashRoomCode);
      
      // Nascondi il mondo e apri direttamente il poker
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.display = 'none';
      }
      
      // Nascondi elementi del mondo
      const worldElements = document.querySelectorAll('#movementJoystick, #xButton, .info-panel');
      worldElements.forEach(el => el.style.display = 'none');
      
      // Apri direttamente la finestra poker con il roomCode
      setTimeout(() => {
        openPokerWindowWithRoom(hashRoomCode);
      }, 500);
      
      return true; // Indica che stiamo andando direttamente al poker
    }
    return false;
  }
  
  // Funzione per aprire poker con roomCode specifico
  function openPokerWindowWithRoom(roomCode) {
    console.log('🎰 Apertura diretta sala poker:', roomCode);
    
    // Inizializza il gioco del poker con il roomCode specifico
    initializePokerGameWithRoom(roomCode);
  }
  
  // Funzione per inizializzare poker con roomCode specifico
  function initializePokerGameWithRoom(roomCode) {
    console.log('🎰 Inizializzazione diretta sala poker:', roomCode);
    
    // Crea la finestra modal per il poker
    createPokerModal(roomCode);
  }
  
  // Controlla accesso diretto all'avvio
  document.addEventListener('DOMContentLoaded', function() {
    checkDirectPokerAccess();
  });
  
  // Controlla anche subito (per quando il DOM è già caricato)
  checkDirectPokerAccess();
  
  // Funzione per creare la finestra modal poker
  function createPokerModal(roomCode = null) {
    // Funzione per rilevare mobile
    function isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
             (window.innerWidth <= 768);
    }
    
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
    
    // Crea la finestra modal per il poker - SISTEMA TEXAS HOLD'EM MULTIPLAYER
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
    
    // Contenuto della finestra poker - RESPONSIVE PER MOBILE
    const pokerContent = document.createElement('div');
    pokerContent.style.cssText = `
      background: linear-gradient(145deg, #2d2d2d, #1a1a1a);
      border: 4px solid #ffd700;
      border-radius: 20px;
      padding: ${isMobile() ? '10px' : '20px'};
      width: 95%;
      max-width: ${isMobile() ? '100%' : '1200px'};
      height: 95%;
      max-height: ${isMobile() ? '100vh' : '800px'};
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
      <div id="pokerGameContainer" style="width: 100%; height: 100%; display: flex; flex-direction: column;">
        <!-- Header con info e link -->
        <div style="background: rgba(0,0,0,0.8); padding: ${isMobile() ? '8px' : '15px'}; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div style="min-width: 200px;">
            <h3 style="color: #ffd700; margin: 0; font-size: ${isMobile() ? '14px' : '18px'};">🎰 TEXAS HOLD'EM - 4 GIOCATORI + DEALER</h3>
            <p style="color: white; margin: 2px 0 0 0; font-size: ${isMobile() ? '10px' : '14px'};">Sala: <span id="roomCode">${roomCode || generateRoomCode()}</span></p>
          </div>
          <div style="text-align: right; min-width: 150px;">
            <button id="copyLinkBtn" style="background: #4CAF50; color: white; border: none; padding: ${isMobile() ? '4px 8px' : '8px 15px'}; border-radius: 5px; cursor: pointer; font-size: ${isMobile() ? '10px' : '12px'}; margin-bottom: 5px;">📋 Copia Link</button>
            <div id="shareLink" style="color: #4CAF50; font-size: ${isMobile() ? '8px' : '10px'}; word-break: break-all; max-width: 200px;"></div>
          </div>
        </div>
        
        <!-- Tavolo da poker -->
        <div style="flex: 1; display: flex; justify-content: center; align-items: center; position: relative; min-height: ${isMobile() ? '250px' : '300px'};">
          <!-- Tavolo -->
          <div style="width: ${isMobile() ? '280px' : '400px'}; height: ${isMobile() ? '180px' : '250px'}; background: radial-gradient(ellipse at center, #2d5f2d, #1a3d1a); border: ${isMobile() ? '4px' : '8px'} solid #8B4513; border-radius: ${isMobile() ? '100px' : '150px'}; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <!-- Area carte comunità -->
            <div id="communityCards" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; gap: ${isMobile() ? '2px' : '5px'};">
              <!-- Carte comunità appariranno qui -->
            </div>
            <!-- Dealer -->
            <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #ffd700; color: black; padding: ${isMobile() ? '3px 6px' : '5px 10px'}; border-radius: 15px; font-size: ${isMobile() ? '8px' : '12px'}; font-weight: bold;">DEALER</div>
          </div>
          
          <!-- Posto Dealer (bloccato) -->
          <div id="playerSeat1" class="player-seat dealer-seat" style="position: absolute; top: 5%; left: 50%; transform: translateX(-50%); width: ${isMobile() ? '80px' : '120px'}; height: ${isMobile() ? '60px' : '80px'}; background: rgba(255, 215, 0, 0.3); border: 2px solid #ffd700; pointer-events: none;">
            <div class="seat-content" style="font-size: ${isMobile() ? '9px' : '12px'};">🤖 DEALER</div>
          </div>
          <!-- Posti giocatori (4 posti disponibili) -->
          <div id="playerSeat2" class="player-seat" style="position: absolute; top: 25%; right: 2%; width: ${isMobile() ? '80px' : '120px'}; height: ${isMobile() ? '60px' : '80px'};">
            <div class="seat-content" style="font-size: ${isMobile() ? '9px' : '12px'};">🪑 Posto 2</div>
          </div>
          <div id="playerSeat3" class="player-seat" style="position: absolute; bottom: 5%; right: 15%; width: ${isMobile() ? '80px' : '120px'}; height: ${isMobile() ? '60px' : '80px'};">
            <div class="seat-content" style="font-size: ${isMobile() ? '9px' : '12px'};">🪑 Posto 3</div>
          </div>
          <div id="playerSeat4" class="player-seat" style="position: absolute; bottom: 5%; left: 15%; width: ${isMobile() ? '80px' : '120px'}; height: ${isMobile() ? '60px' : '80px'};">
            <div class="seat-content" style="font-size: ${isMobile() ? '9px' : '12px'};">🪑 Posto 4</div>
          </div>
          <div id="playerSeat5" class="player-seat" style="position: absolute; top: 25%; left: 2%; width: ${isMobile() ? '80px' : '120px'}; height: ${isMobile() ? '60px' : '80px'};">
            <div class="seat-content" style="font-size: ${isMobile() ? '9px' : '12px'};">🪑 Posto 5</div>
          </div>
        </div>
        
        <!-- Area controlli -->
        <div style="background: rgba(0,0,0,0.8); padding: ${isMobile() ? '8px' : '15px'}; border-radius: 10px; margin-top: 10px;">
          <div id="gameControls" style="display: flex; justify-content: center; gap: ${isMobile() ? '4px' : '10px'}; margin-bottom: 8px; flex-wrap: wrap;">
            <button id="readyBtn" style="background: #4CAF50; color: white; border: none; padding: ${isMobile() ? '6px 10px' : '10px 20px'}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${isMobile() ? '10px' : '14px'};">🎯 PRONTO</button>
            <button id="checkBtn" style="background: #2196F3; color: white; border: none; padding: ${isMobile() ? '6px 10px' : '10px 20px'}; border-radius: 5px; cursor: pointer; display: none; font-size: ${isMobile() ? '10px' : '14px'};">✋ CHECK</button>
            <button id="callBtn" style="background: #FF9800; color: white; border: none; padding: ${isMobile() ? '6px 10px' : '10px 20px'}; border-radius: 5px; cursor: pointer; display: none; font-size: ${isMobile() ? '10px' : '14px'};">📞 CALL</button>
            <button id="raiseBtn" style="background: #f44336; color: white; border: none; padding: ${isMobile() ? '6px 10px' : '10px 20px'}; border-radius: 5px; cursor: pointer; display: none; font-size: ${isMobile() ? '10px' : '14px'};">🔥 RAISE</button>
            <button id="foldBtn" style="background: #9E9E9E; color: white; border: none; padding: ${isMobile() ? '6px 10px' : '10px 20px'}; border-radius: 5px; cursor: pointer; display: none; font-size: ${isMobile() ? '10px' : '14px'};">🏳️ FOLD</button>
          </div>
          <div id="gameInfo" style="text-align: center; color: white; font-size: ${isMobile() ? '11px' : '14px'};">
            <div>Timer: <span id="turnTimer">30</span>s | Fiches: <span id="playerChips">10,000</span> | Pot: <span id="potAmount">0</span></div>
          </div>
        </div>
      </div>
      
      <style>
        .player-seat {
          background: rgba(0,0,0,0.8);
          border: 2px solid #666;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .player-seat.occupied {
          border-color: #4CAF50;
          background: rgba(76, 175, 80, 0.2);
        }
        .player-seat.current-turn {
          border-color: #ffd700;
          background: rgba(255, 215, 0, 0.2);
          animation: pulse 1s infinite;
        }
        .player-seat.dealer-seat {
          background: rgba(255, 215, 0, 0.3) !important;
          border: 2px solid #ffd700 !important;
          opacity: 0.8;
          cursor: not-allowed;
        }
        .seat-content {
          color: white;
          text-align: center;
          padding: 5px;
        }
        .player-info {
          font-size: 9px;
          opacity: 0.8;
        }
        @keyframes pulse {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
        }
        .card {
          background: white;
          border: 1px solid #333;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: black;
        }
        ${isMobile() ? `
        .card {
          width: 25px;
          height: 35px;
          font-size: 10px;
        }
        ` : `
        .card {
          width: 40px;
          height: 60px;
          font-size: 16px;
        }
        `}
      </style>
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
    
    console.log('Finestra poker aperta - controlli mondo bloccati');
    
    // Inizializza il gioco del poker con il roomCode
    initializePokerGame(roomCode);
  }
  
  function openPokerWindow() {
    console.log('Apertura finestra poker - blocco controlli mondo...');
    
    // Usa la funzione createPokerModal senza roomCode specifico
    createPokerModal();
  }
  
  // Funzioni di supporto per il poker
  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  function initializePokerGame(roomCode = null) {
    console.log('Inizializzazione sistema Texas Hold\'em...');
    
    // Inizializza sistema multiplayer
    pokerMultiplayer = new PokerMultiplayer();
    
    // Usa il roomCode passato o genera uno nuovo
    const finalRoomCode = roomCode || document.getElementById('roomCode').textContent;
    
    // Se abbiamo un roomCode passato, aggiornalo nell'interfaccia
    if (roomCode) {
      document.getElementById('roomCode').textContent = roomCode;
    }
    
    // Genera e mostra il link condivisibile
    const shareLink = `${window.location.origin}${window.location.pathname}#${finalRoomCode}`;
    document.getElementById('shareLink').textContent = shareLink;
    
    // Unisciti o crea la stanza multiplayer
    pokerMultiplayer.createOrJoinRoom(finalRoomCode);
    
    // Setup eventi pulsanti
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(shareLink).then(() => {
        alert('Link copiato negli appunti!');
      });
    });
    
    // Chiedi nickname e assegna posto automatico
    setTimeout(() => {
      askNicknameAndAssignSeat();
    }, 500);
    
    // Avvia sincronizzazione multiplayer
    if (pokerMultiplayer) {
      pokerMultiplayer.startSync();
    }
  }
  
  function askNicknameAndAssignSeat() {
    const nickname = prompt('Inserisci il tuo nickname per giocare a poker:');
    if (!nickname) return;
    
    // Trova il primo posto disponibile (escludendo posto 1 - Dealer)
    let assignedSeat = null;
    for (let i = 2; i <= 5; i++) { // Inizia da 2, il posto 1 è del Dealer
      const seat = document.getElementById(`playerSeat${i}`);
      if (seat && !seat.classList.contains('occupied')) {
        assignedSeat = i;
        break;
      }
    }
    
    if (assignedSeat) {
      occupySeat(assignedSeat, nickname);
    } else {
      alert('Tutti i posti sono occupati! Attendi che si liberi un posto.');
    }
  }
  
  function occupySeat(seatNumber, nickname) {
    const seat = document.getElementById(`playerSeat${seatNumber}`);
    seat.classList.add('occupied');
    seat.innerHTML = `
      <div class="seat-content">
        <div style="font-size: ${isMobile ? '14px' : '16px'}; margin-bottom: 5px;">👤</div>
        <div style="font-weight: bold;">${nickname}</div>
        <div class="player-info">10,000 fish</div>
        <div class="player-info" style="margin-top: 5px;" id="playerCards${seatNumber}">🎴 🎴</div>
      </div>
    `;
    
    // Salva i dati del giocatore
    seat.dataset.nickname = nickname;
    seat.dataset.chips = '10000';
    seat.dataset.seatNumber = seatNumber;
    
    console.log(`Giocatore ${nickname} seduto al posto ${seatNumber}`);
    
    // Notifica multiplayer che un giocatore si è unito
    if (pokerMultiplayer) {
      pokerMultiplayer.broadcastPlayerJoined(nickname, seatNumber);
    }
    
    // Controlla se tutti i posti sono occupati
    checkAllPlayersReady();
  }
  
  function checkAllPlayersReady() {
    // Controlla solo i posti giocatori (2-5), escludendo il posto 1 (Dealer)
    const occupiedSeats = document.querySelectorAll('.player-seat.occupied:not(.dealer-seat)').length;
    console.log(`Posti occupati: ${occupiedSeats}/4`); // 4 giocatori + 1 Dealer
    
    if (occupiedSeats >= 2) {
      // Mostra pulsante PRONTO se ci sono almeno 2 giocatori
      document.getElementById('readyBtn').style.display = 'inline-block';
    }
  }
  
  // Sistema Multiplayer Base - LocalStorage Sincronizzazione
  class PokerMultiplayer {
    constructor() {
      this.roomCode = null;
      this.playerId = this.generatePlayerId();
      this.isHost = false;
      this.syncInterval = null;
      
      // Inizializza ascoltatore eventi
      this.setupEventListener();
    }
    
    generatePlayerId() {
      return 'player_' + Math.random().toString(36).substr(2, 9);
    }
    
    setupEventListener() {
      // Ascolta cambiamenti nel localStorage
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('poker_')) {
          this.handleStorageChange(e.key, e.newValue);
        }
      });
    }
    
    handleStorageChange(key, newValue) {
      if (!newValue) return;
      
      try {
        const data = JSON.parse(newValue);
        console.log('🔄 Ricevuto aggiornamento multiplayer:', data);
        
        // Processa diversi tipi di messaggi
        switch (data.type) {
          case 'player_joined':
            this.handlePlayerJoined(data);
            break;
          case 'game_started':
            this.handleGameStarted(data);
            break;
          case 'game_state':
            this.handleGameStateUpdate(data);
            break;
          case 'player_action':
            this.handlePlayerAction(data);
            break;
        }
      } catch (error) {
        console.error('Errore parsing messaggio multiplayer:', error);
      }
    }
    
    createOrJoinRoom(roomCode) {
      this.roomCode = roomCode;
      const roomKey = `poker_${roomCode}`;
      const existingRoom = localStorage.getItem(roomKey);
      
      if (!existingRoom) {
        // Crea nuova stanza (host)
        this.isHost = true;
        const roomData = {
          type: 'room_info',
          roomCode: roomCode,
          host: this.playerId,
          players: [],
          gameState: pokerGameState,
          timestamp: Date.now()
        };
        localStorage.setItem(roomKey, JSON.stringify(roomData));
        console.log('🏠 Stanza creata:', roomCode, 'da host:', this.playerId);
      } else {
        // Unisciti a stanza esistente
        this.isHost = false;
        try {
          const roomData = JSON.parse(existingRoom);
          console.log('🚪 Unione alla stanza esistente:', roomCode, 'host:', roomData.host);
          console.log('👥 Giocatori attuali:', roomData.players?.length || 0);
          
          // Carica i giocatori esistenti nell'interfaccia
          if (roomData.players && roomData.players.length > 0) {
            console.log('🔄 Caricamento giocatori esistenti...');
            roomData.players.forEach(player => {
              if (player.playerId !== this.playerId) {
                const seat = document.getElementById(`playerSeat${player.seatNumber}`);
                if (seat && !seat.classList.contains('occupied')) {
                  // Mostra i giocatori esistenti senza notificare (sono già nella stanza)
                  seat.classList.add('occupied');
                  seat.innerHTML = `
                    <div class="seat-content">
                      <div style="font-size: ${isMobile ? '14px' : '16px'}; margin-bottom: 5px;">👤</div>
                      <div style="font-weight: bold;">${player.nickname}</div>
                      <div class="player-info">10,000 fish</div>
                      <div class="player-info" style="margin-top: 5px;" id="playerCards${player.seatNumber}">🎴 🎴</div>
                    </div>
                  `;
                  seat.dataset.nickname = player.nickname;
                  seat.dataset.chips = '10000';
                  seat.dataset.seatNumber = player.seatNumber;
                  console.log(`✅ Caricato giocatore esistente: ${player.nickname} al posto ${player.seatNumber}`);
                }
              }
            });
          }
          
        } catch (error) {
          console.error('Errore parsing stanza esistente:', error);
        }
      }
    }
    
    broadcastPlayerJoined(nickname, seatNumber) {
      if (!this.roomCode) return;
      
      const message = {
        type: 'player_joined',
        playerId: this.playerId,
        nickname: nickname,
        seatNumber: seatNumber,
        timestamp: Date.now()
      };
      
      this.broadcast(message);
    }
    
    broadcastGameStarted() {
      if (!this.roomCode || !this.isHost) return;
      
      const message = {
        type: 'game_started',
        gameState: pokerGameState,
        timestamp: Date.now()
      };
      
      this.broadcast(message);
    }
    
    broadcast(message) {
      if (!this.roomCode) return;
      
      const roomKey = `poker_${this.roomCode}`;
      localStorage.setItem(roomKey, JSON.stringify(message));
    }
    
    handlePlayerJoined(data) {
      if (data.playerId === this.playerId) return; // Ignora se siamo noi
      
      console.log(`👋 Giocatore ${data.nickname} si è unito al posto ${data.seatNumber}`);
      
      // Aggiorna la stanza con il nuovo giocatore
      const roomKey = `poker_${this.roomCode}`;
      const currentRoom = localStorage.getItem(roomKey);
      
      if (currentRoom) {
        try {
          const roomData = JSON.parse(currentRoom);
          
          // Aggiungi il giocatore alla lista
          if (!roomData.players) roomData.players = [];
          
          // Controlla se il giocatore è già nella lista
          const existingPlayer = roomData.players.find(p => p.playerId === data.playerId);
          if (!existingPlayer) {
            roomData.players.push({
              playerId: data.playerId,
              nickname: data.nickname,
              seatNumber: data.seatNumber,
              timestamp: Date.now()
            });
            
            // Salva la stanza aggiornata
            localStorage.setItem(roomKey, JSON.stringify(roomData));
            console.log('📝 Stanza aggiornata con nuovo giocatore');
          }
          
          // Aggiorna l'interfaccia con il nuovo giocatore
          const seat = document.getElementById(`playerSeat${data.seatNumber}`);
          if (seat && !seat.classList.contains('occupied')) {
            occupySeat(data.seatNumber, data.nickname);
          }
          
        } catch (error) {
          console.error('Errore aggiornamento stanza:', error);
        }
      }
    }
    
    handleGameStarted(data) {
      console.log('🎮 Partita avviata dal host');
      
      // Sincronizza lo stato del gioco
      pokerGameState = data.gameState;
      
      // Aggiorna l'interfaccia
      this.updateUIFromGameState();
    }
    
    handleGameStateUpdate(data) {
      console.log('🔄 Aggiornamento stato gioco');
      pokerGameState = data.gameState;
      this.updateUIFromGameState();
    }
    
    handlePlayerAction(data) {
      console.log(`🎯 Azione giocatore ${data.playerId}: ${data.action}`);
      // Processa l'azione ricevuta da altri giocatori
    }
    
    updateUIFromGameState() {
      // Aggiorna pot, community cards, etc.
      document.getElementById('potAmount').textContent = pokerGameState.pot.toLocaleString();
      
      // Aggiorna carte comunità
      const communityCardsDiv = document.getElementById('communityCards');
      communityCardsDiv.innerHTML = '';
      pokerGameState.communityCards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.textContent = `${card.rank}${card.suit}`;
        communityCardsDiv.appendChild(cardDiv);
      });
    }
    
    startSync() {
      // Sincronizzazione periodica
      this.syncInterval = setInterval(() => {
        if (this.isHost && this.roomCode) {
          // Host invia aggiornamenti periodici dello stato
          this.broadcast({
            type: 'game_state',
            gameState: pokerGameState,
            timestamp: Date.now()
          });
        }
      }, 2000); // Ogni 2 secondi
    }
    
    stopSync() {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    }
    
    leaveRoom() {
      if (this.roomCode) {
        const roomKey = `poker_${this.roomCode}`;
        localStorage.removeItem(roomKey);
        this.roomCode = null;
        this.stopSync();
      }
    }
  }
  
  // Istanza globale del multiplayer
  let pokerMultiplayer = null;
  
  // Variabili globali per il gioco
  let pokerGameState = {
    players: [],
    currentPlayer: 0,
    pot: 0,
    communityCards: [],
    deck: [],
    gamePhase: 'waiting', // waiting, preflop, flop, turn, river, showdown
    turnTimer: 30,
    timerInterval: null
  };
  
  // Event listener per pulsante PRONTO
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'readyBtn') {
      startPokerGame();
    } else if (e.target && e.target.id === 'checkBtn') {
      playerAction('check');
    } else if (e.target && e.target.id === 'callBtn') {
      playerAction('call');
    } else if (e.target && e.target.id === 'raiseBtn') {
      playerAction('raise');
    } else if (e.target && e.target.id === 'foldBtn') {
      playerAction('fold');
    }
  });
  
  function startPokerGame() {
    console.log('Avvio partita Texas Hold\'em!');
    
    // Nascondi pulsante PRONTO
    document.getElementById('readyBtn').style.display = 'none';
    
    // Blocca nuovi ingressi
    const roomCode = document.getElementById('roomCode').textContent;
    document.getElementById('shareLink').innerHTML = `<span style="color: #ff6b6b;">Partita in corso - Sala ${roomCode} chiusa</span>`;
    
    // Inizializza il mazzo e distribuisci le carte
    initializeDeck();
    dealInitialCards();
    
    // Inizia il primo turno
    startBettingRound('preflop');
    
    // Avvia il timer del dealer
    startDealerTimer();
    
    // Notifica tutti i giocatori che la partita è iniziata
    if (pokerMultiplayer && pokerMultiplayer.isHost) {
      pokerMultiplayer.broadcastGameStarted();
    }
  }
  
  function initializeDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    pokerGameState.deck = [];
    for (let suit of suits) {
      for (let rank of ranks) {
        pokerGameState.deck.push({ suit, rank, value: getCardValue(rank) });
      }
    }
    
    // Mescola il mazzo
    shuffleDeck();
  }
  
  function getCardValue(rank) {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank);
  }
  
  function shuffleDeck() {
    for (let i = pokerGameState.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pokerGameState.deck[i], pokerGameState.deck[j]] = [pokerGameState.deck[j], pokerGameState.deck[i]];
    }
    console.log('Mazzo mescolato dal dealer');
  }
  
  function dealInitialCards() {
    // Distribuisci 2 carte a ogni giocatore
    const occupiedSeats = document.querySelectorAll('.player-seat.occupied:not(.dealer-seat)');
    occupiedSeats.forEach((seat, index) => {
      const card1 = pokerGameState.deck.pop();
      const card2 = pokerGameState.deck.pop();
      
      // Salva le carte del giocatore
      seat.dataset.cards = JSON.stringify([card1, card2]);
      
      // Mostra le carte al giocatore (solo se è il giocatore corrente)
      const seatNumber = seat.dataset.seatNumber;
      const cardDisplay = document.getElementById(`playerCards${seatNumber}`);
      
      if (cardDisplay) {
        // Per ora mostriamo le carte a tutti (nel multiplayer reale solo al proprietario)
        cardDisplay.innerHTML = `
          <span style="background: white; color: black; padding: 2px 4px; border-radius: 3px; margin: 0 1px; font-size: 10px; font-weight: bold;">
            ${card1.rank}${card1.suit}
          </span>
          <span style="background: white; color: black; padding: 2px 4px; border-radius: 3px; margin: 0 1px; font-size: 10px; font-weight: bold;">
            ${card2.rank}${card2.suit}
          </span>
        `;
        cardDisplay.style.fontSize = isMobile ? '8px' : '10px';
      }
      
      console.log(`Carte distribuite a ${seat.dataset.nickname}: ${card1.rank}${card1.suit} ${card2.rank}${card2.suit}`);
    });
    
    console.log('Distribuite 2 carte a ogni giocatore - Inizio preflop');
  }
  
  function startBettingRound(phase) {
    pokerGameState.gamePhase = phase;
    pokerGameState.currentPlayer = 0;
    
    // Mostra i pulsanti di azione
    const actionButtons = ['checkBtn', 'callBtn', 'raiseBtn', 'foldBtn'];
    actionButtons.forEach(btnId => {
      document.getElementById(btnId).style.display = 'inline-block';
    });
    
    // Evidenzia il primo giocatore
    highlightCurrentPlayer();
    
    console.log(`Inizio turno di ${phase}`);
  }
  
  function highlightCurrentPlayer() {
    // Rimuovi evidenziazioni precedenti
    document.querySelectorAll('.player-seat').forEach(seat => {
      seat.classList.remove('current-turn');
    });
    
    // Evidenzia il giocatore corrente
    const occupiedSeats = document.querySelectorAll('.player-seat.occupied');
    if (occupiedSeats[pokerGameState.currentPlayer]) {
      occupiedSeats[pokerGameState.currentPlayer].classList.add('current-turn');
    }
  }
  
  function startDealerTimer() {
    let timeLeft = 30;
    document.getElementById('turnTimer').textContent = timeLeft;
    
    pokerGameState.timerInterval = setInterval(() => {
      timeLeft--;
      document.getElementById('turnTimer').textContent = timeLeft;
      
      if (timeLeft <= 0) {
        // Auto-fold se il giocatore non agisce
        playerAction('fold');
      }
    }, 1000);
  }
  
  function playerAction(action) {
    clearInterval(pokerGameState.timerInterval);
    
    console.log(`Giocatore ${pokerGameState.currentPlayer + 1} fa: ${action}`);
    
    // Processa l'azione
    switch (action) {
      case 'check':
        // Passa al prossimo giocatore
        break;
      case 'call':
        // Paga la puntata minima
        addToPot(100);
        break;
      case 'raise':
        // Raddoppia la puntata
        addToPot(200);
        break;
      case 'fold':
        // Il giocatore esce dalla mano
        const currentPlayerSeat = document.querySelectorAll('.player-seat.occupied')[pokerGameState.currentPlayer];
        currentPlayerSeat.style.opacity = '0.5';
        break;
    }
    
    // Passa al prossimo giocatore
    nextPlayer();
  }
  
  function addToPot(amount) {
    pokerGameState.pot += amount;
    document.getElementById('potAmount').textContent = pokerGameState.pot.toLocaleString();
  }
  
  function nextPlayer() {
    pokerGameState.currentPlayer++;
    
    const occupiedSeats = document.querySelectorAll('.player-seat.occupied');
    
    // Controlla se il turno è completato
    if (pokerGameState.currentPlayer >= occupiedSeats.length) {
      // Passa alla fase successiva
      nextGamePhase();
    } else {
      // Continua con il prossimo giocatore
      highlightCurrentPlayer();
      startDealerTimer();
    }
  }
  
  function nextGamePhase() {
    switch (pokerGameState.gamePhase) {
      case 'preflop':
        // Mostra 3 carte comunità (flop)
        dealCommunityCards(3);
        startBettingRound('flop');
        break;
      case 'flop':
        // Mostra 1 carta comunità (turn)
        dealCommunityCards(1);
        startBettingRound('turn');
        break;
      case 'turn':
        // Mostra 1 carta comunità (river)
        dealCommunityCards(1);
        startBettingRound('river');
        break;
      case 'river':
        // Showdown - determina il vincitore
        showdown();
        break;
    }
  }
  
  function dealCommunityCards(count) {
    const communityCardsDiv = document.getElementById('communityCards');
    
    for (let i = 0; i < count; i++) {
      const card = pokerGameState.deck.pop();
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card';
      cardDiv.textContent = `${card.rank}${card.suit}`;
      communityCardsDiv.appendChild(cardDiv);
      
      pokerGameState.communityCards.push(card);
    }
  }
  
  function showdown() {
    console.log('SHOWDOWN - Determinazione vincitore');
    
    // Nascondi pulsanti di azione
    const actionButtons = ['checkBtn', 'callBtn', 'raiseBtn', 'foldBtn'];
    actionButtons.forEach(btnId => {
      document.getElementById(btnId).style.display = 'none';
    });
    
    // Determina il vincitore (semplificato)
    const occupiedSeats = document.querySelectorAll('.player-seat.occupied:not([style*="opacity: 0.5"])');
    if (occupiedSeats.length === 1) {
      // Un solo giocatore rimasto
      const winner = occupiedSeats[0];
      const nickname = winner.dataset.nickname;
      
      // Mostra messaggio vincitore
      alert(`🎉 ${nickname} vince ${pokerGameState.pot.toLocaleString()} fish!`);
      
      // Resetta il tavolo dopo 3 secondi
      setTimeout(resetPokerTable, 3000);
    }
  }
  
  function resetPokerTable() {
    console.log('Reset tavolo poker - nuova partita');
    
    // Pulisci le carte comunità
    document.getElementById('communityCards').innerHTML = '';
    
    // Resetta lo stato del gioco
    pokerGameState.pot = 0;
    pokerGameState.communityCards = [];
    pokerGameState.gamePhase = 'waiting';
    document.getElementById('potAmount').textContent = '0';
    
    // Rimuovi tutti i giocatori MA MANTieni il posto Dealer
    document.querySelectorAll('.player-seat').forEach(seat => {
      if (!seat.classList.contains('dealer-seat')) {
        // Resetta solo i posti giocatori (2-5)
        seat.classList.remove('occupied', 'current-turn');
        const seatNumber = seat.id.replace('playerSeat', '');
        seat.innerHTML = `<div class="seat-content" style="font-size: ${isMobile() ? '9px' : '12px'};">🪑 Posto ${seatNumber}</div>`;
        delete seat.dataset.nickname;
        delete seat.dataset.chips;
        delete seat.dataset.cards;
      }
    });
    
    // Riabilita nuovi ingressi
    const roomCode = generateRoomCode();
    document.getElementById('roomCode').textContent = roomCode;
    const shareLink = `${window.location.origin}${window.location.pathname}#${roomCode}`;
    document.getElementById('shareLink').innerHTML = `<div id="shareLink" style="color: #4CAF50; font-size: ${isMobile() ? '8px' : '10px'}; word-break: break-all;">${shareLink}</div>`;
    
    // Mostra nuovamente pulsante PRONTO
    document.getElementById('readyBtn').style.display = 'inline-block';
  }
  
  function closePokerWindow() {
    console.log('Chiusura finestra poker - ripristino controlli mondo...');
    
    // Ferma sincronizzazione multiplayer
    if (pokerMultiplayer) {
      pokerMultiplayer.stopSync();
      pokerMultiplayer.leaveRoom();
      pokerMultiplayer = null;
    }
    
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
      // Touch start - per feedback immediato
      xButton.addEventListener('touchstart', function(e) {
        e.preventDefault();
        console.log('📱 Touch START sul pulsante X rilevato!');
      });
      
      // Touch end - quando l'utente rilascia il dito
      xButton.addEventListener('touchend', function(e) {
        e.preventDefault();
        console.log('📱 Touch END sul pulsante X - eseguo azione!');
        
        if (nearbyInteractable && nearbyInteractable.userData.isPokerTable) {
          console.log('📱 X premuto vicino al tavolo poker - apro finestra');
          openPokerWindow();
        } else if (window.closeWeddingMessage) {
          window.closeWeddingMessage();
        } else if (window.closeLoveMessage) {
          window.closeLoveMessage();
        } else if (playerController && playerController instanceof AdvancedPlayerController) {
          playerController.collectLoveNote();
        } else {
          console.log('📱 X premuto ma nessuna interazione disponibile');
        }
      });
      
      // Click fallback per desktop/testing
      xButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('🖱️ Click sul pulsante X');
        
        if (nearbyInteractable && nearbyInteractable.userData.isPokerTable) {
          console.log('🖱️ Click vicino al tavolo poker - apro finestra');
          openPokerWindow();
        } else if (window.closeWeddingMessage) {
          window.closeWeddingMessage();
        } else if (window.closeLoveMessage) {
          window.closeLoveMessage();
        } else if (playerController && playerController instanceof AdvancedPlayerController) {
          playerController.collectLoveNote();
        } else {
          console.log('🖱️ Click ma nessuna interazione disponibile');
        }
      });
    }
    
    // Setup touch per rotazione camera su tutto lo schermo
    let touchStartX = 0;
    let isRotatingCamera = false;
    
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1 && !movementJoystickActive) {
        // Verifica se il touch è sopra l'area del joystick
        const touch = e.touches[0];
        const joystickElement = document.getElementById('movementJoystick');
        if (joystickElement) {
          const rect = joystickElement.getBoundingClientRect();
          const joystickCenterX = rect.left + rect.width / 2;
          const joystickCenterY = rect.top + rect.height / 2;
          const joystickRadius = rect.width / 2;
          
          // Calcola distanza dal centro del joystick
          const distance = Math.sqrt(
            Math.pow(touch.clientX - joystickCenterX, 2) + 
            Math.pow(touch.clientY - joystickCenterY, 2)
          );
          
          // Se il touch è dentro l'area del joystick, non attivare camera rotation
          if (distance <= joystickRadius + 20) { // +20px per margine
            console.log('📱 Touch su joystick - nessuna camera rotation');
            return;
          }
        }
        
        console.log('📱 Touch camera rotation START - joystick non attivo');
        touchStartX = touch.clientX;
        isRotatingCamera = true;
      }
    });
    
    document.addEventListener('touchmove', function(e) {
      if (isRotatingCamera && e.touches.length === 1 && playerController) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - touchStartX;
        console.log('📱 Touch camera MOVE - deltaX:', deltaX, 'solo camera rotation');
        playerController.updateCameraAngle(deltaX * 5); // Aumentato drasticamente per rotazione visibile
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

  function showLoveNoteCounter() {
    if (!loveNoteCounterElement) {
      loveNoteCounterElement = document.createElement('div');
      loveNoteCounterElement.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        border: 2px solid #ff0000;
        box-shadow: 0 4px 12px rgba(255, 0, 0, 0.4);
        animation: counterPulse 0.5s ease-out;
      `;
      document.body.appendChild(loveNoteCounterElement);
      
      // Aggiungi animazione CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes counterPulse {
          0% { opacity: 0; transform: scale(0.8); }
          50% { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    updateLoveNoteCounter();
  }

  function updateLoveNoteCounter() {
    if (loveNoteCounterElement) {
      loveNoteCounterElement.innerHTML = `${collectedLoveNotes}/${totalLoveNotes}`;
      
      // Effetto speciale quando raccogli un bigliettino
      loveNoteCounterElement.style.animation = 'none';
      setTimeout(() => {
        loveNoteCounterElement.style.animation = 'counterPulse 0.3s ease-out';
      }, 10);
    }
  }

  function hideLoveNoteCounter() {
    if (loveNoteCounterElement) {
      loveNoteCounterElement.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => {
        if (loveNoteCounterElement.parentNode) {
          document.body.removeChild(loveNoteCounterElement);
        }
        loveNoteCounterElement = null;
      }, 500);
    }
  }

  function showPrinceMessage() {
    console.log('🤴 showPrinceMessage() CHIAMATA!');
    
    // Crea un elemento HTML per il messaggio del principe
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(70, 130, 180, 0.95), rgba(106, 90, 205, 0.95));
      color: white;
      padding: 30px 40px;
      border-radius: 20px;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 15px 40px rgba(70, 130, 180, 0.4);
      border: 3px solid #4682B4;
      max-width: 400px;
      animation: princeMessage 1s ease-out;
    `;
    messageDiv.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 15px;">🤴💭</div>
      <div style="line-height: 1.6; margin-bottom: 15px;">Sembra che il principe abbia lasciato qualcosa durante la fuga...</div>
      <div style="font-size: 16px; opacity: 0.9;">Di cosa si tratterà mai?</div>
      <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">Esplora il villaggio per scoprirlo!</div>
    `;
    
    console.log('🤴 Messaggio creato, aggiungo al DOM...');
    
    // Aggiungi animazione CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes princeMessage {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        50% { transform: translate(-50%, -50%) scale(1.1); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(messageDiv);
    console.log('🤴 Messaggio aggiunto al body!');
    
    // Auto-chiusura dopo 5 secondi
    setTimeout(() => {
      if (messageDiv.parentNode) {
        document.body.removeChild(messageDiv);
        console.log('🤴 Messaggio rimosso dal DOM');
      }
      if (style.parentNode) {
        document.head.removeChild(style);
      }
    }, 5000);
  }

  function playNotificationSound() {
    console.log('🔔 playNotificationSound() CHIAMATA!');
    
    try {
      // Crea contesto audio per suono notifica
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🔔 AudioContext creato:', audioContext);
      
      // Suono notifica misterioso (triangolo wave con envelope)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'triangle'; // Suono morbido e misterioso
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // Nota C5
      oscillator.frequency.exponentialRampToValueAtTime(261.63, audioContext.currentTime + 0.3); // Scende a C4
      
      // Envelope per suono notifica
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.2); // Decay
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5); // Release
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('🔔 Prima nota suonata!');
      
      // Seconda nota per enfatizzare
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.type = 'sine'; // Suono più puro
        oscillator2.frequency.setValueAtTime(392.00, audioContext.currentTime); // Nota G4
        
        gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.03);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.3);
        
        console.log('🔔 Seconda nota suonata!');
      }, 600);
      
      console.log('🔔 Suono notifica misterioso avviato!');
      
    } catch (error) {
      console.log('🔔 Errore suono notifica:', error);
      // Fallback: mostra un indicatore visivo
      const soundIndicator = document.createElement('div');
      soundIndicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(70, 130, 180, 0.9);
        color: white;
        padding: 10px 15px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        animation: soundPulse 0.5s ease-out;
      `;
      soundIndicator.innerHTML = '🔔 Messaggio del Principe!';
      document.body.appendChild(soundIndicator);
      
      setTimeout(() => {
        if (soundIndicator.parentNode) {
          document.body.removeChild(soundIndicator);
        }
      }, 2000);
    }
  }

  console.log('Bridge Serena Open World inizializzato.');
})();
