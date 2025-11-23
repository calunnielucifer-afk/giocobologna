// Game variables
let canvas, ctx;
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = 3;
let level = 1;
let animationId;
let currentDoor = null;
let currentRiddle = null;
let currentPuzzle = null;
let draggedElement = null;

// Shooting system
let projectiles = [];
let canShoot = true;
let shootCooldown = 500; // milliseconds between shots

// 3D System
let camera3D = {
    x: 0,
    y: 0,
    z: 500,
    rotation: 0
};

let is3DLevel = false;
let perspective3D = 800;
let objects3D = [];

// Game objects
let serena = {
    x: 50,
    y: 300,
    width: 30,
    height: 40,
    velocityX: 0,
    velocityY: 0,
    speed: 5,
    jumpPower: -15,
    isJumping: false,
    color: '#FF69B4',
    hairColor: '#000000',
    z: 0, // 3D depth
    velocityZ: 0
};

let obstacles = [];
let platforms = [];
let particles = [];

// Level 2 collectible tracking (open world style)
let level2TotalCollectibles = 0;
let level2Collected = 0;
let goal = { x: 750, y: 320, width: 40, height: 60 };
let doors = [];
let gamePausedForRiddle = false;
let advanced3D = false;
let puzzleSolved = false;
let nearDoorMessage = ""; // Message to show when near door

// Input handling
const keys = {};

// Initialize and start
window.addEventListener('load', () => {
    // Get canvas and context after DOM is loaded
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Check if canvas exists
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    
    console.log('Canvas found:', canvas);
    console.log('Context found:', ctx);
    
    // Set up input handlers
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === 'ArrowUp' || e.key === ' ') {
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    // Initialize game
    init();
    draw();
    
    // Setup touch controls for mobile
    setupTouchControls();
    
    // Event listeners
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            // Show intro dialog instead of starting game directly
            const introDialog = document.getElementById('introDialog');
            if (introDialog) {
                introDialog.classList.remove('hidden');
            }
        });
        console.log('Start button listener added');
    } else {
        console.error('Start button not found!');
    }
    
    const startAdventureBtn = document.getElementById('startAdventureBtn');
    if (startAdventureBtn) {
        startAdventureBtn.addEventListener('click', startAdventure);
        console.log('Start adventure button listener added');
    }
    
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseGame);
    }
    
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
    const submitBtn = document.getElementById('submitAnswer');
    if (submitBtn) {
        submitBtn.addEventListener('click', checkRiddleAnswer);
    }
    
    const skipBtn = document.getElementById('skipRiddle');
    if (skipBtn) {
        skipBtn.addEventListener('click', skipRiddle);
    }

    // Riddle selection buttons
    document.querySelectorAll('.riddle-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const riddleIndex = e.target.dataset.riddle;
            selectRiddle(riddleIndex);
        });
    });

    // Puzzle buttons
    const checkPuzzleBtn = document.getElementById('checkPuzzle');
    if (checkPuzzleBtn) {
        checkPuzzleBtn.addEventListener('click', checkPuzzleSolution);
    }
    
    const skipPuzzleBtn = document.getElementById('skipPuzzle');
    if (skipPuzzleBtn) {
        skipPuzzleBtn.addEventListener('click', skipPuzzle);
    }

    // Enter key for riddle answer
    const riddleAnswer = document.getElementById('riddleAnswer');
    if (riddleAnswer) {
        riddleAnswer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkRiddleAnswer();
            }
        });
    }
    
    console.log('All event listeners added');
});

// Riddle database with variants
const riddles = [
    {
        question: "Ho città ma non case, montagne ma non alberi, acqua ma non pesci. Cosa sono?",
        answer: "mappa",
        emoji: "🗺️",
        variant: "Mostro strade e luoghi ma non puoi camminarci. Guido viaggiatori ma non parlo. Cosa sono?",
        variantAnswer: "cartina"
    },
    {
        question: "Più è nera, più è pulita. Cosa è?",
        answer: "lavagna",
        emoji: "📝",
        variant: "Quando sono vuota sono inutile, quando sono piena divento silenziosa. Cosa sono?",
        variantAnswer: "scatola"
    },
    {
        question: "Qual è quella cosa che una volta che l'hai data, vuoi prenderla indietro?",
        answer: "parola",
        emoji: "🗣️",
        variant: "Non ha peso ma può spezzare il cuore. Cosa è?",
        variantAnswer: "promessa"
    },
    {
        question: "Ha denti ma non mangia mai. Cosa è?",
        answer: "pettine",
        emoji: "🪮",
        variant: "Più usi, più piccolo diventa. Cosa è?",
        variantAnswer: "sapone"
    },
    {
        question: "Corro tutto il giorno senza stancarmi mai. Cosa sono?",
        answer: "orologio",
        emoji: "⏰",
        variant: "Ho facce ma non occhi, mani ma non braccia. Cosa sono?",
        variantAnswer: "orologio"
    },
    {
        question: "Bologna → ? → Benevento\nCosa manca nel viaggio di Serena?",
        answer: "amore",
        emoji: "❤️",
        variant: "Dalle Due Torri al Lungomare, cosa unisce i cuori?",
        variantAnswer: "sentimento"
    }
];

// Puzzle images for cities - now using real images
const cityPuzzles = {
    bologna: [
        {image: 'bologna1.jpg', solved: false},
        {image: 'bologna2.jpg', solved: false}, 
        {image: 'bologna3.jpg', solved: false}
    ],
    benevento: [
        {image: 'benevento1.jpg', solved: false},
        {image: 'benevento2.jpg', solved: false},
        {image: 'benevento3.jpg', solved: false}
    ]
}

// Puzzle configuration
const PUZZLE_SIZE = 2; // 2x2 grid (4 pieces total)
const PUZZLE_PIECE_SIZE = 100; // pixels

// Update UI elements
function updateUI() {
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const levelElement = document.getElementById('level');
    
    if (scoreElement) scoreElement.textContent = score;
    if (livesElement) livesElement.textContent = lives;
    if (levelElement) levelElement.textContent = level;
}

// Game control functions
function startGame() {
    console.log('Start game called, gameRunning:', gameRunning);
    if (gameRunning) return;
    
    // Show intro dialog first
    const introDialog = document.getElementById('introDialog');
    if (introDialog && !introDialog.classList.contains('hidden')) {
        // If intro is visible, don't start the game yet
        return;
    }
    
    console.log('Initializing game...');
    init();
    gameRunning = true;
    gamePaused = false;
    
    const gameOverModal = document.getElementById('gameOver');
    const victoryModal = document.getElementById('victory');
    
    if (gameOverModal) gameOverModal.classList.add('hidden');
    if (victoryModal) victoryModal.classList.add('hidden');
    
    console.log('Starting game loop...');
    gameLoop();
}

function startAdventure() {
    // Hide intro dialog and start the game
    const introDialog = document.getElementById('introDialog');
    if (introDialog) {
        introDialog.classList.add('hidden');
    }
    startGame();
}

function pauseGame() {
    gamePaused = !gamePaused;
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.textContent = gamePaused ? 'Riprendi' : 'Pausa';
}

function restartGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    // Hide all modals including intro dialog
    const gameOverModal = document.getElementById('gameOver');
    const introDialog = document.getElementById('introDialog');
    
    if (gameOverModal) gameOverModal.classList.add('hidden');
    if (introDialog) introDialog.classList.add('hidden');
    
    startGame();
}

// Touch controls for mobile
function setupTouchControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    const shootBtn = document.getElementById('shootBtn');
    
    console.log('Setting up touch controls...', { leftBtn, rightBtn, jumpBtn, shootBtn });
    
    if (leftBtn && rightBtn && jumpBtn && shootBtn) {
        // Touch start events
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Left button touched');
            keys.ArrowLeft = true;
        });
        
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Right button touched');
            keys.ArrowRight = true;
        });
        
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Jump button touched');
            keys.ArrowUp = true;
        });
        
        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            console.log('Shoot button touched');
            keys['x'] = true;
        });
        
        // Touch end events
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Left button released');
            keys.ArrowLeft = false;
        });
        
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Right button released');
            keys.ArrowRight = false;
        });
        
        jumpBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Jump button released');
            keys.ArrowUp = false;
        });
        
        shootBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Shoot button released');
            keys['x'] = false;
        });
        
        // Mouse events for desktop testing
        leftBtn.addEventListener('mousedown', (e) => {
            console.log('Left button clicked');
            keys.ArrowLeft = true;
        });
        
        rightBtn.addEventListener('mousedown', (e) => {
            console.log('Right button clicked');
            keys.ArrowRight = true;
        });
        
        jumpBtn.addEventListener('mousedown', (e) => {
            console.log('Jump button clicked');
            keys.ArrowUp = true;
        });
        
        shootBtn.addEventListener('mousedown', (e) => {
            console.log('Shoot button clicked');
            keys['x'] = true;
        });
        
        leftBtn.addEventListener('mouseup', (e) => {
            console.log('Left button released');
            keys.ArrowLeft = false;
        });
        
        rightBtn.addEventListener('mouseup', (e) => {
            console.log('Right button released');
            keys.ArrowRight = false;
        });
        
        jumpBtn.addEventListener('mouseup', (e) => {
            console.log('Jump button released');
            keys.ArrowUp = false;
        });
        
        shootBtn.addEventListener('mouseup', (e) => {
            console.log('Shoot button released');
            keys['x'] = false;
        });
        
        console.log('Touch controls setup complete');
    } else {
        console.error('Touch controls not found!', { leftBtn, rightBtn, jumpBtn, shootBtn });
    }
}

// Riddle and puzzle functions
function checkRiddleAnswer() {
    const answerInput = document.getElementById('riddleAnswer');
    const feedback = document.getElementById('riddleFeedback');
    
    console.log('Checking riddle answer...');
    console.log('Current riddle:', currentRiddle);
    console.log('Answer input:', answerInput);
    console.log('Feedback element:', feedback);
    
    if (!answerInput || !feedback || !currentRiddle) {
        console.error('Missing elements for riddle check');
        return;
    }
    
    const userAnswer = answerInput.value.toLowerCase().trim();
    console.log('User answer:', userAnswer);
    console.log('Expected answers:', currentRiddle.answer, currentRiddle.variantAnswer);
    
    const isCorrect = userAnswer === currentRiddle.answer.toLowerCase() || 
                     userAnswer === currentRiddle.variantAnswer.toLowerCase();
    
    console.log('Is correct:', isCorrect);
    
    if (isCorrect) {
        feedback.textContent = '✅ Risposta corretta! Porta aperta!';
        feedback.className = 'riddle-feedback correct';
        score += 200;
        updateUI();
        
        if (currentDoor) {
            currentDoor.locked = false;
            console.log('Door unlocked via riddle');
        }
        
        setTimeout(() => {
            closeRiddleModal();
        }, 1500);
    } else {
        feedback.textContent = '❌ Risposta sbagliata! Riprova.';
        feedback.className = 'riddle-feedback wrong';
    }
}

function createCrumblingParticles(wall) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: wall.x + Math.random() * wall.width,
            y: wall.y + Math.random() * wall.height,
            velocityX: (Math.random() - 0.5) * 8,
            velocityY: Math.random() * -6,
            life: 30,
            color: '#8B4513',
            size: Math.random() * 8 + 4
        });
    }
}

function shootProjectile() {
    const projectile = {
        x: serena.x + serena.width,
        y: serena.y + serena.height / 2,
        width: 8,
        height: 4,
        velocityX: 10,
        color: '#FFD700'
    };
    projectiles.push(projectile);
    console.log('Projectile fired!');
}

function createImpactParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            velocityX: (Math.random() - 0.5) * 6,
            velocityY: Math.random() * -4,
            life: 15,
            color: '#FF6347'
        });
    }
}

function chooseRiddle() {
    // Show riddle answer section
    document.querySelector('.riddle-options').classList.add('hidden');
    document.getElementById('answerSection').classList.remove('hidden');
    document.getElementById('puzzleSection').classList.add('hidden');
    
    // Set current riddle
    const riddleId = currentDoor.riddleId;
    currentRiddle = riddles[riddleId];
    
    // Clear previous answer
    const answerInput = document.getElementById('riddleAnswer');
    if (answerInput) {
        answerInput.value = '';
        answerInput.focus();
    }
    
    console.log('Riddle chosen for door:', currentDoor);
}

