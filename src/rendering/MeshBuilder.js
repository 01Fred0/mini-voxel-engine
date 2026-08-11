import * as THREE from 'three';
import { BlockTypes, getBlockById } from '../config.js';

/**
 * MeshBuilder - Converts voxel chunks and sections to Three.js meshes
 * Uses true greedy meshing on 2D slices along each of the 3 axes
 * Integrates with Block system for dynamic colors and properties
 */
export class MeshBuilder {
  constructor() {
    // Cache THREE.Color objects to avoid allocation on every face of every rebuild
    this._colorCache = new Map();
  }

  /**
   * Build mesh for a single chunk section
   * @param {Chunk} chunk - The parent chunk
   * @param {number} sectionIndex - The index of the section
   * @param {THREE.Material} material - The shared chunk material
   * @returns {THREE.Mesh|null} The generated section mesh or null if empty
   */
  buildChunkSectionMesh(chunk, sectionIndex, material) {
    const section = chunk.sections[sectionIndex];
    const yOffset = section.yOffset;
    const sectionHeight = section.sectionHeight;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];

    let vertexIndex = 0;

    // We sweep all 6 face directions:
    // 0: +Y (Top), 1: -Y (Bottom), 2: +X (Right), 3: -X (Left), 4: +Z (Front), 5: -Z (Back)
    const directions = [
      { normal: [0, 1, 0], faceType: 'top' },    // +Y
      { normal: [0, -1, 0], faceType: 'bottom' }, // -Y
      { normal: [1, 0, 0], faceType: 'side' },    // +X
      { normal: [-1, 0, 0], faceType: 'side' },   // -X
      { normal: [0, 0, 1], faceType: 'side' },    // +Z
      { normal: [0, 0, -1], faceType: 'side' }    // -Z
    ];

