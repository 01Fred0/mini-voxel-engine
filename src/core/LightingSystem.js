import { BlockTypes, getBlockById } from '../config.js';

/**
 * LightingSystem - Calculates voxel lighting using light propagation
 * Supports sunlight and block light sources
 * Uses flood-fill algorithm for light propagation
 */
export class LightingSystem {
    constructor(chunkManager) {
        this.chunkManager = chunkManager;
        
        // Lighting configuration
        this.maxLightLevel = 15; // 0 = dark, 15 = brightest
        this.sunlightLevel = 15;
        
        // Light sources (blocks that emit light)
        this.lightSources = new Map([
            [BlockTypes.LAVA, 15],
            // Can add more light-emitting blocks here
        ]);
        
        // Pending light updates
        this.lightUpdates = new Set();
    }

    /**
     * Calculate lighting for a chunk
     * @param {Chunk} chunk - The chunk to light
     */
    calculateChunkLighting(chunk) {
        // Initialize light values
        this.initializeLightData(chunk);
        
        // Propagate sunlight from top
        this.propagateSunlight(chunk);
        
        // Propagate block lights
        this.propagateBlockLight(chunk);
    }

    /**
     * Initialize light data for chunk
     * @param {Chunk} chunk - The chunk
     */
    initializeLightData(chunk) {
        if (!chunk.lightData) {
            // Create light data array: skylight (4 bits) + blocklight (4 bits) = 1 byte per block
            chunk.lightData = new Uint8Array(chunk.size * chunk.height * chunk.size);
        }
    }

    /**
     * Get light value at position
     * @param {Chunk} chunk - The chunk
     * @param {number} x - Local X
     * @param {number} y - Y coordinate
     * @param {number} z - Local Z
     * @returns {object} {skylight, blocklight}
     */
    getLightAt(chunk, x, y, z) {
        if (!chunk.lightData) return { skylight: 15, blocklight: 0 };
        
        const index = this.getIndex(chunk, x, y, z);
        if (index === -1) return { skylight: 15, blocklight: 0 };
        
        const value = chunk.lightData[index];
        return {
            skylight: (value >> 4) & 0xF, // Upper 4 bits
            blocklight: value & 0xF // Lower 4 bits
        };
    }

    /**
     * Set light value at position
     * @param {Chunk} chunk - The chunk
     * @param {number} x - Local X
     * @param {number} y - Y coordinate
     * @param {number} z - Local Z
     * @param {number} skylight - Sky light level (0-15)
     * @param {number} blocklight - Block light level (0-15)
     */
    setLightAt(chunk, x, y, z, skylight, blocklight) {
        if (!chunk.lightData) this.initializeLightData(chunk);
        
        const index = this.getIndex(chunk, x, y, z);
        if (index === -1) return;
        
        // Pack both values into one byte
        chunk.lightData[index] = ((skylight & 0xF) << 4) | (blocklight & 0xF);
    }

    /**
     * Get array index from coordinates
     * @param {Chunk} chunk - The chunk
     * @param {number} x - Local X
     * @param {number} y - Y coordinate
     * @param {number} z - Local Z
     * @returns {number} Array index or -1 if out of bounds
     */
    getIndex(chunk, x, y, z) {
        if (x < 0 || x >= chunk.size || z < 0 || z >= chunk.size) return -1;
        if (y < 0 || y >= chunk.height) return -1;
        
        return x + (z * chunk.size) + (y * chunk.size * chunk.size);
    }

    /**
     * Propagate sunlight from top of chunk
     * @param {Chunk} chunk - The chunk
     */
    propagateSunlight(chunk) {
        for (let x = 0; x < chunk.size; x++) {
            for (let z = 0; z < chunk.size; z++) {
                let lightLevel = this.sunlightLevel;
                
                // Propagate sunlight downward
                for (let y = chunk.height - 1; y >= 0; y--) {
                    const blockType = chunk.getBlock(x, y, z);
                    const block = getBlockById(blockType);
                    
                    if (blockType === BlockTypes.AIR || !block || !block.isSolid()) {
                        // Air or transparent block - light passes through
                        const current = this.getLightAt(chunk, x, y, z);
                        this.setLightAt(chunk, x, y, z, lightLevel, current.blocklight);
                    } else {
                        // Solid block - blocks light
                        lightLevel = 0;
                        const current = this.getLightAt(chunk, x, y, z);
                        this.setLightAt(chunk, x, y, z, 0, current.blocklight);
                    }
                }
            }
        }
        
        // Propagate sunlight horizontally
        this.propagateLightHorizontal(chunk, true);
    }

    /**
     * Propagate block light from light sources
     * @param {Chunk} chunk - The chunk
     */
    propagateBlockLight(chunk) {
        // Find all light sources
        const lightSources = [];
        
        for (let x = 0; x < chunk.size; x++) {
            for (let y = 0; y < chunk.height; y++) {
                for (let z = 0; z < chunk.size; z++) {
                    const blockType = chunk.getBlock(x, y, z);
                    const lightLevel = this.lightSources.get(blockType);
                    
                    if (lightLevel) {
                        const current = this.getLightAt(chunk, x, y, z);
                        this.setLightAt(chunk, x, y, z, current.skylight, lightLevel);
                        lightSources.push({ x, y, z, level: lightLevel });
                    }
                }
            }
        }
        
        // Propagate light from sources
        for (const source of lightSources) {
            this.propagateLightFromSource(chunk, source.x, source.y, source.z, source.level, false);
        }
    }

