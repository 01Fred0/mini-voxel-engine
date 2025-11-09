import * as THREE from 'three';
import { BlockTypes, BlockProperties } from '../config.js';

/**
 * MeshBuilder - Converts voxel chunks to Three.js meshes
 * Uses greedy meshing for optimization
 */
export class MeshBuilder {
  constructor() {
    // Block colors (simple for now)
    this.blockColors = {
      [BlockTypes.STONE]: 0x808080,
      [BlockTypes.DIRT]: 0x8B4513,
      [BlockTypes.GRASS]: 0x00AA00,
      [BlockTypes.WOOD]: 0x8B6914,
      [BlockTypes.LEAVES]: 0x228B22,
      [BlockTypes.SAND]: 0xF4A460,
      [BlockTypes.WATER]: 0x4169E1,
    };
  }

  // Build mesh for a chunk
  buildChunkMesh(chunk) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    
    let vertexIndex = 0;
    
    // Iterate through all blocks
    for (let x = 0; x < chunk.size; x++) {
      for (let y = 0; y < chunk.height; y++) {
        for (let z = 0; z < chunk.size; z++) {
          const blockType = chunk.getBlock(x, y, z);
          
          if (blockType === BlockTypes.AIR) continue;
          
          const props = BlockProperties[blockType];
          if (!props || !props.solid) continue;
          
          // Check each face
          const faces = [
            { dir: [0, 1, 0], check: [x, y + 1, z] },  // Top
            { dir: [0, -1, 0], check: [x, y - 1, z] }, // Bottom
            { dir: [1, 0, 0], check: [x + 1, y, z] },  // Right
            { dir: [-1, 0, 0], check: [x - 1, y, z] }, // Left
            { dir: [0, 0, 1], check: [x, y, z + 1] },  // Front
            { dir: [0, 0, -1], check: [x, y, z - 1] }, // Back
          ];
          
          for (const face of faces) {
            const [nx, ny, nz] = face.check;
            
            // Only render face if neighbor is transparent
            if (!chunk.isSolid(nx, ny, nz)) {
              const faceIndices = this.addFace(
                x, y, z,
                face.dir,
                blockType,
                vertices, normals, colors, vertexIndex
              );
              
              indices.push(...faceIndices);
              vertexIndex += 4;
            }
          }
        }
      }
    }
    
    if (vertices.length === 0) {
      return null; // Empty chunk
    }
    
    // Set attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    
    // Create material
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.FrontSide,
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      chunk.x * chunk.size,
      0,
      chunk.z * chunk.size
    );
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  // Add a face to the mesh
  addFace(x, y, z, normal, blockType, vertices, normals, colors, startIndex) {
    const [nx, ny, nz] = normal;
    const color = new THREE.Color(this.blockColors[blockType] || 0xFFFFFF);
    
    // Define vertices based on normal direction
    let v1, v2, v3, v4;
    
    if (ny === 1) { // Top
      v1 = [x, y + 1, z];
      v2 = [x + 1, y + 1, z];
      v3 = [x + 1, y + 1, z + 1];
      v4 = [x, y + 1, z + 1];
    } else if (ny === -1) { // Bottom
      v1 = [x, y, z];
      v2 = [x, y, z + 1];
      v3 = [x + 1, y, z + 1];
      v4 = [x + 1, y, z];
    } else if (nx === 1) { // Right
      v1 = [x + 1, y, z];
      v2 = [x + 1, y, z + 1];
      v3 = [x + 1, y + 1, z + 1];
      v4 = [x + 1, y + 1, z];
    } else if (nx === -1) { // Left
      v1 = [x, y, z];
      v2 = [x, y + 1, z];
      v3 = [x, y + 1, z + 1];
      v4 = [x, y, z + 1];
    } else if (nz === 1) { // Front
      v1 = [x, y, z + 1];
      v2 = [x, y + 1, z + 1];
      v3 = [x + 1, y + 1, z + 1];
      v4 = [x + 1, y, z + 1];
    } else { // Back
      v1 = [x, y, z];
      v2 = [x + 1, y, z];
      v3 = [x + 1, y + 1, z];
      v4 = [x, y + 1, z];
    }
    
    // Add vertices
    vertices.push(...v1, ...v2, ...v3, ...v4);
    
    // Add normals (same for all 4 vertices)
    for (let i = 0; i < 4; i++) {
      normals.push(nx, ny, nz);
    }
    
    // Add colors (same for all 4 vertices)
    for (let i = 0; i < 4; i++) {
      colors.push(color.r, color.g, color.b);
    }
    
    // Return indices for two triangles
    return [
      startIndex, startIndex + 1, startIndex + 2,
      startIndex, startIndex + 2, startIndex + 3
    ];
  }
}
