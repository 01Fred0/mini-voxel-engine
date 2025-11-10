import * as THREE from 'three';
import { BlockTypes } from '../config.js';

export class InputHandler {
  constructor(camera, chunkManager, renderer) {
    this.camera = camera;
    this.chunkManager = chunkManager;
    this.renderer = renderer;
    
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 10; // Max reach distance
    
    this.selectedBlockType = BlockType.STONE;
    
    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    
    // Setup event listeners
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('keydown', this.onKeyDown);
  }
  
  onMouseDown(event) {
    // Only handle when pointer is locked
    if (document.pointerLockElement !== this.renderer.canvas) return;
    
    if (event.button === 0) {
      // Left click - break block
      this.breakBlock();
    } else if (event.button === 2) {
      // Right click - place block
      this.placeBlock();
      event.preventDefault();
    }
  }
  
  onKeyDown(event) {
    // Number keys to select block type
    if (event.code >= 'Digit1' && event.code <= 'Digit7') {
      const digit = parseInt(event.code.charAt(5));
      this.selectedBlockType = digit;
      console.log('Selected block type:', this.selectedBlockType);
    }
  }
  
  // Raycast to find block player is looking at
  raycastBlock() {
    // Set ray from camera
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.raycaster.set(this.camera.position, direction);
    
    // Check intersection with loaded chunks
    const intersections = [];
    
    // We need to check all chunk meshes
    this.renderer.chunkMeshes.forEach((mesh) => {
      const hits = this.raycaster.intersectObject(mesh);
      if (hits.length > 0) {
        intersections.push(...hits);
      }
    });
    
    if (intersections.length === 0) return null;
    
    // Sort by distance and get closest
    intersections.sort((a, b) => a.distance - b.distance);
    const hit = intersections[0];
    
    // Get block position
    const hitPoint = hit.point;
    const normal = hit.face.normal;
    
    // Calculate block coordinates
    // Offset slightly in the direction of the normal to get the hit block
    const epsilon = 0.001;
    const blockPos = hitPoint.clone().sub(normal.clone().multiplyScalar(epsilon));
    
    const blockX = Math.floor(blockPos.x);
    const blockY = Math.floor(blockPos.y);
    const blockZ = Math.floor(blockPos.z);
    
    // Calculate placement position (adjacent block)
    const placePos = hitPoint.clone().add(normal.clone().multiplyScalar(epsilon));
    const placeX = Math.floor(placePos.x);
    const placeY = Math.floor(placePos.y);
    const placeZ = Math.floor(placePos.z);
    
    return {
      breakPosition: { x: blockX, y: blockY, z: blockZ },
      placePosition: { x: placeX, y: placeY, z: placeZ },
      distance: hit.distance
    };
  }
  
  breakBlock() {
    const hit = this.raycastBlock();
    if (!hit) return;
    
    const { x, y, z } = hit.breakPosition;
    
    // Validate position
    if (y < 0 || y >= 128) return;
    
    // Get chunk coordinates
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    
    // Get chunk
    const chunk = this.chunkManager.getChunk(chunkX, chunkZ);
    if (!chunk) return;
    
    // Get local coordinates
    const localX = ((x % 16) + 16) % 16;
    const localZ = ((z % 16) + 16) % 16;
    
    // Check if block exists
    const currentBlock = chunk.getBlock(localX, y, localZ);
    if (currentBlock === BlockType.AIR) return;
    
    // Break block
    chunk.setBlock(localX, y, localZ, BlockType.AIR);
    
    // Update chunk mesh
    this.renderer.updateChunkMesh(chunk);
    
    console.log(`Broke block at (${x}, ${y}, ${z})`);
  }
  
  placeBlock() {
    const hit = this.raycastBlock();
    if (!hit) return;
    
    const { x, y, z } = hit.placePosition;
    
    // Validate position
    if (y < 0 || y >= 128) return;
    
    // Check if placement position collides with player
    const playerPos = this.camera.position;
    const dx = Math.abs(playerPos.x - x - 0.5);
    const dy = Math.abs(playerPos.y - y - 0.5);
    const dz = Math.abs(playerPos.z - z - 0.5);
    
    // Prevent placing block inside player (simple collision check)
    if (dx < 0.8 && dy < 1.8 && dz < 0.8) {
      console.log('Cannot place block inside player');
      return;
    }
    
    // Get chunk coordinates
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    
    // Get chunk
    const chunk = this.chunkManager.getChunk(chunkX, chunkZ);
    if (!chunk) return;
    
    // Get local coordinates
    const localX = ((x % 16) + 16) % 16;
    const localZ = ((z % 16) + 16) % 16;
    
    // Check if position is already occupied
    const currentBlock = chunk.getBlock(localX, y, localZ);
    if (currentBlock !== BlockType.AIR) return;
    
    // Place block
    chunk.setBlock(localX, y, localZ, this.selectedBlockType);
    
    // Update chunk mesh
    this.renderer.updateChunkMesh(chunk);
    
    console.log(`Placed block type ${this.selectedBlockType} at (${x}, ${y}, ${z})`);
  }
  
  dispose() {
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('keydown', this.onKeyDown);
  }
}
