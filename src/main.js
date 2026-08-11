import { WorldConfig } from './config.js';
import { ChunkManager } from './core/ChunkManager.js';
import { Physics } from './core/Physics.js';
import { Renderer } from './rendering/Renderer.js';
import { CameraController } from './rendering/CameraController.js';
import { InputHandler } from './core/InputHandler.js';
import { VoxelParticleSystem } from './core/VoxelParticleSystem.js';
import { UIManager } from './core/UIManager.js';
import { Profiler } from './core/Profiler.js';

class VoxelEngine {
  constructor() {
    // Get canvas element
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize Profiler first
    this.profiler = new Profiler();
    
    // Initialize renderer
    this.renderer = new Renderer(this.canvas);
    
    // Initialize camera controller
    this.cameraController = new CameraController(
      this.renderer.camera,
      this.canvas
    );
    
    // Initialize chunk manager
    this.chunkManager = new ChunkManager(WorldConfig.seed);
    this.chunkManager.profiler = this.profiler;
    
    // Initialize physics
    this.physics = new Physics(this.chunkManager);
    this.physics.profiler = this.profiler;

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
    
    this.fixedTimestep = 1 / 60; // simulation runs at a fixed 60Hz regardless of render framerate
    this.accumulator = 0;

    // Initialize UI Manager with active quality setting
    this.uiManager = new UIManager(this.canvas, WorldConfig.quality);
    
    // Start game loop
    this.isRunning = true;
    this.gameLoop();
    
    console.log('Voxel Engine initialized!');
    console.log('World seed:', WorldConfig.seed);
  }
  
  updateChunks() {
    this.profiler.start('chunkUpdate');
    const cameraPos = this.cameraController.getPosition();
    const result = this.chunkManager.updateChunks(cameraPos.x, cameraPos.z);
    
    // Unload meshes for distant chunks
    for (const chunk of result.unloaded) {
      this.renderer.removeChunkMesh(chunk.x, chunk.z);
    }
    this.profiler.end('chunkUpdate');
  }
  
  updatePhysics(deltaTime) {
    this.profiler.start('physics');
    // Run the global physics update
    this.physics.update(deltaTime);
    this.profiler.end('physics');
  }

  updateMeshes() {
    this.profiler.start('meshRebuild');
    const needingRebuild = this.chunkManager.getChunksNeedingRebuild();
    if (needingRebuild.length === 0) {
      this.profiler.end('meshRebuild');
      return;
    }

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
    this.profiler.end('meshRebuild');
  }
  
  updateFPS(deltaTime) {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    
    if (this.fpsUpdateTime >= 0.5) { // Update every 0.5 seconds
      const fps = Math.round(this.frameCount / this.fpsUpdateTime);

      const metrics = {
        fps: fps,
        chunkCount: this.chunkManager.chunks.size,
        dirtyRebuildQueueLength: this.chunkManager.dirtyRebuildChunks.size,
        dirtyPhysicsQueueLength: this.chunkManager.dirtyPhysicsChunks.size,
        avgChunkGenMs: this.profiler.average('chunkGen'),
        avgMeshRebuildMs: this.profiler.average('meshRebuild'),
        avgPhysicsMs: this.profiler.average('physics'),
        avgChunkUpdateMs: this.profiler.average('chunkUpdate'),
        drawCalls: this.renderer.renderer.info.render.calls
      };

      this.uiManager.updateProfiler(metrics);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }
  }
  
  gameLoop() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const frameTime = Math.min((currentTime - this.lastTime) / 1000, 0.25); // clamp to avoid spiral of death
    this.lastTime = currentTime;
    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedTimestep) {
      this.updateChunks();
      this.updatePhysics(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
    }

    // Rendering and client-side systems run every animation frame
    this.cameraController.update(frameTime);
    this.updateMeshes();
    this.updateFPS(frameTime);
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
