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
let goal = { x: 750, y: 320, width: 40, height: 60 };
let doors = [];
let gamePausedForRiddle = false;
let advanced3D = false;
let puzzleSolved = false;

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
        
        // Show level transition message
        if (level === 2) {
            alert('🎉 Livello 2 - Benvenuto nel mondo 3D! 🌟\nUsa W/S per muoverti in profondità!');
        }
        
        // Restart with next level
        setTimeout(() => {
            init();
            gameRunning = true;
            gameLoop();
        }, 2000);
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
    score = 0;
    lives = 3;
    level = 1;
    advanced3D = false;
    is3DLevel = false;
    serena.x = 50;
    serena.y = 300;
    serena.z = 0;
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
    updateUI();
}

// Create level obstacles and platforms
function createLevel(levelNum) {
    obstacles = [];
    platforms = [];
    particles = [];
    doors = [];
    objects3D = [];
    
    // Activate 3D from level 2
    is3DLevel = levelNum >= 2;
    advanced3D = levelNum >= 2;
    
    // Ground platform
    platforms.push({
        x: 0,
        y: 350,
        width: 800,
        height: 50,
        color: '#8B4513',
        z: 0
    });
    
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
    // Clear all 2D elements for pure 3D experience
    obstacles = [];
    platforms = [];
    
    // 3D ground platform
    objects3D.push({
        type: 'platform',
        x: 400,
        y: 350,
        z: 0,
        width: 800,
        height: 20,
        depth: 200,
        color: '#8B4513',
        rotation: 0
    });
    
    // 3D floating platforms at different depths
    objects3D.push({
        type: 'platform',
        x: 200,
        y: 280,
        z: -100,
        width: 80,
        height: 15,
        depth: 60,
        color: '#FF6B6B',
        rotation: 0
    });
    
    objects3D.push({
        type: 'platform',
        x: 400,
        y: 250,
        z: -200,
        width: 100,
        height: 15,
        depth: 80,
        color: '#4ECDC4',
        rotation: 0
    });
    
    objects3D.push({
        type: 'platform',
        x: 600,
        y: 300,
        z: -150,
        width: 90,
        height: 15,
        depth: 70,
        color: '#95E77E',
        rotation: 0
    });
    
    // 3D moving obstacles
    for (let i = 0; i < 3; i++) {
        objects3D.push({
            type: 'enemy',
            x: 200 + i * 200,
            y: 200,
            z: -50 - i * 50,
            width: 30,
            height: 40,
            depth: 30,
            color: '#FF4444',
            speed: 1 + i * 0.5,
            direction: i % 2 === 0 ? 1 : -1,
            rotation: 0,
            rotationSpeed: 0.02
        });
    }
    
    // 3D collectible items
    for (let i = 0; i < 5; i++) {
        objects3D.push({
            type: 'collectible',
            x: 150 + i * 120,
            y: 150 + Math.sin(i) * 50,
            z: -100 - i * 30,
            width: 20,
            height: 20,
            depth: 20,
            color: '#FFD700',
            collected: false,
            rotation: 0,
            floatOffset: Math.random() * Math.PI * 2
        });
    }
    
    // Door with advanced puzzle
    doors.push({
        x: 700,
        y: 280,
        width: 40,
        height: 70,
        locked: true,
        riddleId: 4,
        color: '#8B4513',
        puzzleType: 'puzzle'
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

// Complex platforms
    platforms.push({
        x: 100,
        y: 250,
        width: 80,
        height: 15,
        color: '#8B4513',
        curve: true
    });
    
    platforms.push({
        x: 220,
        y: 200,
        width: 70,
        height: 15,
        color: '#8B4513',
        curve: true
    });
    
    platforms.push({
        x: 340,
        y: 150,
        width: 60,
        height: 15,
        color: '#8B4513',
        curve: true
    });
    
    platforms.push({
        x: 450,
        y: 180,
        width: 80,
        height: 15,
        color: '#8B4513',
        curve: true
    });
    
    platforms.push({
        x: 580,
        y: 130,
        width: 70,
        height: 15,
        color: '#8B4513',
        curve: true
    });


function createLevel3() {
    // Expert level with maximum difficulty
    // Fast moving social workers
    for (let i = 0; i < 5; i++) {
        obstacles.push({
            x: 120 + i * 120,
            y: 310,
            width: 35,
            height: 40,
            type: 'socialWorker',
            color: '#4169E1',
            speed: 2 + i * 0.2,
            direction: i % 2 === 0 ? 1 : -1,
            minX: 100 + i * 120,
            maxX: 140 + i * 120
        });
    }
    
    // Many snow obstacles
    for (let i = 0; i < 5; i++) {
        obstacles.push({
            x: 150 + i * 120,
            y: 310,
            width: 40,
            height: 40,
            type: 'snow',
            color: '#FFFFFF',
            speed: 0
        });
    }
    
    // Multiple broken roads
    for (let i = 0; i < 3; i++) {
        obstacles.push({
            x: 180 + i * 200,
            y: 330,
            width: 70,
            height: 20,
            type: 'brokenRoad',
            color: '#696969',
            speed: 0,
            curve: true
        });
    }
    
    // Many doors with mixed challenges
    for (let i = 0; i < 4; i++) {
        doors.push({
            x: 180 + i * 150,
            y: 280,
            width: 40,
            height: 70,
            locked: true,
            riddleId: i,
            color: '#8B4513',
            puzzleType: i % 2 === 0 ? 'riddle' : 'puzzle'
        });
    }
    
    // Complex platform maze
    const platformPositions = [
        {x: 80, y: 280, w: 60},
        {x: 180, y: 230, w: 50},
        {x: 270, y: 180, w: 60},
        {x: 380, y: 140, w: 50},
        {x: 480, y: 170, w: 70},
        {x: 600, y: 120, w: 60},
        {x: 700, y: 160, w: 50}
    ];
    
    platformPositions.forEach(pos => {
        platforms.push({
            x: pos.x,
            y: pos.y,
            width: pos.w,
            height: 15,
            color: '#8B4513',
            curve: true
        });
    });
}

function createFinalLevel() {
    // Final level with Prince Stefano visible
    // Maximum obstacles
    for (let i = 0; i < 6; i++) {
        obstacles.push({
            x: 100 + i * 100,
            y: 310,
            width: 35,
            height: 40,
            type: 'socialWorker',
            color: '#4169E1',
            speed: 2.5 + i * 0.1,
            direction: i % 2 === 0 ? 1 : -1,
            minX: 80 + i * 100,
            maxX: 120 + i * 100
        });
    }
    
    // Snow everywhere
    for (let i = 0; i < 7; i++) {
        obstacles.push({
            x: 120 + i * 90,
            y: 310,
            width: 45,
            height: 45,
            type: 'snow',
            color: '#FFFFFF',
            speed: 0
        });
    }
    
    // Many broken roads
    for (let i = 0; i < 4; i++) {
        obstacles.push({
            x: 150 + i * 150,
            y: 330,
            width: 80,
            height: 20,
            type: 'brokenRoad',
            color: '#696969',
            speed: 0,
            curve: true
        });
    }
    
    // Final doors with challenges
    for (let i = 0; i < 5; i++) {
        doors.push({
            x: 150 + i * 120,
            y: 280,
            width: 40,
            height: 70,
            locked: true,
            riddleId: i % riddles.length,
            color: '#8B4513',
            puzzleType: i % 2 === 0 ? 'riddle' : 'puzzle'
        });
    }
    
    // Complex platform maze to reach the prince
    const finalPlatformPositions = [
        {x: 60, y: 280, w: 50},
        {x: 140, y: 240, w: 40},
        {x: 210, y: 200, w: 50},
        {x: 290, y: 160, w: 40},
        {x: 360, y: 130, w: 50},
        {x: 440, y: 100, w: 40},
        {x: 510, y: 140, w: 50},
        {x: 590, y: 180, w: 40},
        {x: 660, y: 220, w: 50},
        {x: 730, y: 260, w: 40}
    ];
    
    finalPlatformPositions.forEach(pos => {
        platforms.push({
            x: pos.x,
            y: pos.y,
            width: pos.w,
            height: 15,
            color: '#8B4513',
            curve: true
        });
    });
}

// Update game state
function update() {
    if (!gameRunning || gamePaused) return;
    
    // Update 3D camera and objects
    update3DCamera();
    update3DObjects();
    
    // Handle input
    if (keys['ArrowRight']) {
        serena.velocityX = serena.speed;
    } else if (keys['ArrowLeft']) {
        serena.velocityX = -serena.speed;
    } else {
        serena.velocityX *= 0.8; // Friction
    }
    
    if ((keys['ArrowUp'] || keys[' ']) && !serena.isJumping) {
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
    
    // Goal collision
    if (serena.x < goal.x + goal.width &&
        serena.x + serena.width > goal.x &&
        serena.y < goal.y + goal.height &&
        serena.y + serena.height > goal.y) {
        victory();
    }
    
    // Door collisions (for riddles and puzzles)
    for (let door of doors) {
        if (door.locked && 
            serena.x < door.x + door.width &&
            serena.x + serena.width > door.x &&
            serena.y < door.y + door.height &&
            serena.y + serena.height > door.y) {
            
            console.log('Door collision detected:', door);
            console.log('Door locked:', door.locked);
            console.log('Door type:', door.puzzleType ? 'puzzle' : 'riddle', 'Riddle ID:', door.riddleId);
            console.log('Door index:', doors.indexOf(door));
            
            // Stop Serena from moving through locked door
            if (serena.velocityX > 0) {
                serena.x = door.x - serena.width;
            } else if (serena.velocityX < 0) {
                serena.x = door.x + door.width;
            }
            serena.velocityX = 0;
            
            // Check if it's a puzzle or riddle door
            currentDoor = door;
            if (door.puzzleType === 'puzzle') {
                console.log('Opening puzzle modal');
                choosePuzzle();
            } else {
                console.log('Opening riddle modal');
                openRiddleModal(door);
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
        // Slow down in snow
        serena.speed = 2;
        setTimeout(() => { serena.speed = 5; }, 1000);
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
    
    // Draw door hint

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