function choosePuzzle() {
    console.log('choosePuzzle called');
    
    // Check if this is level 2 memory game
    if (currentDoor && currentDoor.puzzleType === 'memory') {
        startMemoryGame();
        return;
    }
    
    // Hide ALL riddle-related content
    const riddleOptions = document.querySelector('.riddle-options');
    if (riddleOptions) {
        riddleOptions.classList.add('hidden');
        console.log('Hidden riddle options');
    }
    
    const answerSection = document.getElementById('answerSection');
    if (answerSection) {
        answerSection.classList.add('hidden');
        console.log('Hidden answer section');
    }
    
    // Hide riddle text and emoji
    const riddleText = document.getElementById('riddleText');
    if (riddleText) {
        riddleText.textContent = '';
        console.log('Cleared riddle text');
    }
    
    const riddleEmoji = document.getElementById('riddleEmoji');
    if (riddleEmoji) {
        riddleEmoji.textContent = '';
        console.log('Cleared riddle emoji');
    }
    
    // Hide riddle title and description
    const modalTitle = document.querySelector('#riddleModal h2');
    if (modalTitle) {
        modalTitle.textContent = '🧩 Puzzle della Città';
        console.log('Changed modal title to puzzle');
    }
    
    const modalDescription = document.querySelector('#riddleModal p');
    if (modalDescription) {
        modalDescription.textContent = 'Famosa citazione di un film';
        console.log('Changed modal description to movie quote hint');
    }
    
    // Show puzzle section (remove hidden class)
    const puzzleSection = document.getElementById('puzzleSection');
    if (puzzleSection) {
        puzzleSection.classList.remove('hidden');
        console.log('Showing puzzle section');
    }
    
    // Create puzzle with emojis instead of image
    // Use food/fruit emojis for the puzzle pieces
    const puzzleEmojis = ['🍎', '🍐', '🍌', '☕']; // mela, pera, banana, caffe
    
    currentPuzzle = {
        city: 'emoji-puzzle',
        imageName: 'food-emojis',
        solved: false,
        pieces: [],
        correctOrder: [], // Add correct order for validation
        emojis: puzzleEmojis
    };
    
    // Create puzzle pieces (2x2 grid) - following the correct sequence: 1,2,3,4
    // Correct sequence: 1,2,3,4 (standard order)
    const correctSequence = [0, 1, 2, 3]; // Piece IDs in correct positions
    const pieces = [];
    
    for (let row = 0; row < PUZZLE_SIZE; row++) {
        for (let col = 0; col < PUZZLE_SIZE; col++) {
            const pieceId = row * PUZZLE_SIZE + col; // 0,1,2,3
            pieces.push({
                id: pieceId,
                correctRow: row,
                correctCol: col,
                currentRow: row,
                currentCol: col,
                emoji: puzzleEmojis[pieceId], // Assign emoji based on piece ID
                displayNumber: pieceId + 1 // Display number: 1-4
            });
        }
    }
    
    // Set the correct order based on the standard sequence
    currentPuzzle.correctOrder = correctSequence; // [0,1,2,3]
    
    // Shuffle pieces - mix up their current positions but keep their emojis
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Swap current positions only, not emojis
        const tempRow = pieces[i].currentRow;
        const tempCol = pieces[i].currentCol;
        pieces[i].currentRow = pieces[j].currentRow;
        pieces[i].currentCol = pieces[j].currentCol;
        pieces[j].currentRow = tempRow;
        pieces[j].currentCol = tempCol;
    }
    
    currentPuzzle.pieces = pieces;
    console.log('Puzzle pieces shuffled. Correct sequence (standard):', currentPuzzle.correctOrder.map(id => id + 1).join(','));
    
    // Create puzzle UI
    const container = document.getElementById('puzzleContainer');
    if (!container) {
        console.error('Puzzle container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    // Create 2x2 grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${PUZZLE_SIZE}, ${PUZZLE_PIECE_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${PUZZLE_SIZE}, ${PUZZLE_PIECE_SIZE}px)`;
    grid.style.gap = '2px';
    grid.style.justifyContent = 'center';
    
    // Create pieces in grid positions (current positions after shuffle)
    for (let row = 0; row < PUZZLE_SIZE; row++) {
        for (let col = 0; col < PUZZLE_SIZE; col++) {
            // Find piece that should be at this grid position
            const piece = pieces.find(p => p.currentRow === row && p.currentCol === col);
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'puzzle-piece';
                pieceElement.dataset.pieceId = piece.id;
                pieceElement.draggable = true;
                pieceElement.style.width = `${PUZZLE_PIECE_SIZE}px`;
                pieceElement.style.height = `${PUZZLE_PIECE_SIZE}px`;
                pieceElement.style.border = '2px solid #333';
                pieceElement.style.cursor = 'move';
                pieceElement.style.position = 'relative';
                pieceElement.style.display = 'flex';
                pieceElement.style.alignItems = 'center';
                pieceElement.style.justifyContent = 'center';
                pieceElement.style.fontSize = '40px';
                pieceElement.style.background = '#f8f8f8';
                
                // Show emoji instead of image background
                const emojiDisplay = document.createElement('div');
                emojiDisplay.textContent = piece.emoji; // Show the emoji (🍎, 🍐, 🍌, ☕)
                emojiDisplay.style.fontSize = '50px';
                emojiDisplay.style.lineHeight = '1';
                pieceElement.appendChild(emojiDisplay);
                
                // Add debug info to piece
                pieceElement.title = `Emoji: ${piece.emoji} - Correct pos: (${piece.correctRow},${piece.correctCol})`;
                
                console.log(`Creating piece ${piece.emoji} at grid position (${row},${col})`);
                
                // Add drag and drop events
                pieceElement.addEventListener('dragstart', function(e) {
                    draggedElement = this;
                    this.style.opacity = '0.5';
                    console.log('Drag started for piece:', piece.emoji);
                });
                
                pieceElement.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    return false;
                });
                
                pieceElement.addEventListener('drop', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (draggedElement !== this) {
                        // Get piece IDs
                        const draggedId = parseInt(draggedElement.dataset.pieceId);
                        const targetId = parseInt(this.dataset.pieceId);
                        
                        // Find pieces in currentPuzzle
                        const draggedPiece = currentPuzzle.pieces.find(p => p.id === draggedId);
                        const targetPiece = currentPuzzle.pieces.find(p => p.id === targetId);
                        
                        if (draggedPiece && targetPiece) {
                            // Swap current positions in data
                            const tempRow = draggedPiece.currentRow;
                            const tempCol = draggedPiece.currentCol;
                            draggedPiece.currentRow = targetPiece.currentRow;
                            draggedPiece.currentCol = targetPiece.currentCol;
                            targetPiece.currentRow = tempRow;
                            targetPiece.currentCol = tempCol;
                            
                            console.log('Swapped pieces:', draggedPiece.emoji, 'and', targetPiece.emoji);
                        }
                    }
                    
                    return false;
                });
                
                pieceElement.addEventListener('dragend', function(e) {
                    // Reset opacity
                    document.querySelectorAll('.puzzle-piece').forEach(piece => {
                        piece.style.opacity = '1';
                    });
                    draggedElement = null;
                    
                    // Re-render grid to show new positions
                    setTimeout(() => {
                        choosePuzzle(); // Re-render to update positions
                    }, 100);
                });
                
                grid.appendChild(pieceElement);
            }
        }
    }
    
    container.appendChild(grid);
    
    // Clear feedback
    const feedback = document.getElementById('puzzleFeedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'puzzle-feedback';
    }
    
    // Show modal
    const modal = document.getElementById('riddleModal');
    if (modal) {
        modal.classList.remove('hidden');
        gamePaused = true;
        console.log('Puzzle modal shown');
    } else {
        console.error('Modal not found');
    }
}

function closeRiddleModal() {
    const modal = document.getElementById('riddleModal');
    if (modal) modal.classList.add('hidden');
    
    gamePausedForRiddle = false;
    gamePaused = false;
    currentDoor = null;
    currentRiddle = null;
}

function checkPuzzleSolution() {
    const pieces = document.querySelectorAll('.puzzle-piece');
    if (!pieces || !currentPuzzle) {
        console.log('No pieces or current puzzle found');
        return;
    }
    
    console.log('=== DEBUG PUZZLE SOLUTION ===');
    console.log('Expected sequence (emojis): 🍎,🍐,🍌,☕');
    console.log('Found pieces:', pieces.length);
    
    // Check if pieces are in the correct emoji sequence: 🍎,🍐,🍌,☕
    const expectedSequence = ['🍎', '🍐', '🍌', '☕']; // Emojis in correct positions
    const letters = ['A', 'B', 'C', 'D']; // 2x2 puzzle letters
    let isCorrect = true;
    let correctCount = 0;
    const currentSequence = [];
    
    console.log('Analyzing piece positions...');
    
    pieces.forEach((piece, index) => {
        const pieceId = parseInt(piece.dataset.pieceId);
        const pieceData = currentPuzzle.pieces.find(p => p.id === pieceId);
        const displayEmoji = pieceData ? pieceData.emoji : '?'; // Get emoji from piece data
        const expectedEmoji = expectedSequence[index]; // What emoji should be in this position
        
        currentSequence.push(displayEmoji);
        
        console.log(`Position ${index} (grid position ${index}):`);
        console.log(`  Piece ID: ${pieceId}`);
        console.log(`  Display Emoji: ${displayEmoji}`);
        console.log(`  Expected Emoji: ${expectedEmoji}`);
        console.log(`  Is Correct: ${displayEmoji === expectedEmoji}`);
        
        // Check if piece has the correct emoji for this position
        if (displayEmoji === expectedEmoji) {
            correctCount++;
            console.log(`  ✅ CORRECT: Position ${index} has emoji ${displayEmoji}`);
        } else {
            console.log(`  ❌ WRONG: Position ${index} has emoji ${displayEmoji}, should be ${expectedEmoji}`);
            isCorrect = false;
        }
    });
    
    console.log('=== FINAL ANALYSIS ===');
    console.log('Current sequence:', currentSequence.join(','));
    console.log('Expected sequence:', expectedSequence.join(','));
    console.log('Correct pieces:', correctCount, 'out of', pieces.length);
    console.log('Is puzzle correct:', isCorrect);
    console.log('========================');
    
    const feedback = document.getElementById('puzzleFeedback');
    if (!feedback) return;
    
    if (correctCount === pieces.length) {
        feedback.textContent = '🎉 Puzzle completato! Porta aperta!';
        feedback.className = 'puzzle-feedback correct';
        score += 300;
        updateUI();
        
        // Mark pieces as correct
        pieces.forEach(piece => piece.classList.add('correct'));
        
        if (currentDoor) {
            currentDoor.locked = false;
            console.log('Door unlocked via puzzle');
        }
        
        setTimeout(() => {
            closeRiddleModal();
        }, 2000);
    } else {
        // ALWAYS show the current sequence with emojis
        feedback.textContent = `❌ Sequenza errata! Metti in ordine: 🍎,🍐,🍌,☕. Sequenza attuale: ${currentSequence.join(',')}`;
        feedback.className = 'puzzle-feedback wrong';
        
        console.log(`Feedback updated - Current sequence: ${currentSequence.join(',')}`);
        
        // Shake incorrect pieces
        pieces.forEach(piece => piece.classList.add('incorrect'));
        setTimeout(() => {
            pieces.forEach(piece => piece.classList.remove('incorrect'));
        }, 500);
    }
}

function skipPuzzle() {
    if (lives > 1) {
        lives--;
        updateUI();
        
        const feedback = document.getElementById('puzzleFeedback');
        if (feedback) {
            feedback.textContent = `🚪 Porta aperta ma hai perso una vita! Vite rimaste: ${lives}`;
            feedback.className = 'puzzle-feedback correct';
        }
        
        if (currentDoor) {
            currentDoor.locked = false;
        }
        
        setTimeout(() => {
            closeRiddleModal();
        }, 1500);
    } else {
        const feedback = document.getElementById('puzzleFeedback');
        if (feedback) {
            feedback.textContent = '❌ Non puoi saltare! Hai solo una vita rimasta!';
            feedback.className = 'puzzle-feedback wrong';
        }
    }
}

// Game loop and core functions
function gameLoop() {
    if (!gameRunning) return;
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

function loseLife() {
    lives--;
    updateUI();
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset position
        serena.x = 50;
        serena.y = 300;
        serena.velocityX = 0;
        serena.velocityY = 0;
    }
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    const gameOverModal = document.getElementById('gameOver');
    if (gameOverModal) {
        gameOverModal.classList.remove('hidden');
        
        const finalScoreElement = document.getElementById('finalScore');
        if (finalScoreElement) {
            finalScoreElement.textContent = score;
        }
    }
}

function victory() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    score += 1000;
    updateUI();
    
    if (level < 4) {
        level++;
        console.log('Advancing to level:', level);
        
        // Show level transition message
        if (level === 2) {
            alert('🎉 Livello 2 - Benvenuto nel mondo 3D! 🌟\nUsa W/S per muoverti in profondità!');
        }
        
        // Restart with next level immediately
        init();
        gameRunning = true;
        gameLoop();
    } else {
        // Game completed
        const victoryModal = document.getElementById('victory');
        if (victoryModal) {
            victoryModal.classList.remove('hidden');
            
            const finalScoreElement = document.getElementById('finalScore');
            if (finalScoreElement) {
                finalScoreElement.textContent = score;
            }
        }
    }
}

function nextLevel() {
    document.getElementById('victory').classList.add('hidden');
    init();
    gameRunning = true;
    gamePaused = false;
    gameLoop();
}

// Drag and drop handlers for puzzles
function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.5';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        // Get piece IDs
        const draggedId = parseInt(draggedElement.dataset.pieceId);
        const targetId = parseInt(this.dataset.pieceId);
        
        // Find pieces in currentPuzzle
        const draggedPiece = currentPuzzle.pieces.find(p => p.id === draggedId);
        const targetPiece = currentPuzzle.pieces.find(p => p.id === targetId);
        
        if (draggedPiece && targetPiece) {
            // Swap positions in data
            const tempRow = draggedPiece.currentRow;
            const tempCol = draggedPiece.currentCol;
            draggedPiece.currentRow = targetPiece.currentRow;
            draggedPiece.currentCol = targetPiece.currentCol;
            targetPiece.currentRow = tempRow;
            targetPiece.currentCol = tempCol;
            
            // Swap background positions in DOM
            const draggedBgPos = draggedElement.style.backgroundPosition;
            const targetBgPos = this.style.backgroundPosition;
            
            draggedElement.style.backgroundPosition = targetBgPos;
            this.style.backgroundPosition = draggedBgPos;
            
            console.log('Swapped pieces:', draggedId, 'and', targetId);
        }
    }
    
    return false;
}

function handleDragEnd(e) {
    // Reset opacity
    document.querySelectorAll('.puzzle-piece').forEach(piece => {
        piece.style.opacity = '1';
    });
    draggedElement = null;
}

// Initialize game
function init() {
    // Don't reset score and lives when advancing levels
    if (score === 0 && lives === 3) {
        score = 0;
        lives = 3;
        level = 1;
    }
    
    advanced3D = level >= 2;
    is3DLevel = level >= 2;
    
    // Set safe spawn position based on level
    if (level === 1) {
        serena.x = 50;   // Safe spawn for level 1
        serena.y = 300;
        serena.z = 0;
    } else if (level === 2) {
        serena.x = 150;  // Safe spawn for level 2 (grass area)
        serena.y = 250;
        serena.z = 0;
    } else if (level === 3) {
        serena.x = 200;  // Safe spawn for level 3 (safe lava area)
        serena.y = 250;
        serena.z = 0;
    } else if (level === 4) {
        serena.x = 100;  // Safe spawn for level 4 (far from dangers)
        serena.y = 300;
        serena.z = 0;
    } else {
        serena.x = 100;  // Default safe spawn
        serena.y = 250;
        serena.z = 0;
    }
    
    // Reset all velocities to prevent auto-movement
    serena.velocityX = 0;
    serena.velocityY = 0;
    serena.velocityZ = 0;
    serena.isJumping = false;
    
    // Reset 3D camera
    camera3D = {
        x: 0,
        y: 0,
        z: 500,
        rotation: 0
    };
    
    createLevel(level);
    
    // Show Prince Stefano dialog at start of level 4
    if (level === 4) {
        setTimeout(() => {
            showPrinceDialog();
        }, 1000);
    }
    
    updateUI();
}

// Show Prince Stefano dialog at level 4 start
function showPrinceDialog() {
    gameRunning = false;
    
    // Create dialog overlay
    const dialogOverlay = document.createElement('div');
    dialogOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create dialog box
    const dialogBox = document.createElement('div');
    dialogBox.style.cssText = `
        background: linear-gradient(135deg, #2C1810, #4A2C1A);
        border: 3px solid #FFD700;
        border-radius: 15px;
        padding: 30px;
        max-width: 500px;
        text-align: center;
        color: #FFFFFF;
        font-family: 'Georgia', serif;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
    `;
    
    dialogBox.innerHTML = `
        <h2 style="color: #FFD700; margin-bottom: 20px; font-size: 24px;">⚡ Principe Stefano ⚡</h2>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            "Serena mia guerriera... sei sempre più vicina a Benevento!<br><br>
            Il sogno sta diventando realtà. Ogni passo che fai ti avvicina al tuo destino.<br><br>
            Ma attenzione: il cammino finale è pericoloso. Gli assistenti sociali sono più forti qui,<br>
            e la realtà del sogno è più intensa che mai.<br><br>
            Coraggio! Io sono con te, nel cuore e nello spirito. Presto ci ritroveremo!"
        </p>
        <button id="continueBtn" style="
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border: none;
            border-radius: 25px;
            padding: 12px 30px;
            font-size: 18px;
            font-weight: bold;
            color: #2C1810;
            cursor: pointer;
            margin-top: 10px;
        ">Continua l'avventura</button>
    `;
    
    dialogOverlay.appendChild(dialogBox);
    document.body.appendChild(dialogOverlay);
    
    // Handle continue button
    document.getElementById('continueBtn').addEventListener('click', () => {
        document.body.removeChild(dialogOverlay);
        gameRunning = true;
        gameLoop();
    });
}

