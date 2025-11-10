import { BlockTypes } from '../config.js';

/**
 * WaterPhysics - Simulates realistic water flow and fluid dynamics
 * Implements water spreading, flowing downward, and source blocks
 * Uses level-based system (0-7) for water depth
 */
export class WaterPhysics {
  constructor(chunkManager) {
    this.chunkManager = chunkManager;
    
    // Water configuration
    this.maxWaterLevel = 7; // 0 = empty, 7 = full source block
    this.flowRate = 1; // How fast water spreads per tick
    this.tickInterval = 200; // ms between water physics updates
    
    // Pending water updates
    this.waterUpdates = new Set();
    this.sourceBlocks = new Map(); // Track water source blocks
    
    // Last update time
    this.lastUpdateTime = Date.now();
  }

  /**
   * Update water physics
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.tickInterval) return;
    
    this.lastUpdateTime = now;
    this.processWaterFlow();
  }

  /**
   * Process all pending water flow updates
   */
  processWaterFlow() {
    const updates = Array.from(this.waterUpdates);
    this.waterUpdates.clear();
    
    for (const posKey of updates) {
      const [x, y, z] = posKey.split(',').map(Number);
      this.updateWaterBlock(x, y, z);
    }
  }

  /**
   * Update a single water block
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} worldZ - World Z coordinate
   */
  updateWaterBlock(worldX, worldY, worldZ) {
    const chunk = this.chunkManager.getChunkAt(worldX, worldZ);
    if (!chunk) return;
    
    const localPos = this.chunkManager.worldToLocal(worldX, worldY, worldZ);
    const blockType = chunk.getBlock(localPos.x, localPos.y, localPos.z);
    
    if (blockType !== BlockTypes.WATER) return;
    
    const waterLevel = this.getWaterLevel(chunk, localPos.x, localPos.y, localPos.z);
    
    // Check if this is a source block
    const sourceKey = `${worldX},${worldY},${worldZ}`;
    const isSource = this.sourceBlocks.has(sourceKey);
    
    // Water flows down first
    if (this.tryFlowDown(worldX, worldY, worldZ, waterLevel)) {
      return; // Water flowed down, don't spread horizontally
    }
    
    // If not a source block and water level is low, remove it
    if (!isSource && waterLevel <= 0) {
      chunk.setBlock(localPos.x, localPos.y, localPos.z, BlockTypes.AIR);
      return;
    }
    
    // Spread horizontally if there's enough water
    if (waterLevel > 1 || isSource) {
      this.spreadHorizontally(worldX, worldY, worldZ, waterLevel, isSource);
    }
  }

