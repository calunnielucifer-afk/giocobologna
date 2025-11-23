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

    // Configura le luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Aumentata intensità
    threeScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Aumentata intensità
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    threeScene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.0, 100);
    pointLight.position.set(0, 5, 0);
    threeScene.add(pointLight);

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

        console.log(`Applying texture to mesh: ${child.name}`);

        // Abito (Miao_new_suit) - usa QiPao
        if (name.includes('miao_new_suit') || name.includes('suit') || name.includes('dress')) {
          console.log('Loading dress textures...');
          const diffuse = textureLoader.load(
            basePath + 'QiPao_MetallicAlpha.png',
            (texture) => console.log('Dress diffuse loaded'),
            undefined,
            (error) => console.error('Error loading dress diffuse:', error)
          );
          const roughness = textureLoader.load(
            basePath + 'QiPao_roughness.png',
            (texture) => console.log('Dress roughness loaded'),
            undefined,
            (error) => console.error('Error loading dress roughness:', error)
          );
          const metallic = textureLoader.load(
            basePath + 'QiPao_metallic.png',
            (texture) => console.log('Dress metallic loaded'),
            undefined,
            (error) => console.error('Error loading dress metallic:', error)
          );
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            roughnessMap: roughness,
            metalnessMap: metallic,
            skinning: true,
          });
          console.log('Dress material created');
        }
        // Pelle (CC_Base_Body) - usa Std_Skin_Body
        else if (name.includes('cc_base_body')) {
          console.log('Loading body skin textures...');
          const diffuse = textureLoader.load(
            basePath + 'Std_Skin_Body_MetallicAlpha.png',
            (texture) => console.log('Body diffuse loaded'),
            undefined,
            (error) => console.error('Error loading body diffuse:', error)
          );
          const roughness = textureLoader.load(
            basePath + 'Std_Skin_Body_roughness.png',
            (texture) => console.log('Body roughness loaded'),
            undefined,
            (error) => console.error('Error loading body roughness:', error)
          );
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            roughnessMap: roughness,
            skinning: true,
          });
          console.log('Body skin material created');
        }
        // Capelli (Long_bangs, Long_wavy_ponytail, Messy_high)
        else if (name.includes('long_bangs') || name.includes('long_wavy_ponytail') || name.includes('messy_high') || name.includes('hair')) {
          console.log('Loading hair textures...');
          const diffuse = textureLoader.load(
            basePath + 'Hair_Transparency_MetallicAlpha.png',
            (texture) => console.log('Hair diffuse loaded'),
            undefined,
            (error) => console.error('Error loading hair diffuse:', error)
          );
          const ao = textureLoader.load(
            basePath + 'Hair_Transparency_ao.png',
            (texture) => console.log('Hair AO loaded'),
            undefined,
            (error) => console.error('Error loading hair AO:', error)
          );
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            aoMap: ao,
            transparent: true,
            alphaTest: 0.5,
            skinning: true,
          });
          console.log('Hair material created');
        }
        // Occhi (CC_Base_Eye, CC_Base_EyeOcclusion)
        else if (name.includes('cc_base_eye')) {
          console.log('Loading eye textures...');
          const diffuse = textureLoader.load(
            basePath + 'Std_Cornea_L_Sclera.jpg',
            (texture) => console.log('Eye diffuse loaded'),
            undefined,
            (error) => console.error('Error loading eye diffuse:', error)
          );
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            skinning: true,
          });
          console.log('Eye material created');
        }
        // Denti (CC_Base_Teeth) - usa Std_Upper_Teeth
        else if (name.includes('cc_base_teeth')) {
          console.log('Loading teeth textures...');
          const diffuse = textureLoader.load(
            basePath + 'Std_Upper_Teeth_GradAO.jpg',
            (texture) => console.log('Teeth diffuse loaded'),
            undefined,
            (error) => console.error('Error loading teeth diffuse:', error)
          );
          const roughness = textureLoader.load(
            basePath + 'Std_Upper_Teeth_roughness.png',
            (texture) => console.log('Teeth roughness loaded'),
            undefined,
            (error) => console.error('Error loading teeth roughness:', error)
          );
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            roughnessMap: roughness,
            skinning: true,
          });
          console.log('Teeth material created');
        }
        // Lingua (CC_Base_Tongue)
        else if (name.includes('cc_base_tongue')) {
          console.log('Loading tongue textures...');
          const diffuse = textureLoader.load(
            basePath + 'Std_Tongue_GradAO.jpg',
            (texture) => console.log('Tongue diffuse loaded'),
            undefined,
            (error) => console.error('Error loading tongue diffuse:', error)
          );
          const roughness = textureLoader.load(
            basePath + 'Std_Tongue_roughness.png',
            (texture) => console.log('Tongue roughness loaded'),
            undefined,
            (error) => console.error('Error loading tongue roughness:', error)
          );
          material = new THREE.MeshStandardMaterial({
            map: diffuse,
            roughnessMap: roughness,
            skinning: true,
          });
          console.log('Tongue material created');
        }
        // Scarpe (High_Heels)
        else if (name.includes('high_heels')) {
          console.log('Loading shoe textures...');
          const metallic = textureLoader.load(
            basePath + 'High_Heels_metallic.png',
            (texture) => console.log('Shoe metallic loaded'),
            undefined,
            (error) => console.error('Error loading shoe metallic:', error)
          );
          const roughness = textureLoader.load(
            basePath + 'High_Heels_roughness.png',
            (texture) => console.log('Shoe roughness loaded'),
            undefined,
            (error) => console.error('Error loading shoe roughness:', error)
          );
          material = new THREE.MeshStandardMaterial({
            metalnessMap: metallic,
            roughnessMap: roughness,
            skinning: true,
          });
          console.log('Shoe material created');
        }
        // Altro (occlusione, tearline, ecc.)
        else if (name.includes('cc_base_eyeocclusion') || name.includes('cc_base_tearline') || name.includes('sphere')) {
          material = new THREE.MeshStandardMaterial({
            transparent: true,
            opacity: 0.01,
            skinning: true,
          });
        }
        // Default - colore rosa per abito
        else {
          console.log(`Using default pink color for mesh: ${child.name}`);
          material = new THREE.MeshStandardMaterial({ 
            color: 0xFFB6C1, // rosa chiaro
            skinning: true,
          });
        }

        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
        console.log(`Material applied to ${child.name}`);
      }
    });
    console.log('All materials applied to Serena model');
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
