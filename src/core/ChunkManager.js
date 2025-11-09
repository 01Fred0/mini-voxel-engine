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
    const key = this.getChunkKey(chunkX, chunkZ);
    this.chunks.set(key, chunk);
    
    return chunk;
  }

  // Unload a chunk
  unloadChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
    const chunk = this.chunks.get(key);
    
    if (chunk) {
      chunk.dispose();  // Clean up mesh resources
      this.chunks.delete(key);
      return true;
    }
    
    return false;
  }

  // Update loaded chunks based on player position
  updateChunks(playerX, playerZ) {
    const playerChunk = this.worldToChunk(playerX, playerZ);
    
    // Only update if player moved to a new chunk
    if (playerChunk.x === this.lastPlayerChunk.x && 
        playerChunk.z === this.lastPlayerChunk.z) {
      return { loaded: [], unloaded: [] };
    }
    
    this.lastPlayerChunk = playerChunk;
    
    // Determine which chunks should be loaded
    const requiredChunks = new Set();
    const loaded = [];
    const unloaded = [];
    
    for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
      for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
        const chunkX = playerChunk.x + x;
        const chunkZ = playerChunk.z + z;
        const key = this.getChunkKey(chunkX, chunkZ);
        requiredChunks.add(key);
        
        // Load chunk if not already loaded
        if (!this.hasChunk(chunkX, chunkZ)) {
          const chunk = this.loadChunk(chunkX, chunkZ);
          loaded.push(chunk);
        }
      }
    }
    
    // Unload chunks that are too far
    for (const [key, chunk] of this.chunks.entries()) {
      if (!requiredChunks.has(key)) {
        this.unloadChunk(chunk.x, chunk.z);
        unloaded.push(chunk);
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
    return this.getAllChunks().filter(chunk => chunk.needsPhysicsUpdate);
  }

  // Get chunks that need mesh rebuild
  getChunksNeedingRebuild() {
    return this.getAllChunks().filter(chunk => chunk.needsRebuild);
  }

  // Dispose all chunks
  dispose() {
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }
    this.chunks.clear();
  }
}