// Create level obstacles and platforms
function createLevel(levelNum) {
    console.log('Creating level:', levelNum);
    obstacles = [];
    platforms = [];
    particles = [];
    doors = [];
    objects3D = [];
    
    // Activate 3D from level 2
    is3DLevel = levelNum >= 2;
    advanced3D = levelNum >= 2;
    
    console.log('is3DLevel:', is3DLevel, 'advanced3D:', advanced3D);
    
    // Ground platform only for 2D levels
    if (levelNum === 1) {
        platforms.push({
            x: 0,
            y: 350,
            width: 800,
            height: 50,
            color: '#8B4513',
            z: 0
        });
    }
    
    // Level-specific obstacles
    if (levelNum === 1) {
        createLevel1();
    } else if (levelNum === 2) {
        createLevel2();
    } else if (levelNum === 3) {
        createLevel3();
    } else if (levelNum === 4) {
        createFinalLevel();
    }
}

function createLevel1() {
    // Neve obstacles
    obstacles.push({
        x: 200,
        y: 310,
        width: 40,
        height: 40,
        type: 'snow',
        color: '#FFFFFF',
        speed: 0
    });
    
    obstacles.push({
        x: 400,
        y: 310,
        width: 40,
        height: 40,
        type: 'snow',
        color: '#FFFFFF',
        speed: 0
    });
    
    // Strade curve e rotte
    obstacles.push({
        x: 280,
        y: 330,
        width: 80,
        height: 20,
        type: 'brokenRoad',
        color: '#696969',
        speed: 0,
        curve: true
    });
    
    obstacles.push({
        x: 380,
        y: 325,
        width: 60,
        height: 25,
        type: 'brokenRoad',
        color: '#696969',
        speed: 0,
        curve: true
    });
    
    // Assistente sociale (moving obstacle)
    obstacles.push({
        x: 500,
        y: 310,
        width: 35,
        height: 40,
        type: 'socialWorker',
        color: '#4169E1',
        speed: 1,
        direction: 1,
        minX: 480,
        maxX: 600
    });
    
    // Porta 1 (x=420): solo indovinello 0
    doors.push({
        x: 420,
        y: 0,
        width: 40,
        height: 350,
        locked: true,
        riddleId: 0,
        color: '#8B4513'
    });
    
    // Piattaforma superiore accessibile solo tramite porta
    platforms.push({
        x: 460,
        y: 250,
        width: 120,
        height: 15,
        color: '#8B4513'
    });
    
    // Secondo assistente sociale
    obstacles.push({
        x: 650,
        y: 310,
        width: 35,
        height: 40,
        type: 'socialWorker',
        color: '#4169E1',
        speed: 1.5,
        direction: -1,
        minX: 620,
        maxX: 720
    });
    
    // Porta 2 (x=580): solo indovinello 1
    doors.push({
        x: 580,
        y: 0,
        width: 40,
        height: 350,
        locked: true,
        riddleId: 1,
        color: '#8B4513'
    });
    
    // Porta 3 (x=700): solo puzzle emoji
    doors.push({
        x: 700,
        y: 0,
        width: 40,
        height: 350,
        locked: true,
        puzzleType: 'puzzle',
        color: '#8B4513'
    });
    
    // Floating platforms curve
    platforms.push({
        x: 120,
        y: 250,
        width: 100,
        height: 15,
        color: '#8B4513',
        curve: true
    });
    
    platforms.push({
        x: 260,
        y: 200,
        width: 90,
        height: 15,
        color: '#8B4513',
        curve: true
    });
    
    platforms.push({
        x: 380,
        y: 160,
        width: 80,
        height: 15,
        color: '#8B4513',
        curve: true
    });
}

function createLevel2() {
    console.log('Creating Level 2 - Realistic Open World Village');
    
    // Clear all elements for open world experience
    obstacles = [];
    platforms = [];
    objects3D = [];
    
    // Reset level 2 collectible tracking
    level2TotalCollectibles = 0;
    level2Collected = 0;
    
    console.log('Cleared arrays, creating open world village...');
    
    // REALISTIC OPEN WORLD VILLAGE - Inspired by openworld-js
    
    // Large realistic terrain with texture variation
    objects3D.push({
        type: 'platform',
        x: 400,
        y: 350,
        z: 0,
        width: 1600,
        height: 20,
        depth: 1200,
        color: '#8FBC8F',  // Sage green grass
        rotation: 0,
        texture: 'grass',
        physics: { mass: 0, friction: 0.8 }
    });
    
    console.log('Added terrain, objects3D length:', objects3D.length);
    
    // Stone path through village
    for (let i = 0; i < 8; i++) {
        objects3D.push({
            type: 'platform',
            x: 200 + i * 80,
            y: 348,
            z: -100 + Math.sin(i * 0.5) * 30,
            width: 60,
            height: 22,
            depth: 60,
            color: '#A9A9A9',  // Gray stone
            rotation: 0,
            texture: 'stone',
            physics: { mass: 0, friction: 0.9 }
        });
    }
    
    console.log('Added stone paths, objects3D length:', objects3D.length);
    
    // Realistic houses with proper structure
    for (let i = 0; i < 6; i++) {
        const houseX = 250 + i * 140;
        const houseZ = -200 - i * 60;
        
        // House foundation
        objects3D.push({
            type: 'platform',
            x: houseX,
            y: 320,
            z: houseZ,
            width: 80,
            height: 30,
            depth: 80,
            color: '#CD853F',  // Peru wood
            rotation: 0,
            texture: 'wood',
            physics: { mass: 0, friction: 0.7 }
        });
        
        // House walls
        objects3D.push({
            type: 'platform',
            x: houseX,
            y: 290,
            z: houseZ,
            width: 70,
            height: 30,
            depth: 70,
            color: '#DEB887',  // Burlywood
            rotation: 0,
            texture: 'plaster',
            physics: { mass: 0, friction: 0.6 }
        });
        
        // Roof
        objects3D.push({
            type: 'platform',
            x: houseX,
            y: 270,
            z: houseZ,
            width: 90,
            height: 20,
            depth: 90,
            color: '#8B4513',  // Saddle brown roof
            rotation: 0,
            texture: 'roof',
            physics: { mass: 0, friction: 0.8 }
        });
        
        // Windows (glowing at night)
        objects3D.push({
            type: 'collectible',
            x: houseX - 20,
            y: 295,
            z: houseZ,
            width: 12,
            height: 18,
            depth: 8,
            color: '#FFD700',  // Golden light
            collected: false,
            rotation: 0,
            texture: 'glass',
            glow: true
        });
        
        objects3D.push({
            type: 'collectible',
            x: houseX + 20,
            y: 295,
            z: houseZ,
            width: 12,
            height: 18,
            depth: 8,
            color: '#FFD700',
            collected: false,
            rotation: 0,
            texture: 'glass',
            glow: true
        });
    }
    
    console.log('Added houses, objects3D length:', objects3D.length);
    
    // Realistic forest with varied trees
    for (let i = 0; i < 15; i++) {
        const treeX = 150 + i * 85;
        const treeZ = -50 - i * 35;
        const treeSize = 0.8 + Math.random() * 0.4;
        
        // Tree trunk
        objects3D.push({
            type: 'platform',
            x: treeX,
            y: 320,
            z: treeZ,
            width: 25 * treeSize,
            height: 30 * treeSize,
            depth: 25 * treeSize,
            color: '#654321',  // Dark brown
            rotation: Math.random() * 0.2,
            texture: 'bark',
            physics: { mass: 0, friction: 0.9 }
        });
        
        // Tree crown
        objects3D.push({
            type: 'platform',
            x: treeX,
            y: 280 - Math.random() * 10,
            z: treeZ,
            width: 70 * treeSize,
            height: 40 * treeSize,
            depth: 70 * treeSize,
            color: '#228B22',  // Forest green
            rotation: 0,
            texture: 'leaves',
            physics: { mass: 0, friction: 0.5 }
        });
    }
    
    console.log('Added trees, objects3D length:', objects3D.length);
    
    // Village well (centerpiece)
    objects3D.push({
        type: 'platform',
        x: 400,
        y: 330,
        z: -300,
        width: 40,
        height: 20,
        depth: 40,
        color: '#696969',  // Gray stone
        rotation: 0,
        texture: 'stone',
        physics: { mass: 0, friction: 0.9 }
    });
    
    // Water in well
    objects3D.push({
        type: 'platform',
        x: 400,
        y: 340,
        z: -300,
        width: 30,
        height: 10,
        depth: 30,
        color: '#4682B4',  // Steel blue water
        rotation: 0,
        texture: 'water',
        physics: { mass: 0, friction: 0.1 }
    });
    
    // Realistic villagers (NPCs)
    for (let i = 0; i < 8; i++) {
        objects3D.push({
            type: 'enemy',
            x: 200 + i * 120,
            y: 325,
            z: -150 - i * 40,
            width: 25,
            height: 40,
            depth: 25,
            color: i % 3 === 0 ? '#8B4513' : (i % 3 === 1 ? '#D2691E' : '#F4A460'), // Various skin tones
            speed: 0.3 + Math.random() * 0.4,
            direction: i % 2 === 0 ? 1 : -1,
            rotation: 0,
            rotationSpeed: 0.005,
            texture: 'clothing',
            physics: { mass: 50, friction: 0.7 },
            behavior: 'villager',
            patrolStart: 150 + i * 100,
            patrolEnd: 250 + i * 100
        });
    }
    
    console.log('Added villagers, objects3D length:', objects3D.length);
    
    // Collectible items scattered around village
    const collectibles = [
        { color: '#FFD700', name: 'coin', texture: 'metal' },
        { color: '#FF6347', name: 'apple', texture: 'food' },
        { color: '#8B4513', name: 'bread', texture: 'food' },
        { color: '#FF69B4', name: 'flower', texture: 'nature' }
    ];
    
    for (let i = 0; i < 12; i++) {
        const item = collectibles[i % collectibles.length];
        objects3D.push({
            type: 'collectible',
            x: 180 + i * 95,
            y: 330 + Math.random() * 20,
            z: -120 - i * 35,
            width: 15,
            height: 15,
            depth: 15,
            color: item.color,
            collected: false,
            rotation: Math.random() * Math.PI * 2,
            texture: item.texture,
            physics: { mass: 0.1, friction: 0.5 }
        });
        level2TotalCollectibles++;
    }
    
    console.log('Added collectibles, objects3D length:', objects3D.length);
    
    // Village exit gate (unlocked after collecting all items)
    doors.push({
        x: 750,
        y: 280,
        width: 60,
        height: 80,
        locked: true,
        riddleId: 4,
        color: '#8B4513',
        puzzleType: 'level2_exit'
    });
    
    console.log('Level 2 creation complete! Total 3D objects:', objects3D.length);
    console.log('is3DLevel:', is3DLevel, 'advanced3D:', advanced3D);
}

