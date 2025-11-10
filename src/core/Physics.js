import { WorldConfig, BlockTypes } from '../config.js'
  ;import { VoxelParticleSystem } from './VoxelParticleSystem.js';

/**
 * Physics Engine - Handles voxel physics (Rust-like mechanics)
 * - Gravity simulation
 * - Structural integrity checks
 * - Block falling and collapse
 * - Micro-voxel particle destruction effects
 */
export class Physics {
  constructor(chunkManager) {
    this.chunkManager = chunkManager;
    this.gravity = WorldConfig.physics.gravity;
    this.structuralIntegrity = WorldConfig.physics.structuralIntegrity;
    this.supportDistance = WorldConfig.physics.supportDistance;
    
    // Initialize particle system for micro-voxel destruction
    this.particleSystem = null; // Will be set by main engine with scene
    
    // Blocks awaiting physics updates
    this.pendingUpdates = new Set();
    this.fallingBlocks = new Map();  // Track blocks that are falling
  }

  /**
   * Set the particle system for micro-voxel destruction effects
   * @param {VoxelParticleSystem} particleSystem - The particle system instance
   */
  setParticleSystem(particleSystem) {
    this.particleSystem = particleSystem;
  }

  // Update physics for all pending blocks
  update(deltaTime) {
    if (!this.structuralIntegrity) return;
    
    // Process falling blocks
    this.updateFallingBlocks(deltaTime);
    
    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }
    
    // Check structural integrity for pending updates
    const updates = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();
    
