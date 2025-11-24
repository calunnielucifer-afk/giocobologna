// Serena Escape Game - Isolated scope to prevent conflicts
(function() {
  'use strict';

  // Game variables - prefixed to avoid conflicts
  let canvas, ctx;
  let gameRunning = false;
  let gamePaused = false;
  let score = 0;
  let lives = 3;
  let level = 1;
  let gameAnimationId; // Renamed from animationId
  let currentDoor = null;
  let currentRiddle = null;
  let currentPuzzle = null;
  let draggedElement = null;

  // Shooting system
  let projectiles = [];
  let canShoot = true;
  let shootCooldown = 500; // milliseconds between shots

  // 3D System - renamed to avoid conflicts
  let gameCamera3D = { // Renamed from camera3D
    x: 0,
    y: 0,
    z: 500,
    rotation: 0
  };

  let is3DLevel = false;
  let perspective3D = 800;
  let objects3D = [];

// Expose necessary functions to global scope for HTML event handlers
window.SerenaGame = {
    startGame,
    pauseGame,
    restartGame,
    gameOver
};

})(); // Close IIFE
