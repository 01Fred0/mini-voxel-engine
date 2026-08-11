import { WorldConfig } from './config.js';
import { ChunkManager } from './core/ChunkManager.js';
import { Physics } from './core/Physics.js';
import { Renderer } from './rendering/Renderer.js';
import { CameraController } from './rendering/CameraController.js';
import { InputHandler } from './core/InputHandler.js';
import { VoxelParticleSystem } from './core/VoxelParticleSystem.js';
import { UIManager } from './core/UIManager.js';

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
    this.physics = new Physics(this.chunkManager);

    // Initialize particle system
    this.particleSystem = new VoxelParticleSystem(this.renderer.scene);
    this.physics.setParticleSystem(this.particleSystem);

    // Initialize input handler
    this.inputHandler = new InputHandler(
      this.renderer.camera,
      this.chunkManager,
      this.renderer,
      this.physics
    );
    
    // Prevent right-click context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Performance tracking
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    // Initialize UI Manager with active quality setting
    this.uiManager = new UIManager(this.canvas, WorldConfig.quality);
    
    // Start game loop
    this.isRunning = true;
    this.gameLoop();
    
    console.log('Voxel Engine initialized!');
    console.log('World seed:', WorldConfig.seed);
  }
  
  updateChunks() {
    const cameraPos = this.cameraController.getPosition();
    const result = this.chunkManager.updateChunks(cameraPos.x, cameraPos.z);
    
    // Unload meshes for distant chunks
    for (const chunk of result.unloaded) {
      this.renderer.removeChunkMesh(chunk.x, chunk.z);
    }
  }
  
  updatePhysics(deltaTime) {
    // Run the global physics update
    this.physics.update(deltaTime);
  }

  updateMeshes() {
    const needingRebuild = this.chunkManager.getChunksNeedingRebuild();
    if (needingRebuild.length === 0) return;

    const cameraPos = this.cameraController.getPosition();
    const playerChunk = this.chunkManager.worldToChunk(cameraPos.x, cameraPos.z);

    // Sort by distance to camera so closest chunks are rebuilt first
    needingRebuild.sort((a, b) => {
      const distA = (a.x - playerChunk.x) ** 2 + (a.z - playerChunk.z) ** 2;
      const distB = (b.x - playerChunk.x) ** 2 + (b.z - playerChunk.z) ** 2;
      return distA - distB;
    });

    // Budget: rebuild at most X chunks per frame to avoid stuttering/hitching
    const limit = WorldConfig.meshRebuildBudgetPerFrame;
    let count = 0;
    for (const chunk of needingRebuild) {
      if (count >= limit) break;
      this.renderer.updateChunkMesh(chunk);
      chunk.needsRebuild = false;
      count++;
    }
  }
  
  updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    
    if (this.fpsUpdateTime >= 0.5) { // Update every 0.5 seconds
      const fps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.uiManager.updateFPS(fps, this.chunkManager.chunks.size);
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

    // Update meshes (budget-controlled mesh rebuilding)
    this.updateMeshes();
    
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
    this.uiManager.dispose();
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
