import { WorldConfig, BlockTypes } from '../config.js';
import { PerlinNoise } from '../noise/PerlinNoise.js';
import { Chunk } from './Chunk.js';

/**
 * WorldGenerator - Generates terrain using Perlin noise
 * Creates height maps, caves, and places different block types
 */
export class WorldGenerator {
  constructor(seed = null) {
    this.seed = seed || WorldConfig.seed;
    this.noise = new PerlinNoise(this.seed);
    this.caveNoise = new PerlinNoise(this.seed + 1000);  // Different seed for caves
    
    this.terrainConfig = WorldConfig.terrain;
    this.caveConfig = WorldConfig.caves;
  }

  // Generate a chunk at given coordinates
  generateChunk(chunkX, chunkZ) {
    const chunk = new Chunk(chunkX, chunkZ);
    
    // Fill chunk with blocks
    for (let x = 0; x < chunk.size; x++) {
      for (let z = 0; z < chunk.size; z++) {
        // World coordinates
        const worldX = chunkX * chunk.size + x;
        const worldZ = chunkZ * chunk.size + z;
        
        // Generate height at this position
        const height = this.getTerrainHeight(worldX, worldZ);
        
        // Fill column
        for (let y = 0; y < chunk.height; y++) {
          let blockType = this.getBlockType(worldX, y, worldZ, height);
          chunk.setBlock(x, y, z, blockType);
        }
      }
    }
    
    chunk.needsPhysicsUpdate = false;  // Initial generation doesn't need physics
    chunk.dirtyBlocks.clear();
    
    return chunk;
  }

  // Get terrain height at world coordinates
  getTerrainHeight(worldX, worldZ) {
    const { scale, octaves, persistence, lacunarity, heightMultiplier, baseHeight } = this.terrainConfig;
    
    // Generate height using fractal brownian motion
    const noiseValue = this.noise.fbm2D(
      worldX * scale,
      worldZ * scale,
      octaves,
      persistence,
      lacunarity
    );
    
    // Convert from [-1, 1] to height
    const height = Math.floor(baseHeight + noiseValue * heightMultiplier);
    return Math.max(0, Math.min(height, WorldConfig.chunkHeight - 1));
  }

  // Determine block type at position
  getBlockType(worldX, worldY, worldZ, surfaceHeight) {
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
    
    // Surface layer
    if (worldY === surfaceHeight) {
      if (surfaceHeight < waterLevel - 2) {
        return BlockTypes.SAND;  // Beach/underwater
      }
      return BlockTypes.GRASS;
    }
    
    // Subsurface layers
    const depthFromSurface = surfaceHeight - worldY;
    
    if (depthFromSurface <= 3) {
      return BlockTypes.DIRT;
    }
    
    return BlockTypes.STONE;
  }

  // Check if position should be a cave
  isCave(worldX, worldY, worldZ) {
    const { scale, threshold, minHeight, maxHeight } = this.caveConfig;
    
    // Only generate caves in certain height range
    if (worldY < minHeight || worldY > maxHeight) {
      return false;
    }
    
    // Use 3D noise for cave generation
    const caveValue = this.caveNoise.fbm3D(
      worldX * scale,
      worldY * scale,
      worldZ * scale,
      3,  // octaves
      0.5,
      2.0
    );
    
    // Cave if noise exceeds threshold
    return caveValue > threshold;
  }

  // Get biome at position (for future expansion)
  getBiome(worldX, worldZ) {
    const biomeNoise = this.noise.noise2D(worldX * 0.001, worldZ * 0.001);
    
    if (biomeNoise < -0.3) {
      return 'desert';
    } else if (biomeNoise < 0.3) {
      return 'plains';
    } else {
      return 'mountains';
    }
  }

  // Get spawn position (flat area near origin)
  getSpawnPosition() {
    // Find a suitable spawn point near origin
    for (let radius = 0; radius < 50; radius += 5) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x = Math.floor(Math.cos(angle) * radius);
        const z = Math.floor(Math.sin(angle) * radius);
        
        const height = this.getTerrainHeight(x, z);
        
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
