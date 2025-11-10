import { WorldConfig, BlockTypes, Blocks } from '../config.js';
import { SimplexNoise } from '../noise/SimplexNoise.js';
import { BiomeGenerator } from './Biome.js';
import { OreGenerator } from './OreGenerator.js';
import { Chunk } from './Chunk.js';
import { TerrainPolisher } from './TerrainPolisher.js';

/**
 * WorldGenerator - Generates terrain using advanced noise algorithms
 * Creates height maps, caves, biomes, ores, and places different block types
 * Integrates SimplexNoise, BiomeGenerator, and OreGenerator systems
 */
export class WorldGenerator {
  constructor(seed = null) {
    this.seed = seed || WorldConfig.seed;
    
    // Initialize noise generators
    this.noise = new SimplexNoise(this.seed);
    this.caveNoise = new SimplexNoise(this.seed + 1000); // Different seed for caves
    
    // Initialize biome and ore generators
    this.biomeGenerator = new BiomeGenerator(this.seed);
    this.oreGenerator = new OreGenerator(this.seed);
        this.terrainPolisher = new TerrainPolisher(this.seed);
    
    // Config references
    this.terrainConfig = WorldConfig.terrain;
    this.caveConfig = WorldConfig.caves;
  }

  /**
   * Generate a chunk at given coordinates
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {Chunk} Generated chunk with terrain, biomes, and ores
   */
  generateChunk(chunkX, chunkZ) {
    const chunk = new Chunk(chunkX, chunkZ);
    
    // Fill chunk with blocks
    for (let x = 0; x < chunk.size; x++) {
      for (let z = 0; z < chunk.size; z++) {
        // World coordinates
        const worldX = chunkX * chunk.size + x;
        const worldZ = chunkZ * chunk.size + z;
        
        // Get biome for this column
        const biome = this.biomeGenerator.getBiome(worldX, worldZ);
        
        // Generate height at this position
        const height = this.getTerrainHeight(worldX, worldZ, biome);
        
        // Fill column
        for (let y = 0; y < chunk.height; y++) {
          let blockType = this.getBlockType(worldX, y, worldZ, height, biome);
          chunk.setBlock(x, y, z, blockType);
        }
      }
    }
    
    // Generate ores after base terrain
    this.oreGenerator.generateOres(chunk);

        // Apply terrain polishing for enhanced terrain quality
    this.terrainPolisher.polishChunk(chunk, this);
    
    chunk.needsPhysicsUpdate = false; // Initial generation doesn't need physics
    chunk.dirtyBlocks.clear();
    
    return chunk;
  }

  /**
   * Get terrain height at world coordinates with biome influence
   * @param {number} worldX - World X coordinate
   * @param {number} worldZ - World Z coordinate
   * @param {object} biome - Biome data
   * @returns {number} Height value
   */
  getTerrainHeight(worldX, worldZ, biome) {
    const { scale, octaves, persistence, lacunarity } = this.terrainConfig;
    
    // Use SimplexNoise FBM for terrain generation
    const noiseValue = this.noise.fbm(
      worldX * scale * biome.terrainScale,
      0,
      worldZ * scale * biome.terrainScale,
      octaves,
      persistence,
      lacunarity
    );
    
    // Apply biome-specific height modifiers
    const biomeHeight = this.terrainConfig.baseHeight + biome.heightOffset;
    const height = Math.floor(biomeHeight + noiseValue * biome.heightVariation);
    
    return Math.max(0, Math.min(height, WorldConfig.chunkHeight - 1));
  }

  /**
   * Determine block type at position based on biome and depth
   * @param {number} worldX - World X coordinate  
   * @param {number} worldY - World Y coordinate
   * @param {number} worldZ - World Z coordinate
   * @param {number} surfaceHeight - Surface height at this column
   * @param {object} biome - Biome data
   * @returns {number} Block type ID
   */
  getBlockType(worldX, worldY, worldZ, surfaceHeight, biome) {
    // Air above surface
    if (worldY > surfaceHeight) {
      return BlockTypes.AIR;
    }
    
    // Check for caves
    if (this.isCave(worldX, worldY, worldZ)) {
      return BlockTypes.AIR;
    }
    
    // Water level
    const waterLevel = this.terrainConfig.baseHeight;
    if (worldY <= waterLevel - 5 && worldY > surfaceHeight) {
      return BlockTypes.WATER;
    }
    
    // Surface layer - use biome surface block
    if (worldY === surfaceHeight) {
      if (surfaceHeight < waterLevel - 2) {
        return BlockTypes.SAND; // Beach/underwater
      }
      return biome.surfaceBlock || BlockTypes.GRASS;
    }
    
    // Subsurface layers
    const depthFromSurface = surfaceHeight - worldY;
    
    // Subsurface layer - use biome subsurface block
    if (depthFromSurface <= 3) {
      return biome.subsurfaceBlock || BlockTypes.DIRT;
    }
    
    // Deep layer - stone
    return BlockTypes.STONE;
  }

  /**
   * Check if position should be a cave using 3D noise
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate  
   * @param {number} worldZ - World Z coordinate
   * @returns {boolean} True if cave
   */
  isCave(worldX, worldY, worldZ) {
    const { scale, threshold, minHeight, maxHeight } = this.caveConfig;
    
    // Only generate caves in certain height range
    if (worldY < minHeight || worldY > maxHeight) {
      return false;
    }
    
    // Use 3D SimplexNoise for cave generation
    const caveValue = this.caveNoise.fbm(
      worldX * scale,
      worldY * scale,
      worldZ * scale,
      3, // octaves
      0.5,
      2.0
    );
    
    // Cave if noise exceeds threshold
    return caveValue > threshold;
  }

  /**
   * Get spawn position (flat area near origin)
   * @returns {object} Spawn position {x, y, z}
   */
  getSpawnPosition() {
    // Find a suitable spawn point near origin
    for (let radius = 0; radius < 50; radius += 5) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x = Math.floor(Math.cos(angle) * radius);
        const z = Math.floor(Math.sin(angle) * radius);
        
        const biome = this.biomeGenerator.getBiome(x, z);
        const height = this.getTerrainHeight(x, z, biome);
        
        // Check if position is suitable (above water, not in cave)
        if (height > this.terrainConfig.baseHeight + 5) {
          // Check a few blocks above are air
          let safe = true;
          for (let y = height + 1; y <= height + 3; y++) {
            if (this.isCave(x, y, z)) {
              safe = false;
              break;
            }
          }
          
          if (safe) {
            return { x, y: height + 2, z };
          }
        }
      }
    }
    
    // Fallback
    return { x: 0, y: this.terrainConfig.baseHeight + 10, z: 0 };
  }
}
