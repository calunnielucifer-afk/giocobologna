// Bridge tra Giocobologna e il motore openworld-js
// Carica il modello FBX di Serena con three.js e lo integra nel mondo openworld.

(function() {
  if (typeof window === 'undefined') return;

  let threeScene, threeCamera, threeRenderer, threeControls;
  let serenaModel = null;
  let mixer = null;
  let clock = new THREE.Clock();

  // Funzione per inizializzare three.js e caricare il modello FBX
  function initThreeJSAndSerena() {
    if (typeof THREE === 'undefined') {
      console.warn('THREE.js non caricato.');
      return;
    }

    // Inizializza scena three.js (condivisa con openworld se possibile)
    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    threeCamera.position.set(0, 5, 10);

    threeRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webgl'), alpha: true, antialias: true });
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    threeRenderer.shadowMap.enabled = true;
    threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controlli Orbit (opzionali, per debug)
    threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
    threeControls.enableDamping = true;
    threeControls.dampingFactor = 0.05;

    // Luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    threeScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    threeScene.add(directionalLight);

    // Carica il modello FBX di Serena
    const fbxLoader = new THREE.FBXLoader();
    fbxLoader.load(
      'openworld/modelpg/Lady in red dress/Lady in red dress.fbx',
      function(object) {
        serenaModel = object;
        object.scale.set(0.01, 0.01, 0.01); // Scala il modello
        object.position.set(0, 0, 0);
        threeScene.add(object);

        // Log dei nomi dei mesh per debug
        console.log('Mesh names in Serena model:');
        object.traverse(function(child) {
          if (child.isMesh) {
            console.log('Mesh:', child.name);
          }
        });

        // Applica le texture (se disponibili)
        applyTexturesToModel(object);

        // Animazioni (se presenti)
        mixer = new THREE.AnimationMixer(object);
        if (object.animations.length > 0) {
          const action = mixer.clipAction(object.animations[0]);
          action.play();
        }

        console.log('Modello FBX di Serena caricato con successo.');
      },
      function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% caricato');
      },
      function(error) {
        console.error('Errore caricamento FBX:', error);
      }
    );

    // Loop di rendering three.js
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      if (threeControls) threeControls.update();
      threeRenderer.render(threeScene, threeCamera);
    }
    animate();
  }

  // Funzione per applicare le texture al modello
  function applyTexturesToModel(model) {
    const textureLoader = new THREE.TextureLoader();
    const basePath = 'openworld/modelpg/Lady in red dress/textures/';

    model.traverse(function(child) {
      if (child.isMesh) {
        const name = child.name.toLowerCase();
        let material = null;

        // Abito (QiPao)
        if (name.includes('dress') || name.includes('qipao') || name.includes('body') || name.includes('cloth')) {
          const diffuse = textureLoader.load(basePath + 'QiPao_MetallicAlpha.png');
          const roughness = textureLoader.load(basePath + 'QiPao_roughness.png');
          const metallic = textureLoader.load(basePath + 'QiPao_metallic.png');
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            roughnessMap: roughness,
            metalnessMap: metallic,
          });
        }
        // Pelle (testa, corpo, braccia, gambe)
        else if (name.includes('head') || name.includes('skin') || name.includes('arm') || name.includes('leg') || name.includes('body')) {
          const diffuse = textureLoader.load(basePath + 'Std_Skin_Head_MetallicAlpha.png');
          const roughness = textureLoader.load(basePath + 'Std_Skin_Head_roughness.png');
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            roughnessMap: roughness,
          });
        }
        // Capelli
        else if (name.includes('hair')) {
          const diffuse = textureLoader.load(basePath + 'Hair_Transparency_MetallicAlpha.png');
          const ao = textureLoader.load(basePath + 'Hair_Transparency_ao.png');
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            aoMap: ao,
            transparent: true,
            alphaTest: 0.5,
          });
        }
        // Occhi
        else if (name.includes('eye')) {
          const diffuse = textureLoader.load(basePath + 'Std_Cornea_L_Sclera.jpg');
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
          });
        }
        // Scarpe (High Heels)
        else if (name.includes('heel') || name.includes('shoe')) {
          const metallic = textureLoader.load(basePath + 'High_Heels_metallic.png');
          const roughness = textureLoader.load(basePath + 'High_Heels_roughness.png');
          material = new THREE.MeshStandardMaterial({
            metalnessMap: metallic,
            roughnessMap: roughness,
          });
        }
        // Default (non trovato)
        else {
          material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        }

        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  // Inizializza quando la pagina è pronta e il motore openworld è caricato
  function initSerenaOpenWorld() {
    console.log('Serena Open World bridge inizializzato.');

    // Overlay introduttivo
    const intro = document.createElement('div');
    intro.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: #fff;
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    intro.innerHTML = `
      <div style="max-width: 600px;">
        <h2>Nuovo mondo verso Benevento</h2>
        <p>Serena si risveglia in un mondo aperto, realistico, ispirato al tuo sogno.</p>
        <p>Esplora, cammina, guarda attorno: il viaggio verso Benevento continua in 3D.</p>
        <button id="serenaOpenWorldStart" style="margin-top:16px;padding:8px 16px;font-size:16px;cursor:pointer;">Inizia</button>
      </div>
    `;
    document.body.appendChild(intro);

    const btn = document.getElementById('serenaOpenWorldStart');
    if (btn) {
      btn.addEventListener('click', () => {
        intro.remove();
        // Inizializza three.js e carica il modello FBX
        initThreeJSAndSerena();
      });
    }
  }

  // Inizializza quando la pagina è pronta
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSerenaOpenWorld);
  } else {
    initSerenaOpenWorld();
  }
})();
