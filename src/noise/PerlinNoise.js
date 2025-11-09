/**
 * Perlin Noise Generator
 * Based on Ken Perlin's improved noise algorithm
 * Used for procedural terrain generation
 */

export class PerlinNoise {
  constructor(seed = null) {
    this.seed = seed || Math.floor(Math.random() * 65536);
    this.permutation = this.generatePermutation();
  }

  // Generate permutation table from seed
  generatePermutation() {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    // Shuffle using seed
    let rng = this.seed;
    for (let i = 255; i > 0; i--) {
      rng = (rng * 16807) % 2147483647;
      const j = Math.floor((rng / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Duplicate for wrapping
    return [...p, ...p];
  }

  // Fade function (6t^5 - 15t^4 + 10t^3)
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Linear interpolation
  lerp(t, a, b) {
    return a + t * (b - a);
  }

  // Gradient function
  grad(hash, x, y, z = 0) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // 2D Perlin Noise
  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const p = this.permutation;
    const a = p[X] + Y;
    const aa = p[a];
    const ab = p[a + 1];
    const b = p[X + 1] + Y;
    const ba = p[b];
    const bb = p[b + 1];
    
    return this.lerp(v,
      this.lerp(u, this.grad(p[aa], x, y), this.grad(p[ba], x - 1, y)),
      this.lerp(u, this.grad(p[ab], x, y - 1), this.grad(p[bb], x - 1, y - 1))
    );
  }

  // 3D Perlin Noise (for caves)
  noise3D(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    const p = this.permutation;
    const a = p[X] + Y;
    const aa = p[a] + Z;
    const ab = p[a + 1] + Z;
    const b = p[X + 1] + Y;
    const ba = p[b] + Z;
    const bb = p[b + 1] + Z;
    
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(p[aa], x, y, z), this.grad(p[ba], x - 1, y, z)),
        this.lerp(u, this.grad(p[ab], x, y - 1, z), this.grad(p[bb], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(p[aa + 1], x, y, z - 1), this.grad(p[ba + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(p[ab + 1], x, y - 1, z - 1), this.grad(p[bb + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  // Fractal Brownian Motion (multiple octaves)
  fbm2D(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return total / maxValue;
  }

  // 3D Fractal Brownian Motion
  fbm3D(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return total / maxValue;
  }
}
