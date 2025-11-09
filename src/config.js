// World Configuration
export const WorldConfig = {
  // World Seed
  seed: Math.floor(Math.random() * 1000000),
  
  // Chunk Settings
  chunkSize: 16,  // 16x16 blocks
  chunkHeight: 64, // 64 blocks tall
  renderDistance: 4, // Number of chunks to render around player
  
  // Terrain Generation
  terrain: {
    scale: 0.01,  // Noise scale (smaller = more zoomed out)
    octaves: 4,   // Number of noise layers
    persistence: 0.5,
    lacunarity: 2.0,
    heightMultiplier: 32,  // Max terrain height variation
    baseHeight: 32,  // Sea level
  },
  
  // Cave Generation
  caves: {
    scale: 0.05,
    threshold: 0.3,  // Higher = fewer caves
    minHeight: 5,
    maxHeight: 50,
  },
  
  // Physics Settings (Rust-like mechanics)
  physics: {
    gravity: -9.8,
    terminalVelocity: -50,
    structuralIntegrity: true,  // Enable structural support checks
    supportDistance: 3,  // Blocks that can be unsupported
    updateRate: 1/60,  // Physics tick rate
  },
};

// Block Types with Physics Properties
export const BlockTypes = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  WOOD: 4,
  LEAVES: 5,
  SAND: 6,
  WATER: 7,
};

// Block Properties
export const BlockProperties = {
  [BlockTypes.AIR]: {
    name: 'Air',
    solid: false,
    transparent: true,
    mass: 0,
    durability: 0,
  },
  [BlockTypes.STONE]: {
    name: 'Stone',
    solid: true,
    transparent: false,
    mass: 10,
    durability: 100,
    canSupport: true,
  },
  [BlockTypes.DIRT]: {
    name: 'Dirt',
    solid: true,
    transparent: false,
    mass: 5,
    durability: 50,
    canSupport: true,
  },
  [BlockTypes.GRASS]: {
    name: 'Grass',
    solid: true,
    transparent: false,
    mass: 5,
    durability: 50,
    canSupport: true,
  },
  [BlockTypes.WOOD]: {
    name: 'Wood',
    solid: true,
    transparent: false,
    mass: 3,
    durability: 75,
    canSupport: true,
  },
  [BlockTypes.LEAVES]: {
    name: 'Leaves',
    solid: false,
    transparent: true,
    mass: 0.5,
    durability: 10,
    canSupport: false,
  },
  [BlockTypes.SAND]: {
    name: 'Sand',
    solid: true,
    transparent: false,
    mass: 7,
    durability: 30,
    affectedByGravity: true,  // Falls when unsupported
    canSupport: false,
  },
  [BlockTypes.WATER]: {
    name: 'Water',
    solid: false,
    transparent: true,
    mass: 1,
    durability: 0,
    fluid: true,
  },
};