    /**
     * Propagate light horizontally using BFS
     * @param {Chunk} chunk - The chunk
     * @param {boolean} isSkylight - True for skylight, false for blocklight
     */
    propagateLightHorizontal(chunk, isSkylight) {
        const queue = [];
        
        // Add all lit blocks to queue
        for (let x = 0; x < chunk.size; x++) {
            for (let y = 0; y < chunk.height; y++) {
                for (let z = 0; z < chunk.size; z++) {
                    const light = this.getLightAt(chunk, x, y, z);
                    const level = isSkylight ? light.skylight : light.blocklight;
                    
                    if (level > 0) {
                        queue.push({ x, y, z, level });
                    }
                }
            }
        }
        
        // BFS propagation
        while (queue.length > 0) {
            const { x, y, z, level } = queue.shift();
            
            if (level <= 1) continue; // Light too weak to propagate
            
            const neighbors = [
                [x + 1, y, z], [x - 1, y, z],
                [x, y + 1, z], [x, y - 1, z],
                [x, y, z + 1], [x, y, z - 1]
            ];
            
            for (const [nx, ny, nz] of neighbors) {
                if (nx < 0 || nx >= chunk.size || nz < 0 || nz >= chunk.size) continue;
                if (ny < 0 || ny >= chunk.height) continue;
                
                const neighborBlock = chunk.getBlock(nx, ny, nz);
                const block = getBlockById(neighborBlock);
                
                // Only propagate through air/transparent blocks
                if (neighborBlock !== BlockTypes.AIR && block && block.isSolid()) continue;
                
                const neighborLight = this.getLightAt(chunk, nx, ny, nz);
                const currentLevel = isSkylight ? neighborLight.skylight : neighborLight.blocklight;
                const newLevel = level - 1;
                
                if (newLevel > currentLevel) {
                    if (isSkylight) {
                        this.setLightAt(chunk, nx, ny, nz, newLevel, neighborLight.blocklight);
                    } else {
                        this.setLightAt(chunk, nx, ny, nz, neighborLight.skylight, newLevel);
                    }
                    queue.push({ x: nx, y: ny, z: nz, level: newLevel });
                }
            }
        }
    }

    /**
     * Propagate light from a specific source
     * @param {Chunk} chunk - The chunk
     * @param {number} x - Source X
     * @param {number} y - Source Y
     * @param {number} z - Source Z
     * @param {number} lightLevel - Initial light level
     * @param {boolean} isSkylight - True for skylight
     */
    propagateLightFromSource(chunk, x, y, z, lightLevel, isSkylight) {
        const queue = [{ x, y, z, level: lightLevel }];
        const visited = new Set();
        
        while (queue.length > 0) {
            const { x: cx, y: cy, z: cz, level } = queue.shift();
            const key = `${cx},${cy},${cz}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (level <= 0) continue;
            
            const neighbors = [
                [cx + 1, cy, cz], [cx - 1, cy, cz],
                [cx, cy + 1, cz], [cx, cy - 1, cz],
                [cx, cy, cz + 1], [cx, cy, cz - 1]
            ];
            
            for (const [nx, ny, nz] of neighbors) {
                if (nx < 0 || nx >= chunk.size || nz < 0 || nz >= chunk.size) continue;
                if (ny < 0 || ny >= chunk.height) continue;
                
                const blockType = chunk.getBlock(nx, ny, nz);
                const block = getBlockById(blockType);
                
                if (blockType !== BlockTypes.AIR && block && block.isSolid()) continue;
                
                const currentLight = this.getLightAt(chunk, nx, ny, nz);
                const currentLevel = isSkylight ? currentLight.skylight : currentLight.blocklight;
                const newLevel = level - 1;
                
                if (newLevel > currentLevel) {
                    if (isSkylight) {
                        this.setLightAt(chunk, nx, ny, nz, newLevel, currentLight.blocklight);
                    } else {
                        this.setLightAt(chunk, nx, ny, nz, currentLight.skylight, newLevel);
                    }
                    queue.push({ x: nx, y: ny, z: nz, level: newLevel });
                }
            }
        }
    }

    /**
     * Update lighting when a block changes
     * @param {Chunk} chunk - The chunk
     * @param {number} x - Local X
     * @param {number} y - Y coordinate
     * @param {number} z - Local Z
     * @param {number} oldBlockType - Previous block type
     * @param {number} newBlockType - New block type
     */
    onBlockChange(chunk, x, y, z, oldBlockType, newBlockType) {
        // Recalculate lighting for this position and neighbors
        this.recalculateLight(chunk, x, y, z);
        
        // If new block is a light source, propagate its light
        const lightLevel = this.lightSources.get(newBlockType);
        if (lightLevel) {
            this.propagateLightFromSource(chunk, x, y, z, lightLevel, false);
        }
    }

    /**
     * Recalculate light at a specific position
     * @param {Chunk} chunk - The chunk
     * @param {number} x - Local X
     * @param {number} y - Y coordinate
     * @param {number} z - Local Z
     */
    recalculateLight(chunk, x, y, z) {
        // Reset light to 0
        this.setLightAt(chunk, x, y, z, 0, 0);
        
        // Recalculate from neighbors and sunlight
        // This is a simplified version - full implementation would need
        // more sophisticated light removal/addition algorithms
    }
}
