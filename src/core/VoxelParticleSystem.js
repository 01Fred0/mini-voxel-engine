/**
 * VoxelParticleSystem.js - Micro-voxel particle system
 * Breaks blocks into 64 smaller voxels (4x4x4) that can fall apart
 * Simulates realistic destruction physics
 */

import { getBlockById } from './Block.js';
import * as THREE from 'three';

/**
 * VoxelParticle - Individual micro-voxel particle
 */
export class VoxelParticle {
  constructor(x, y, z, size, color, blockType) {
    // Position (world coordinates)
    this.position = new THREE.Vector3(x, y, z);
    this.size = size; // Size of micro-voxel (1/4 of block size)
    
    // Visual properties
    this.color = color;
    this.blockType = blockType;
    
    // Physics
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );
    this.rotation = new THREE.Euler(0, 0, 0);
    
    // State
    this.age = 0; // Lifetime in seconds
    this.maxAge = 5; // Max lifetime before despawn
    this.onGround = false;
    this.settled = false; // Has stopped moving
    this.friction = 0.95; // Ground friction
    this.bounciness = 0.3; // Bounce coefficient
    
    // Collision
    this.mass = 0.1; // Mass for physics
  }
  
  /**
   * Update particle physics
   */
  update(deltaTime, gravity = -9.8) {
    if (this.settled) return;
    
    this.age += deltaTime;
    
    // Apply gravity
    this.velocity.y += gravity * deltaTime;
    
    // Apply velocity
    this.position.add(
      this.velocity.clone().multiplyScalar(deltaTime)
    );
    
    // Apply rotation
    this.rotation.x += this.angularVelocity.x * deltaTime;
    this.rotation.y += this.angularVelocity.y * deltaTime;
    this.rotation.z += this.angularVelocity.z * deltaTime;
    
    // Check if particle has stopped moving
    if (this.onGround && 
        this.velocity.length() < 0.01 && 
        this.angularVelocity.length() < 0.01) {
      this.settled = true;
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);
    }
    
    // Despawn old particles
    return this.age < this.maxAge;
  }
  
  /**
   * Handle collision with ground or blocks
   */
  collide(normal) {
    // Reflect velocity
    const dot = this.velocity.dot(normal);
    this.velocity.sub(
      normal.clone().multiplyScalar(dot * (1 + this.bounciness))
    );
    
    // Apply friction
    if (Math.abs(normal.y) > 0.8) { // Ground collision
      this.onGround = true;
      this.velocity.x *= this.friction;
      this.velocity.z *= this.friction;
      this.angularVelocity.multiplyScalar(this.friction);
    }
  }
}

/**
 * VoxelParticleSystem - Manages all micro-voxel particles
 */
