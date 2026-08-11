import { WorldGenerator } from '../core/WorldGenerator.js';

let generator = null;

self.onmessage = (e) => {
  const { type, seed, chunkX, chunkZ } = e.data;

  if (type === 'init') {
    generator = new WorldGenerator(seed);
    return;
  }

  if (type === 'generate') {
    if (!generator) {
      console.error('Generator not initialized in Web Worker!');
      return;
    }
    const chunk = generator.generateChunk(chunkX, chunkZ);
    // Transfer both blocks and heightMap buffers — zero-copy
    self.postMessage(
      {
        chunkX,
        chunkZ,
        blocksBuffer: chunk.blocks.buffer,
        heightMapBuffer: chunk.heightMap.buffer
      },
      [chunk.blocks.buffer, chunk.heightMap.buffer]
    );
  }
};
