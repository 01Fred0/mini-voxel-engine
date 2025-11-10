/**
 * Block.js - Defines block types and their properties
 * Manages block behavior, appearance, and physics
 */

// Block property flags
export const BlockFlags = {
  SOLID: 1 << 0,           // Block is solid (can be stood on)
  TRANSPARENT: 1 << 1,     // Block is see-through
  LIQUID: 1 << 2,          // Block is a liquid
  AFFECTED_BY_GRAVITY: 1 << 3, // Block falls when unsupported
  EMITS_LIGHT: 1 << 4,     // Block produces light
  BREAKABLE: 1 << 5,       // Block can be broken
  PLACEABLE: 1 << 6,       // Block can be placed
};

/**
 * Block class - Represents a single block type
 */
export class Block {
  constructor(id, name, properties = {}) {
    this.id = id;
    this.name = name;
    
    // Block properties
    this.flags = properties.flags || 0;
    this.hardness = properties.hardness || 1.0; // Time to break
    this.lightLevel = properties.lightLevel || 0; // 0-15
    this.opacity = properties.opacity || 15; // Light blocking 0-15
    
    // Texture/color properties
    this.color = properties.color || 0xFFFFFF;
    this.topColor = properties.topColor || this.color;
    this.bottomColor = properties.bottomColor || this.color;
    this.sideColor = properties.sideColor || this.color;
    
    // Physics properties
    this.friction = properties.friction || 0.6;
    this.bounciness = properties.bounciness || 0;
    
    // Sound properties (for future use)
    this.breakSound = properties.breakSound || 'stone';
    this.placeSound = properties.placeSound || 'stone';
  }
  
  // Check if block has a specific flag
  hasFlag(flag) {
    return (this.flags & flag) !== 0;
  }
  
  isSolid() {
    return this.hasFlag(BlockFlags.SOLID);
  }
  
  isTransparent() {
    return this.hasFlag(BlockFlags.TRANSPARENT);
  }
  
  isLiquid() {
    return this.hasFlag(BlockFlags.LIQUID);
  }
  
  isAffectedByGravity() {
    return this.hasFlag(BlockFlags.AFFECTED_BY_GRAVITY);
  }
  
  emitsLight() {
    return this.hasFlag(BlockFlags.EMITS_LIGHT);
  }
  
  isBreakable() {
    return this.hasFlag(BlockFlags.BREAKABLE);
  }
  
  isPlaceable() {
    return this.hasFlag(BlockFlags.PLACEABLE);
  }
}

// Define all block types
export const Blocks = {
  AIR: new Block(0, 'Air', {
    flags: BlockFlags.TRANSPARENT,
    opacity: 0,
    hardness: 0,
  }),
  
  GRASS: new Block(1, 'Grass', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x8B7355,
    topColor: 0x7CBF3B,
    bottomColor: 0x8B6F47,
    sideColor: 0x8B7355,
    hardness: 0.6,
  }),
  
  DIRT: new Block(2, 'Dirt', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x8B6F47,
    hardness: 0.5,
  }),
  
  STONE: new Block(3, 'Stone', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x808080,
    hardness: 1.5,
  }),
  
  SAND: new Block(4, 'Sand', {
    flags: BlockFlags.SOLID | BlockFlags.AFFECTED_BY_GRAVITY | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0xEDDC9C,
    hardness: 0.5,
  }),
  
  WOOD: new Block(5, 'Wood', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x8B4513,
    topColor: 0x654321,
    bottomColor: 0x654321,
    sideColor: 0x8B4513,
    hardness: 2.0,
  }),
  
  LEAVES: new Block(6, 'Leaves', {
    flags: BlockFlags.SOLID | BlockFlags.TRANSPARENT | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x228B22,
    opacity: 1,
    hardness: 0.2,
  }),
  
  BEDROCK: new Block(7, 'Bedrock', {
    flags: BlockFlags.SOLID,
    color: 0x333333,
    hardness: Infinity,
  }),
  
  WATER: new Block(8, 'Water', {
    flags: BlockFlags.LIQUID | BlockFlags.TRANSPARENT,
    color: 0x4169E1,
    opacity: 2,
    hardness: 0,
  }),
  
  LAVA: new Block(9, 'Lava', {
    flags: BlockFlags.LIQUID | BlockFlags.EMITS_LIGHT,
    color: 0xFF4500,
    lightLevel: 15,
    opacity: 0,
    hardness: 0,
  }),
  
  GLASS: new Block(10, 'Glass', {
    flags: BlockFlags.SOLID | BlockFlags.TRANSPARENT | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0xE6F2FF,
    opacity: 0,
    hardness: 0.3,
  }),
  
  COAL_ORE: new Block(11, 'Coal Ore', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x434343,
    hardness: 3.0,
  }),
  
  IRON_ORE: new Block(12, 'Iron Ore', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0xD8AF93,
    hardness: 3.0,
  }),
  
  GOLD_ORE: new Block(13, 'Gold Ore', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0xFCEE4B,
    hardness: 3.0,
  }),
  
  DIAMOND_ORE: new Block(14, 'Diamond Ore', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x5DCCCC,
    hardness: 3.0,
  }),
  
  GRAVEL: new Block(15, 'Gravel', {
    flags: BlockFlags.SOLID | BlockFlags.AFFECTED_BY_GRAVITY | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0x888888,
    hardness: 0.6,
  }),
  
  SNOW: new Block(16, 'Snow', {
    flags: BlockFlags.SOLID | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0xFFFAFA,
    hardness: 0.2,
  }),
  
  ICE: new Block(17, 'Ice', {
    flags: BlockFlags.SOLID | BlockFlags.TRANSPARENT | BlockFlags.BREAKABLE | BlockFlags.PLACEABLE,
    color: 0xB0E0E6,
    opacity: 3,
    hardness: 0.5,
    friction: 0.98,
  }),
};

// Create a lookup array for quick access by ID
export const BlocksById = Object.values(Blocks);

// Helper function to get block by ID
export function getBlockById(id) {
  return BlocksById[id] || Blocks.AIR;
}

// Helper function to get block by name
export function getBlockByName(name) {
  return Object.values(Blocks).find(block => block.name === name) || Blocks.AIR;
}
