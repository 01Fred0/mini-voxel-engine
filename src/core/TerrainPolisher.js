/**
 * TerrainPolisher.js - Advanced terrain polishing and enhancement system
 * Provides smooth transitions, erosion simulation, and feature placement
 * for procedurally generated voxel terrain
 */

import { BlockTypes } from '../config.js';
import { SimplexNoise } from '../noise/SimplexNoise.js';
import { Biomes } from './Biome.js';

/**
 * TerrainPolisher - Enhances generated terrain with polish passes
 */
export class TerrainPolisher {
  constructor(seed = 0) {
    this.seed = seed;
    this.featureNoise = new SimplexNoise(seed + 5000);
    this.erosionNoise = new SimplexNoise(seed + 6000);
  }

  /**
   * Polish a chunk with all enhancement passes
   * @param {Chunk} chunk - The chunk to polish
   * @param {WorldGenerator} worldGen - Reference to world generator
   */
  polishChunk(chunk, worldGen) {
    // Pass 1: Smooth terrain transitions
    this.smoothTerrainTransitions(chunk, worldGen);
    
    // Pass 2: Apply erosion simulation
    this.applyErosion(chunk, worldGen);
    
    // Pass 3: Add surface details
    this.addSurfaceDetails(chunk, worldGen);
    
    // Pass 4: Place natural features
    this.placeNaturalFeatures(chunk, worldGen);
    
    // Pass 5: Clean up floating blocks
    this.cleanupFloatingBlocks(chunk);
    
    return chunk;
  }

  /**
   * Smooth terrain transitions between biomes and height changes
   */
  smoothTerrainTransitions(chunk, worldGen) {
    for (let x = 1; x < chunk.size - 1; x++) {
      for (let z = 1; z < chunk.size - 1; z++) {
        for (let y = 1; y < chunk.height - 1; y++) {
          const blockType = chunk.getBlock(x, y, z);
          
          // Skip air and special blocks
          if (blockType === BlockTypes.AIR || blockType === BlockTypes.WATER) {
            continue;
          }
          
          // Check if this is a sharp edge that needs smoothing
          if (this.isSharpEdge(chunk, x, y, z)) {
            // Sample neighboring blocks and smooth
            this.smoothBlock(chunk, x, y, z);
          }
        }
      }
    }
  }

  /**
   * Check if a block position is a sharp edge
   */
  isSharpEdge(chunk, x, y, z) {
    let airNeighbors = 0;
    let solidNeighbors = 0;
    
    // Check 6 adjacent neighbors
    const neighbors = [
      [x+1, y, z], [x-1, y, z],
      [x, y+1, z], [x, y-1, z],
      [x, y, z+1], [x, y, z-1]
    ];
    
    for (const [nx, ny, nz] of neighbors) {
      if (nx < 0 || nx >= chunk.size || ny < 0 || ny >= chunk.height || nz < 0 || nz >= chunk.size) {
        continue;
      }
      const neighborType = chunk.getBlock(nx, ny, nz);
      if (neighborType === BlockTypes.AIR) {
        airNeighbors++;
      } else {
        solidNeighbors++;
      }
    }
    
    // Sharp edge if has both air and solid neighbors in significant amounts
    return airNeighbors >= 2 && solidNeighbors >= 2;
  }

