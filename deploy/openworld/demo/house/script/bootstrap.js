// Bootstrap per caricare il motore openworld senza moduli ES6
// Inizializzazione manuale dell'oggetto k

console.log('Bootstrap del motore openworld...');

// Funzione per caricare script dinamicamente
function loadScript(src, callback) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = callback;
  script.onerror = () => console.error('Errore caricamento:', src);
  document.head.appendChild(script);
}

// Carica i file necessari in ordine
loadScript('openworld/src/common/hooks.js', () => {
  loadScript('openworld/src/utils/tool.js', () => {
    loadScript('openworld/src/wjs/w.js', () => {
      loadScript('openworld/src/core/main.js', () => {
        loadScript('openworld/src/obj/texture.js', () => {
          loadScript('openworld/src/player/control.js', () => {
            loadScript('openworld/src/obj/chunkManager.js', () => {
              loadScript('openworld/src/obj/addobj.js', () => {
                loadScript('openworld/src/core/animate.js', () => {
                  loadScript('openworld/src/plugins/webgl/wjsDynamicIns.js', () => {
                    console.log('Tutti i moduli openworld caricati');
                    
                    // Inizializzazione manuale dell'oggetto k
                    if (typeof window !== 'undefined') {
                      // Qui dovremmo ricostruire l'oggetto k manualmente
                      // Per ora, simuliamo un oggetto k minimo
                      window.k = {
                        W: { scene: null },
                        mainVPlayer: null,
                        hooks: { on: function() {} },
                        addPhy: { getPos: function() { return {x:0, y:0, z:0}; } },
                        keys: { turnRight: 0 }
                      };
                      console.log('Oggetto k minimale creato');
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
