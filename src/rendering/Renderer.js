import * as THREE from 'three';
import { MeshBuilder } from './MeshBuilder.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB); // Sky blue
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      window.innerWidth / window.innerHeight, // Aspect
      0.1, // Near
      500 // Far
    );
    this.camera.position.set(0, 80, 0);
    
    // Lighting setup
    this.setupLighting();
    
    // Mesh builder for chunk meshes
    this.meshBuilder = new MeshBuilder();
    
    // Track chunk meshes
    this.chunkMeshes = new Map(); // Map<chunkKey, THREE.Mesh>
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    
    // Configure shadow map
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    
    this.scene.add(directionalLight);
    
    // Hemisphere light for sky/ground color gradient
    const hemisphereLight = new THREE.HemisphereLight(
      0x87CEEB, // Sky color
      0x362312, // Ground color
      0.3
    );
    this.scene.add(hemisphereLight);
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Update or create mesh for a chunk
  updateChunkMesh(chunk) {
    const chunkKey = `${chunk.x},${chunk.z}`;
    
    // Remove old mesh if exists
    if (this.chunkMeshes.has(chunkKey)) {
      const oldMesh = this.chunkMeshes.get(chunkKey);
      this.scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      oldMesh.material.dispose();
      this.chunkMeshes.delete(chunkKey);
    }
    
    // Build new mesh
    const geometry = this.meshBuilder.buildChunkMesh(chunk);
    
    // Only create mesh if there's geometry
    if (geometry.attributes.position.count === 0) {
      geometry.dispose();
      return;
    }
    
    // Create material with vertex colors
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Position mesh in world
    mesh.position.set(
      chunk.x * chunk.size,
      0,
      chunk.z * chunk.size
    );
    
    // Add to scene and track
    this.scene.add(mesh);
    this.chunkMeshes.set(chunkKey, mesh);
  }
  
  // Remove chunk mesh
  removeChunkMesh(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (this.chunkMeshes.has(chunkKey)) {
      const mesh = this.chunkMeshes.get(chunkKey);
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.chunkMeshes.delete(chunkKey);
    }
  }
  
  // Get camera position
  getCameraPosition() {
    return this.camera.position.clone();
  }
  
  // Set camera position
  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }
  
  // Get camera direction
  getCameraDirection() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }
  
  // Render frame
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  // Cleanup
  dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose all chunk meshes
    this.chunkMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.chunkMeshes.clear();
    
    this.renderer.dispose();
  }
}