export class VoxelParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 10000; // Limit for performance
    
    // Particle mesh pool for performance
    this.particleMeshes = [];
    this.availableMeshes = [];
    
    // Configuration
    this.microVoxelSize = 0.25; // 1/4 of block size
    this.subdivisionsPerBlock = 4; // 4x4x4 = 64 micro-voxels
  }
  
  /**
   * Break a block into 64 micro-voxels
   */
  breakBlock(x, y, z, blockId, impact = null) {
    const block = getBlockById(blockId);
    if (!block) return;
    
    const particles = [];
    const size = this.microVoxelSize;
    const divisions = this.subdivisionsPerBlock;
    
    // Create 4x4x4 = 64 micro-voxels
    for (let dx = 0; dx < divisions; dx++) {
      for (let dy = 0; dy < divisions; dy++) {
        for (let dz = 0; dz < divisions; dz++) {
          const px = x + (dx / divisions) + size / 2;
          const py = y + (dy / divisions) + size / 2;
          const pz = z + (dz / divisions) + size / 2;
          
          // Determine color based on position in block
          let color = block.color;
          if (dy === divisions - 1) color = block.topColor;
          else if (dy === 0) color = block.bottomColor;
          else if (dx === 0 || dx === divisions - 1 || 
                   dz === 0 || dz === divisions - 1) {
            color = block.sideColor;
          }
          
          const particle = new VoxelParticle(
            px, py, pz, size, color, blockId
          );
          
          // Apply explosion force if there was an impact
          if (impact) {
            const dir = new THREE.Vector3(
              px - impact.x,
              py - impact.y,
              pz - impact.z
            ).normalize();
            
            const force = impact.force || 5.0;
            const randomness = 0.5;
            
            particle.velocity.add(
              dir.multiplyScalar(force + (Math.random() - 0.5) * randomness)
            );
          } else {
            // Random small velocity
            particle.velocity.set(
              (Math.random() - 0.5) * 2,
              Math.random() * 2,
              (Math.random() - 0.5) * 2
            );
          }
          
          particles.push(particle);
        }
      }
    }
    
    this.addParticles(particles);
    return particles;
  }
  
  /**
   * Crumble block gradually (e.g., when walked on)
   */
  crumbleBlock(x, y, z, blockId, amount = 0.2) {
    const block = getBlockById(blockId);
    if (!block) return;
    
    // Calculate how many particles to spawn
    const totalParticles = 64;
    const particlesToSpawn = Math.floor(totalParticles * amount);
    
    const particles = [];
    const size = this.microVoxelSize;
    const divisions = this.subdivisionsPerBlock;
    
    // Spawn particles from top layer first
    for (let i = 0; i < particlesToSpawn; i++) {
      const dx = Math.floor(Math.random() * divisions);
      const dy = divisions - 1; // Top layer
      const dz = Math.floor(Math.random() * divisions);
      
      const px = x + (dx / divisions) + size / 2;
      const py = y + (dy / divisions) + size / 2;
      const pz = z + (dz / divisions) + size / 2;
      
      const particle = new VoxelParticle(
        px, py, pz, size, block.topColor, blockId
      );
      
      // Small random velocity
      particle.velocity.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      
      particles.push(particle);
    }
    
    this.addParticles(particles);
    return particles;
  }
  
  /**
   * Add particles to the system
   */
  addParticles(particles) {
    // Limit total particles for performance
    if (this.particles.length + particles.length > this.maxParticles) {
      const excess = (this.particles.length + particles.length) - this.maxParticles;
      this.particles.splice(0, excess);
    }
    
    this.particles.push(...particles);
    
    // Create meshes for new particles
    for (const particle of particles) {
      this.createParticleMesh(particle);
    }
  }
  
  /**
   * Create a mesh for a particle
   */
  createParticleMesh(particle) {
    let mesh;
    
    // Reuse mesh from pool if available
    if (this.availableMeshes.length > 0) {
      mesh = this.availableMeshes.pop();
      mesh.material.color.setHex(particle.color);
      mesh.visible = true;
    } else {
      // Create new mesh
      const geometry = new THREE.BoxGeometry(
        particle.size, particle.size, particle.size
      );
      const material = new THREE.MeshLambertMaterial({
        color: particle.color
      });
      mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
    }
    
    mesh.position.copy(particle.position);
    mesh.rotation.copy(particle.rotation);
    particle.mesh = mesh;
    
    this.particleMeshes.push(mesh);
  }
  
  /**
   * Update all particles
   */
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const alive = particle.update(deltaTime);
      
      if (!alive) {
        // Remove dead particle
        if (particle.mesh) {
          particle.mesh.visible = false;
          this.availableMeshes.push(particle.mesh);
        }
        this.particles.splice(i, 1);
      } else if (particle.mesh) {
        // Update mesh
        particle.mesh.position.copy(particle.position);
        particle.mesh.rotation.copy(particle.rotation);
      }
    }
  }
  
  /**
   * Clear all particles
   */
  clear() {
    for (const particle of this.particles) {
      if (particle.mesh) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
      }
    }
    
    this.particles = [];
    this.particleMeshes = [];
    this.availableMeshes = [];
  }
  
  /**
   * Get particle count
   */
  getParticleCount() {
    return this.particles.length;
  }
}
