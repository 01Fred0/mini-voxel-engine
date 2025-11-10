/**
 * SimplexNoise.js - 3D Simplex Noise implementation
 * Based on Ken Perlin's improved noise algorithm
 * Produces smooth, natural-looking terrain patterns
 */

export class SimplexNoise {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.perm = this.buildPermutationTable();
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.permMod12[i] = this.perm[i] % 12;
    }
  }
  
  // Build permutation table from seed
  buildPermutationTable() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    // Fisher-Yates shuffle with seed
    let seed = this.seed * 65536;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Duplicate for overflow
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
    
    return perm;
  }
  
  // 3D gradient vectors
  static grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];
  
  // Dot product of gradient and distance vector
  dot3(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }
  
  // 3D Simplex noise
  noise3D(x, y, z) {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;
    
    // Skew input space to determine which simplex cell we're in
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;
    
    // Determine which simplex we are in
    let i1, j1, k1;
    let i2, j2, k2;
    
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1=1; j1=0; k1=0; i2=1; j2=1; k2=0;
      } else if (x0 >= z0) {
        i1=1; j1=0; k1=0; i2=1; j2=0; k2=1;
      } else {
        i1=0; j1=0; k1=1; i2=1; j2=0; k2=1;
      }
    } else {
      if (y0 < z0) {
        i1=0; j1=0; k1=1; i2=0; j2=1; k2=1;
      } else if (x0 < z0) {
        i1=0; j1=1; k1=0; i2=0; j2=1; k2=1;
      } else {
        i1=0; j1=1; k1=0; i2=1; j2=1; k2=0;
      }
    }
    
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;
    
    // Work out the hashed gradient indices
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = this.permMod12[ii + this.perm[jj + this.perm[kk]]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]];
    const gi2 = this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]];
    const gi3 = this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]];
    
    // Calculate the contribution from the four corners
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    let n0 = 0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot3(SimplexNoise.grad3[gi0], x0, y0, z0);
    }
    
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    let n1 = 0;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot3(SimplexNoise.grad3[gi1], x1, y1, z1);
    }
    
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    let n2 = 0;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot3(SimplexNoise.grad3[gi2], x2, y2, z2);
    }
    
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    let n3 = 0;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3 * t3 * this.dot3(SimplexNoise.grad3[gi3], x3, y3, z3);
    }
    
    // Add contributions from each corner and scale to [-1, 1]
    return 32.0 * (n0 + n1 + n2 + n3);
  }
  
  // 2D Simplex noise (for heightmaps)
  noise2D(x, y) {
    return this.noise3D(x, y, 0);
  }
  
  // Fractal Brownian Motion (multiple octaves)
  fbm3D(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise3D(
        x * frequency,
        y * frequency,
        z * frequency
      ) * amplitude;
      
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return total / maxValue;
  }
  
  // 2D FBM
  fbm2D(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    return this.fbm3D(x, y, 0, octaves, persistence, lacunarity);
  }
  
  // Ridge noise (inverted absolute value)
  ridge3D(x, y, z, octaves = 4) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      const n = Math.abs(this.noise3D(
        x * frequency,
        y * frequency,
        z * frequency
      ));
      total += (1 - n) * amplitude;
      
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return total / maxValue;
  }
  
  // Billow noise (absolute value)
  billow3D(x, y, z, octaves = 4) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      const n = Math.abs(this.noise3D(
        x * frequency,
        y * frequency,
        z * frequency
      ));
      total += n * amplitude;
      
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return total / maxValue;
  }
}