// Memory card game for level 2
function startMemoryGame() {
    gameRunning = false;
    
    // Create memory game modal
    const memoryOverlay = document.createElement('div');
    memoryOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const memoryGame = document.createElement('div');
    memoryGame.style.cssText = `
        background: linear-gradient(135deg, #2C1810, #4A2C1A);
        border: 3px solid #FFD700;
        border-radius: 15px;
        padding: 20px;
        max-width: 900px;
        text-align: center;
        color: #FFFFFF;
        font-family: 'Georgia', serif;
    `;
    
    // Create 20 cards (10 pairs)
    const cardPairs = ['🌟', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺', '🎻', '🎹', '🎮'];
    const cards = [...cardPairs, ...cardPairs].sort(() => Math.random() - 0.5);
    
    let flippedCards = [];
    let matchedPairs = 0;
    let canFlip = true;
    
    let cardsHTML = '<h2 style="color: #FFD700; margin-bottom: 20px;">🎮 Memory Game - Trova le Coppie! 🎮</h2>';
    cardsHTML += '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px auto; max-width: 600px;">';
    
    cards.forEach((symbol, index) => {
        cardsHTML += `
            <div class="memory-card" data-index="${index}" data-symbol="${symbol}" style="
                width: 80px;
                height: 100px;
                background: linear-gradient(135deg, #4169E1, #1E90FF);
                border: 2px solid #FFD700;
                border-radius: 10px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 30px;
                cursor: pointer;
                transition: transform 0.3s;
                position: relative;
            ">
                <div class="card-front" style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #4169E1, #1E90FF);
                    border-radius: 8px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 40px;
                    color: #FFD700;
                ">?</div>
                <div class="card-back" style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border-radius: 8px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 40px;
                    opacity: 0;
                    transform: rotateY(180deg);
                ">${symbol}</div>
            </div>
        `;
    });
    
    cardsHTML += '</div>';
    cardsHTML += '<div id="gameStatus" style="font-size: 18px; margin: 20px 0;">Coppie trovate: 0/10</div>';
    cardsHTML += '<button id="closeMemoryBtn" style="display: none; background: linear-gradient(135deg, #FFD700, #FFA500); border: none; border-radius: 25px; padding: 12px 30px; font-size: 18px; font-weight: bold; color: #2C1810; cursor: pointer;">Continua al Livello 3</button>';
    
    memoryGame.innerHTML = cardsHTML;
    memoryOverlay.appendChild(memoryGame);
    document.body.appendChild(memoryOverlay);
    
    // Add card flip logic
    const cardElements = memoryGame.querySelectorAll('.memory-card');
    
    cardElements.forEach(card => {
        card.addEventListener('click', function() {
            if (!canFlip || this.classList.contains('flipped') || this.classList.contains('matched')) return;
            
            canFlip = false;
            this.classList.add('flipped');
            
            const front = this.querySelector('.card-front');
            const back = this.querySelector('.card-back');
            
            front.style.opacity = '0';
            back.style.opacity = '1';
            back.style.transform = 'rotateY(0deg)';
            
            flippedCards.push(this);
            
            if (flippedCards.length === 2) {
                setTimeout(() => {
                    if (flippedCards[0].dataset.symbol === flippedCards[1].dataset.symbol) {
                        // Match found!
                        flippedCards[0].classList.add('matched');
                        flippedCards[1].classList.add('matched');
                        flippedCards[0].style.background = 'linear-gradient(135deg, #32CD32, #00FF00)';
                        flippedCards[1].style.background = 'linear-gradient(135deg, #32CD32, #00FF00)';
                        matchedPairs++;
                        
                        document.getElementById('gameStatus').textContent = `Coppie trovate: ${matchedPairs}/10`;
                        
                        if (matchedPairs === 10) {
                            // Game completed!
                            setTimeout(() => {
                                document.getElementById('closeMemoryBtn').style.display = 'block';
                                document.getElementById('gameStatus').innerHTML = '<div style="color: #32CD32; font-size: 24px; font-weight: bold;">🎉 Completato! Hai trovato tutte le coppie! 🎉</div>';
                            }, 500);
                        }
                    } else {
                        // No match - flip back
                        flippedCards[0].querySelector('.card-front').style.opacity = '1';
                        flippedCards[0].querySelector('.card-back').style.opacity = '0';
                        flippedCards[0].querySelector('.card-back').style.transform = 'rotateY(180deg)';
                        
                        flippedCards[1].querySelector('.card-front').style.opacity = '1';
                        flippedCards[1].querySelector('.card-back').style.opacity = '0';
                        flippedCards[1].querySelector('.card-back').style.transform = 'rotateY(180deg)';
                    }
                    
                    flippedCards = [];
                    canFlip = true;
                }, 1000);
            } else {
                canFlip = true;
            }
        });
    });
    
    // Handle continue button
    document.getElementById('closeMemoryBtn').addEventListener('click', () => {
        document.body.removeChild(memoryOverlay);
        // Unlock the door
        if (currentDoor) {
            currentDoor.locked = false;
        }
        gameRunning = true;
        gameLoop();
    });
}

// 3D Functions
function project3D(x, y, z) {
    const scale = perspective3D / (perspective3D + z - camera3D.z);
    return {
        x: (x - camera3D.x) * scale + canvas.width / 2,
        y: (y - camera3D.y) * scale + canvas.height / 2,
        scale: scale
    };
}

function draw3DObject(obj) {
    const projected = project3D(obj.x, obj.y, obj.z);
    
    ctx.save();
    ctx.globalAlpha = Math.max(0.3, Math.min(1, projected.scale));
    
    if (obj.type === 'platform') {
        // Draw 3D platform with perspective
        const corners = [
            project3D(obj.x - obj.width/2, obj.y - obj.height/2, obj.z - obj.depth/2),
            project3D(obj.x + obj.width/2, obj.y - obj.height/2, obj.z - obj.depth/2),
            project3D(obj.x + obj.width/2, obj.y - obj.height/2, obj.z + obj.depth/2),
            project3D(obj.x - obj.width/2, obj.y - obj.height/2, obj.z + obj.depth/2)
        ];
        
        // Top face
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.forEach(corner => ctx.lineTo(corner.x, corner.y));
        ctx.closePath();
        ctx.fill();
        
        // Add 3D effect with darker sides
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(projected.x + obj.width/2 * projected.scale, projected.y + obj.height * projected.scale);
        ctx.lineTo(projected.x - obj.width/2 * projected.scale, projected.y + obj.height * projected.scale);
        ctx.closePath();
        ctx.fill();
    }
    else if (obj.type === 'enemy') {
        // Draw 3D enemy with rotation
        ctx.translate(projected.x, projected.y);
        ctx.rotate(obj.rotation);
        ctx.scale(projected.scale, projected.scale);
        
        // Enemy body
        ctx.fillStyle = obj.color;
        ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
        
        // Enemy face
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-obj.width/4, -obj.height/4, obj.width/4, obj.height/4);
        ctx.fillRect(0, -obj.height/4, obj.width/4, obj.height/4);
    }
    else if (obj.type === 'collectible') {
        // Draw 3D collectible with floating animation
        const floatY = Math.sin(Date.now() * 0.002 + obj.floatOffset) * 10;
        ctx.translate(projected.x, projected.y + floatY);
        ctx.rotate(obj.rotation);
        ctx.scale(projected.scale, projected.scale);
        
        // Star shape
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 72 - 90) * Math.PI / 180;
            const x = Math.cos(angle) * obj.width/2;
            const y = Math.sin(angle) * obj.height/2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
            const innerX = Math.cos(innerAngle) * obj.width/4;
            const innerY = Math.sin(innerAngle) * obj.height/4;
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

function update3DObjects() {
    objects3D.forEach(obj => {
        // Rotate enemies
        if (obj.type === 'enemy') {
            obj.rotation += obj.rotationSpeed;
            obj.x += obj.speed * obj.direction;
            
            // Bounce off boundaries
            if (obj.x > 700 || obj.x < 100) {
                obj.direction *= -1;
            }
        }
        
        // Rotate collectibles
        if (obj.type === 'collectible') {
            obj.rotation += 0.05;
        }
        
        // Check collision with Serena in 3D space
        if (obj.type === 'collectible' && !obj.collected) {
            const dist = Math.sqrt(
                Math.pow(serena.x - obj.x, 2) + 
                Math.pow(serena.y - obj.y, 2) + 
                Math.pow(serena.z - obj.z, 2)
            );
            
            if (dist < 50) {
                obj.collected = true;
                score += 10;
                updateUI();

                // Level 2: count collected items to unlock exit door
                if (level === 2) {
                    level2Collected++;
                    if (level2Collected >= level2TotalCollectibles && level2TotalCollectibles > 0) {
                        // Unlock level 2 exit door
                        doors.forEach(door => {
                            if (door.puzzleType === 'level2_exit') {
                                door.locked = false;
                                door.color = '#32CD32'; // Green when unlocked
                            }
                        });
                    }
                }
                
                // Check if this is the key for level 4
                if (obj.isKey && level === 4) {
                    // Unlock the exit door
                    doors.forEach(door => {
                        if (door.puzzleType === 'hideandseek') {
                            door.locked = false;
                            door.color = '#32CD32'; // Green when unlocked
                        }
                    });
                    
                    // Show key found message
                    showKeyFoundMessage();
                }
                
                // Create collection particles
                for (let i = 0; i < 10; i++) {
                    particles.push({
                        x: obj.x,
                        y: obj.y,
                        z: obj.z,
                        velocityX: (Math.random() - 0.5) * 5,
                        velocityY: (Math.random() - 0.5) * 5,
                        velocityZ: (Math.random() - 0.5) * 5,
                        life: 30,
                        color: obj.color
                    });
                }
            }
        }
        
        // Check collision with enemies
        if (obj.type === 'enemy') {
            const dist = Math.sqrt(
                Math.pow(serena.x - obj.x, 2) + 
                Math.pow(serena.y - obj.y, 2) + 
                Math.pow(serena.z - obj.z, 2)
            );
            
            if (dist < 40) {
                loseLife();
            }
        }
    });
}

function update3DCamera() {
    if (is3DLevel) {
        // Smooth camera follow
        camera3D.x += (serena.x - 400 - camera3D.x) * 0.1;
        camera3D.y += (serena.y - 200 - camera3D.y) * 0.1;
        camera3D.z = 500 + Math.sin(Date.now() * 0.001) * 20; // Subtle breathing effect
    }
}

        function createLevel3() {
    console.log('Creating Level 3 - Realistic Forest Open World');
    
    // Clear all elements for open world experience
    obstacles = [];
    platforms = [];
    objects3D = [];
    
    // REALISTIC FOREST WORLD - Inspired by openworld-js terrain system
    
    // Large forest terrain with elevation
    objects3D.push({
        type: 'platform',
        x: 400,
        y: 350,
        z: 0,
        width: 2000,
        height: 25,
        depth: 1600,
        color: '#3B5323',  // Dark forest green
        rotation: 0,
        texture: 'forest_floor',
        physics: { mass: 0, friction: 0.8 }
    });
    
    // Hills and terrain variation
    for (let i = 0; i < 8; i++) {
        objects3D.push({
            type: 'platform',
            x: 200 + i * 180,
            y: 280 + Math.sin(i * 0.7) * 40,
            z: -200 - i * 70,
            width: 200,
            height: 120 + Math.cos(i * 0.5) * 30,
            depth: 180,
            color: '#4A5D23',  // Forest hill green
            rotation: i * 15 * Math.PI / 180,
            texture: 'terrain',
            physics: { mass: 0, friction: 0.9 }
        });
    }
    
    // Dense forest with varied tree types
    for (let i = 0; i < 25; i++) {
        const treeX = 150 + i * 65;
        const treeZ = -80 - i * 30;
        const treeType = i % 4; // Different tree types
        const treeSize = 0.7 + Math.random() * 0.6;
        
        // Tree trunk
        objects3D.push({
            type: 'platform',
            x: treeX,
            y: 320,
            z: treeZ,
            width: (25 + treeType * 5) * treeSize,
            height: (35 + treeType * 10) * treeSize,
            depth: (25 + treeType * 5) * treeSize,
            color: treeType === 0 ? '#654321' : (treeType === 1 ? '#8B4513' : '#704214'), // Various browns
            rotation: Math.random() * 0.3,
            texture: 'bark',
            physics: { mass: 0, friction: 0.9 }
        });
        
        // Tree crown
        const crownColors = ['#228B22', '#2E7D32', '#1B5E20', '#388E3C']; // Various greens
        objects3D.push({
            type: 'platform',
            x: treeX,
            y: 275 - Math.random() * 15,
            z: treeZ,
            width: (60 + treeType * 15) * treeSize,
            height: (45 + treeType * 15) * treeSize,
            depth: (60 + treeType * 15) * treeSize,
            color: crownColors[treeType],
            rotation: 0,
            texture: 'foliage',
            physics: { mass: 0, friction: 0.4 }
        });
    }
    
    // River flowing through forest
    for (let i = 0; i < 12; i++) {
        objects3D.push({
            type: 'platform',
            x: 300 + i * 70,
            y: 342 + Math.sin(i * 0.4) * 8,
            z: -150 - i * 45,
            width: 50,
            height: 8,
            depth: 80,
            color: '#1E90FF',  // Dodger blue water
            rotation: 0,
            texture: 'water',
            physics: { mass: 0, friction: 0.1 },
            flow: true
        });
    }
    
    // River stones
    for (let i = 0; i < 8; i++) {
        objects3D.push({
            type: 'platform',
            x: 280 + i * 90,
            y: 345,
            z: -140 - i * 40,
            width: 20 + Math.random() * 15,
            height: 10 + Math.random() * 8,
            depth: 20 + Math.random() * 15,
            color: '#696969',  // Gray stones
            rotation: Math.random() * Math.PI,
            texture: 'rock',
            physics: { mass: 0, friction: 0.8 }
        });
    }
    
    // Forest cabin (player shelter)
    const cabinX = 600;
    const cabinZ = -400;
    
    // Cabin foundation
    objects3D.push({
        type: 'platform',
        x: cabinX,
        y: 320,
        z: cabinZ,
        width: 100,
        height: 30,
        depth: 80,
        color: '#8B4513',  // Saddle brown
        rotation: 0,
        texture: 'wood',
        physics: { mass: 0, friction: 0.7 }
    });
    
    // Cabin walls
    objects3D.push({
        type: 'platform',
        x: cabinX,
        y: 290,
        z: cabinZ,
        width: 90,
        height: 30,
        depth: 70,
        color: '#A0522D',  // Sienna
        rotation: 0,
        texture: 'logs',
        physics: { mass: 0, friction: 0.8 }
    });
    
    // Cabin roof
    objects3D.push({
        type: 'platform',
        x: cabinX,
        y: 265,
        z: cabinZ,
        width: 110,
        height: 25,
        depth: 90,
        color: '#654321',  // Dark brown
        rotation: 0,
        texture: 'roof_wood',
        physics: { mass: 0, friction: 0.7 }
    });
    
    // Cabin chimney
    objects3D.push({
        type: 'platform',
        x: cabinX + 30,
        y: 250,
        z: cabinZ,
        width: 20,
        height: 40,
        depth: 20,
        color: '#696969',  // Gray stone
        rotation: 0,
        texture: 'brick',
        physics: { mass: 0, friction: 0.9 }
    });
    
    // Forest wildlife (animals)
    const animals = [
        { color: '#8B4513', name: 'deer', speed: 1.2 },
        { color: '#696969', name: 'wolf', speed: 1.8 },
        { color: '#FF8C00', name: 'fox', speed: 1.5 },
        { color: '#D2691E', name: 'bear', speed: 0.8 }
    ];
    
    for (let i = 0; i < 10; i++) {
        const animal = animals[i % animals.length];
        objects3D.push({
            type: 'enemy',
            x: 200 + i * 110,
            y: 325,
            z: -120 - i * 50,
            width: 30 + Math.random() * 20,
            height: 25 + Math.random() * 15,
            depth: 40 + Math.random() * 20,
            color: animal.color,
            speed: animal.speed * (0.8 + Math.random() * 0.4),
            direction: i % 2 === 0 ? 1 : -1,
            rotation: 0,
            rotationSpeed: 0.01,
            texture: 'fur',
            physics: { mass: 30 + Math.random() * 50, friction: 0.6 },
            behavior: 'wildlife',
            patrolStart: 150 + i * 90,
            patrolEnd: 250 + i * 90
        });
    }
    
    // Forest collectibles (berries, mushrooms, herbs)
    const forestItems = [
        { color: '#FF0000', name: 'berry', texture: 'food' },
        { color: '#8B4513', name: 'mushroom', texture: 'nature' },
        { color: '#90EE90', name: 'herb', texture: 'plant' },
        { color: '#FFD700', name: 'crystal', texture: 'magic' }
    ];
    
    for (let i = 0; i < 16; i++) {
        const item = forestItems[i % forestItems.length];
        objects3D.push({
            type: 'collectible',
            x: 180 + i * 85,
            y: 335 + Math.random() * 25,
            z: -100 - i * 40,
            width: 12,
            height: 12,
            depth: 12,
            color: item.color,
            collected: false,
            rotation: Math.random() * Math.PI * 2,
            texture: item.texture,
            physics: { mass: 0.05, friction: 0.3 },
            glow: item.name === 'crystal'
        });
    }
    
    // Forest exit (stone archway)
    doors.push({
        x: 850,
        y: 270,
        width: 80,
        height: 100,
        locked: true,
        riddleId: 5,
        color: '#696969',
        puzzleType: 'puzzle'
    });
    
    // Stone archway structure
    objects3D.push({
        type: 'platform',
        x: 850,
        y: 250,
        z: -600,
        width: 100,
        height: 120,
        depth: 30,
        color: '#696969',  // Gray stone
        rotation: 0,
        texture: 'stone',
        physics: { mass: 0, friction: 0.9 }
    });
}

function createFinalLevel() {
    console.log('Creating Level 4 - Realistic Mountain Open World');
    
    // Clear all elements for open world experience
    obstacles = [];
    platforms = [];
    objects3D = [];
    
    // REALISTIC MOUNTAIN WORLD - Inspired by openworld-js terrain generation
    
    // Massive mountain terrain
    objects3D.push({
        type: 'platform',
        x: 400,
        y: 350,
        z: 0,
        width: 2400,
        height: 30,
        depth: 1800,
        color: '#8B7355',  // Rocky mountain brown
        rotation: 0,
        texture: 'mountain_rock',
        physics: { mass: 0, friction: 0.9 }
    });
    
    // Mountain peaks with realistic elevation
    for (let i = 0; i < 6; i++) {
        const peakX = 300 + i * 200;
        const peakZ = -200 - i * 80;
        const peakHeight = 150 + Math.sin(i * 0.8) * 80;
        
        // Mountain peak
        objects3D.push({
            type: 'platform',
            x: peakX,
            y: 200 - peakHeight/2,
            z: peakZ,
            width: 250,
            height: peakHeight,
            depth: 200,
            color: '#696969',  // Gray mountain rock
            rotation: i * 20 * Math.PI / 180,
            texture: 'rock_face',
            physics: { mass: 0, friction: 0.95 }
        });
        
        // Snow cap on peak
        objects3D.push({
            type: 'platform',
            x: peakX,
            y: 140 - peakHeight/2,
            z: peakZ,
            width: 180,
            height: 60,
            depth: 150,
            color: '#FFFAFA',  // Snow white
            rotation: 0,
            texture: 'snow',
            physics: { mass: 0, friction: 0.3 }
        });
    }
    
    // Mountain paths and trails
    for (let i = 0; i < 10; i++) {
        objects3D.push({
            type: 'platform',
            x: 200 + i * 90,
            y: 335 + Math.sin(i * 0.6) * 20,
            z: -100 - i * 55,
            width: 40,
            height: 15,
            depth: 60,
            color: '#A0522D',  // Sienna path
            rotation: 0,
            texture: 'trail',
            physics: { mass: 0, friction: 0.8 }
        });
    }
    
    // Mountain forest (pine trees)
    for (let i = 0; i < 20; i++) {
        const treeX = 180 + i * 75;
        const treeZ = -80 - i * 35;
        const treeSize = 0.6 + Math.random() * 0.5;
        
        // Pine trunk (tall and thin)
        objects3D.push({
            type: 'platform',
            x: treeX,
            y: 320,
            z: treeZ,
            width: 15 * treeSize,
            height: 45 * treeSize,
            depth: 15 * treeSize,
            color: '#4A3C28',  // Dark brown pine
            rotation: Math.random() * 0.1,
            texture: 'pine_bark',
            physics: { mass: 0, friction: 0.9 }
        });
        
        // Pine crown (triangular)
        objects3D.push({
            type: 'platform',
            x: treeX,
            y: 270 - Math.random() * 20,
            z: treeZ,
            width: 40 * treeSize,
            height: 50 * treeSize,
            depth: 40 * treeSize,
            color: '#0F5132',  // Dark pine green
            rotation: 0,
            texture: 'pine_needles',
            physics: { mass: 0, friction: 0.3 }
        });
    }
    
    // Mountain lake
    objects3D.push({
        type: 'platform',
        x: 600,
        y: 340,
        z: -500,
        width: 200,
        height: 10,
        depth: 150,
        color: '#4682B4',  // Steel blue water
        rotation: 0,
        texture: 'water',
        physics: { mass: 0, friction: 0.1 }
    });
    
    // Rocky outcrops and boulders
    for (let i = 0; i < 12; i++) {
        objects3D.push({
            type: 'platform',
            x: 250 + i * 85,
            y: 325 + Math.random() * 15,
            z: -150 - i * 45,
            width: 30 + Math.random() * 25,
            height: 20 + Math.random() * 20,
            depth: 30 + Math.random() * 25,
            color: '#708090',  // Slate gray
            rotation: Math.random() * Math.PI,
            texture: 'boulder',
            physics: { mass: 0, friction: 0.85 }
        });
    }
    
    // Mountain monastery (final destination)
    const monasteryX = 900;
    const monasteryZ = -700;
    
    // Monastery foundation
    objects3D.push({
        type: 'platform',
        x: monasteryX,
        y: 280,
        z: monasteryZ,
        width: 120,
        height: 70,
        depth: 100,
        color: '#8B7D6B',  // Burlywood stone
        rotation: 0,
        texture: 'stone_wall',
        physics: { mass: 0, friction: 0.9 }
    });
    
    // Monastery main building
    objects3D.push({
        type: 'platform',
        x: monasteryX,
        y: 240,
        z: monasteryZ,
        width: 100,
        height: 40,
        depth: 80,
        color: '#D2B48C',  // Tan monastery
        rotation: 0,
        texture: 'plaster',
        physics: { mass: 0, friction: 0.7 }
    });
    
    // Monastery roof
    objects3D.push({
        type: 'platform',
        x: monasteryX,
        y: 220,
        z: monasteryZ,
        width: 110,
        height: 20,
        depth: 90,
        color: '#8B4513',  // Brown roof tiles
        rotation: 0,
        texture: 'roof_tiles',
        physics: { mass: 0, friction: 0.8 }
    });
    
    // Monastery tower
    objects3D.push({
        type: 'platform',
        x: monasteryX + 40,
        y: 180,
        z: monasteryZ,
        width: 30,
        height: 60,
        depth: 30,
        color: '#696969',  // Gray tower
        rotation: 0,
        texture: 'stone_tower',
        physics: { mass: 0, friction: 0.9 }
    });
    
    // Tower roof
    objects3D.push({
        type: 'platform',
        x: monasteryX + 40,
        y: 170,
        z: monasteryZ,
        width: 40,
        height: 10,
        depth: 40,
        color: '#8B0000',  // Dark red tower roof
        rotation: 0,
        texture: 'cone_roof',
        physics: { mass: 0, friction: 0.8 }
    });
    
    // Mountain wildlife (eagles, mountain goats)
    const mountainAnimals = [
        { color: '#8B4513', name: 'goat', speed: 1.0 },
        { color: '#696969', name: 'eagle', speed: 2.5 },
        { color: '#D2691E', name: 'marmot', speed: 0.8 },
        { color: '#F5DEB3', name: 'mountain_lion', speed: 1.8 }
    ];
    
    for (let i = 0; i < 8; i++) {
        const animal = mountainAnimals[i % mountainAnimals.length];
        objects3D.push({
            type: 'enemy',
            x: 200 + i * 130,
            y: 310 + Math.random() * 40,
            z: -120 - i * 55,
            width: 25 + Math.random() * 15,
            height: 20 + Math.random() * 20,
            depth: 35 + Math.random() * 20,
            color: animal.color,
            speed: animal.speed * (0.7 + Math.random() * 0.6),
            direction: i % 2 === 0 ? 1 : -1,
            rotation: 0,
            rotationSpeed: 0.012,
            texture: 'fur',
            physics: { mass: 20 + Math.random() * 40, friction: 0.7 },
            behavior: 'mountain_wildlife',
            patrolStart: 150 + i * 110,
            patrolEnd: 250 + i * 110
        });
    }
    
    // Mountain collectibles (crystals, rare minerals, herbs)
    const mountainItems = [
        { color: '#B0E0E6', name: 'crystal', texture: 'gem' },
        { color: '#C0C0C0', name: 'silver_ore', texture: 'metal' },
        { color: '#FFD700', name: 'gold_nugget', texture: 'metal' },
        { color: '#9370DB', name: 'magic_herb', texture: 'plant' },
        { color: '#FF6347', name: 'rare_flower', texture: 'nature' }
    ];
    
    for (let i = 0; i < 15; i++) {
        const item = mountainItems[i % mountainItems.length];
        objects3D.push({
            type: 'collectible',
            x: 180 + i * 90,
            y: 330 + Math.random() * 30,
            z: -100 - i * 45,
            width: 10,
            height: 10,
            depth: 10,
            color: item.color,
            collected: false,
            rotation: Math.random() * Math.PI * 2,
            texture: item.texture,
            physics: { mass: 0.08, friction: 0.4 },
            glow: item.name === 'crystal' || item.name === 'magic_herb'
        });
    }
    
    // Mountain monastery door (final door)
    doors.push({
        x: 920,
        y: 250,
        width: 60,
        height: 90,
        locked: true,
        riddleId: 6,
        color: '#8B4513',
        puzzleType: 'hideandseek'
    });
    
    // Stone path to monastery
    for (let i = 0; i < 8; i++) {
        objects3D.push({
            type: 'platform',
            x: 750 + i * 25,
            y: 335,
            z: -550 - i * 20,
            width: 30,
            height: 15,
            depth: 40,
            color: '#696969',  // Gray stone path
            rotation: 0,
            texture: 'cobblestone',
            physics: { mass: 0, friction: 0.9 }
        });
    }
}

// Show key found message
function showKeyFoundMessage() {
    const keyMessage = document.createElement('div');
    keyMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #FFD700, #FFA500);
        border: 3px solid #FFD700;
        border-radius: 15px;
        padding: 20px 40px;
        text-align: center;
        color: #2C1810;
        font-family: 'Georgia', serif;
        font-weight: bold;
        font-size: 20px;
        z-index: 1000;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
        animation: keyGlow 2s ease-in-out infinite;
    `;
    
    keyMessage.innerHTML = '🗝️ CHIAVE TROVATA! 🗝️<br>La porta è sbloccata! Corri al finale!';
    
    document.body.appendChild(keyMessage);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        document.body.removeChild(keyMessage);
    }, 3000);
}

// Hide and seek game instructions
function showHideAndSeekInstructions() {
    const instructionOverlay = document.createElement('div');
    instructionOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const instructionBox = document.createElement('div');
    instructionBox.style.cssText = `
        background: linear-gradient(135deg, #1E3A1E, #2F4F2F);
        border: 3px solid #FFD700;
        border-radius: 15px;
        padding: 30px;
        max-width: 600px;
        text-align: center;
        color: #FFFFFF;
        font-family: 'Georgia', serif;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    `;
    
    instructionBox.innerHTML = `
        <h2 style="color: #FFD700; margin-bottom: 20px; font-size: 24px;">🌿 Nascondino nel Giardino 🌿</h2>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            <strong>Missione:</strong> Trova la chiave d'oro nascosta nel giardino!<br><br>
            <strong>Attenzione:</strong> Le guardie pattugliano l'area. Se ti vedono, perderai una vita!<br><br>
            <strong>Consiglio:</strong> Nasconditi tra i cespugli e gli alberi per evitare le guardie.<br><br>
            <strong>Obiettivo:</strong> Trova la chiave d'oro e raggiunge la porta per il finale!
        </p>
        <div style="background: rgba(255, 215, 0, 0.2); padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p style="color: #FFD700; font-weight: bold; margin: 0;">
                💡 La chiave è nascosta tra le piante... cerca bene! 💡
            </p>
        </div>
        <button id="startGameBtn" style="
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border: none;
            border-radius: 25px;
            padding: 12px 30px;
            font-size: 18px;
            font-weight: bold;
            color: #1E3A1E;
            cursor: pointer;
            margin-top: 10px;
        ">Inizia la Missione</button>
    `;
    
    instructionOverlay.appendChild(instructionBox);
    document.body.appendChild(instructionOverlay);
    
    // Handle start button
    document.getElementById('startGameBtn').addEventListener('click', () => {
        document.body.removeChild(instructionOverlay);
        gameRunning = true;
        gameLoop();
    });
}

// Update game state
function update() {
    if (!gameRunning || gamePaused) return;
    
    // Update 3D camera and objects
    update3DCamera();
    update3DObjects();
    
    // Handle input - Different controls for 2D vs 3D levels
    if (is3DLevel) {
        // 3D movement for levels 2+
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            serena.velocityX = serena.speed;
        } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            serena.velocityX = -serena.speed;
        } else {
            serena.velocityX *= 0.8; // Friction
        }
        
        if (keys['s'] || keys['S']) {
            serena.z += 4; // Move backward in 3D space
        }
        if (keys['w'] || keys['W']) {
            serena.z -= 4; // Move forward in 3D space
        }
    } else {
        // 2D movement for level 1
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            serena.velocityX = serena.speed;
        } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            serena.velocityX = -serena.speed;
        } else {
            serena.velocityX *= 0.8; // Friction
        }
    }
    
    // Jump (works in both 2D and 3D)
    if ((keys['ArrowUp'] || keys[' '] || keys['w'] || keys['W']) && !serena.isJumping) {
        serena.velocityY = serena.jumpPower;
        serena.isJumping = true;
    }
    
    // Handle shooting
    if (keys['x'] && canShoot) {
        shootProjectile();
        canShoot = false;
        setTimeout(() => {
            canShoot = true;
        }, shootCooldown);
    }
    
    // Update position
    serena.x += serena.velocityX;
    serena.y += serena.velocityY;
    
    // 3D movement (depth)
    if (is3DLevel) {
        if (keys['w']) serena.z -= 5; // Move forward
        if (keys['s']) serena.z += 5; // Move backward
    }
    
    // Gravity
    serena.velocityY += 0.8;
    
    // Screen boundaries
    if (serena.x < 0) serena.x = 0;
    if (serena.x + serena.width > canvas.width) serena.x = canvas.width - serena.width;
    
    // Ground collision
    if (serena.y + serena.height > 350) {
        serena.y = 350 - serena.height;
        serena.velocityY = 0;
        serena.isJumping = false;
    }
    
    // Platform collisions
    for (let platform of platforms) {
        if (serena.x < platform.x + platform.width &&
            serena.x + serena.width > platform.x &&
            serena.y < platform.y + platform.height &&
            serena.y + serena.height > platform.y) {
            
            // Landing on top of platform
            if (serena.velocityY > 0 && serena.y < platform.y) {
                serena.y = platform.y - serena.height;
                serena.velocityY = 0;
                serena.isJumping = false;
            }
        }
    }
    
    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.x += projectile.velocityX;
        
        // Remove projectiles that go off screen
        if (projectile.x < 0 || projectile.x > canvas.width) {
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check collision with obstacles (social workers)
        for (let j = obstacles.length - 1; j >= 0; j--) {
            const obstacle = obstacles[j];
            if (obstacle.type === 'socialWorker') {
                if (projectile.x < obstacle.x + obstacle.width &&
                    projectile.x + projectile.width > obstacle.x &&
                    projectile.y < obstacle.y + obstacle.height &&
                    projectile.y + projectile.height > obstacle.y) {
                    
                    // Hit the social worker
                    obstacle.hits = (obstacle.hits || 0) + 1;
                    projectiles.splice(i, 1);
                    
                    // Create impact particles
                    createImpactParticles(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
                    
                    if (obstacle.hits >= 2) {
                        // Remove the obstacle after 2 hits
                        obstacles.splice(j, 1);
                        score += 100;
                        updateUI();
                        console.log('Social worker eliminated!');
                    }
                    
                    break;
                }
            }
        }
    }
    
    // Obstacle collisions
    for (let obstacle of obstacles) {
        if (serena.x < obstacle.x + obstacle.width &&
            serena.x + serena.width > obstacle.x &&
            serena.y < obstacle.y + obstacle.height &&
            serena.y + serena.height > obstacle.y) {
            
            // Bounce back
            if (serena.velocityX > 0) {
                serena.x = obstacle.x - serena.width;
            } else if (serena.velocityX < 0) {
                serena.x = obstacle.x + obstacle.width;
            }
            serena.velocityX = 0;
            
            if (obstacle.type === 'socialWorker') {
                loseLife();
            }
        }
    }
    
    // Goal collision (still used in level 1)
    if (serena.x < goal.x + goal.width &&
        serena.x + serena.width > goal.x &&
        serena.y < goal.y + goal.height &&
        serena.y + serena.height > goal.y) {
        victory();
    }
    
    // Door collisions
    nearDoorMessage = ""; // Reset message
    for (let door of doors) {
        if (serena.x < door.x + door.width &&
            serena.x + serena.width > door.x &&
            serena.y < door.y + door.height &&
            serena.y + serena.height > door.y) {

            // Stop Serena from moving through locked doors
            if (door.locked) {
                if (serena.velocityX > 0) {
                    serena.x = door.x - serena.width;
                } else if (serena.velocityX < 0) {
                    serena.x = door.x + door.width;
                }
                serena.velocityX = 0;
            }

            // Level 1: use riddles/puzzles as before
            if (level === 1 && door.locked) {
                currentDoor = door;
                if (door.puzzleType === 'puzzle') {
                    choosePuzzle();
                } else {
                    openRiddleModal(door);
                }
            }

            // Levels 2+: door is just progression gate, no riddles
            if (level >= 2 && !door.locked) {
                // Reaching an unlocked door in higher levels advances the game
                victory();
                return;
            }
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let particle = particles[i];
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.velocityY += 0.5;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // Update social workers movement
    for (let obstacle of obstacles) {
        if (obstacle.type === 'socialWorker') {
            obstacle.x += obstacle.speed * obstacle.direction;
            
            // Bounce at boundaries
            if (obstacle.x <= obstacle.minX || obstacle.x + obstacle.width >= obstacle.maxX) {
                obstacle.direction *= -1;
            }
        }
    }
    
    // Check if Serena fell off the screen
    if (serena.y > canvas.height) {
        loseLife();
    }
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Handle obstacle collisions
function handleObstacleCollision(obstacle) {
    if (obstacle.type === 'snow') {
        // Slow down in snow temporarily
        serena.speed = 2;
        setTimeout(() => { serena.speed = 5; }, 500);
    } else if (obstacle.type === 'brokenRoad') {
        // Stumble on broken road
        serena.velocityX *= -0.5;
        createStumbleParticles();
    } else if (obstacle.type === 'socialWorker') {
        // Lose life when caught by social worker
        loseLife();
    }
}

// Create particle effects
function createJumpParticles() {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: serena.x + serena.width / 2,
            y: serena.y + serena.height,
            velocityX: (Math.random() - 0.5) * 4,
            velocityY: Math.random() * -2,
            life: 20,
            color: '#FFD700'
        });
    }
}

function createStumbleParticles() {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: serena.x + serena.width / 2,
            y: serena.y + serena.height / 2,
            velocityX: (Math.random() - 0.5) * 6,
            velocityY: Math.random() * -4,
            life: 15,
            color: '#8B4513'
        });
    }
}

// Riddle modal functions
function openRiddleModal(door) {
    console.log('openRiddleModal called for door:', door);
    console.log('Door type:', door.puzzleType ? 'puzzle' : 'riddle');
    
    if (gamePausedForRiddle) return;
    
    gamePausedForRiddle = true;
    currentDoor = door;
    
    // Check door type
    if (door.puzzleType === 'puzzle') {
        // Door 3: show puzzle directly
        console.log('Opening puzzle modal for door 3');
        choosePuzzle();
    } else {
        // Doors 1-2: show riddle directly
        const riddleId = door.riddleId;
        currentRiddle = riddles[riddleId];
        
        // Update riddle text
        const riddleText = document.getElementById('riddleText');
        if (riddleText) {
            riddleText.textContent = currentRiddle.question;
        }
        
        // Update emoji
        const riddleEmoji = document.getElementById('riddleEmoji');
        if (riddleEmoji) {
            riddleEmoji.textContent = currentRiddle.emoji;
        }
        
        // Show answer section
        const answerSection = document.getElementById('answerSection');
        if (answerSection) {
            answerSection.classList.remove('hidden');
        }
        
        // Hide riddle options
        const riddleOptions = document.querySelector('.riddle-options');
        if (riddleOptions) {
            riddleOptions.classList.add('hidden');
        }
        
        // Hide puzzle section
        const puzzleSection = document.getElementById('puzzleSection');
        if (puzzleSection) {
            puzzleSection.classList.add('hidden');
        }
        
        // Clear feedback and input
        const feedback = document.getElementById('riddleFeedback');
        if (feedback) {
            feedback.textContent = '';
            feedback.className = 'riddle-feedback';
        }
        
        const answerInput = document.getElementById('riddleAnswer');
        if (answerInput) {
            answerInput.value = '';
        }
    }
    
    // Show modal
    const modal = document.getElementById('riddleModal');
    if (modal) {
        modal.classList.remove('hidden');
        console.log('Modal shown');
    } else {
        console.error('Modal not found');
    }
}

function openChoiceModal(door) {
    const riddleId = door.riddleId;
    const riddle = riddles[riddleId];
    
    console.log('Opening choice modal for door:', door, 'Riddle ID:', riddleId);
    
    // Update riddle text
    const riddleTextElement = document.getElementById('riddleText');
    if (riddleTextElement) {
        riddleTextElement.textContent = riddle.question;
        console.log('Set riddle text:', riddle.question);
    } else {
        console.error('riddleText element not found');
    }
    
    // Update riddle emoji
    const riddleEmojiElement = document.getElementById('riddleEmoji');
    if (riddleEmojiElement) {
        riddleEmojiElement.textContent = riddle.emoji;
        console.log('Set riddle emoji:', riddle.emoji);
    } else {
        console.error('riddleEmoji element not found');
    }
    
    // Show riddle options
    const riddleOptions = document.querySelector('.riddle-options');
    if (riddleOptions) {
        riddleOptions.classList.remove('hidden');
        console.log('Showing riddle options');
    }
    
    const answerSection = document.getElementById('answerSection');
    if (answerSection) {
        answerSection.classList.add('hidden');
    }
    
    const puzzleSection = document.getElementById('puzzleSection');
    if (puzzleSection) {
        puzzleSection.classList.add('hidden');
    }
    
    // Clear feedback
    const feedback = document.getElementById('riddleFeedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'riddle-feedback';
    }
    
    // Show modal
    const modal = document.getElementById('riddleModal');
    if (modal) {
        modal.classList.remove('hidden');
        gamePaused = true;
        console.log('Modal shown');
    }
    
    console.log('Choice modal opened successfully');
}

function openRiddleChoiceModal() {
    const riddleId = currentDoor.riddleId;
    const riddle = riddles[riddleId];
    const variantId = (riddleId + 1) % riddles.length;
    const variant = riddles[variantId];
    
    // Show two riddle options
    document.getElementById('riddleText1').innerHTML = riddle.question.replace(/\n/g, '<br>');
    document.getElementById('riddleImage1').textContent = riddle.emoji;
    
    document.getElementById('riddleText2').innerHTML = variant.question.replace(/\n/g, '<br>');
    document.getElementById('riddleImage2').textContent = variant.emoji;
    
    // Show riddle options, hide other sections
    document.querySelector('.riddle-options').classList.remove('hidden');
    document.getElementById('answerSection').classList.add('hidden');
    document.getElementById('puzzleSection').classList.add('hidden');
    
    // Reset selection
    document.querySelectorAll('.riddle-option').forEach(opt => opt.classList.remove('selected'));
    
    document.getElementById('riddleModal').classList.remove('hidden');
    gamePaused = true;
}

function openPuzzleModal() {
    console.log('Opening puzzle modal...');
    
    // Use the specific image from the door
    if (!currentDoor || !currentDoor.puzzleImage) {
        console.error('No puzzle image specified for door');
        return;
    }
    
    const selectedImage = {
        image: currentDoor.puzzleImage,
        solved: false
    };
    
    console.log('Using puzzle image:', selectedImage.image);
    
    currentPuzzle = {
        city: 'benevento',
        imageName: selectedImage.image,
        solved: false,
        pieces: []
    };
    
    // Create puzzle pieces (3x3 grid)
    const pieces = [];
    for (let row = 0; row < PUZZLE_SIZE; row++) {
        for (let col = 0; col < PUZZLE_SIZE; col++) {
            pieces.push({
                id: row * PUZZLE_SIZE + col,
                correctRow: row,
                correctCol: col,
                currentRow: row,
                currentCol: col
            });
        }
    }
    
    // Shuffle pieces
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Swap positions
        const tempRow = pieces[i].currentRow;
        const tempCol = pieces[i].currentCol;
        pieces[i].currentRow = pieces[j].currentRow;
        pieces[i].currentCol = pieces[j].currentCol;
        pieces[j].currentRow = tempRow;
        pieces[j].currentCol = tempCol;
    }
    
    currentPuzzle.pieces = pieces;
    
    console.log('Current puzzle:', currentPuzzle);
    
    // Create puzzle UI
    const container = document.getElementById('puzzleContainer');
    if (!container) {
        console.error('Puzzle container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    // Create 3x3 grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${PUZZLE_SIZE}, ${PUZZLE_PIECE_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${PUZZLE_SIZE}, ${PUZZLE_PIECE_SIZE}px)`;
    grid.style.gap = '2px';
    grid.style.justifyContent = 'center';
    
    // Create pieces
    for (let row = 0; row < PUZZLE_SIZE; row++) {
        for (let col = 0; col < PUZZLE_SIZE; col++) {
            const piece = pieces.find(p => p.currentRow === row && p.currentCol === col);
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'puzzle-piece';
                pieceElement.dataset.pieceId = piece.id;
                pieceElement.draggable = true;
                pieceElement.style.width = `${PUZZLE_PIECE_SIZE}px`;
                pieceElement.style.height = `${PUZZLE_PIECE_SIZE}px`;
                pieceElement.style.backgroundImage = `url('${selectedImage.image}')`;
                pieceElement.style.backgroundSize = `${PUZZLE_SIZE * PUZZLE_PIECE_SIZE}px ${PUZZLE_SIZE * PUZZLE_PIECE_SIZE}px`;
                pieceElement.style.backgroundPosition = `-${piece.correctCol * PUZZLE_PIECE_SIZE}px -${piece.correctRow * PUZZLE_PIECE_SIZE}px`;
                pieceElement.style.border = '2px solid #333';
                pieceElement.style.cursor = 'move';
                
                // Add drag and drop events with proper event listeners
                pieceElement.addEventListener('dragstart', function(e) {
                    draggedElement = this;
                    this.style.opacity = '0.5';
                    console.log('Drag started for piece:', piece.id);
                });
                
                pieceElement.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    return false;
                });
                
                pieceElement.addEventListener('drop', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (draggedElement !== this) {
                        // Get piece IDs
                        const draggedId = parseInt(draggedElement.dataset.pieceId);
                        const targetId = parseInt(this.dataset.pieceId);
                        
                        // Find pieces in currentPuzzle
                        const draggedPiece = currentPuzzle.pieces.find(p => p.id === draggedId);
                        const targetPiece = currentPuzzle.pieces.find(p => p.id === targetId);
                        
                        if (draggedPiece && targetPiece) {
                            // Swap positions in data
                            const tempRow = draggedPiece.currentRow;
                            const tempCol = draggedPiece.currentCol;
                            draggedPiece.currentRow = targetPiece.currentRow;
                            draggedPiece.currentCol = targetPiece.currentCol;
                            targetPiece.currentRow = tempRow;
                            targetPiece.currentCol = tempCol;
                            
                            // Swap background positions in DOM
                            const draggedBgPos = draggedElement.style.backgroundPosition;
                            const targetBgPos = this.style.backgroundPosition;
                            
                            draggedElement.style.backgroundPosition = targetBgPos;
                            this.style.backgroundPosition = draggedBgPos;
                            
                            console.log('Swapped pieces:', draggedId, 'and', targetId);
                        }
                    }
                    
                    return false;
                });
                
                pieceElement.addEventListener('dragend', function(e) {
                    // Reset opacity
                    document.querySelectorAll('.puzzle-piece').forEach(piece => {
                        piece.style.opacity = '1';
                    });
                    draggedElement = null;
                    console.log('Drag ended');
                });
                
                grid.appendChild(pieceElement);
                console.log('Added puzzle piece:', piece.id);
            }
        }
    }
    
    container.appendChild(grid);
    
    // Show puzzle section directly (skip riddle options)
    const riddleOptions = document.querySelector('.riddle-options');
    if (riddleOptions) {
        riddleOptions.classList.add('hidden');
    }
    
    const answerSection = document.getElementById('answerSection');
    if (answerSection) {
        answerSection.classList.add('hidden');
    }
    
    const puzzleSection = document.getElementById('puzzleSection');
    if (puzzleSection) {
        puzzleSection.classList.remove('hidden');
    }
    
    const puzzleFeedback = document.getElementById('puzzleFeedback');
    if (puzzleFeedback) {
        puzzleFeedback.textContent = '';
        puzzleFeedback.className = 'puzzle-feedback';
    }
    
    const modal = document.getElementById('riddleModal');
    if (modal) {
        modal.classList.remove('hidden');
        gamePaused = true;
        console.log('Puzzle modal opened successfully');
    } else {
        console.error('Modal not found');
    }
}

