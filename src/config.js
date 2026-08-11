// World Configuration
import { Blocks, BlocksById, getBlockById } from './core/Block.js';

// Helper to determine seed from URLSearchParams, localStorage, or fallback to random
function getQueryOrLocalStorageSeed() {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSeed = urlParams.get('seed');
      if (urlSeed) {
        const seedNum = parseInt(urlSeed);
        if (!isNaN(seedNum)) return seedNum;
      }
    }

    if (typeof localStorage !== 'undefined') {
      const localSeed = localStorage.getItem('world_seed');
      if (localSeed) {
        const seedNum = parseInt(localSeed);
        if (!isNaN(seedNum)) return seedNum;
      }
    }
  } catch (e) {
    // Ignore environments where window/localStorage is unavailable (e.g. Node, non-browser)
  }

  const randomSeed = Math.floor(Math.random() * 1000000);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('world_seed', randomSeed.toString());
    }
  } catch (e) {}
  return randomSeed;
}

export const WorldConfig = {
  // World Seed
  seed: getQueryOrLocalStorageSeed(),
  
  // Chunk Settings
  chunkSize: 16, // 16x16 blocks
  chunkHeight: 64, // 64 blocks tall
  renderDistance: 4, // Number of chunks to render around player
  
  // Terrain Generation
  terrain: {
    scale: 0.01, // Noise scale (smaller = more zoomed out)
    octaves: 4, // Number of noise layers
    persistence: 0.5,
    lacunarity: 2.0,
    heightMultiplier: 32, // Max terrain height variation
    baseHeight: 32, // Sea level
  },
  
  // Cave Generation
  caves: {
    scale: 0.05,
    threshold: 0.3, // Higher = fewer caves
    minHeight: 5,
    maxHeight: 50,
  },
  
  // Ore Generation
  ores: {
    coal: {
      minHeight: 0,
      maxHeight: 64,
      veinSize: 8,
      veinsPerChunk: 10,
    },
    iron: {
      minHeight: 0,
      maxHeight: 48,
      veinSize: 6,
      veinsPerChunk: 6,
    },
    gold: {
      minHeight: 0,
      maxHeight: 32,
      veinSize: 4,
      veinsPerChunk: 2,
    },
    diamond: {
      minHeight: 0,
      maxHeight: 16,
      veinSize: 3,
      veinsPerChunk: 1,
    },
  },
  
  // Physics Settings
  physics: {
    gravity: -9.8,
    terminalVelocity: -50,
    structuralIntegrity: true, // Enable structural support checks
    supportDistance: 3, // Blocks that can be unsupported
    updateRate: 1/60, // Physics tick rate
  },
};

// Set seed programmatically for reproducibility
export function setSeed(newSeed) {
  WorldConfig.seed = newSeed;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('world_seed', newSeed.toString());
    }
  } catch (e) {}
}

// Export new Block system
export { Blocks, BlocksById, getBlockById };

// Legacy BlockTypes for backward compatibility
export const BlockTypes = {
  AIR: Blocks.AIR.id,
  GRASS: Blocks.GRASS.id,
  DIRT: Blocks.DIRT.id,
  STONE: Blocks.STONE.id,
  SAND: Blocks.SAND.id,
  WOOD: Blocks.WOOD.id,
  LEAVES: Blocks.LEAVES.id,
  BEDROCK: Blocks.BEDROCK.id,
  WATER: Blocks.WATER.id,
  LAVA: Blocks.LAVA.id,
  GLASS: Blocks.GLASS.id,
  COAL_ORE: Blocks.COAL_ORE.id,
  IRON_ORE: Blocks.IRON_ORE.id,
  GOLD_ORE: Blocks.GOLD_ORE.id,
  DIAMOND_ORE: Blocks.DIAMOND_ORE.id,
  GRAVEL: Blocks.GRAVEL.id,
  SNOW: Blocks.SNOW.id,
  ICE: Blocks.ICE.id,
};

// Helper function to get block properties
export function getBlockProperties(blockId) {
  const block = getBlockById(blockId);
  return {
    name: block.name,
    solid: block.isSolid(),
    transparent: block.isTransparent(),
    liquid: block.isLiquid(),
    affectedByGravity: block.isAffectedByGravity(),
    canSupport: block.isSolid() && !block.isLiquid(),
    emitsLight: block.emitsLight(),
    lightLevel: block.lightLevel,
    opacity: block.opacity,
    hardness: block.hardness,
    color: block.color,
    topColor: block.topColor,
    bottomColor: block.bottomColor,
    sideColor: block.sideColor,
  };
}
