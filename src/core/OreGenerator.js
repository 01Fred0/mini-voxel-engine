/**
 * OreGenerator.js - Generates ore veins in the world
 * Places coal, iron, gold, and diamond ores at appropriate depths
 */

import { Blocks } from './Block.js';
import { WorldConfig } from '../config.js';

export class OreGenerator {
  constructor(seed = 0) {
    this.seed = seed;
    this.random = this.seededRandom(seed);
  }
  
  // Seeded random number generator
  seededRandom(seed) {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }
  
  /**
   * Generate ores in a chunk
   * @param {Chunk} chunk - The chunk to generate ores in
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   */
  generateOres(chunk, chunkX, chunkZ) {
    const oreConfig = WorldConfig.ores;
    
    // Generate coal veins
    this.generateOreType(
      chunk, chunkX, chunkZ,
      Blocks.COAL_ORE.id,
      oreConfig.coal
    );
    
    // Generate iron veins
    this.generateOreType(
      chunk, chunkX, chunkZ,
      Blocks.IRON_ORE.id,
      oreConfig.iron
    );
    
    // Generate gold veins
    this.generateOreType(
      chunk, chunkX, chunkZ,
      Blocks.GOLD_ORE.id,
      oreConfig.gold
    );
    
    // Generate diamond veins
    this.generateOreType(
      chunk, chunkX, chunkZ,
      Blocks.DIAMOND_ORE.id,
      oreConfig.diamond
    );
  }
  
  /**
   * Generate a specific ore type
   */
  generateOreType(chunk, chunkX, chunkZ, oreBlockId, config) {
    const { minHeight, maxHeight, veinSize, veinsPerChunk } = config;
    
    // Generate multiple veins per chunk
    for (let vein = 0; vein < veinsPerChunk; vein++) {
      // Random position in chunk
      const x = Math.floor(this.random() * chunk.size);
      const y = minHeight + Math.floor(this.random() * (maxHeight - minHeight));
      const z = Math.floor(this.random() * chunk.size);
      
      // Check if the block at this position is stone
      if (chunk.getBlock(x, y, z) === Blocks.STONE.id) {
        // Generate vein
        this.generateVein(chunk, x, y, z, oreBlockId, veinSize);
      }
    }
  }
  
  /**
   * Generate a single ore vein
   */
  generateVein(chunk, startX, startY, startZ, oreBlockId, size) {
    const positions = [[startX, startY, startZ]];
    
    for (let i = 0; i < size; i++) {
      if (positions.length === 0) break;
      
      // Pick a random position from the list
      const idx = Math.floor(this.random() * positions.length);
      const [x, y, z] = positions[idx];
      positions.splice(idx, 1);
      
      // Place ore if the block is stone
      if (chunk.getBlock(x, y, z) === Blocks.STONE.id) {
        chunk.setBlock(x, y, z, oreBlockId);
        
        // Add neighboring positions
        const neighbors = [
          [x + 1, y, z], [x - 1, y, z],
          [x, y + 1, z], [x, y - 1, z],
          [x, y, z + 1], [x, y, z - 1]
        ];
        
        for (const [nx, ny, nz] of neighbors) {
          // Only add valid positions
          if (chunk.isValidPosition(nx, ny, nz)) {
            // Random chance to extend vein
            if (this.random() > 0.5) {
              positions.push([nx, ny, nz]);
            }
          }
        }
      }
    }
  }
  
  /**
   * Check if ore should spawn at this height
   */
  canSpawnAt(y, minHeight, maxHeight) {
    return y >= minHeight && y <= maxHeight;
  }
}
