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

export const QualityPresets = {
  LOW: {
    pixelRatio: 1.0,               // Cap DPR to 1.0 to save high-res screens from lagging
    shadows: false,                // Disable shadows for massive performance boost
    shadowMapSize: 512,
    renderDistance: 3,             // Smaller render distance
    fogFar: 100,
  },
  MEDIUM: {
    pixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    renderDistance: 4,
    fogFar: 150,
  },
  HIGH: {
    pixelRatio: 2.0,
    shadows: true,
    shadowMapSize: 2048,
    renderDistance: 6,
    fogFar: 250,
  }
};

function getQueryOrLocalStorageQuality() {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuality = urlParams.get('quality');
      if (urlQuality && QualityPresets[urlQuality.toUpperCase()]) {
        return urlQuality.toUpperCase();
      }
    }

    if (typeof localStorage !== 'undefined') {
      const localQuality = localStorage.getItem('graphics_quality');
      if (localQuality && QualityPresets[localQuality.toUpperCase()]) {
        return localQuality.toUpperCase();
      }
    }
  } catch (e) {}
  return 'MEDIUM'; // Default quality
}

export const WorldConfig = {
  // World Seed
  seed: getQueryOrLocalStorageSeed(),

  // Quality settings (LOW, MEDIUM, HIGH)
  quality: getQueryOrLocalStorageQuality(),
  
  // Chunk Settings
  chunkSize: 16, // 16x16 blocks
  chunkHeight: 64, // 64 blocks tall

  // Render Distance - determined by Quality Preset
  get renderDistance() {
    return QualityPresets[this.quality].renderDistance;
  },
  
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

// Auto-generate BlockTypes from Blocks to eliminate the manual sync requirement
export const BlockTypes = Object.fromEntries(
  Object.entries(Blocks).map(([key, block]) => [key, block.id])
);

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