    for (const posKey of updates) {
      const [x, y, z] = posKey.split(',').map(Number);
      this.checkBlockPhysics(x, y, z);
    }
  }

  // Check if a block should fall or needs support
  checkBlockPhysics(x, y, z) {
    const chunk = this.chunkManager.getChunkAt(x, z);
    if (!chunk) return;
    
    const localPos = this.chunkManager.worldToLocal(x, y, z);
    const blockType = chunk.getBlock(localPos.x, localPos.y, localPos.z);
    
    if (blockType === BlockTypes.AIR) return;
    
    const props = BlockProperties[blockType];
    if (!props) return;
    
    // Check if block is affected by gravity
    if (props.affectedByGravity) {
      if (!this.hasSupport(x, y, z)) {
        this.startFalling(x, y, z, blockType);
        return;
      }
    }
    
    // Check structural integrity
    if (this.structuralIntegrity && props.canSupport !== false) {
      if (!this.hasStructuralSupport(x, y, z)) {
        // Block loses support - start falling
        this.startFalling(x, y, z, blockType);
        
        // Check blocks above
        this.queueUpdate(x, y + 1, z);
      }
    }
  }

  // Check if block has direct support below
  hasSupport(x, y, z) {
    if (y <= 0) return true;  // Bedrock
    
    const belowChunk = this.chunkManager.getChunkAt(x, z);
    if (!belowChunk) return false;
    
    const localPos = this.chunkManager.worldToLocal(x, y - 1, z);
    const blockBelow = belowChunk.getBlock(localPos.x, localPos.y, localPos.z);
    
    if (blockBelow === BlockTypes.AIR || blockBelow === BlockTypes.WATER) {
      return false;
    }
    
    const belowProps = BlockProperties[blockBelow];
    return belowProps && belowProps.canSupport !== false;
  }

  // Check if block has structural support (connected to ground)
  hasStructuralSupport(x, y, z) {
    // Use flood fill to check if connected to ground
    const visited = new Set();
    const queue = [[x, y, z, 0]];
    
    while (queue.length > 0) {
      const [cx, cy, cz, distance] = queue.shift();
      const key = `${cx},${cy},${cz}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // Reached ground
      if (cy <= 0) return true;
      
      // Max distance reached
      if (distance >= this.supportDistance) continue;
      
      // Check direct support
      if (this.hasSupport(cx, cy, cz)) return true;
      
      // Check neighbors
      const neighbors = [
        [cx - 1, cy, cz],
        [cx + 1, cy, cz],
        [cx, cy - 1, cz],
        [cx, cy, cz - 1],
        [cx, cy, cz + 1]
      ];
      
      for (const [nx, ny, nz] of neighbors) {
        const chunk = this.chunkManager.getChunkAt(nx, nz);
        if (!chunk) continue;
        
        const localPos = this.chunkManager.worldToLocal(nx, ny, nz);
        const blockType = chunk.getBlock(localPos.x, localPos.y, localPos.z);
        
        if (blockType !== BlockTypes.AIR && blockType !== BlockTypes.WATER) {
          const props = BlockProperties[blockType];
          if (props && props.canSupport !== false) {
            queue.push([nx, ny, nz, distance + 1]);
          }
        }
      }
    }
    
    return false;
  }

  // Start a block falling
  startFalling(x, y, z, blockType) {
    const key = `${x},${y},${z}`;
    
    if (this.fallingBlocks.has(key)) return;
    
    // Remove block from world
    const chunk = this.chunkManager.getChunkAt(x, z);
    if (!chunk) return;
    
    const localPos = this.chunkManager.worldToLocal(x, y, z);
    chunk.setBlock(localPos.x, localPos.y, localPos.z, BlockTypes.AIR);
    
    // Track falling block
    this.fallingBlocks.set(key, {
      x, y, z,
      blockType,
      velocity: 0,
      posY: y
    });
    
    // Queue updates for neighbors
    this.queueNeighborUpdates(x, y, z);
  }

  // Update all falling blocks
  updateFallingBlocks(deltaTime) {
    const toRemove = [];
    
    for (const [key, block] of this.fallingBlocks.entries()) {
      // Apply gravity
      block.velocity += this.gravity * deltaTime;
      block.velocity = Math.max(block.velocity, WorldConfig.physics.terminalVelocity);
      
      block.posY += block.velocity * deltaTime;
      
      const targetY = Math.floor(block.posY);
      
      // Check if landed
      if (targetY <= block.y - 1) {
        const landY = targetY;
        
        // Check if landing position is solid
        if (this.hasSupport(block.x, landY + 1, block.z)) {
          // Place block at landing position
          const chunk = this.chunkManager.getChunkAt(block.x, block.z);
          if (chunk) {
            const localPos = this.chunkManager.worldToLocal(block.x, landY, block.z);
            chunk.setBlock(localPos.x, localPos.y, localPos.z, block.blockType);
            
            // Queue physics check
            this.queueUpdate(block.x, landY, block.z);
            this.queueNeighborUpdates(block.x, landY, block.z);
          }
          
          toRemove.push(key);
        } else {
          // Continue falling
          block.y = targetY;
        }
      }
    }
    
    // Remove landed blocks
    for (const key of toRemove) {
      this.fallingBlocks.delete(key);
    }
  }

  // Queue a block for physics update
  queueUpdate(x, y, z) {
    this.pendingUpdates.add(`${x},${y},${z}`);
  }

  // Queue all neighbors for update
  queueNeighborUpdates(x, y, z) {
    const neighbors = [
      [x - 1, y, z], [x + 1, y, z],
      [x, y - 1, z], [x, y + 1, z],
      [x, y, z - 1], [x, y, z + 1]
    ];
    
    for (const [nx, ny, nz] of neighbors) {
      this.queueUpdate(nx, ny, nz);
    }
  }

  // Handle block destruction
  onBlockDestroyed(x, y, z) {
    // Get block type before it's destroyed for particle effect
    const chunk = this.chunkManager.getChunkAt(x, z);
    let blockType = null;
    if (chunk) {
      const localPos = this.chunkManager.worldToLocal(x, y, z);
      blockType = chunk.getBlock(localPos.x, localPos.y, localPos.z);
    }
    
    // Create particle effect if particle system is available
    if (this.particleSystem && blockType && blockType !== BlockTypes.AIR) {
      // Calculate impact direction (default to upward)
      const impact = { x: 0, y: 1, z: 0 };
      this.particleSystem.breakBlock(x, y, z, blockType, impact);
    }
    
    this.queueNeighborUpdates(x, y, z);
  }

  // Handle block placement
  onBlockPlaced(x, y, z) {
    this.queueUpdate(x, y, z);
    this.queueNeighborUpdates(x, y, z);
  }
}