    for (let d = 0; d < 6; d++) {
      const { normal, faceType } = directions[d];
      const [nx, ny, nz] = normal;

      // Y-axis slicing
      if (ny !== 0) {
        const minC = yOffset;
        const maxC = yOffset + sectionHeight;
        const maxU = chunk.size;
        const maxV = chunk.size;

        for (let C = minC; C < maxC; C++) {
          // Build 2D grid for this slice
          const grid = Array(maxU).fill(null).map(() => Array(maxV).fill(null));
          let hasFaces = false;

          for (let u = 0; u < maxU; u++) {
            for (let v = 0; v < maxV; v++) {
              const x = u;
              const y = C;
              const z = v;

              const blockType = chunk.getBlock(x, y, z);
              if (blockType !== BlockTypes.AIR) {
                const block = getBlockById(blockType);
                if (block && block.isSolid()) {
                  // Check if neighbor in normal direction is transparent/air
                  const neighborSolid = chunk.isSolid(x + nx, y + ny, z + nz);
                  if (!neighborSolid) {
                    grid[u][v] = blockType;
                    hasFaces = true;
                  }
                }
              }
            }
          }

          if (!hasFaces) continue;

          // Perform 2D greedy meshing on the slice grid
          const visited = Array(maxU).fill(null).map(() => Array(maxV).fill(false));
          for (let v = 0; v < maxV; v++) {
            for (let u = 0; u < maxU; u++) {
              const type = grid[u][v];
              if (type !== null && !visited[u][v]) {
                // Find maximum width along U
                let w = 1;
                while (u + w < maxU && grid[u + w][v] === type && !visited[u + w][v]) {
                  w++;
                }

                // Find maximum height along V that matches this width run
                let h = 1;
                let canExpand = true;
                while (v + h < maxV) {
                  for (let k = 0; k < w; k++) {
                    if (grid[u + k][v + h] !== type || visited[u + k][v + h]) {
                      canExpand = false;
                      break;
                    }
                  }
                  if (!canExpand) break;
                  h++;
                }

                // Mark the combined rectangle as visited
                for (let dv = 0; dv < h; dv++) {
                  for (let du = 0; du < w; du++) {
                    visited[u + du][v + dv] = true;
                  }
                }

                const x = u;
                const y = C;
                const z = v;
                const block = getBlockById(type);

                let v1, v2, v3, v4;
                if (ny === 1) { // Top Face
                  v1 = [x, y + 1, z];
                  v2 = [x + w, y + 1, z];
                  v3 = [x + w, y + 1, z + h];
                  v4 = [x, y + 1, z + h];
                } else { // Bottom Face
                  v1 = [x, y, z];
                  v2 = [x, y, z + h];
                  v3 = [x + w, y, z + h];
                  v4 = [x + w, y, z];
                }

                const faceIndices = this.addQuad(
                  chunk, v1, v2, v3, v4,
                  normal, block, faceType,
                  vertices, normals, colors, vertexIndex
                );
                indices.push(...faceIndices);
                vertexIndex += 4;
              }
            }
          }
        }
      }
      // X-axis slicing
      else if (nx !== 0) {
        const maxC = chunk.size;
        const minU = yOffset;
        const maxU = yOffset + sectionHeight;
        const maxV = chunk.size;

        for (let C = 0; C < maxC; C++) {
          const grid = Array(sectionHeight).fill(null).map(() => Array(maxV).fill(null));
          let hasFaces = false;

          for (let u = 0; u < sectionHeight; u++) {
            for (let v = 0; v < maxV; v++) {
              const x = C;
              const y = minU + u;
              const z = v;

              const blockType = chunk.getBlock(x, y, z);
              if (blockType !== BlockTypes.AIR) {
                const block = getBlockById(blockType);
                if (block && block.isSolid()) {
                  const neighborSolid = chunk.isSolid(x + nx, y + ny, z + nz);
                  if (!neighborSolid) {
                    grid[u][v] = blockType;
                    hasFaces = true;
                  }
                }
              }
            }
          }

          if (!hasFaces) continue;

          const visited = Array(sectionHeight).fill(null).map(() => Array(maxV).fill(false));
          for (let v = 0; v < maxV; v++) {
            for (let u = 0; u < sectionHeight; u++) {
              const type = grid[u][v];
              if (type !== null && !visited[u][v]) {
                let w = 1;
                while (u + w < sectionHeight && grid[u + w][v] === type && !visited[u + w][v]) {
                  w++;
                }

                let h = 1;
                let canExpand = true;
                while (v + h < maxV) {
                  for (let k = 0; k < w; k++) {
                    if (grid[u + k][v + h] !== type || visited[u + k][v + h]) {
                      canExpand = false;
                      break;
                    }
                  }
                  if (!canExpand) break;
                  h++;
                }

                for (let dv = 0; dv < h; dv++) {
                  for (let du = 0; du < w; du++) {
                    visited[u + du][v + dv] = true;
                  }
                }

                const x = C;
                const y = minU + u;
                const z = v;
                const block = getBlockById(type);

                let v1, v2, v3, v4;
                if (nx === 1) { // Right Face
                  v1 = [x + 1, y, z];
                  v2 = [x + 1, y, z + h];
                  v3 = [x + 1, y + w, z + h];
                  v4 = [x + 1, y + w, z];
                } else { // Left Face
                  v1 = [x, y, z];
                  v2 = [x, y + w, z];
                  v3 = [x, y + w, z + h];
                  v4 = [x, y, z + h];
                }

                const faceIndices = this.addQuad(
                  chunk, v1, v2, v3, v4,
                  normal, block, faceType,
                  vertices, normals, colors, vertexIndex
                );
                indices.push(...faceIndices);
                vertexIndex += 4;
              }
            }
          }
        }
      }
      // Z-axis slicing
      else if (nz !== 0) {
        const maxC = chunk.size;
        const maxU = chunk.size;
        const minV = yOffset;
        const maxV = yOffset + sectionHeight;

        for (let C = 0; C < maxC; C++) {
          const grid = Array(maxU).fill(null).map(() => Array(sectionHeight).fill(null));
          let hasFaces = false;

          for (let u = 0; u < maxU; u++) {
            for (let v = 0; v < sectionHeight; v++) {
              const x = u;
              const y = minV + v;
              const z = C;

              const blockType = chunk.getBlock(x, y, z);
              if (blockType !== BlockTypes.AIR) {
                const block = getBlockById(blockType);
                if (block && block.isSolid()) {
                  const neighborSolid = chunk.isSolid(x + nx, y + ny, z + nz);
                  if (!neighborSolid) {
                    grid[u][v] = blockType;
                    hasFaces = true;
                  }
                }
              }
            }
          }

          if (!hasFaces) continue;

          const visited = Array(maxU).fill(null).map(() => Array(sectionHeight).fill(false));
          for (let v = 0; v < sectionHeight; v++) {
            for (let u = 0; u < maxU; u++) {
              const type = grid[u][v];
              if (type !== null && !visited[u][v]) {
                let w = 1;
                while (u + w < maxU && grid[u + w][v] === type && !visited[u + w][v]) {
                  w++;
                }

                let h = 1;
                let canExpand = true;
                while (v + h < sectionHeight) {
                  for (let k = 0; k < w; k++) {
                    if (grid[u + k][v + h] !== type || visited[u + k][v + h]) {
                      canExpand = false;
                      break;
                    }
                  }
                  if (!canExpand) break;
                  h++;
                }

                for (let dv = 0; dv < h; dv++) {
                  for (let du = 0; du < w; du++) {
                    visited[u + du][v + dv] = true;
                  }
                }

                const x = u;
                const y = minV + v;
                const z = C;
                const block = getBlockById(type);

                let v1, v2, v3, v4;
                if (nz === 1) { // Front Face
                  v1 = [x, y, z + 1];
                  v2 = [x, y + h, z + 1];
                  v3 = [x + w, y + h, z + 1];
                  v4 = [x + w, y, z + 1];
                } else { // Back Face
                  v1 = [x, y, z];
                  v2 = [x + w, y, z];
                  v3 = [x + w, y + h, z];
                  v4 = [x, y + h, z];
                }

                const faceIndices = this.addQuad(
                  chunk, v1, v2, v3, v4,
                  normal, block, faceType,
                  vertices, normals, colors, vertexIndex
                );
                indices.push(...faceIndices);
                vertexIndex += 4;
              }
            }
          }
        }
      }
    }

