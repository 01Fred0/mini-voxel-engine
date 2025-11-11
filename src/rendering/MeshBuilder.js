import * as THREE from 'three';
import { BlockTypes, Blocks, getBlockById } from '../config.js';

/**
 * MeshBuilder - Converts voxel chunks to Three.js meshes
 * Uses greedy meshing for optimization
 * Integrates with Block system for dynamic colors and properties
 */
export class MeshBuilder {
    constructor() {
        // No longer need hardcoded colors - will use Block.color properties
    }

    /**
     * Build mesh for a chunk
     * @param {Chunk} chunk - The chunk to build a mesh for
     * @returns {THREE.Mesh|null} The generated mesh or null if empty
     */
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
                    
                    const block = getBlockById(blockType);
                    if (!block || !block.isSolid()) continue;
                    
                    // Check each face
                    const faces = [
                        { dir: [0, 1, 0], check: [x, y + 1, z], face: 'top' },    // Top
                        { dir: [0, -1, 0], check: [x, y - 1, z], face: 'bottom' }, // Bottom
                        { dir: [1, 0, 0], check: [x + 1, y, z], face: 'side' },    // Right
                        { dir: [-1, 0, 0], check: [x - 1, y, z], face: 'side' },   // Left
                        { dir: [0, 0, 1], check: [x, y, z + 1], face: 'side' },    // Front
                        { dir: [0, 0, -1], check: [x, y, z - 1], face: 'side' },   // Back
                    ];
                    
                    for (const face of faces) {
                        const [nx, ny, nz] = face.check;
                        
                        // Only render face if neighbor is transparent
                        if (!chunk.isSolid(nx, ny, nz)) {
                            const faceIndices = this.addFace(
                                x, y, z,
                                face.dir,
                                block,
                                face.face,
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
        
        return geometry;
    }

    /**
     * Add a face to the mesh with proper color based on face type
     * @param {number} x - Block X position
     * @param {number} y - Block Y position
     * @param {number} z - Block Z position
     * @param {Array} normal - Face normal direction
     * @param {Block} block - Block instance with color properties
     * @param {string} faceType - Face type ('top', 'bottom', 'side')
     * @param {Array} vertices - Vertices array
     * @param {Array} normals - Normals array
     * @param {Array} colors - Colors array
     * @param {number} startIndex - Starting vertex index
     * @returns {Array} Face indices
     */
    addFace(x, y, z, normal, block, faceType, vertices, normals, colors, startIndex) {
        const [nx, ny, nz] = normal;
        
        // Get color based on face type from Block color properties
        let colorHex;
        if (faceType === 'top') {
            colorHex = block.topColor;
        } else if (faceType === 'bottom') {
            colorHex = block.bottomColor;
        } else {
            colorHex = block.sideColor;
        }
        
        const color = new THREE.Color(colorHex);
        
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