// Drag and drop handlers
function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.5';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        // Swap content
        const tempText = draggedElement.textContent;
        const tempIndex = draggedElement.dataset.index;
        
        draggedElement.textContent = this.textContent;
        draggedElement.dataset.index = this.dataset.index;
        
        this.textContent = tempText;
        this.dataset.index = tempIndex;
    }
    
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
}

function skipPuzzle() {
    if (lives > 1) {
        lives--;
        updateUI();
        
        const feedback = document.getElementById('puzzleFeedback');
        feedback.textContent = `🚪 Porta aperta ma hai perso una vita! Vite rimaste: ${lives}`;
        feedback.className = 'puzzle-feedback correct';
        
        if (currentDoor) {
            currentDoor.locked = false;
        }
        
        setTimeout(() => {
            closeRiddleModal();
        }, 1500);
    } else {
        const feedback = document.getElementById('puzzleFeedback');
        feedback.textContent = '❌ Non puoi saltare! Hai solo una vita rimasta!';
        feedback.className = 'puzzle-feedback wrong';
    }
}

function closeRiddleModal() {
    document.getElementById('riddleModal').classList.add('hidden');
    gamePausedForRiddle = false;
    currentRiddle = null;
    currentDoor = null;
    currentPuzzle = null;
    gamePaused = false;
}

