# Serena Open World - Deploy

## 🌸 Progetto Pronto per il Deploy

### File Principali
- `openworld.html` - Pagina principale del gioco
- `serena-openworld-bridge.js` - Logica del gioco Three.js
- `openworld/` - Cartella con modelli 3D e assets
- `netlify.toml` - Configurazione Netlify

### 🚀 Deploy su Netlify

1. **Trascina la cartella `deploy` su [netlify.com](https://netlify.com)**
2. Oppure usa Netlify CLI:
   ```bash
   npm install -g netlify-cli
   cd deploy
   netlify deploy --prod
   ```

### 📱 Funzionalità

- **Desktop**: WASD per movimento, mouse drag per guardarsi intorno
- **Mobile**: Joystick virtuale + touch slide per visuale
- **🎯 Mirino Centrale**: Croce rossa come punto di mira
- **Movimento smart**: WASD segue esattamente la direzione del mirino
- **🃏 Tavola da Poker**: Tavola interattiva a coordinate (5,5)
- **🎰 Poker Room**: Finestra completa con Texas Hold'em
- **🤖 Dealer Bot**: Bot automatico "Max Dealer"
- **🔗 Link d'invito**: Condividi il tavolo con amici
- **Modello 3D**: Serena con animazioni e texture complete
- **Mondo open world**: Terreno, alberi, illuminazione dinamica

### 🔧 Configurazione

Il progetto è già configurato con:
- Three.js r128
- FBX Loader per modelli 3D
- Touch controls ottimizzati per mobile
- Responsive design
- Fullscreen support
- Mirino visibile su desktop
- Sistema di click raycasting
- Modal windows per poker

### 📁 Struttura

```
deploy/
├── openworld.html          # Pagina principale
├── serena-openworld-bridge.js  # Logica del gioco
├── openworld/              # Assets 3D
│   └── modelpg/
│       └── Lady_in_red_dress/
├── netlify.toml           # Configurazione deploy
└── README_DEPLOY.md       # Questo file
```

### 🌐 URL Preview

Una volta deployato, il gioco sarà disponibile all'URL:
`https://[tuo-username].github.io/[repo-name]/openworld.html`

### 🎮 Controlli

**Desktop:**
- W = Avanti (verso il mirino rosso)
- A = Sinistra (rispetto al mirino)
- S = Indietro (via dal mirino)
- D = Destra (rispetto al mirino)
- Mouse drag = Guardarsi intorno
- Click sulla tavola verde = Apri poker

**Mobile:**
- Joystick = Movimento
- Slide schermo = Guardarsi intorno

### 🎯 Mirino Centrale

- **Croce rossa** al centro dello schermo (solo desktop)
- **Punto di riferimento** per tutti i movimenti WASD
- **Movimento preciso**: WASD segue esattamente la visuale del mirino
- **Nascosto su mobile** dove non è necessario

### 🎰 Tavola da Poker

- **Posizione**: Coordinate (5,5) nel mondo
- **Visibilità**: Indicatore dorato + luce gialla
- **Interazione**: Click con mouse per aprire
- **Contenuti**: 
  - Texas Hold'em completo
  - 3 giocatori (tu + bot)
  - Link d'invito per amici
  - Dealer Bot automatico
  - Fiches e betting system
