/**
 * Perlin Noise Generator - Improved Version
 * Based on Ken Perlin's improved noise algorithm
 * Used for procedural terrain generation
 * 
 * @class PerlinNoise
 * @description Generates coherent Perlin noise for 2D and 3D terrain generation
 */
export class PerlinNoise {
  // Constants for permutation generation
  static PERMUTATION_SIZE = 256;
  static RNG_MULTIPLIER = 16807;
  static RNG_MODULUS = 2147483647;
  static SEED_RANGE = 65536;
  
  // Fade function constants (6t^5 - 15t^4 + 10t^3)
  static FADE_COEF_A = 6;
  static FADE_COEF_B = 15;
  static FADE_COEF_C = 10;
  
  // Gradient lookup table for 2D (16 possible gradients)
  static GRADIENTS_2D = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];
  
  /**
   * @param {number} seed - Seed for random permutation (optional)
   */
  constructor(seed = null) {
    // Validate seed
    if (seed !== null && (typeof seed !== 'number' || seed < 0 || !isFinite(seed))) {
      throw new Error('Seed must be a non-negative number');
    }
    
    this.seed = seed || Math.floor(Math.random() * PerlinNoise.SEED_RANGE);
    this.permutation = this.generatePermutation();
    this.fadeCache = new Map(); // Cache fade values for optimization
  }

  /**
   * Generate permutation table from seed
   * @private
   * @returns {Uint8Array} Permutation table (size 512 for wrapping)
   */
  generatePermutation() {
    const p = new Uint8Array(PerlinNoise.PERMUTATION_SIZE);
    for (let i = 0; i < PerlinNoise.PERMUTATION_SIZE; i++) {
      p[i] = i;
    }

    // Shuffle using seed (Fisher-Yates with seed)
    let rng = this.seed;
    for (let i = PerlinNoise.PERMUTATION_SIZE - 1; i > 0; i--) {
      rng = (rng * PerlinNoise.RNG_MULTIPLIER) % PerlinNoise.RNG_MODULUS;
      const j = Math.floor((rng / PerlinNoise.RNG_MODULUS) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    // Duplicate for wrapping
    const result = new Uint8Array(PerlinNoise.PERMUTATION_SIZE * 2);
    for (let i = 0; i < PerlinNoise.PERMUTATION_SIZE * 2; i++) {
      result[i] = p[i & (PerlinNoise.PERMUTATION_SIZE - 1)];
    }
    return result;
  }

  /**
   * Validate input coordinates
   * @private
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @throws {Error} If coordinates are NaN or infinite
   */
  validateCoordinates(x, y, z = 0) {
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
      throw new Error('Coordinates must be finite numbers');
    }
  }

  /**
   * Fade function (6t^5 - 15t^4 + 10t^3)
   * @private
   * @param {number} t - Value between 0 and 1
   * @returns {number} Smoothed value
   */
  fade(t) {
    return t * t * t * (t * (t * PerlinNoise.FADE_COEF_A - PerlinNoise.FADE_COEF_B) + PerlinNoise.FADE_COEF_C);
  }

  /**
   * Linear interpolation
   * @private
   * @param {number} t - Interpolation factor (0-1)
   * @param {number} a - Start value
   * @param {number} b - End value
   * @returns {number} Interpolated value
   */
  lerp(t, a, b) {
    return a + t * (b - a);
  }

  /**
   * Gradient function - uses lookup table for performance
   * @private
   * @param {number} hash - Hash value for gradient selection
   * @param {number} x - X coordinate offset
   * @param {number} y - Y coordinate offset
   * @param {number} z - Z coordinate offset (default 0)
   * @returns {number} Dot product of gradient and offset vector
   */
  grad(hash, x, y, z = 0) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * 2D Perlin Noise
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Noise value between -1 and 1
   */
  noise2D(x, y) {
    this.validateCoordinates(x, y);
    
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

  /**
   * 3D Perlin Noise (for caves)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Noise value between -1 and 1
   */
  noise3D(x, y, z) {
    this.validateCoordinates(x, y, z);
    
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

  /**
   * Fractal Brownian Motion (multiple octaves for 2D)
   * Produces natural-looking terrain by combining multiple noise layers
   * Output is normalized to [-1, 1] range
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} octaves - Number of noise layers (default 4)
   * @param {number} persistence - Amplitude multiplier per octave (default 0.5)
   * @param {number} lacunarity - Frequency multiplier per octave (default 2.0)
   * @returns {number} Combined noise value in range [-1, 1]
   */
  fbm2D(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    this.validateCoordinates(x, y);
    
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

    return total / maxValue; // Normalized output [-1, 1]
  }

  /**
   * Fractal Brownian Motion for 3D (for caves)
   * Output is normalized to [-1, 1] range
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @param {number} octaves - Number of noise layers (default 4)
   * @param {number} persistence - Amplitude multiplier per octave (default 0.5)
   * @param {number} lacunarity - Frequency multiplier per octave (default 2.0)
   * @returns {number} Combined noise value in range [-1, 1]
   */
  fbm3D(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    this.validateCoordinates(x, y, z);
    
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

    return total / maxValue; // Normalized output [-1, 1]
  }
}