function selectRiddle(riddleIndex) {
    const riddleId = parseInt(riddleIndex);
    const riddle = riddles[riddleId];
    
    currentRiddle = riddle;
    
    // Show answer section
    document.querySelector('.riddle-options').classList.add('hidden');
    document.getElementById('answerSection').classList.remove('hidden');
    document.getElementById('puzzleSection').classList.add('hidden');
    
    // Set current riddle text
    document.getElementById('riddleAnswer').value = '';
    document.getElementById('riddleFeedback').textContent = '';
    document.getElementById('riddleFeedback').className = 'riddle-feedback';
}

function checkRiddleAnswer() {
    const userAnswer = document.getElementById('riddleAnswer').value.toLowerCase().trim();
    const feedback = document.getElementById('riddleFeedback');
    
    // Check both main answer and variant answer
    const isCorrect = userAnswer === currentRiddle.answer || 
                     (currentRiddle.variantAnswer && userAnswer === currentRiddle.variantAnswer);
    
    if (isCorrect) {
        feedback.textContent = '✅ Risposta corretta! Porta aperta!';
        feedback.className = 'riddle-feedback correct';
        score += 200;
        updateUI();
        
        if (currentDoor) {
            currentDoor.locked = false;
        }
        
        setTimeout(() => {
            closeRiddleModal();
        }, 1500);
    } else {
        feedback.textContent = '❌ Risposta sbagliata! Riprova.';
        feedback.className = 'riddle-feedback wrong';
        document.getElementById('riddleAnswer').value = '';
    }
}

