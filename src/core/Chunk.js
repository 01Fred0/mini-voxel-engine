import { WorldConfig, BlockTypes } from '../config.js';
import { ChunkSection } from './ChunkSection.js';

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
    this._needsPhysicsUpdate = false;
    this.dirtyBlocks = new Set();  // Blocks that changed
    
    // Mesh state
    this.mesh = null;
    this._needsRebuild = true;

    // Link to ChunkManager (will be set when added/loaded)
    this.chunkManager = null;

    // Heightmap for occlusion culling
    this.heightMap = new Uint8Array(this.size * this.size);

    // Initialize vertical sections
    this.sectionHeight = WorldConfig.sectionHeight ?? 16;
    this.sectionCount = Math.ceil(this.height / this.sectionHeight);
    this.sections = [];
    for (let i = 0; i < this.sectionCount; i++) {
      this.sections.push(new ChunkSection(this, i, this.sectionHeight));
    }
  }

  get needsRebuild() {
    return this._needsRebuild;
  }

  set needsRebuild(val) {
    this._needsRebuild = val;
    if (this.chunkManager) {
      if (val) {
        this.chunkManager.dirtyRebuildChunks.add(this);
      } else {
        this.chunkManager.dirtyRebuildChunks.delete(this);
      }
    }
  }

  get needsPhysicsUpdate() {
    return this._needsPhysicsUpdate;
  }

  set needsPhysicsUpdate(val) {
    this._needsPhysicsUpdate = val;
    if (this.chunkManager) {
      if (val) {
        this.chunkManager.dirtyPhysicsChunks.add(this);
      } else {
        this.chunkManager.dirtyPhysicsChunks.delete(this);
      }
    }
  }

  index(x, y, z) {
    // Layout optimized for horizontal slice (contiguous X and Z access)
    return x + this.size * (z + this.size * y);
  }

  packLocal(x, y, z) {
    return x | (y << 8) | (z << 16);
  }

  unpackLocal(v) {
    return {
      x: v & 0xff,
      y: (v >> 8) & 0xff,
      z: (v >> 16) & 0xff
    };
  }

  // Create empty block array
  createBlockArray() {
    return new Uint16Array(this.size * this.height * this.size);
  }

  // Get block at local coordinates
  getBlock(x, y, z) {
    if (!this.isValidPosition(x, y, z)) {
      return BlockTypes.AIR;
    }
    return this.blocks[this.index(x, y, z)];
  }

  markForRebuild() {
    this.needsRebuild = true;
  }

  markBoundaryNeighborsForRebuild(x, z) {
    if (!this.chunkManager) return;
    if (x === 0) {
      this.chunkManager.getChunk(this.x - 1, this.z)?.markForRebuild();
    } else if (x === this.size - 1) {
      this.chunkManager.getChunk(this.x + 1, this.z)?.markForRebuild();
    }
    if (z === 0) {
      this.chunkManager.getChunk(this.x, this.z - 1)?.markForRebuild();
    } else if (z === this.size - 1) {
      this.chunkManager.getChunk(this.x, this.z + 1)?.markForRebuild();
    }
  }

  // Set block at local coordinates
  setBlock(x, y, z, blockType) {
    if (!this.isValidPosition(x, y, z)) {
      return false;
    }
    
    const idx = this.index(x, y, z);
    const oldBlock = this.blocks[idx];
    if (oldBlock === blockType) {
      return false;
    }
    
    this.blocks[idx] = blockType;
    this.dirtyBlocks.add(this.packLocal(x, y, z));
    this.needsPhysicsUpdate = true;
    this.needsRebuild = true;

    // Mark specific section dirty
    const sectionIndex = Math.floor(y / this.sectionHeight);
    if (sectionIndex >= 0 && sectionIndex < this.sectionCount) {
      this.sections[sectionIndex].markDirty();

      // If the block is on a section boundary, mark the adjacent section too
      const localY = y % this.sectionHeight;
      if (localY === 0 && sectionIndex > 0) {
        this.sections[sectionIndex - 1].markDirty();
      } else if (localY === this.sectionHeight - 1 && sectionIndex < this.sectionCount - 1) {
        this.sections[sectionIndex + 1].markDirty();
      }
    }

    // Update lighting on block change
    if (this.chunkManager && this.chunkManager.lightingSystem) {
      this.chunkManager.lightingSystem.onBlockChange(this, x, y, z, oldBlock, blockType);
    }

    this.markBoundaryNeighborsForRebuild(x, z);
    
    return true;
  }

  // Set block at local coordinates during world generation (bypassing dirty/physics tracking)
  fillBlock(x, y, z, blockType) {
    if (!this.isValidPosition(x, y, z)) {
      return false;
    }
    this.blocks[this.index(x, y, z)] = blockType;
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
    if (y < 0 || y >= this.height) return false;
    if (x >= 0 && x < this.size && z >= 0 && z < this.size) {
      const blockType = this.blocks[this.index(x, y, z)];
      return blockType !== BlockTypes.AIR && blockType !== BlockTypes.WATER;
    }
    if (this.chunkManager) {
      const neighborX = this.x + Math.floor(x / this.size);
      const neighborZ = this.z + Math.floor(z / this.size);
      const neighbor = this.chunkManager.getChunk(neighborX, neighborZ);
      if (neighbor) {
        const localX = (x % this.size + this.size) % this.size;
        const localZ = (z % this.size + this.size) % this.size;
        return neighbor.isSolid(localX, y, localZ);
      }
    }
    return false;
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
      const { x, y, z } = this.unpackLocal(key);
      return { x, y, z, type: this.blocks[this.index(x, y, z)] };
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
    newChunk.blocks.set(this.blocks);
    return newChunk;
  }

  // Dispose of mesh resources
  dispose() {
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      // DO NOT dispose this.mesh.material because it is shared!
      this.mesh = null;
    }
  }
}
