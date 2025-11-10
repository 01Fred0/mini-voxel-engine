import { WorldConfig } from './config.js';
import { ChunkManager } from './core/ChunkManager.js';
import { Physics } from './core/Physics.js';
import { Renderer } from './rendering/Renderer.js';
import { CameraController } from './rendering/CameraController.js';
import { InputHandler } from './core/InputHandler.js';

class VoxelEngine {
  constructor() {
    // Get canvas element
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    
    // Initialize renderer
    this.renderer = new Renderer(this.canvas);
    
    // Initialize camera controller
    this.cameraController = new CameraController(
      this.renderer.camera,
      this.canvas
    );
    
    // Initialize chunk manager
    this.chunkManager = new ChunkManager(WorldConfig.seed);
    
    // Initialize physics
    this.physics = new Physics();

        // Initialize input handler
    this.inputHandler = new InputHandler(
      this.renderer.camera,
      this.chunkManager,
      this.renderer
    );
    
    // Track loaded chunks
    this.loadedChunks = new Map();


        // Prevent right-click context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Performance tracking
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    // Create FPS display
    this.createFPSDisplay();
    
    // Create instructions overlay
    this.createInstructions();
    
    // Start game loop
    this.isRunning = true;
    this.gameLoop();
    
    console.log('Voxel Engine initialized!');
    console.log('World seed:', WorldConfig.seed);
  }
  
  createFPSDisplay() {
    this.fpsElement = document.createElement('div');
    this.fpsElement.style.position = 'fixed';
    this.fpsElement.style.top = '10px';
    this.fpsElement.style.left = '10px';
    this.fpsElement.style.color = 'white';
    this.fpsElement.style.fontFamily = 'monospace';
    this.fpsElement.style.fontSize = '14px';
    this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.fpsElement.style.padding = '5px 10px';
    this.fpsElement.style.borderRadius = '3px';
    this.fpsElement.style.zIndex = '1000';
    this.fpsElement.textContent = 'FPS: 0';
    document.body.appendChild(this.fpsElement);
  }
  
  createInstructions() {
    const instructions = document.createElement('div');
    instructions.style.position = 'fixed';
    instructions.style.top = '50%';
    instructions.style.left = '50%';
    instructions.style.transform = 'translate(-50%, -50%)';
    instructions.style.color = 'white';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '18px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    instructions.style.padding = '20px';
    instructions.style.borderRadius = '10px';
    instructions.style.textAlign = 'center';
    instructions.style.zIndex = '999';
    instructions.innerHTML = `
      <h2>Mini Voxel Engine</h2>
      <p><strong>Click to start</strong></p>
      <br>
      <p>WASD - Move</p>
      <p>Mouse - Look around</p>
      <p>Space - Move up</p>
      <p>Shift - Sprint / Move down</p>
      <p>ESC - Release mouse</p>
    `;
    document.body.appendChild(instructions);
    
    // Remove instructions when pointer is locked
    const removeInstructions = () => {
      if (document.pointerLockElement === this.canvas) {
        instructions.remove();
        document.removeEventListener('pointerlockchange', removeInstructions);
      }
    };
    document.addEventListener('pointerlockchange', removeInstructions);
  }
  
  updateChunks() {
    const cameraPos = this.cameraController.getPosition();
    const chunkX = Math.floor(cameraPos.x / WorldConfig.chunkSize);
    const chunkZ = Math.floor(cameraPos.z / WorldConfig.chunkSize);
    
    // Load chunks around player
    const renderDistance = 4; // Number of chunks to load in each direction
    const chunksToLoad = [];
    
    for (let x = chunkX - renderDistance; x <= chunkX + renderDistance; x++) {
      for (let z = chunkZ - renderDistance; z <= chunkZ + renderDistance; z++) {
        const distance = Math.sqrt((x - chunkX) ** 2 + (z - chunkZ) ** 2);
        if (distance <= renderDistance) {
          chunksToLoad.push({ x, z, distance });
        }
      }
    }
    
    // Sort by distance (load closest first)
    chunksToLoad.sort((a, b) => a.distance - b.distance);
    
    // Load new chunks
    for (const { x, z } of chunksToLoad) {
      const chunkKey = `${x},${z}`;
      
      if (!this.loadedChunks.has(chunkKey)) {
        const chunk = this.chunkManager.getChunk(x, z);
        this.loadedChunks.set(chunkKey, chunk);
        this.renderer.updateChunkMesh(chunk);
      }
    }
    
    // Unload distant chunks
    const unloadDistance = renderDistance + 2;
    const chunksToUnload = [];
    
    for (const [chunkKey, chunk] of this.loadedChunks) {
      const distance = Math.sqrt(
        (chunk.x - chunkX) ** 2 + (chunk.z - chunkZ) ** 2
      );
      
      if (distance > unloadDistance) {
        chunksToUnload.push(chunkKey);
      }
    }
    
    // Unload chunks
    for (const chunkKey of chunksToUnload) {
      const chunk = this.loadedChunks.get(chunkKey);
      this.renderer.removeChunkMesh(chunk.x, chunk.z);
      this.loadedChunks.delete(chunkKey);
    }
  }
  
  updatePhysics(deltaTime) {
    // Update physics for all loaded chunks
    for (const chunk of this.loadedChunks.values()) {
      this.physics.update(chunk, deltaTime);
      
      // If chunk was modified by physics, update its mesh
      if (chunk.needsRebuild) {
        this.renderer.updateChunkMesh(chunk);
        chunk.needsRebuild = false;
      }
    }
  }
  
  updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    
    if (this.fpsUpdateTime >= 0.5) { // Update every 0.5 seconds
      const fps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.fpsElement.textContent = `FPS: ${fps} | Chunks: ${this.loadedChunks.size}`;
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }
  }
  
  gameLoop() {
    if (!this.isRunning) return;
    
    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;
    
    // Update camera controller
    this.cameraController.update(deltaTime);
    
    // Update chunks (load/unload based on camera position)
    this.updateChunks();
    
    // Update physics
    this.updatePhysics(deltaTime);
    
    // Update FPS display
    this.updateFPS(deltaTime);
    
    // Render scene
    this.renderer.render();
    
    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }
  
  dispose() {
    this.isRunning = false;
    this.cameraController.dispose();
        this.inputHandler.dispose();
    this.renderer.dispose();
    this.chunkManager.dispose();
    if (this.fpsElement) {
      this.fpsElement.remove();
    }
  }
}

// Initialize engine when page loads
window.addEventListener('load', () => {
  try {
    window.voxelEngine = new VoxelEngine();
  } catch (error) {
    console.error('Failed to initialize voxel engine:', error);
    alert('Failed to initialize voxel engine. Check console for details.');
  }
});