  /**
   * Try to flow water downward
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   * @param {number} waterLevel - Current water level
   * @returns {boolean} True if water flowed down
   */
  tryFlowDown(x, y, z, waterLevel) {
    if (y <= 0) return false;
    
    const chunkBelow = this.chunkManager.getChunkAt(x, z);
    if (!chunkBelow) return false;
    
    const localBelow = this.chunkManager.worldToLocal(x, y - 1, z);
    const blockBelow = chunkBelow.getBlock(localBelow.x, localBelow.y, localBelow.z);
    
    // Can flow into air
    if (blockBelow === BlockTypes.AIR) {
      chunkBelow.setBlock(localBelow.x, localBelow.y, localBelow.z, BlockTypes.WATER);
      this.setWaterLevel(chunkBelow, localBelow.x, localBelow.y, localBelow.z, this.maxWaterLevel);
      this.queueWaterUpdate(x, y - 1, z);
      return true;
    }
    
    // Can fill existing water below
    if (blockBelow === BlockTypes.WATER) {
      const belowLevel = this.getWaterLevel(chunkBelow, localBelow.x, localBelow.y, localBelow.z);
      if (belowLevel < this.maxWaterLevel) {
        const transfer = Math.min(waterLevel, this.maxWaterLevel - belowLevel);
        this.setWaterLevel(chunkBelow, localBelow.x, localBelow.y, localBelow.z, belowLevel + transfer);
        this.queueWaterUpdate(x, y - 1, z);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Spread water horizontally
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   * @param {number} waterLevel - Current water level
   * @param {boolean} isSource - Is this a source block
   */
  spreadHorizontally(x, y, z, waterLevel, isSource) {
    const directions = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y, z + 1],
      [x, y, z - 1]
    ];
    
    const newLevel = isSource ? this.maxWaterLevel : Math.max(0, waterLevel - 1);
    if (newLevel <= 0) return;
    
    for (const [nx, ny, nz] of directions) {
      const neighborChunk = this.chunkManager.getChunkAt(nx, nz);
      if (!neighborChunk) continue;
      
      const localPos = this.chunkManager.worldToLocal(nx, ny, nz);
      const neighborBlock = neighborChunk.getBlock(localPos.x, localPos.y, localPos.z);
      
      // Can flow into air
      if (neighborBlock === BlockTypes.AIR) {
        neighborChunk.setBlock(localPos.x, localPos.y, localPos.z, BlockTypes.WATER);
        this.setWaterLevel(neighborChunk, localPos.x, localPos.y, localPos.z, newLevel);
        this.queueWaterUpdate(nx, ny, nz);
      }
      // Can fill existing water
      else if (neighborBlock === BlockTypes.WATER) {
        const neighborLevel = this.getWaterLevel(neighborChunk, localPos.x, localPos.y, localPos.z);
        if (newLevel > neighborLevel) {
          this.setWaterLevel(neighborChunk, localPos.x, localPos.y, localPos.z, newLevel);
          this.queueWaterUpdate(nx, ny, nz);
        }
      }
    }
  }

  /**
   * Get water level at position
   * @param {Chunk} chunk - The chunk
   * @param {number} x - Local X
   * @param {number} y - Y coordinate
   * @param {number} z - Local Z
   * @returns {number} Water level (0-7)
   */
  getWaterLevel(chunk, x, y, z) {
    if (!chunk.waterLevels) {
      chunk.waterLevels = new Uint8Array(chunk.size * chunk.height * chunk.size);
      chunk.waterLevels.fill(this.maxWaterLevel); // Default to full
    }
    
    const index = x + (z * chunk.size) + (y * chunk.size * chunk.size);
    return chunk.waterLevels[index] || this.maxWaterLevel;
  }

  /**
   * Set water level at position
   * @param {Chunk} chunk - The chunk
   * @param {number} x - Local X
   * @param {number} y - Y coordinate
   * @param {number} z - Local Z
   * @param {number} level - Water level (0-7)
   */
  setWaterLevel(chunk, x, y, z, level) {
    if (!chunk.waterLevels) {
      chunk.waterLevels = new Uint8Array(chunk.size * chunk.height * chunk.size);
      chunk.waterLevels.fill(this.maxWaterLevel);
    }
    
    const index = x + (z * chunk.size) + (y * chunk.size * chunk.size);
    chunk.waterLevels[index] = Math.max(0, Math.min(level, this.maxWaterLevel));
  }

  /**
   * Queue a water block for update
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   */
  queueWaterUpdate(x, y, z) {
    this.waterUpdates.add(`${x},${y},${z}`);
  }

  /**
   * Place a water source block
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   */
  placeWaterSource(x, y, z) {
    const chunk = this.chunkManager.getChunkAt(x, z);
    if (!chunk) return;
    
    const localPos = this.chunkManager.worldToLocal(x, y, z);
    chunk.setBlock(localPos.x, localPos.y, localPos.z, BlockTypes.WATER);
    this.setWaterLevel(chunk, localPos.x, localPos.y, localPos.z, this.maxWaterLevel);
    
    // Mark as source block
    this.sourceBlocks.set(`${x},${y},${z}`, true);
    this.queueWaterUpdate(x, y, z);
  }

  /**
   * Remove water at position
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   */
  removeWater(x, y, z) {
    const chunk = this.chunkManager.getChunkAt(x, z);
    if (!chunk) return;
    
    const localPos = this.chunkManager.worldToLocal(x, y, z);
    const blockType = chunk.getBlock(localPos.x, localPos.y, localPos.z);
    
    if (blockType === BlockTypes.WATER) {
      chunk.setBlock(localPos.x, localPos.y, localPos.z, BlockTypes.AIR);
      this.sourceBlocks.delete(`${x},${y},${z}`);
      
      // Queue neighbors for update
      this.queueNeighborsForUpdate(x, y, z);
    }
  }

  /**
   * Queue all neighbors for water update
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   */
  queueNeighborsForUpdate(x, y, z) {
    const neighbors = [
      [x + 1, y, z], [x - 1, y, z],
      [x, y + 1, z], [x, y - 1, z],
      [x, y, z + 1], [x, y, z - 1]
    ];
    
    for (const [nx, ny, nz] of neighbors) {
      this.queueWaterUpdate(nx, ny, nz);
    }
  }

  /**
   * Initialize water physics for a chunk
   * @param {Chunk} chunk - The chunk
   */
  initializeChunkWater(chunk) {
    // Find all water blocks and queue them for initial processing
    for (let x = 0; x < chunk.size; x++) {
      for (let y = 0; y < chunk.height; y++) {
        for (let z = 0; z < chunk.size; z++) {
          const blockType = chunk.getBlock(x, y, z);
          if (blockType === BlockTypes.WATER) {
            const worldX = chunk.x * chunk.size + x;
            const worldZ = chunk.z * chunk.size + z;
            
            // Check if it's a naturally generated water (likely a source)
            const hasWaterAbove = y < chunk.height - 1 && 
                                  chunk.getBlock(x, y + 1, z) === BlockTypes.WATER;
            
            if (hasWaterAbove || y === chunk.height - 1) {
              // Mark as source block
              this.sourceBlocks.set(`${worldX},${y},${worldZ}`, true);
            }
            
            this.queueWaterUpdate(worldX, y, worldZ);
          }
        }
      }
    }
  }
}