function skipRiddle() {
    if (lives > 1) {
        lives--;
        updateUI();
        
        const feedback = document.getElementById('riddleFeedback');
        feedback.textContent = `🚪 Porta aperta ma hai perso una vita! Vite rimaste: ${lives}`;
        feedback.className = 'riddle-feedback correct';
        
        if (currentDoor) {
            currentDoor.locked = false;
            console.log('Door unlocked via skipping');
        }
        
        setTimeout(() => {
            closeRiddleModal();
        }, 1500);
    } else {
        const feedback = document.getElementById('riddleFeedback');
        feedback.textContent = '❌ Non puoi saltare! Hai solo una vita rimasta!';
        feedback.className = 'riddle-feedback wrong';
    }
}

// Lose life
function loseLife() {
    lives--;
    updateUI();
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset position
        serena.x = 50;
        serena.y = 300;
        serena.velocityX = 0;
        serena.velocityY = 0;
    }
}

// Draw everything
function draw() {
    // Check if canvas and context exist
    if (!canvas || !ctx) {
        console.error('Canvas or context not available in draw()');
        return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient with 3D effect
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (advanced3D) {
        gradient.addColorStop(0, '#4A90E2');
        gradient.addColorStop(0.3, '#87CEEB');
        gradient.addColorStop(0.7, '#98FB98');
        gradient.addColorStop(1, '#7CB342');
    } else {
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw clouds with 3D effect
    drawClouds();
    
    // Draw 3D objects (behind 2D elements)
    if (is3DLevel) {
        objects3D.forEach(obj => draw3DObject(obj));
    }
    
    // Draw platforms with enhanced 3D effect
    for (let platform of platforms) {
        // Platform shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        if (platform.curve) {
            // Curved shadow
            ctx.beginPath();
            ctx.moveTo(platform.x + 3, platform.y + platform.height/2 + 3);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2 + 3, platform.y + 3,
                platform.x + platform.width + 3, platform.y + platform.height/2 + 3
            );
            ctx.lineTo(platform.x + platform.width + 3, platform.y + platform.height + 3);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2 + 3, platform.y + platform.height + 8,
                platform.x + 3, platform.y + platform.height + 3
            );
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(platform.x + 3, platform.y + 3, platform.width, platform.height);
        }
        
        // Main platform with gradient
        const platformGradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
        platformGradient.addColorStop(0, '#A0522D');
        platformGradient.addColorStop(0.5, platform.color);
        platformGradient.addColorStop(1, '#654321');
        ctx.fillStyle = platformGradient;
        
        if (platform.curve) {
            // Draw curved platform
            ctx.beginPath();
            ctx.moveTo(platform.x, platform.y + platform.height/2);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2, platform.y - 2,
                platform.x + platform.width, platform.y + platform.height/2
            );
            ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2, platform.y + platform.height + 2,
                platform.x, platform.y + platform.height
            );
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
        
        // Platform edges (3D effect)
        ctx.fillStyle = '#8B4513';
        if (platform.curve) {
            // Top edge curve
            ctx.beginPath();
            ctx.moveTo(platform.x, platform.y + platform.height/2);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2, platform.y - 2,
                platform.x + platform.width, platform.y + platform.height/2
            );
            ctx.lineTo(platform.x + platform.width, platform.y + platform.height/2 + 2);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2, platform.y,
                platform.x, platform.y + platform.height/2 + 2
            );
            ctx.closePath();
            ctx.fill();
        } else {
            // Top edge
            ctx.fillRect(platform.x, platform.y, platform.width, 2);
            // Left edge
            ctx.fillRect(platform.x, platform.y, 2, platform.height);
        }
        
        // Highlight edges
        ctx.fillStyle = '#D2691E';
        if (platform.curve) {
            // Bottom edge curve
            ctx.beginPath();
            ctx.moveTo(platform.x, platform.y + platform.height - 2);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2, platform.y + platform.height,
                platform.x + platform.width, platform.y + platform.height - 2
            );
            ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
            ctx.quadraticCurveTo(
                platform.x + platform.width/2, platform.y + platform.height + 2,
                platform.x, platform.y + platform.height
            );
            ctx.closePath();
            ctx.fill();
        } else {
            // Right edge
            ctx.fillRect(platform.x + platform.width - 2, platform.y + 2, 2, platform.height - 2);
            // Bottom edge
            ctx.fillRect(platform.x + 2, platform.y + platform.height - 2, platform.width - 4, 2);
        }
        
        // Wood texture
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        for (let i = 0; i < platform.width; i += 15) {
            if (platform.curve) {
                ctx.beginPath();
                ctx.moveTo(platform.x + i, platform.y + 2);
                ctx.quadraticCurveTo(
                    platform.x + i + platform.width/2, platform.y + platform.height/2,
                    platform.x + i, platform.y + platform.height - 2
                );
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(platform.x + i, platform.y + 2);
                ctx.lineTo(platform.x + i, platform.y + platform.height - 2);
                ctx.stroke();
            }
        }
        
        // Wood knots
        ctx.fillStyle = '#4A2C17';
        for (let i = 0; i < 3; i++) {
            const knotX = platform.x + Math.random() * platform.width;
            const knotY = platform.y + 5 + Math.random() * (platform.height - 10);
            ctx.beginPath();
            ctx.arc(knotX, knotY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw doors with 3D effect
    for (let door of doors) {
        // Door shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(door.x + 3, door.y + 3, door.width, door.height);
        
        if (door.locked) {
            // Draw locked door with 3D effect
            const doorGradient = ctx.createLinearGradient(door.x, door.y, door.x + door.width, door.y + door.height);
            doorGradient.addColorStop(0, '#A0522D');
            doorGradient.addColorStop(0.5, door.color);
            doorGradient.addColorStop(1, '#654321');
            ctx.fillStyle = doorGradient;
            ctx.fillRect(door.x, door.y, door.width, door.height);
            
            // Door frame
            ctx.strokeStyle = '#4A2C17';
            ctx.lineWidth = 3;
            ctx.strokeRect(door.x, door.y, door.width, door.height);
            
            // Door panels
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.strokeRect(door.x + 5, door.y + 5, door.width - 10, door.height - 10);
            ctx.beginPath();
            ctx.moveTo(door.x + door.width/2, door.y + 5);
            ctx.lineTo(door.x + door.width/2, door.y + door.height - 5);
            ctx.stroke();
            
            // Draw 3D lock
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(door.x + door.width/2, door.y + door.height/2, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Lock highlight
            ctx.fillStyle = '#FFED4E';
            ctx.beginPath();
            ctx.arc(door.x + door.width/2 - 2, door.y + door.height/2 - 2, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Lock shadow
            ctx.fillStyle = '#B8860B';
            ctx.beginPath();
            ctx.arc(door.x + door.width/2 + 2, door.y + door.height/2 + 2, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Lock keyhole
            ctx.fillStyle = '#000000';
            ctx.fillRect(door.x + door.width/2 - 2, door.y + door.height/2, 4, 6);
            ctx.beginPath();
            ctx.arc(door.x + door.width/2, door.y + door.height/2, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw question mark with glow
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px Arial';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
            ctx.fillText('?', door.x + door.width/2 - 6, door.y + door.height/2 - 12);
            ctx.shadowBlur = 0;
        } else {
            // Draw unlocked door (open) with 3D effect
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.strokeRect(door.x + 5, door.y, door.width - 10, door.height);
            
            // Open door effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(door.x + 8, door.y + 5, door.width - 16, door.height - 5);
            
            // Draw open indicator with glow
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 16px Arial';
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 8;
            ctx.fillText('✓', door.x + door.width/2 - 5, door.y + door.height/2);
            ctx.shadowBlur = 0;
        }
    }
    
    // Draw obstacles
    for (let obstacle of obstacles) {
        ctx.fillStyle = obstacle.color;
        
        if (obstacle.type === 'snow') {
            // Draw snow pile with 3D effect
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, obstacle.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Snow shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width/2 + 2, obstacle.y + obstacle.height/2 + 2, obstacle.width/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add snow texture with highlights
            ctx.fillStyle = '#F0F8FF';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width/2 - 5, obstacle.y + obstacle.height/2 - 5, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width/2 + 3, obstacle.y + obstacle.height/2 - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (obstacle.type === 'brokenRoad') {
            // Draw curved broken road with 3D effect
            if (obstacle.curve) {
                // Draw curved road
                ctx.fillStyle = obstacle.color;
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y + obstacle.height/2);
                ctx.quadraticCurveTo(
                    obstacle.x + obstacle.width/2, obstacle.y - 5,
                    obstacle.x + obstacle.width, obstacle.y + obstacle.height/2
                );
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                ctx.quadraticCurveTo(
                    obstacle.x + obstacle.width/2, obstacle.y + obstacle.height + 5,
                    obstacle.x, obstacle.y + obstacle.height
                );
                ctx.closePath();
                ctx.fill();
                
                // Road shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.beginPath();
                ctx.moveTo(obstacle.x + 2, obstacle.y + obstacle.height/2 + 2);
                ctx.quadraticCurveTo(
                    obstacle.x + obstacle.width/2 + 2, obstacle.y - 3,
                    obstacle.x + obstacle.width + 2, obstacle.y + obstacle.height/2 + 2
                );
                ctx.lineTo(obstacle.x + obstacle.width + 2, obstacle.y + obstacle.height + 2);
                ctx.quadraticCurveTo(
                    obstacle.x + obstacle.width/2 + 2, obstacle.y + obstacle.height + 7,
                    obstacle.x + 2, obstacle.y + obstacle.height + 2
                );
                ctx.closePath();
                ctx.fill();
                
                // Add cracks on curved road
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(obstacle.x + 15, obstacle.y + 5);
                ctx.quadraticCurveTo(obstacle.x + 25, obstacle.y + 15, obstacle.x + 20, obstacle.y + obstacle.height);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(obstacle.x + 35, obstacle.y + 3);
                ctx.quadraticCurveTo(obstacle.x + 45, obstacle.y + 12, obstacle.x + 40, obstacle.y + obstacle.height - 2);
                ctx.stroke();
            } else {
                // Original straight broken road
                ctx.fillStyle = obstacle.color;
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                // Add cracks
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(obstacle.x + 10, obstacle.y);
                ctx.lineTo(obstacle.x + 15, obstacle.y + obstacle.height);
                ctx.moveTo(obstacle.x + 30, obstacle.y);
                ctx.lineTo(obstacle.x + 25, obstacle.y + obstacle.height);
                ctx.stroke();
            }
        } else if (obstacle.type === 'wall') {
            // Draw wall with crumbling animation
            if (obstacle.crumbling) {
                // Wall is crumbling - draw with shake effect
                const shakeX = (Math.random() - 0.5) * 4;
                const shakeY = (Math.random() - 0.5) * 4;
                
                ctx.fillStyle = obstacle.color;
                ctx.globalAlpha = 0.7;
                ctx.fillRect(obstacle.x + shakeX, obstacle.y + shakeY, obstacle.width, obstacle.height);
                
                // Add cracks
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obstacle.x + 10 + shakeX, obstacle.y + 10 + shakeY);
                ctx.lineTo(obstacle.x + 30 + shakeX, obstacle.y + 40 + shakeY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(obstacle.x + 40 + shakeX, obstacle.y + 20 + shakeY);
                ctx.lineTo(obstacle.x + 20 + shakeX, obstacle.y + 60 + shakeY);
                ctx.stroke();
                
                ctx.globalAlpha = 1;
            } else {
                // Draw solid wall with 3D effect
                // Wall shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(obstacle.x + 3, obstacle.y + 3, obstacle.width, obstacle.height);
                
                // Wall gradient
                const wallGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                wallGradient.addColorStop(0, '#A0522D');
                wallGradient.addColorStop(0.5, obstacle.color);
                wallGradient.addColorStop(1, '#654321');
                ctx.fillStyle = wallGradient;
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Wall border
                ctx.strokeStyle = '#4A2C17';
                ctx.lineWidth = 3;
                ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Wall texture - bricks
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 1;
                for (let row = 0; row < obstacle.height; row += 20) {
                    for (let col = 0; col < obstacle.width; col += 30) {
                        // Offset every other row
                        const xOffset = (row / 20) % 2 === 1 ? 15 : 0;
                        ctx.strokeRect(obstacle.x + col + xOffset, obstacle.y + row, 30, 20);
                    }
                }
            }
        } else if (obstacle.type === 'socialWorker') {
            // Draw social worker as a simple character
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            // Add head
            ctx.fillStyle = '#FDBCB4';
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.width/2, obstacle.y - 5, 8, 0, Math.PI * 2);
            ctx.fill();
            // Add briefcase
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(obstacle.x + obstacle.width, obstacle.y + 10, 8, 6);
        }
    }
    
    // Draw goal area (help dialog or prince)
    drawGoal();
    
    // Draw particles
    for (let particle of particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        
        if (particle.size) {
            // Wall crumbling particles
            ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        } else {
            // Regular particles
            ctx.fillRect(particle.x, particle.y, 3, 3);
        }
    }
    ctx.globalAlpha = 1;
    
    // Draw projectiles
    for (let projectile of projectiles) {
        ctx.fillStyle = projectile.color;
        ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
        
        // Add glow effect
        ctx.shadowColor = projectile.color;
        ctx.shadowBlur = 5;
        ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
        ctx.shadowBlur = 0;
    }
    
    // Draw Serena
    drawSerena();
    
    // Draw level info
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Bologna → Benevento`, 10, 30);
    
    // Draw door interaction hint
    if (nearDoorMessage) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(serena.x - 50, serena.y - 40, 200, 30);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.fillText(nearDoorMessage, serena.x - 45, serena.y - 20);
    }

// Draw Serena character with enhanced 3D details
function drawSerena() {
    // Enhanced 3D shadow with multiple layers
    if (advanced3D) {
        // Multi-layer shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(serena.x + serena.width/2 + 2, serena.y + serena.height + 4, serena.width/2 + 2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(serena.x + serena.width/2, serena.y + serena.height + 2, serena.width/2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Simple shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(serena.x + serena.width/2, serena.y + serena.height + 2, serena.width/2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Body with enhanced 3D gradient
    if (advanced3D) {
        // Multi-directional gradient
        const bodyGradient = ctx.createRadialGradient(
            serena.x + serena.width/2, serena.y + 20, 5,
            serena.x + serena.width/2, serena.y + 20, 25
        );
        bodyGradient.addColorStop(0, '#FFB6C1');
        bodyGradient.addColorStop(0.5, '#FF69B4');
        bodyGradient.addColorStop(1, '#C71585');
        ctx.fillStyle = bodyGradient;
    } else {
        const bodyGradient = ctx.createLinearGradient(serena.x + 5, serena.y + 15, serena.x + 25, serena.y + 40);
        bodyGradient.addColorStop(0, '#FFB6C1');
        bodyGradient.addColorStop(1, '#FF69B4');
        ctx.fillStyle = bodyGradient;
    }
    
    ctx.fillRect(serena.x + 5, serena.y + 15, 20, 25);
    
    // Body outline with 3D effect
    ctx.strokeStyle = advanced3D ? '#8B008B' : '#C71585';
    ctx.lineWidth = advanced3D ? 2 : 1;
    ctx.strokeRect(serena.x + 5, serena.y + 15, 20, 25);
    
    // Enhanced 3D head
    ctx.fillStyle = '#FDBCB4';
    if (advanced3D) {
        // Spherical head with shading
        const headGradient = ctx.createRadialGradient(
            serena.x + serena.width/2 - 3, serena.y + 8, 2,
            serena.x + serena.width/2, serena.y + 10, 8
        );
        headGradient.addColorStop(0, '#FFE4E1');
        headGradient.addColorStop(0.7, '#FDBCB4');
        headGradient.addColorStop(1, '#E6A8A8');
        ctx.fillStyle = headGradient;
    }
    
    ctx.beginPath();
    ctx.arc(serena.x + serena.width/2, serena.y + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Enhanced hair with 3D highlights
    if (advanced3D) {
        const hairGradient = ctx.createLinearGradient(serena.x + 7, serena.y + 2, serena.x + 23, serena.y + 10);
        hairGradient.addColorStop(0, '#4A4A4A');
        hairGradient.addColorStop(0.5, '#000000');
        hairGradient.addColorStop(1, '#2A2A2A');
        ctx.fillStyle = hairGradient;
    } else {
        ctx.fillStyle = '#000000';
    }
    
    ctx.fillRect(serena.x + serena.width/2 - 6, serena.y + 2, 12, 8);
    ctx.fillRect(serena.x + serena.width/2 - 4, serena.y, 8, 4);
    
    // Hair highlights
    if (advanced3D) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(serena.x + serena.width/2 - 2, serena.y + 10, 2, 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(serena.x + serena.width/2, serena.y + 8, 1, 8);
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(serena.x + serena.width/2 - 2, serena.y + 10, 2, 10);
    }
    
    // Enhanced eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(serena.x + 9, serena.y + 7, 3, 3);
    ctx.fillRect(serena.x + 18, serena.y + 7, 3, 3);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(serena.x + 10, serena.y + 8, 2, 2);
    ctx.fillRect(serena.x + 19, serena.y + 8, 2, 2);
    
    // Enhanced smile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = advanced3D ? 1.5 : 1;
    ctx.beginPath();
    ctx.arc(serena.x + serena.width/2, serena.y + 12, 3, 0, Math.PI);
    ctx.stroke();
    
    // Enhanced 3D legs
    if (advanced3D) {
        const legGradient = ctx.createLinearGradient(serena.x + 8, serena.y + 35, serena.x + 12, serena.y + 40);
        legGradient.addColorStop(0, '#000080');
        legGradient.addColorStop(1, '#000040');
        ctx.fillStyle = legGradient;
    } else {
        ctx.fillStyle = '#000080';
    }
    
    ctx.fillRect(serena.x + 8, serena.y + 35, 5, 5);
    ctx.fillRect(serena.x + 17, serena.y + 35, 5, 5);
    
    // Enhanced shoes
    ctx.fillStyle = '#000000';
    if (advanced3D) {
        // 3D shoe effect
        ctx.fillRect(serena.x + 7, serena.y + 38, 7, 3);
        ctx.fillRect(serena.x + 16, serena.y + 38, 7, 3);
        ctx.fillStyle = '#333333';
        ctx.fillRect(serena.x + 7, serena.y + 40, 7, 1);
        ctx.fillRect(serena.x + 16, serena.y + 40, 7, 1);
    } else {
        ctx.fillRect(serena.x + 7, serena.y + 38, 7, 3);
        ctx.fillRect(serena.x + 16, serena.y + 38, 7, 3);
    }
    
    // Enhanced 3D arms
    if (advanced3D) {
        const armGradient = ctx.createLinearGradient(serena.x + 2, serena.y + 18, serena.x + 6, serena.y + 26);
        armGradient.addColorStop(0, '#FDBCB4');
        armGradient.addColorStop(1, '#E6A8A8');
        ctx.fillStyle = armGradient;
    } else {
        ctx.fillStyle = '#FDBCB4';
    }
    
    ctx.fillRect(serena.x + 2, serena.y + 18, 4, 8);
    ctx.fillRect(serena.x + 24, serena.y + 18, 4, 8);
    
    // Enhanced hands
    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath();
    ctx.arc(serena.x + 4, serena.y + 26, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(serena.x + 26, serena.y + 26, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Enhanced dress details
    if (advanced3D) {
        ctx.strokeStyle = '#8B008B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(serena.x + 15, serena.y + 20);
        ctx.lineTo(serena.x + 15, serena.y + 35);
        ctx.stroke();
        
        // Add 3D dress pattern
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(serena.x + 12, serena.y + 25);
        ctx.lineTo(serena.x + 18, serena.y + 25);
        ctx.stroke();
    } else {
        ctx.strokeStyle = '#C71585';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(serena.x + 15, serena.y + 20);
        ctx.lineTo(serena.x + 15, serena.y + 35);
        ctx.stroke();
    }
}

// Draw goal area with help dialog or prince
function drawGoal() {
    if (level === 4) {
        // Final level - show Prince Stefano
        drawPrince();
    } else {
        // Previous levels - show help dialog
        drawHelpDialog();
    }
}

// Draw Prince Stefano with 3D details
function drawPrince() {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(goal.x + goal.width/2, goal.y + goal.height + 2, goal.width/2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Prince body with gradient
    const bodyGradient = ctx.createLinearGradient(goal.x + 5, goal.y + 15, goal.x + 35, goal.y + 50);
    bodyGradient.addColorStop(0, '#6495ED');
    bodyGradient.addColorStop(1, '#4169E1');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(goal.x + 5, goal.y + 15, 30, 35);
    
    // Body outline
    ctx.strokeStyle = '#191970';
    ctx.lineWidth = 1;
    ctx.strokeRect(goal.x + 5, goal.y + 15, 30, 35);
    
    // Royal cape
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.moveTo(goal.x + 5, goal.y + 20);
    ctx.lineTo(goal.x - 5, goal.y + 45);
    ctx.lineTo(goal.x + 5, goal.y + 50);
    ctx.lineTo(goal.x + 35, goal.y + 50);
    ctx.lineTo(goal.x + 45, goal.y + 45);
    ctx.lineTo(goal.x + 35, goal.y + 20);
    ctx.closePath();
    ctx.fill();
    
    // Cape shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(goal.x + 2, goal.y + 25, 8, 20);
    ctx.fillRect(goal.x + 30, goal.y + 25, 8, 20);
    
    // Prince head with 3D effect
    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2, goal.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Head shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2 - 3, goal.y + 8, 7, 0, Math.PI);
    ctx.fill();
    
    // Royal hair
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(goal.x + goal.width/2 - 8, goal.y + 2, 16, 8);
    ctx.fillRect(goal.x + goal.width/2 - 6, goal.y, 12, 4);
    
    // Crown with 3D effect
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(goal.x + goal.width/2 - 10, goal.y);
    ctx.lineTo(goal.x + goal.width/2 - 7, goal.y - 5);
    ctx.lineTo(goal.x + goal.width/2 - 4, goal.y);
    ctx.lineTo(goal.x + goal.width/2 - 1, goal.y - 3);
    ctx.lineTo(goal.x + goal.width/2 + 2, goal.y);
    ctx.lineTo(goal.x + goal.width/2 + 5, goal.y - 5);
    ctx.lineTo(goal.x + goal.width/2 + 8, goal.y);
    ctx.lineTo(goal.x + goal.width/2 + 12, goal.y - 3);
    ctx.lineTo(goal.x + goal.width/2 + 15, goal.y);
    ctx.closePath();
    ctx.fill();
    
    // Crown jewels
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2, goal.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#0000FF';
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2 - 5, goal.y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2 + 5, goal.y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Crown outline
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Detailed eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(goal.x + goal.width/2 - 4, goal.y + 7, 3, 3);
    ctx.fillRect(goal.x + goal.width/2 + 1, goal.y + 7, 3, 3);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(goal.x + goal.width/2 - 3, goal.y + 8, 2, 2);
    ctx.fillRect(goal.x + goal.width/2 + 2, goal.y + 8, 2, 2);
    
    // Smile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2, goal.y + 13, 3, 0, Math.PI);
    ctx.stroke();
    
    // Royal sash
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(goal.x + 8, goal.y + 25, 24, 4);
    
    // Medallion
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2, goal.y + 27, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Royal boots
    ctx.fillStyle = '#000000';
    ctx.fillRect(goal.x + 8, goal.y + 48, 8, 4);
    ctx.fillRect(goal.x + 24, goal.y + 48, 8, 4);
    
    // Label with 3D effect
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Stefano', goal.x + 2, goal.y + goal.height + 15);
    
    // Heart animation
    const time = Date.now() / 1000;
    const heartY = goal.y - 15 + Math.sin(time * 2) * 3;
    ctx.fillStyle = '#FF1493';
    ctx.font = '16px Arial';
    ctx.fillText('❤️', goal.x + goal.width/2 - 8, heartY);
}

// Draw help dialog with Prince Stefano hints
function drawHelpDialog() {
    // Dialog cloud
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 2;
    
    // Main cloud body
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2, goal.y - 10, 35, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width/2 - 25, goal.y - 5, 25, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width/2 + 25, goal.y - 5, 25, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width/2 - 15, goal.y - 25, 20, 0, Math.PI * 2);
    ctx.arc(goal.x + goal.width/2 + 15, goal.y - 25, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Cloud tail pointing to goal
    ctx.beginPath();
    ctx.moveTo(goal.x + goal.width/2 - 10, goal.y + 10);
    ctx.lineTo(goal.x + goal.width/2, goal.y + 25);
    ctx.lineTo(goal.x + goal.width/2 + 10, goal.y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Prince Stefano mini avatar in dialog
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(goal.x + goal.width/2 - 8, goal.y - 18, 16, 20);
    
    // Mini crown
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(goal.x + goal.width/2 - 6, goal.y - 22, 12, 4);
    
    // Mini head
    ctx.fillStyle = '#FDBCB4';
    ctx.beginPath();
    ctx.arc(goal.x + goal.width/2, goal.y - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Help text based on current challenge
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    
    let helpText = '';
    if (window.currentDoor && window.currentDoor.puzzleType === 'puzzle') {
        helpText = 'Puzzle: ' + (window.currentPuzzle ? window.currentPuzzle.city.charAt(0).toUpperCase() + window.currentPuzzle.city.slice(1) : 'Città');
        ctx.fillText(helpText, goal.x + goal.width/2 - 25, goal.y - 5);
        ctx.fillText('Ricorda i luoghi!', goal.x + goal.width/2 - 30, goal.y + 5);
    } else if (window.currentRiddle) {
        // Give a hint for the riddle
        if (window.currentRiddle.answer === 'mappa' || window.currentRiddle.variantAnswer === 'cartina') {
            helpText = 'Pensa alla navigazione';
        } else if (window.currentRiddle.answer === 'lavagna') {
            helpText = 'Dalla scuola...';
        } else if (window.currentRiddle.answer === 'parola' || window.currentRiddle.variantAnswer === 'promessa') {
            helpText = 'Cosa non si può tornare indietro?';
        } else if (window.currentRiddle.answer === 'pettine' || window.currentRiddle.variantAnswer === 'sapone') {
            helpText = 'Cosa usi per pulire?';
        } else if (window.currentRiddle.answer === 'orologio') {
            helpText = 'Tempo che scorre...';
        } else if (window.currentRiddle.answer === 'amore' || window.currentRiddle.variantAnswer === 'sentimento') {
            helpText = 'Cosa unisce i cuori?';
        }
        
        ctx.fillText('💡 Suggerimento:', goal.x + goal.width/2 - 25, goal.y - 5);
        ctx.font = '9px Arial';
        ctx.fillText(helpText, goal.x + goal.width/2 - 30, goal.y + 5);
    } else {
        // General encouragement
        ctx.fillText('Forza Serena!', goal.x + goal.width/2 - 20, goal.y - 5);
        ctx.fillText('Ti aspetto a Benevento ❤️', goal.x + goal.width/2 - 35, goal.y + 5);
    }
    
    // Goal marker (simple flag)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(goal.x + goal.width/2 - 2, goal.y, 4, 20);
    
    // Flag
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.moveTo(goal.x + goal.width/2 + 2, goal.y);
    ctx.lineTo(goal.x + goal.width/2 + 20, goal.y + 8);
    ctx.lineTo(goal.x + goal.width/2 + 2, goal.y + 16);
    ctx.closePath();
    ctx.fill();
}

// Draw background clouds
function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Cloud 1
    ctx.beginPath();
    ctx.arc(100, 80, 25, 0, Math.PI * 2);
    ctx.arc(130, 80, 35, 0, Math.PI * 2);
    ctx.arc(160, 80, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Cloud 2
    ctx.beginPath();
    ctx.arc(500, 60, 20, 0, Math.PI * 2);
    ctx.arc(525, 60, 30, 0, Math.PI * 2);
    ctx.arc(550, 60, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Cloud 3
    ctx.beginPath();
    ctx.arc(700, 90, 22, 0, Math.PI * 2);
    ctx.arc(725, 90, 28, 0, Math.PI * 2);
    ctx.arc(750, 90, 22, 0, Math.PI * 2);
    ctx.fill();
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('level').textContent = level;
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    
    update();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    console.log('Start game called, gameRunning:', gameRunning);
    if (gameRunning) return;
    
    console.log('Initializing game...');
    init();
    gameRunning = true;
    gamePaused = false;
    
    const gameOverModal = document.getElementById('gameOver');
    const victoryModal = document.getElementById('victory');
    
    if (gameOverModal) gameOverModal.classList.add('hidden');
    if (victoryModal) victoryModal.classList.add('hidden');
    
    console.log('Starting game loop...');
    gameLoop();
}

// Pause game
function pauseGame() {
    gamePaused = !gamePaused;
    document.getElementById('pauseBtn').textContent = gamePaused ? 'Riprendi' : 'Pausa';
}

// Restart game
function restartGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('victory').classList.add('hidden');
    startGame();
}

// Game over
function gameOver() {
    gameRunning = false;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Victory
// Victory function with level progression
function victory() {
    gameRunning = false;
    score += 1000;
    
    if (level < 4) {
        // Next level
        level++;
        document.getElementById('victory').innerHTML = `
            <div class="modal-content">
                <h2>Livello ${level - 1} Completato!</h2>
                <p>Serena sta viaggiando verso Benevento...</p>
                <p>Punteggio: ${score}</p>
                <button onclick="nextLevel()">Prossimo Livello</button>
            </div>
        `;
    } else {
        // Game completed - Prince Stefano found!
        document.getElementById('victory').innerHTML = `
            <div class="modal-content">
                <h2>🎉 Vittoria Finale! 🎉</h2>
                <p>Serena ha finalmente raggiunto il principe Stefano a Benevento! ❤️</p>
                <p>Il principe l'aspettava con ansia...</p>
                <p>Punteggio finale: ${score}</p>
                <button onclick="restartGame()">Gioca Ancora</button>
            </div>
        `;
    }
    
    document.getElementById('victory').classList.remove('hidden');
}

function nextLevel() {
    document.getElementById('victory').classList.add('hidden');
    init();
    gameRunning = true;
    gamePaused = false;
    gameLoop();
}
}