    if (vertices.length === 0) {
      geometry.dispose();
      return null; // Empty section mesh
    }

    // Set geometry attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    // Create mesh using the shared material
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

  /**
   * Build mesh for an entire chunk (delegates to sections for backward compatibility)
   * @param {Chunk} chunk - The chunk to build a mesh for
   * @param {THREE.Material} material - The shared chunk material
   * @returns {THREE.Mesh|null} The generated mesh or null if empty
   */
  buildChunkMesh(chunk, material) {
    for (let i = 0; i < chunk.sections.length; i++) {
      const mesh = this.buildChunkSectionMesh(chunk, i, material);
      if (mesh) return mesh;
    }
    return null;
  }

  /**
   * Get smooth lighting value at vertex by averaging surrounding blocks
   */
  getSmoothLight(chunk, vx, vy, vz, normal) {
    const [nx, ny, nz] = normal;
    let sumLight = 0;
    let count = 0;

    // Define the 4 blocks surrounding the vertex corner on the exposed side of the face
    let blocks = [];
    if (ny !== 0) {
      const ey = ny === 1 ? vy : vy - 1;
      blocks = [
        [vx - 1, ey, vz - 1],
        [vx, ey, vz - 1],
        [vx - 1, ey, vz],
        [vx, ey, vz]
      ];
    } else if (nx !== 0) {
      const ex = nx === 1 ? vx : vx - 1;
      blocks = [
        [ex, vy - 1, vz - 1],
        [ex, vy, vz - 1],
        [ex, vy - 1, vz],
        [ex, vy, vz]
      ];
    } else {
      const ez = nz === 1 ? vz : vz - 1;
      blocks = [
        [vx - 1, vy - 1, ez],
        [vx, vy - 1, ez],
        [vx - 1, vy, ez],
        [vx, vy, ez]
      ];
    }

    for (const [bx, by, bz] of blocks) {
      // Check if coordinate is solid
      const isSolid = chunk.isSolid(bx, by, bz);
      if (!isSolid) {
        let lightVal = 15; // default to maximum light
        if (chunk.chunkManager && chunk.chunkManager.lightingSystem) {
          const light = chunk.chunkManager.lightingSystem.getLightAt(chunk, bx, by, bz);
          lightVal = Math.max(light.skylight, light.blocklight);
        }
        sumLight += lightVal;
        count++;
      }
    }

    if (count === 0) return 0;
    return sumLight / count;
  }

