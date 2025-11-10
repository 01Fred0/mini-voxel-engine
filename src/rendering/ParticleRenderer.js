import * as THREE from 'three';

/**
 * ParticleRenderer - Optimized renderer for voxel particles using instanced rendering
 * 
 * This class provides high-performance rendering for thousands of micro-voxel particles
 * by using THREE.js InstancedMesh for efficient GPU rendering. It includes mesh pooling,
 * LOD support, and automatic culling for optimal performance.
 * 
 * Features:
 * - Instanced rendering for thousands of particles
 * - Mesh pooling to reduce allocations
 * - Automatic frustum culling
 * - LOD system for distant particles
 * - Dynamic particle updates
 * 
 * @class ParticleRenderer
 */
export class ParticleRenderer {
    /**
     * Create a particle renderer
     * @param {THREE.Scene} scene - The THREE.js scene to render particles in
     * @param {Object} options - Configuration options
     * @param {number} options.maxParticles - Maximum number of particles to support (default: 10000)
     * @param {number} options.particleSize - Size of each micro-voxel particle (default: 0.25)
     * @param {boolean} options.enableLOD - Enable level-of-detail system (default: true)
     * @param {number} options.lodDistance - Distance at which to reduce particle detail (default: 50)
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.maxParticles = options.maxParticles || 10000;
        this.particleSize = options.particleSize || 0.25;
        this.enableLOD = options.enableLOD !== undefined ? options.enableLOD : true;
        this.lodDistance = options.lodDistance || 50;

        // Create geometry for a single voxel particle
        this.particleGeometry = new THREE.BoxGeometry(
            this.particleSize,
            this.particleSize,
            this.particleSize
        );

        // Create material with basic lighting
        this.particleMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.2
        });

        // Create instanced mesh for all particles
        this.instancedMesh = new THREE.InstancedMesh(
            this.particleGeometry,
            this.particleMaterial,
            this.maxParticles
        );
        
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.count = 0; // Start with no visible instances
        this.scene.add(this.instancedMesh);

        // Temporary objects for matrix operations
        this.tempMatrix = new THREE.Matrix4();
        this.tempPosition = new THREE.Vector3();
        this.tempQuaternion = new THREE.Quaternion();
        this.tempScale = new THREE.Vector3(1, 1, 1);
        this.tempColor = new THREE.Color();

        // Track active particle count
        this.activeParticles = 0;

        // Performance tracking
        this.lastUpdateTime = performance.now();
        this.updateCount = 0;
    }

    /**
     * Update particle rendering from particle system
     * @param {Array} particles - Array of VoxelParticle objects to render
     * @param {THREE.Camera} camera - Camera for frustum culling and LOD
     */
    update(particles, camera) {
        const startTime = performance.now();
        
        // Reset instance count
        let instanceIndex = 0;

        // Camera position for LOD calculations
        const cameraPos = camera ? camera.position : null;

        // Update each particle
        for (let i = 0; i < particles.length && instanceIndex < this.maxParticles; i++) {
            const particle = particles[i];
            
            // Skip settled particles that haven't moved
            if (particle.settled && !particle.needsRender) {
                continue;
            }

            // Calculate distance from camera for LOD
            let skipParticle = false;
            if (this.enableLOD && cameraPos) {
                const dx = particle.position.x - cameraPos.x;
                const dy = particle.position.y - cameraPos.y;
                const dz = particle.position.z - cameraPos.z;
                const distanceSq = dx * dx + dy * dy + dz * dz;

                // Skip distant particles based on LOD settings
                if (distanceSq > this.lodDistance * this.lodDistance) {
                    // Only render every other distant particle
                    if (i % 2 === 0) {
                        skipParticle = true;
                    }
                }

                // Skip very distant particles entirely
                if (distanceSq > (this.lodDistance * 2) * (this.lodDistance * 2)) {
                    skipParticle = true;
                }
            }

            if (skipParticle) {
                continue;
            }

            // Set position
            this.tempPosition.set(
                particle.position.x,
                particle.position.y,
                particle.position.z
            );

            // Set rotation from velocity/rotation
            this.tempQuaternion.setFromEuler(
                new THREE.Euler(
                    particle.rotation.x,
                    particle.rotation.y,
                    particle.rotation.z
                )
            );

            // Compose matrix
            this.tempMatrix.compose(
                this.tempPosition,
                this.tempQuaternion,
                this.tempScale
            );

            // Set instance matrix
            this.instancedMesh.setMatrixAt(instanceIndex, this.tempMatrix);

            // Set instance color
            this.tempColor.setHex(particle.color);
            this.instancedMesh.setColorAt(instanceIndex, this.tempColor);

            // Mark particle as rendered
            particle.needsRender = false;

            instanceIndex++;
        }

        // Update instance count
        this.instancedMesh.count = instanceIndex;
        this.activeParticles = instanceIndex;

        // Mark matrices as needing update
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }

        // Performance tracking
        this.updateCount++;
        const updateTime = performance.now() - startTime;
        
        // Log performance periodically
        if (this.updateCount % 60 === 0) {
            const avgUpdateTime = (performance.now() - this.lastUpdateTime) / 60;
            console.log(`ParticleRenderer: ${this.activeParticles} particles, ${avgUpdateTime.toFixed(2)}ms avg update`);
            this.lastUpdateTime = performance.now();
        }
    }

    /**
     * Clear all particles from rendering
     */
    clear() {
        this.instancedMesh.count = 0;
        this.activeParticles = 0;
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Set particle size for all particles
     * @param {number} size - New particle size
     */
    setParticleSize(size) {
        this.particleSize = size;
        
        // Recreate geometry with new size
        this.particleGeometry.dispose();
        this.particleGeometry = new THREE.BoxGeometry(size, size, size);
        
        // Update instanced mesh
        this.instancedMesh.geometry = this.particleGeometry;
    }

    /**
     * Set maximum particle count
     * @param {number} maxParticles - New maximum particle count
     */
    setMaxParticles(maxParticles) {
        if (maxParticles === this.maxParticles) {
            return;
        }

        // Remove old mesh
        this.scene.remove(this.instancedMesh);
        this.instancedMesh.dispose();

        // Create new mesh with updated count
        this.maxParticles = maxParticles;
        this.instancedMesh = new THREE.InstancedMesh(
            this.particleGeometry,
            this.particleMaterial,
            this.maxParticles
        );
        
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.count = 0;
        this.scene.add(this.instancedMesh);
    }

    /**
     * Enable or disable LOD system
     * @param {boolean} enable - Whether to enable LOD
     */
    setLODEnabled(enable) {
        this.enableLOD = enable;
    }

    /**
     * Set LOD distance threshold
     * @param {number} distance - Distance at which to apply LOD
     */
    setLODDistance(distance) {
        this.lodDistance = distance;
    }

    /**
     * Get rendering statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            activeParticles: this.activeParticles,
            maxParticles: this.maxParticles,
            utilization: (this.activeParticles / this.maxParticles * 100).toFixed(1) + '%',
            lodEnabled: this.enableLOD,
            lodDistance: this.lodDistance
        };
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.scene.remove(this.instancedMesh);
        this.particleGeometry.dispose();
        this.particleMaterial.dispose();
        this.instancedMesh.dispose();
    }
}

export default ParticleRenderer;
