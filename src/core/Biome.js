/**
 * Biome.js - Biome system for varied terrain generation
 * Defines different biomes with unique characteristics
 */

import { Blocks } from './Block.js';

/**
 * Biome class - Represents a biome type
 */
export class Biome {
  constructor(id, name, properties = {}) {
    this.id = id;
    this.name = name;
    
    // Terrain properties
    this.baseHeight = properties.baseHeight || 64;
    this.heightVariation = properties.heightVariation || 16;
    this.terrainScale = properties.terrainScale || 0.01;
    
    // Block types
    this.topBlock = properties.topBlock || Blocks.GRASS;
    this.fillBlock = properties.fillBlock || Blocks.DIRT;
    this.stoneBlock = properties.stoneBlock || Blocks.STONE;
    this.beachBlock = properties.beachBlock || Blocks.SAND;
    
    // Temperature and humidity
    this.temperature = properties.temperature || 0.5; // 0-1
    this.humidity = properties.humidity || 0.5; // 0-1
    
    // Features
    this.hasTree = properties.hasTree !== false;
    this.treeDensity = properties.treeDensity || 0.01;
    this.grassDensity = properties.grassDensity || 0.3;
    this.flowerDensity = properties.flowerDensity || 0.05;
    
    // Special features
    this.hasOres = properties.hasOres !== false;
    this.hasCaves = properties.hasCaves !== false;
    this.hasWater = properties.hasWater !== false;
  }
}

// Define all biome types
export const Biomes = {
  PLAINS: new Biome(0, 'Plains', {
    baseHeight: 64,
    heightVariation: 8,
    terrainScale: 0.008,
    topBlock: Blocks.GRASS,
    fillBlock: Blocks.DIRT,
    temperature: 0.6,
    humidity: 0.5,
    treeDensity: 0.005,
    grassDensity: 0.6,
    flowerDensity: 0.1,
  }),
  
  FOREST: new Biome(1, 'Forest', {
    baseHeight: 68,
    heightVariation: 12,
    terrainScale: 0.01,
    topBlock: Blocks.GRASS,
    fillBlock: Blocks.DIRT,
    temperature: 0.5,
    humidity: 0.7,
    treeDensity: 0.05,
    grassDensity: 0.8,
    flowerDensity: 0.05,
  }),
  
  DESERT: new Biome(2, 'Desert', {
    baseHeight: 62,
    heightVariation: 16,
    terrainScale: 0.012,
    topBlock: Blocks.SAND,
    fillBlock: Blocks.SAND,
    stoneBlock: Blocks.STONE,
    temperature: 0.9,
    humidity: 0.1,
    hasTree: false,
    treeDensity: 0.0,
    grassDensity: 0.0,
    flowerDensity: 0.0,
  }),
  
  MOUNTAINS: new Biome(3, 'Mountains', {
    baseHeight: 80,
    heightVariation: 40,
    terrainScale: 0.015,
    topBlock: Blocks.STONE,
    fillBlock: Blocks.STONE,
    temperature: 0.2,
    humidity: 0.4,
    treeDensity: 0.002,
    grassDensity: 0.1,
    flowerDensity: 0.02,
  }),
  
  SNOW_TUNDRA: new Biome(4, 'Snow Tundra', {
    baseHeight: 64,
    heightVariation: 6,
    terrainScale: 0.008,
    topBlock: Blocks.SNOW,
    fillBlock: Blocks.DIRT,
    temperature: 0.0,
    humidity: 0.3,
    hasTree: false,
    treeDensity: 0.0,
    grassDensity: 0.05,
    flowerDensity: 0.0,
  }),
  
  TAIGA: new Biome(5, 'Taiga', {
    baseHeight: 66,
    heightVariation: 10,
    terrainScale: 0.009,
    topBlock: Blocks.GRASS,
    fillBlock: Blocks.DIRT,
    temperature: 0.1,
    humidity: 0.6,
    treeDensity: 0.03,
    grassDensity: 0.2,
    flowerDensity: 0.01,
  }),
  
  BEACH: new Biome(6, 'Beach', {
    baseHeight: 58,
    heightVariation: 2,
    terrainScale: 0.006,
    topBlock: Blocks.SAND,
    fillBlock: Blocks.SAND,
    beachBlock: Blocks.SAND,
    temperature: 0.7,
    humidity: 0.6,
    hasTree: false,
    treeDensity: 0.0,
    grassDensity: 0.0,
    flowerDensity: 0.0,
  }),
  
  OCEAN: new Biome(7, 'Ocean', {
    baseHeight: 40,
    heightVariation: 8,
    terrainScale: 0.005,
    topBlock: Blocks.SAND,
    fillBlock: Blocks.SAND,
    temperature: 0.5,
    humidity: 1.0,
    hasTree: false,
    treeDensity: 0.0,
    grassDensity: 0.0,
    flowerDensity: 0.0,
    hasWater: true,
  }),
};

/**
 * BiomeGenerator - Generates and manages biomes
 */
export class BiomeGenerator {
  constructor(seed = 0) {
    this.seed = seed;
  }
  
  /**
   * Get biome at world coordinates
   * Uses temperature and humidity to determine biome
   */
  getBiome(x, z, temperature, humidity) {
    // Determine biome based on temperature and humidity
    if (humidity > 0.8) {
      if (temperature < 0.2) return Biomes.TAIGA;
      if (temperature < 0.6) return Biomes.FOREST;
      return Biomes.PLAINS;
    }
    
    if (humidity > 0.5) {
      if (temperature < 0.3) return Biomes.TAIGA;
      if (temperature < 0.7) return Biomes.FOREST;
      return Biomes.PLAINS;
    }
    
    if (humidity > 0.3) {
      if (temperature < 0.2) return Biomes.SNOW_TUNDRA;
      if (temperature < 0.5) return Biomes.PLAINS;
      if (temperature < 0.8) return Biomes.PLAINS;
      return Biomes.DESERT;
    }
    
    if (temperature < 0.2) return Biomes.SNOW_TUNDRA;
    if (temperature > 0.7) return Biomes.DESERT;
    return Biomes.PLAINS;
  }
  
  /**
   * Get biome blend for smooth transitions
   * Returns array of biomes with weights
   */
  getBiomeBlend(x, z, temperature, humidity, blendRadius = 32) {
    const mainBiome = this.getBiome(x, z, temperature, humidity);
    
    // For now, return just the main biome
    // TODO: Implement biome blending
    return [{ biome: mainBiome, weight: 1.0 }];
  }
}

export const BiomesById = Object.values(Biomes);
