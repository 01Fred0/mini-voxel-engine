import { WorldConfig } from '../config.js';
import { WorldGenerator } from './WorldGenerator.js';
import { LightingSystem } from './LightingSystem.js';
import { Chunk } from './Chunk.js';
import GenerationWorker from '../workers/generation.worker.js?worker';

/**
 * ChunkManager - Manages chunk loading and unloading
 * Loads chunks around the player, unloads distant chunks
 */
export class ChunkManager {
  constructor(seed = null) {
    this.generator = new WorldGenerator(seed);
    this.chunks = new Map();  // key: 'x,z' -> Chunk
    this.lightingSystem = new LightingSystem(this);
    this.renderDistance = WorldConfig.renderDistance;
    this.chunkSize = WorldConfig.chunkSize;
    
    this.loadQueue = [];
    this.lastPlayerChunk = { x: null, z: null };

    // Sets to track dirty chunks (avoids garbage allocation inside game loop)
    this.dirtyPhysicsChunks = new Set();
    this.dirtyRebuildChunks = new Set();
    this._requiredChunks = new Set();

    // Web Worker Initialization using 100% compatible Vite classic-worker bundling
    this.pendingGeneration = new Set();
    this.worker = new GenerationWorker();

    this.worker.onerror = (err) => {
      console.error("Web Worker Generation Error:", err);
    };

    this.worker.postMessage({ type: 'init', seed: seed || WorldConfig.seed });
    this.worker.onmessage = (e) => {
      const { chunkX, chunkZ, blocksBuffer, heightMapBuffer } = e.data;
      const key = this.getChunkKey(chunkX, chunkZ);

      this.pendingGeneration.delete(key);

      // Check if we still require this chunk (not unloaded while generating)
      if (this._requiredChunks.size > 0 && !this._requiredChunks.has(key)) {
        return;
      }

      const chunk = new Chunk(chunkX, chunkZ);
      chunk.blocks = new Uint16Array(blocksBuffer);
      chunk.heightMap = new Uint8Array(heightMapBuffer);
      chunk.chunkManager = this;

      this.chunks.set(key, chunk);

      // Calculate lighting
      if (this.profiler) this.profiler.start('chunkLight');
      this.lightingSystem.calculateChunkLighting(chunk);
      if (this.profiler) this.profiler.end('chunkLight');

      // Add to rebuild queue
      this.dirtyRebuildChunks.add(chunk);

      // Invalidate neighbor chunk meshes so they rebuild and hide boundary faces
      const neighbors = [
        [chunkX - 1, chunkZ],
        [chunkX + 1, chunkZ],
        [chunkX, chunkZ - 1],
        [chunkX, chunkZ + 1]
      ];
      for (const [nx, nz] of neighbors) {
        const neighbor = this.getChunk(nx, nz);
        if (neighbor) {
          neighbor.needsRebuild = true;
        }
      }
    };
  }

