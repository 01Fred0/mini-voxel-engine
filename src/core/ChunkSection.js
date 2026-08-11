export class ChunkSection {
  constructor(chunk, sectionIndex, sectionHeight) {
    this.chunk = chunk;
    this.sectionIndex = sectionIndex;       // e.g., 0-3 for a 64-tall chunk with 16-tall sections
    this.sectionHeight = sectionHeight;      // 16
    this.yOffset = sectionIndex * sectionHeight;

    this.needsRebuild = true;
    this.mesh = null;
    this.boundingBox = this.computeBoundingBox(chunk.x, chunk.z, chunk.size); // precompute or compute lazily
  }

  containsWorldY(y) {
    return y >= this.yOffset && y < this.yOffset + this.sectionHeight;
  }

  markDirty() {
    this.needsRebuild = true;
    // Mark the parent chunk dirty as well
    if (this.chunk) {
      this.chunk.needsRebuild = true;
    }
  }

  isSectionFullyBuried() {
    // A section is buried if its top is below the min height of this chunk
    const sectionTop = this.yOffset + this.sectionHeight;
    const chunkMinHeight = Math.min(...this.chunk.heightMap);
    if (sectionTop >= chunkMinHeight) return false; // may have exposed terrain

    // Check neighbor chunk edges for cave exposure
    if (!this.chunk.chunkManager) return false;
    const neighbors = [
      this.chunk.chunkManager.getChunk(this.chunk.x - 1, this.chunk.z),
      this.chunk.chunkManager.getChunk(this.chunk.x + 1, this.chunk.z),
      this.chunk.chunkManager.getChunk(this.chunk.x, this.chunk.z - 1),
      this.chunk.chunkManager.getChunk(this.chunk.x, this.chunk.z + 1)
    ];
    for (const neighbor of neighbors) {
      if (!neighbor) return false; // if neighbor is not loaded yet, assume not buried to be safe
      if (Math.min(...neighbor.heightMap) > sectionTop) continue; // neighbor fully covers this section too
      return false; // potential exposure via neighbor
    }
    return true;
  }

  computeBoundingBox(chunkX, chunkZ, chunkSize) {
    const minX = chunkX * chunkSize;
    const minY = this.yOffset;
    const minZ = chunkZ * chunkSize;
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: minX + chunkSize, y: minY + this.sectionHeight, z: minZ + chunkSize }
    };
  }
}
