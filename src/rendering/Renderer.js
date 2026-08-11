import * as THREE from 'three';
import { MeshBuilder } from './MeshBuilder.js';
import { WorldConfig, QualityPresets } from '../config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const preset = QualityPresets[WorldConfig.quality] || QualityPresets.MEDIUM;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB); // Sky blue
    this.renderer.shadowMap.enabled = preset.shadows;
    if (preset.shadows) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, preset.fogFar);
    
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
    
    // Create shared chunk material
    this.sharedChunkMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.FrontSide,
      flatShading: true
    });

    // Track chunk meshes
    this.chunkMeshes = new Map(); // Map<chunkKey, THREE.Mesh>
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  setupLighting() {
    const preset = QualityPresets[WorldConfig.quality] || QualityPresets.MEDIUM;

    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    
    if (preset.shadows) {
      directionalLight.castShadow = true;

      // Configure shadow map
      directionalLight.shadow.mapSize.width = preset.shadowMapSize;
      directionalLight.shadow.mapSize.height = preset.shadowMapSize;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -100;
      directionalLight.shadow.camera.right = 100;
      directionalLight.shadow.camera.top = 100;
      directionalLight.shadow.camera.bottom = -100;
    }
    
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
  
  // Update or create meshes for sections of a chunk that need rebuild
  updateChunkMesh(chunk) {
    for (let i = 0; i < chunk.sections.length; i++) {
      const section = chunk.sections[i];
      if (section.needsRebuild) {
        if (section.isSectionFullyBuried()) {
          // Remove old mesh if exists since it is now fully buried
          const sectionKey = `${chunk.x},${chunk.z},${i}`;
          if (this.chunkMeshes.has(sectionKey)) {
            const oldMesh = this.chunkMeshes.get(sectionKey);
            this.scene.remove(oldMesh);
            if (oldMesh.geometry) oldMesh.geometry.dispose();
            this.chunkMeshes.delete(sectionKey);
          }
          section.mesh = null;
          section.needsRebuild = false;
          continue;
        }

        this.updateChunkSectionMesh(chunk, i);
        section.needsRebuild = false;
      }
    }
  }

  // Update or create mesh for a single chunk section
  updateChunkSectionMesh(chunk, sectionIndex) {
    const sectionKey = `${chunk.x},${chunk.z},${sectionIndex}`;
    
    // Remove old mesh if exists
    if (this.chunkMeshes.has(sectionKey)) {
      const oldMesh = this.chunkMeshes.get(sectionKey);
      this.scene.remove(oldMesh);
      if (oldMesh.geometry) oldMesh.geometry.dispose();
      // DO NOT dispose oldMesh.material because it is shared!
      this.chunkMeshes.delete(sectionKey);
    }
    
    // Build new mesh using MeshBuilder with shared material
    const mesh = this.meshBuilder.buildChunkSectionMesh(chunk, sectionIndex, this.sharedChunkMaterial);
    
    if (!mesh) {
      chunk.sections[sectionIndex].mesh = null;
      return;
    }
    
    mesh.userData.section = chunk.sections[sectionIndex];

    // Add to scene, track, and set reference on section
    this.scene.add(mesh);
    this.chunkMeshes.set(sectionKey, mesh);
    chunk.sections[sectionIndex].mesh = mesh;
  }
  
  // Remove chunk meshes for all sections
  removeChunkMesh(chunkX, chunkZ) {
    const chunkKeyPrefix = `${chunkX},${chunkZ},`;
    
    for (const key of Array.from(this.chunkMeshes.keys())) {
      if (key.startsWith(chunkKeyPrefix)) {
        const mesh = this.chunkMeshes.get(key);
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        // DO NOT dispose mesh.material because it is shared!
        this.chunkMeshes.delete(key);
      }
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
  
  updateFrustum(camera) {
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum = new THREE.Frustum();
    this.frustum.setFromProjectionMatrix(projScreenMatrix);
  }

  isSectionVisible(section) {
    if (!section.threeBox3) {
      if (!section.boundingBox) return true;
      section.threeBox3 = new THREE.Box3(
        new THREE.Vector3(section.boundingBox.min.x, section.boundingBox.min.y, section.boundingBox.min.z),
        new THREE.Vector3(section.boundingBox.max.x, section.boundingBox.max.y, section.boundingBox.max.z)
      );
    }
    return this.frustum.intersectsBox(section.threeBox3);
  }

  // Render frame
  render() {
    this.updateFrustum(this.camera);

    // Filter chunk section meshes using frustum culling
    for (const [key, mesh] of this.chunkMeshes.entries()) {
      const section = mesh.userData.section;
      if (section) {
        mesh.visible = this.isSectionVisible(section);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
  
  // Cleanup
  dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose all chunk meshes
    this.chunkMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      // DO NOT dispose mesh.material because it is shared!
    });
    this.chunkMeshes.clear();
    
    // Dispose shared material
    if (this.sharedChunkMaterial) {
      this.sharedChunkMaterial.dispose();
    }

    this.renderer.dispose();
  }
}