  /**
   * Calculate ambient occlusion value at a vertex corner based on surrounding block solidity
   */
  getVertexAO(chunk, vx, vy, vz, normal, vIdx) {
    const [nx, ny, nz] = normal;
    let s1 = 0, s2 = 0, c = 0;

    if (ny === 1) { // Top
      const dx = vIdx === 0 || vIdx === 3 ? -1 : 1;
      const dz = vIdx === 0 || vIdx === 1 ? -1 : 1;
      s1 = chunk.isSolid(vx + dx, vy, vz) ? 1 : 0;
      s2 = chunk.isSolid(vx, vy, vz + dz) ? 1 : 0;
      c = chunk.isSolid(vx + dx, vy, vz + dz) ? 1 : 0;
    } else if (ny === -1) { // Bottom
      const dxArr = [-1, -1, 1, 1];
      const dzArr = [-1, 1, 1, -1];
      const dx = dxArr[vIdx];
      const dz = dzArr[vIdx];
      s1 = chunk.isSolid(vx + dx, vy - 1, vz) ? 1 : 0;
      s2 = chunk.isSolid(vx, vy - 1, vz + dz) ? 1 : 0;
      c = chunk.isSolid(vx + dx, vy - 1, vz + dz) ? 1 : 0;
    } else if (nx === 1) { // Right
      const dyArr = [-1, -1, 1, 1];
      const dzArr = [-1, 1, 1, -1];
      const dy = dyArr[vIdx];
      const dz = dzArr[vIdx];
      s1 = chunk.isSolid(vx, vy + dy, vz) ? 1 : 0;
      s2 = chunk.isSolid(vx, vy, vz + dz) ? 1 : 0;
      c = chunk.isSolid(vx, vy + dy, vz + dz) ? 1 : 0;
    } else if (nx === -1) { // Left
      const dyArr = [-1, 1, 1, -1];
      const dzArr = [-1, -1, 1, 1];
      const dy = dyArr[vIdx];
      const dz = dzArr[vIdx];
      s1 = chunk.isSolid(vx - 1, vy + dy, vz) ? 1 : 0;
      s2 = chunk.isSolid(vx - 1, vy, vz + dz) ? 1 : 0;
      c = chunk.isSolid(vx - 1, vy + dy, vz + dz) ? 1 : 0;
    } else if (nz === 1) { // Front
      const dxArr = [-1, -1, 1, 1];
      const dyArr = [-1, 1, 1, -1];
      const dx = dxArr[vIdx];
      const dy = dyArr[vIdx];
      s1 = chunk.isSolid(vx + dx, vy, vz) ? 1 : 0;
      s2 = chunk.isSolid(vx, vy + dy, vz) ? 1 : 0;
      c = chunk.isSolid(vx + dx, vy + dy, vz) ? 1 : 0;
    } else if (nz === -1) { // Back
      const dxArr = [-1, 1, 1, -1];
      const dyArr = [-1, -1, 1, 1];
      const dx = dxArr[vIdx];
      const dy = dyArr[vIdx];
      s1 = chunk.isSolid(vx + dx, vy, vz - 1) ? 1 : 0;
      s2 = chunk.isSolid(vx, vy + dy, vz - 1) ? 1 : 0;
      c = chunk.isSolid(vx + dx, vy + dy, vz - 1) ? 1 : 0;
    }

    if (s1 && s2) return 0; // completely occluded
    return 3 - (s1 + s2 + c); // 0 to 3
  }

  /**
   * Add a quad with vertex positions and colors to vectors
   */
  addQuad(chunk, v1, v2, v3, v4, normal, block, faceType, vertices, normals, colors, startIndex) {
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

    // Reuse cached THREE.Color if available
    if (!this._colorCache.has(colorHex)) {
      this._colorCache.set(colorHex, new THREE.Color(colorHex));
    }
    const color = this._colorCache.get(colorHex);

    // Add 4 vertices of the quad
    const quads = [v1, v2, v3, v4];
    for (let i = 0; i < 4; i++) {
      vertices.push(...quads[i]);
    }

    // Add normals for 4 vertices
    for (let i = 0; i < 4; i++) {
      normals.push(nx, ny, nz);
    }

    // Add colors for 4 vertices with baked lighting & Ambient Occlusion (AO)
    for (let i = 0; i < 4; i++) {
      const [vx, vy, vz] = quads[i];
      const smoothLight = this.getSmoothLight(chunk, vx, vy, vz, normal);
      const lightFactor = Math.max(0.12, smoothLight / 15.0); // Ambient minimum of 0.12

      const aoLevel = this.getVertexAO(chunk, vx, vy, vz, normal, i);
      const aoFactor = 0.45 + (aoLevel / 3) * 0.55; // Scales from 0.45 to 1.0

      const factor = lightFactor * aoFactor;
      colors.push(color.r * factor, color.g * factor, color.b * factor);
    }

    // Two triangles covering the quad
    return [
      startIndex, startIndex + 1, startIndex + 2,
      startIndex, startIndex + 2, startIndex + 3
    ];
  }
}
