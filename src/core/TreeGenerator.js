import { BlockTypes } from '../config.js';
import { SimplexNoise } from '../noise/SimplexNoise.js';

/**
 * TreeGenerator - Generates trees in the voxel world
 * Creates various tree types with configurable parameters
 * Uses noise for natural variation in tree placement
 */
export class TreeGenerator {
  constructor(seed = 0) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed + 5000); // Different seed for tree placement
    
    // Tree configuration
    this.treeTypes = {
      oak: {
        trunkHeight: { min: 4, max: 6 },
        leafRadius: 2,
        leafHeight: 3,
        trunkBlock: BlockTypes.WOOD,
        leafBlock: BlockTypes.LEAVES,
      },
      pine: {
        trunkHeight: { min: 6, max: 10 },
        leafRadius: 2,
        leafHeight: 5,
        trunkBlock: BlockTypes.WOOD,
        leafBlock: BlockTypes.LEAVES,
        tapered: true, // Cone-shaped
      },
      birch: {
        trunkHeight: { min: 5, max: 7 },
        leafRadius: 2,
        leafHeight: 2,
        trunkBlock: BlockTypes.WOOD,
        leafBlock: BlockTypes.LEAVES,
      }
    };
  }

  /**
   * Check if a tree should spawn at this position
   * @param {number} worldX - World X coordinate
   * @param {number} worldZ - World Z coordinate  
   * @param {object} biome - Biome data
   * @returns {boolean} True if tree should spawn
   */
  shouldSpawnTree(worldX, worldZ, biome) {
    if (!biome.canHaveTrees) return false;
    
    // Use noise to determine tree placement
    const treeNoise = this.noise.noise2D(worldX * 0.05, worldZ * 0.05);
    
    // Trees spawn based on biome tree density and noise threshold
    return treeNoise > (1.0 - biome.treeDensity);
  }

  /**
   * Get tree type for biome
   * @param {object} biome - Biome data
   * @returns {string} Tree type name
   */
  getTreeTypeForBiome(biome) {
    // Different biomes have different tree types
    const biomeTreeMap = {
      'PLAINS': 'oak',
      'FOREST': 'oak',
      'TAIGA': 'pine',
      'BIRCH_FOREST': 'birch',
      'MOUNTAIN': 'pine',
    };
    
    return biomeTreeMap[biome.name] || 'oak';
  }

  /**
   * Generate a tree in the chunk
   * @param {Chunk} chunk - The chunk to generate trees in
   * @param {number} localX - Local X position in chunk
   * @param {number} y - World Y position (ground level)
   * @param {number} localZ - Local Z position in chunk
   * @param {string} treeType - Type of tree to generate
   */
  generateTree(chunk, localX, y, localZ, treeType = 'oak') {
    const config = this.treeTypes[treeType];
    if (!config) return;
    
    // Random trunk height
    const trunkHeight = Math.floor(
      config.trunkHeight.min + 
      Math.random() * (config.trunkHeight.max - config.trunkHeight.min)
    );
    
    // Generate trunk
    for (let dy = 0; dy < trunkHeight; dy++) {
      this.safeSetBlock(chunk, localX, y + dy, localZ, config.trunkBlock);
    }
    
    // Generate leaves
    if (config.tapered) {
      // Tapered tree (pine/spruce)
      this.generateTaperedLeaves(chunk, localX, y + trunkHeight, localZ, config);
    } else {
      // Round tree (oak/birch)
      this.generateRoundLeaves(chunk, localX, y + trunkHeight, localZ, config);
    }
  }

  /**
   * Generate round leaves (for oak, birch)
   * @param {Chunk} chunk - The chunk
   * @param {number} x - Center X
   * @param {number} y - Base Y
   * @param {number} z - Center Z
   * @param {object} config - Tree configuration
   */
  generateRoundLeaves(chunk, x, y, z, config) {
    const radius = config.leafRadius;
    const height = config.leafHeight;
    
    for (let dy = -1; dy < height; dy++) {
      const layerRadius = dy === height - 1 ? Math.max(1, radius - 1) : radius;
      
      for (let dx = -layerRadius; dx <= layerRadius; dx++) {
        for (let dz = -layerRadius; dz <= layerRadius; dz++) {
          // Distance from center
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          // Create sphere-like shape
          if (dist <= layerRadius) {
            // Skip center column (trunk)
            if (dx === 0 && dz === 0 && dy <= 0) continue;
            
            // Random gaps for natural look
            if (Math.random() > 0.85) continue;
            
            this.safeSetBlock(chunk, x + dx, y + dy, z + dz, config.leafBlock);
          }
        }
      }
    }
  }

  /**
   * Generate tapered leaves (for pine, spruce)
   * @param {Chunk} chunk - The chunk
   * @param {number} x - Center X
   * @param {number} y - Base Y
   * @param {number} z - Center Z
   * @param {object} config - Tree configuration
   */
  generateTaperedLeaves(chunk, x, y, z, config) {
    const height = config.leafHeight;
    const baseRadius = config.leafRadius;
    
    for (let dy = 0; dy < height; dy++) {
      // Radius decreases as we go up
      const layerRadius = Math.max(1, baseRadius - Math.floor(dy / 2));
      
      for (let dx = -layerRadius; dx <= layerRadius; dx++) {
        for (let dz = -layerRadius; dz <= layerRadius; dz++) {
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist <= layerRadius) {
            // Skip center for trunk
            if (dx === 0 && dz === 0) continue;
            
            // Random gaps
            if (Math.random() > 0.9) continue;
            
            this.safeSetBlock(chunk, x + dx, y + dy, z + dz, config.leafBlock);
          }
        }
      }
    }
  }

  /**
   * Safely set a block (checks bounds)
   * @param {Chunk} chunk - The chunk
   * @param {number} x - Local X
   * @param {number} y - World Y
   * @param {number} z - Local Z
   * @param {number} blockType - Block type to set
   */
  safeSetBlock(chunk, x, y, z, blockType) {
    // Check if position is within chunk bounds
    if (x < 0 || x >= chunk.size || z < 0 || z >= chunk.size) return;
    if (y < 0 || y >= chunk.height) return;
    
    // Don't overwrite solid blocks (except for placing on ground)
    const currentBlock = chunk.getBlock(x, y, z);
    if (currentBlock !== BlockTypes.AIR && currentBlock !== BlockTypes.LEAVES) return;
    
    chunk.setBlock(x, y, z, blockType);
  }

  /**
   * Generate all trees for a chunk
   * @param {Chunk} chunk - The chunk to generate trees in
   * @param {BiomeGenerator} biomeGenerator - Biome generator instance
   * @param {Function} getTerrainHeight - Function to get terrain height at position
   */
  generateTreesForChunk(chunk, biomeGenerator, getTerrainHeight) {
    // Check a grid of positions in the chunk
    const spacing = 4; // Check every 4 blocks
    
    for (let x = 2; x < chunk.size - 2; x += spacing) {
      for (let z = 2; z < chunk.size - 2; z += spacing) {
        const worldX = chunk.x * chunk.size + x;
        const worldZ = chunk.z * chunk.size + z;
        
        const biome = biomeGenerator.getBiome(worldX, worldZ);
        
        if (this.shouldSpawnTree(worldX, worldZ, biome)) {
          const height = getTerrainHeight(worldX, worldZ, biome);
          
          // Check if ground block is grass or dirt
          const groundBlock = chunk.getBlock(x, height, z);
          if (groundBlock === BlockTypes.GRASS || groundBlock === BlockTypes.DIRT) {
            const treeType = this.getTreeTypeForBiome(biome);
            this.generateTree(chunk, x, height + 1, z, treeType);
          }
        }
      }
    }
  }
}