  // Get chunk key for storage
  getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
  }

  // Get chunk coordinates from world position
  worldToChunk(worldX, worldZ) {
    return {
      x: Math.floor(worldX / this.chunkSize),
      z: Math.floor(worldZ / this.chunkSize)
    };
  }

  // Convert world coordinates to local chunk coordinates
  worldToLocal(worldX, worldY, worldZ) {
    const chunkX = Math.floor(worldX / this.chunkSize);
    const chunkZ = Math.floor(worldZ / this.chunkSize);
    
    return {
      x: worldX - (chunkX * this.chunkSize),
      y: worldY,
      z: worldZ - (chunkZ * this.chunkSize)
    };
  }

  // Get chunk at world position
  getChunkAt(worldX, worldZ) {
    const chunk = this.worldToChunk(worldX, worldZ);
    return this.getChunk(chunk.x, chunk.z);
  }

  // Get chunk by chunk coordinates
  getChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
    return this.chunks.get(key);
  }

  // Check if chunk is loaded
  hasChunk(chunkX, chunkZ) {
    return this.chunks.has(this.getChunkKey(chunkX, chunkZ));
  }

  // Load a chunk asynchronously using Web Workers
  loadChunk(chunkX, chunkZ) {
    if (this.hasChunk(chunkX, chunkZ)) {
      return this.getChunk(chunkX, chunkZ);
    }
    
    const key = this.getChunkKey(chunkX, chunkZ);
    if (this.pendingGeneration.has(key)) {
      return null;
    }

    this.pendingGeneration.add(key);
    this.worker.postMessage({ type: 'generate', chunkX, chunkZ });
    return null;
  }

  // Unload a chunk
  unloadChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
    this.pendingGeneration.delete(key);
    const chunk = this.chunks.get(key);
    
    if (chunk) {
      this.dirtyRebuildChunks.delete(chunk);
      this.dirtyPhysicsChunks.delete(chunk);
      chunk.dispose();  // Clean up mesh resources
      this.chunks.delete(key);
      return true;
    }
    
    return false;
  }

  drainLoadQueue(limit, loaded) {
    let count = 0;
    while (this.loadQueue.length > 0 && count < limit) {
      const next = this.loadQueue.shift();
      const key = this.getChunkKey(next.x, next.z);
      if (this._requiredChunks.has(key) && !this.hasChunk(next.x, next.z)) {
        const chunk = this.loadChunk(next.x, next.z);
        loaded.push(chunk);
        count++;
      }
    }
  }

  // Update loaded chunks based on player position (priority-based load budget)
  updateChunks(playerX, playerZ) {
    const playerChunk = this.worldToChunk(playerX, playerZ);
    const loaded = [];
    const unloaded = [];
    
    // If player is in the same chunk, we can skip the expensive requiredChunks calculation
    // and just process the load queue.
    if (playerChunk.x === this.lastPlayerChunk.x &&
        playerChunk.z === this.lastPlayerChunk.z) {

      this.drainLoadQueue(WorldConfig.chunkLoadBudgetPerFrame, loaded);
      return { loaded, unloaded };
    }

    this.lastPlayerChunk = playerChunk;
    this._requiredChunks.clear();
    const requiredChunks = this._requiredChunks;
    const maxDistance = this.renderDistance;

    // Determine which chunks should be loaded (circular distance check)
    for (let x = -maxDistance; x <= maxDistance; x++) {
      for (let z = -maxDistance; z <= maxDistance; z++) {
        const chunkX = playerChunk.x + x;
        const chunkZ = playerChunk.z + z;
        
        const distanceSq = x * x + z * z;
        if (distanceSq <= maxDistance * maxDistance) {
          const key = this.getChunkKey(chunkX, chunkZ);
          requiredChunks.add(key);
        }
      }
    }
    
    // Unload chunks that are too far
    for (const [key, chunk] of this.chunks.entries()) {
      if (!requiredChunks.has(key)) {
        unloaded.push({ x: chunk.x, z: chunk.z });
        this.unloadChunk(chunk.x, chunk.z);
      }
    }

    // Rebuild the load queue with pending chunks
    this.loadQueue = [];
    for (const key of requiredChunks) {
      const [cx, cz] = key.split(',').map(Number);
      if (!this.hasChunk(cx, cz)) {
        const distanceSq = (cx - playerChunk.x) ** 2 + (cz - playerChunk.z) ** 2;
        this.loadQueue.push({ x: cx, z: cz, distanceSq });
      }
    }

    // Sort closest first
    this.loadQueue.sort((a, b) => a.distanceSq - b.distanceSq);

    this.drainLoadQueue(WorldConfig.chunkLoadBudgetPerFrame, loaded);
    
    return { loaded, unloaded };
  }

  // Get all loaded chunks
  getAllChunks() {
    return Array.from(this.chunks.values());
  }

  // Get block at world coordinates
  getBlock(worldX, worldY, worldZ) {
    const chunk = this.getChunkAt(worldX, worldZ);
    if (!chunk) return null;
    
    const local = this.worldToLocal(worldX, worldY, worldZ);
    return chunk.getBlock(local.x, local.y, local.z);
  }

  // Set block at world coordinates
  setBlock(worldX, worldY, worldZ, blockType) {
    const chunk = this.getChunkAt(worldX, worldZ);
    if (!chunk) return false;
    
    const local = this.worldToLocal(worldX, worldY, worldZ);
    return chunk.setBlock(local.x, local.y, local.z, blockType);
  }

  // Get chunks that need physics updates
  getChunksNeedingPhysics() {
    return Array.from(this.dirtyPhysicsChunks);
  }

  // Get chunks that need mesh rebuild
  getChunksNeedingRebuild() {
    return Array.from(this.dirtyRebuildChunks);
  }

  // Dispose all chunks
  dispose() {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
    this.dirtyPhysicsChunks.clear();
    this.dirtyRebuildChunks.clear();
    this.loadQueue = [];
  }
}