  /**
   * Smooth a single block based on neighbors
   */
  smoothBlock(chunk, x, y, z) {
    // Get most common solid block type in neighborhood
    const blockCounts = new Map();
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (nx < 0 || nx >= chunk.size || ny < 0 || ny >= chunk.height || nz < 0 || nz >= chunk.size) {
            continue;
          }
          
          const blockType = chunk.getBlock(nx, ny, nz);
          if (blockType !== BlockTypes.AIR && blockType !== BlockTypes.WATER) {
            blockCounts.set(blockType, (blockCounts.get(blockType) || 0) + 1);
          }
        }
      }
    }
    
    // Find most common block type
    let maxCount = 0;
    let mostCommon = chunk.getBlock(x, y, z);
    for (const [blockType, count] of blockCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = blockType;
      }
    }
    
    // Apply smoothing if significant difference
    if (maxCount >= 8) {
      chunk.setBlock(x, y, z, mostCommon);
    }
  }

  /**
   * Apply erosion simulation for realistic weathering
   */
  applyErosion(chunk, worldGen) {
    const erosionStrength = 0.3;
    
    for (let x = 1; x < chunk.size - 1; x++) {
      for (let z = 1; z < chunk.size - 1; z++) {
        // Find surface height
        let surfaceY = -1;
        for (let y = chunk.height - 1; y >= 0; y--) {
          if (chunk.getBlock(x, y, z) !== BlockTypes.AIR) {
            surfaceY = y;
            break;
          }
        }
        
        if (surfaceY <= 0) continue;
        
        const worldX = chunk.chunkX * chunk.size + x;
        const worldZ = chunk.chunkZ * chunk.size + z;
        
        // Use noise to determine erosion amount
        const erosionValue = this.erosionNoise.noise(worldX * 0.05, worldZ * 0.05);
        
        if (erosionValue > 0.6) {
          // Strong erosion - remove top blocks
          const erosionDepth = Math.floor((erosionValue - 0.6) * 3 * erosionStrength);
          for (let i = 0; i < erosionDepth && surfaceY - i > 0; i++) {
            chunk.setBlock(x, surfaceY - i, z, BlockTypes.AIR);
          }
        } else if (erosionValue < -0.4) {
          // Deposition - add sediment
          if (chunk.getBlock(x, surfaceY + 1, z) === BlockTypes.AIR) {
            const surfaceBlock = chunk.getBlock(x, surfaceY, z);
            if (surfaceBlock === BlockTypes.GRASS) {
              chunk.setBlock(x, surfaceY + 1, z, BlockTypes.DIRT);
            } else if (surfaceBlock === BlockTypes.STONE) {
              chunk.setBlock(x, surfaceY + 1, z, BlockTypes.STONE);
            }
          }
        }
      }
    }
  }

  /**
   * Add surface details like pebbles and varied textures
   */
  addSurfaceDetails(chunk, worldGen) {
    for (let x = 0; x < chunk.size; x++) {
      for (let z = 0; z < chunk.size; z++) {
        const worldX = chunk.chunkX * chunk.size + x;
        const worldZ = chunk.chunkZ * chunk.size + z;
        
        // Find surface
        let surfaceY = -1;
        for (let y = chunk.height - 1; y >= 0; y--) {
          const blockType = chunk.getBlock(x, y, z);
          if (blockType !== BlockTypes.AIR && blockType !== BlockTypes.WATER) {
            surfaceY = y;
            break;
          }
        }
        
        if (surfaceY <= 0 || surfaceY >= chunk.height - 1) continue;
        
        // Add occasional stone patches on grass
        const detailNoise = this.featureNoise.noise(worldX * 0.2, worldZ * 0.2);
        if (detailNoise > 0.85 && chunk.getBlock(x, surfaceY, z) === BlockTypes.GRASS) {
          chunk.setBlock(x, surfaceY, z, BlockTypes.STONE);
        }
      }
    }
  }

  /**
   * Place natural features like boulders and rock formations
   */
  placeNaturalFeatures(chunk, worldGen) {
    for (let x = 2; x < chunk.size - 2; x++) {
      for (let z = 2; z < chunk.size - 2; z++) {
        const worldX = chunk.chunkX * chunk.size + x;
        const worldZ = chunk.chunkZ * chunk.size + z;
        
        // Find surface
        let surfaceY = -1;
        for (let y = chunk.height - 1; y >= 0; y--) {
          if (chunk.getBlock(x, y, z) !== BlockTypes.AIR) {
            surfaceY = y;
            break;
          }
        }
        
        if (surfaceY <= 0 || surfaceY >= chunk.height - 5) continue;
        
        const featureValue = this.featureNoise.noise(worldX * 0.08, worldZ * 0.08);
        
        // Place boulders
        if (featureValue > 0.92) {
          this.placeBoulder(chunk, x, surfaceY + 1, z);
        }
        // Place small rock piles
        else if (featureValue > 0.88 && featureValue <= 0.92) {
          this.placeRockPile(chunk, x, surfaceY + 1, z);
        }
      }
    }
  }

  /**
   * Place a boulder at position
   */
  placeBoulder(chunk, x, y, z) {
    // Simple 2x2x2 boulder
    const boulderSize = 2;
    for (let dx = 0; dx < boulderSize; dx++) {
      for (let dy = 0; dy < boulderSize; dy++) {
        for (let dz = 0; dz < boulderSize; dz++) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (nx >= 0 && nx < chunk.size && ny >= 0 && ny < chunk.height && nz >= 0 && nz < chunk.size) {
            if (chunk.getBlock(nx, ny, nz) === BlockTypes.AIR) {
              chunk.setBlock(nx, ny, nz, BlockTypes.STONE);
            }
          }
        }
      }
    }
  }

  /**
   * Place a small rock pile
   */
  placeRockPile(chunk, x, y, z) {
    if (x >= 0 && x < chunk.size && y >= 0 && y < chunk.height && z >= 0 && z < chunk.size) {
      if (chunk.getBlock(x, y, z) === BlockTypes.AIR) {
        chunk.setBlock(x, y, z, BlockTypes.STONE);
        // Occasionally add a second block
        if (Math.random() > 0.5 && y + 1 < chunk.height) {
          chunk.setBlock(x, y + 1, z, BlockTypes.STONE);
        }
      }
    }
  }

  /**
   * Clean up floating blocks and unnatural formations
   */
  cleanupFloatingBlocks(chunk) {
    // Multiple passes for thorough cleanup
    for (let pass = 0; pass < 2; pass++) {
      for (let x = 0; x < chunk.size; x++) {
        for (let z = 0; z < chunk.size; z++) {
          for (let y = 1; y < chunk.height - 1; y++) {
            const blockType = chunk.getBlock(x, y, z);
            
            // Skip air and water
            if (blockType === BlockTypes.AIR || blockType === BlockTypes.WATER) {
              continue;
            }
            
            // Check if block is floating (no support below within 3 blocks)
            if (this.isFloating(chunk, x, y, z)) {
              chunk.setBlock(x, y, z, BlockTypes.AIR);
            }
          }
        }
      }
    }
  }

  /**
   * Check if a block is floating without proper support
   */
  isFloating(chunk, x, y, z) {
    // Check blocks directly below (up to 3 blocks)
    let hasSupport = false;
    const checkDepth = 3;
    
    for (let dy = 1; dy <= checkDepth && y - dy >= 0; dy++) {
      const belowBlock = chunk.getBlock(x, y - dy, z);
      if (belowBlock !== BlockTypes.AIR && belowBlock !== BlockTypes.WATER) {
        hasSupport = true;
        break;
      }
    }
    
    if (hasSupport) return false;
    
    // Check if has strong horizontal connections (3+ adjacent solid blocks)
    let solidNeighbors = 0;
    const neighbors = [
      [x+1, y, z], [x-1, y, z],
      [x, y, z+1], [x, y, z-1]
    ];
    
    for (const [nx, ny, nz] of neighbors) {
      if (nx >= 0 && nx < chunk.size && nz >= 0 && nz < chunk.size) {
        const neighborType = chunk.getBlock(nx, ny, nz);
        if (neighborType !== BlockTypes.AIR && neighborType !== BlockTypes.WATER) {
          solidNeighbors++;
        }
      }
    }
    
    // Floating if no support below and fewer than 3 solid neighbors
    return solidNeighbors < 3;
  }

  /**
   * Get surface height at position (utility function)
   */
  getSurfaceHeight(chunk, x, z) {
    for (let y = chunk.height - 1; y >= 0; y--) {
      const blockType = chunk.getBlock(x, y, z);
      if (blockType !== BlockTypes.AIR && blockType !== BlockTypes.WATER) {
        return y;
      }
    }
    return -1;
  }
}
