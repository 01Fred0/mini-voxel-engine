import { WorldConfig } from '../config.js';
import { WorldGenerator } from './WorldGenerator.js';

/**
 * ChunkManager - Manages chunk loading and unloading
 * Loads chunks around the player, unloads distant chunks
 */
export class ChunkManager {
  constructor(seed = null) {
    this.generator = new WorldGenerator(seed);
    this.chunks = new Map();  // key: 'x,z' -> Chunk
    this.renderDistance = WorldConfig.renderDistance;
    this.chunkSize = WorldConfig.chunkSize;
    
    this.loadQueue = [];
    this.lastPlayerChunk = { x: null, z: null };

    // Sets to track dirty chunks (avoids garbage allocation inside game loop)
    this.dirtyPhysicsChunks = new Set();
    this.dirtyRebuildChunks = new Set();
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

  // Load a chunk
  loadChunk(chunkX, chunkZ) {
    if (this.hasChunk(chunkX, chunkZ)) {
      return this.getChunk(chunkX, chunkZ);
    }
    
    // Generate new chunk
    const chunk = this.generator.generateChunk(chunkX, chunkZ);
    chunk.chunkManager = this;

    const key = this.getChunkKey(chunkX, chunkZ);
    this.chunks.set(key, chunk);
    
    // Add to rebuild queue
    this.dirtyRebuildChunks.add(chunk);

    return chunk;
  }

  // Unload a chunk
  unloadChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
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

  // Update loaded chunks based on player position (priority-based load budget)
  updateChunks(playerX, playerZ) {
    const playerChunk = this.worldToChunk(playerX, playerZ);
    const requiredChunks = new Set();
    const loaded = [];
    const unloaded = [];
    
    const maxDistance = this.renderDistance;

    // Determine which chunks should be loaded (circular distance check)
    for (let x = -maxDistance; x <= maxDistance; x++) {
      for (let z = -maxDistance; z <= maxDistance; z++) {
        const chunkX = playerChunk.x + x;
        const chunkZ = playerChunk.z + z;
        
        const distance = Math.sqrt(x * x + z * z);
        if (distance <= maxDistance) {
          const key = this.getChunkKey(chunkX, chunkZ);
          requiredChunks.add(key);
        }
      }
    }
    
    // If player moved to a new chunk, unload distant chunks and rebuild priority queue
    if (playerChunk.x !== this.lastPlayerChunk.x ||
        playerChunk.z !== this.lastPlayerChunk.z) {

      this.lastPlayerChunk = playerChunk;

      // Unload chunks that are too far
      for (const [key, chunk] of this.chunks.entries()) {
        if (!requiredChunks.has(key)) {
          this.unloadChunk(chunk.x, chunk.z);
          unloaded.push(chunk);
        }
      }

      // Rebuild the load queue with pending chunks
      this.loadQueue = [];
      for (const key of requiredChunks) {
        const [cx, cz] = key.split(',').map(Number);
        if (!this.hasChunk(cx, cz)) {
          const distance = Math.sqrt((cx - playerChunk.x) ** 2 + (cz - playerChunk.z) ** 2);
          this.loadQueue.push({ x: cx, z: cz, distance });
        }
      }

      // Sort closest first
      this.loadQueue.sort((a, b) => a.distance - b.distance);
    }

    // Load at most 2 chunks from queue per frame
    const limit = 2;
    let count = 0;
    while (this.loadQueue.length > 0 && count < limit) {
      const next = this.loadQueue.shift();
      const key = this.getChunkKey(next.x, next.z);
      if (requiredChunks.has(key) && !this.hasChunk(next.x, next.z)) {
        const chunk = this.loadChunk(next.x, next.z);
        loaded.push(chunk);
        count++;
      }
    }
    
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
