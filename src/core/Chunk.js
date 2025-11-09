import { WorldConfig, BlockTypes } from '../config.js';

/**
 * Chunk - Represents a 3D section of the world
 * Stores voxel data and manages physics state
 */
export class Chunk {
  constructor(x, z) {
    this.x = x;  // Chunk X coordinate
    this.z = z;  // Chunk Z coordinate
    this.size = WorldConfig.chunkSize;
    this.height = WorldConfig.chunkHeight;
    
    // 3D array to store block types [x][y][z]
    this.blocks = this.createBlockArray();
    
    // Physics state tracking
    this.needsPhysicsUpdate = false;
    this.dirtyBlocks = new Set();  // Blocks that changed
    
    // Mesh state
    this.mesh = null;
    this.needsRebuild = true;
  }

  // Create empty block array
  createBlockArray() {
    const blocks = [];
    for (let x = 0; x < this.size; x++) {
      blocks[x] = [];
      for (let y = 0; y < this.height; y++) {
        blocks[x][y] = [];
        for (let z = 0; z < this.size; z++) {
          blocks[x][y][z] = BlockTypes.AIR;
        }
      }
    }
    return blocks;
  }

  // Get block at local coordinates
  getBlock(x, y, z) {
    if (!this.isValidPosition(x, y, z)) {
      return BlockTypes.AIR;
    }
    return this.blocks[x][y][z];
  }

  // Set block at local coordinates
  setBlock(x, y, z, blockType) {
    if (!this.isValidPosition(x, y, z)) {
      return false;
    }
    
    const oldBlock = this.blocks[x][y][z];
    if (oldBlock === blockType) {
      return false;
    }
    
    this.blocks[x][y][z] = blockType;
    this.dirtyBlocks.add(`${x},${y},${z}`);
    this.needsPhysicsUpdate = true;
    this.needsRebuild = true;
    
    return true;
  }

  // Check if position is within chunk bounds
  isValidPosition(x, y, z) {
    return x >= 0 && x < this.size &&
           y >= 0 && y < this.height &&
           z >= 0 && z < this.size;
  }

  // Get world position from chunk coordinates
  getWorldPosition(localX, localY, localZ) {
    return {
      x: this.x * this.size + localX,
      y: localY,
      z: this.z * this.size + localZ
    };
  }

  // Check if block is solid
  isSolid(x, y, z) {
    const blockType = this.getBlock(x, y, z);
    return blockType !== BlockTypes.AIR && blockType !== BlockTypes.WATER;
  }

  // Check if block is exposed (has air neighbor)
  isExposed(x, y, z) {
    if (!this.isSolid(x, y, z)) {
      return false;
    }
    
    // Check all 6 neighbors
    const neighbors = [
      [x - 1, y, z], [x + 1, y, z],
      [x, y - 1, z], [x, y + 1, z],
      [x, y, z - 1], [x, y, z + 1]
    ];
    
    for (const [nx, ny, nz] of neighbors) {
      if (!this.isSolid(nx, ny, nz)) {
        return true;
      }
    }
    
    return false;
  }

  // Get blocks that need physics updates
  getDirtyBlocks() {
    return Array.from(this.dirtyBlocks).map(key => {
      const [x, y, z] = key.split(',').map(Number);
      return { x, y, z, type: this.blocks[x][y][z] };
    });
  }

  // Clear dirty blocks after physics update
  clearDirtyBlocks() {
    this.dirtyBlocks.clear();
    this.needsPhysicsUpdate = false;
  }

  // Clone chunk data
  clone() {
    const newChunk = new Chunk(this.x, this.z);
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.size; z++) {
          newChunk.blocks[x][y][z] = this.blocks[x][y][z];
        }
      }
    }
    return newChunk;
  }

  // Dispose of mesh resources
  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(m => m.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
      this.mesh = null;
    }
  }
}
