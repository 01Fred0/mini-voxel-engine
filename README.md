# mini-voxel-engine
A simplified Minecraft-like voxel engine built from scratch with procedural terrain generation using Perlin/Simplex noise and 3D cave systems


## 🎮 Features

- **Procedural Terrain Generation** using Perlin/Simplex noise
- **3D Cave Systems** generated with volumetric noise
- **Chunk-based World** for efficient rendering and infinite terrain
- **Real-time 3D Rendering** with Three.js
- **Modular Architecture** - easy to extend and customize
- **FPS-style Camera Controls**

- - **Physics-Based Block Mechanics** - blocks respond to gravity and structural integrity
- **Block Breaking & Placing** - interact with the world using raycasting
- **Multiple Block Types** - 7 different block types (Air, Grass, Dirt, Stone, Sand, Wood, Leaves)

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/01Fred0/mini-voxel-engine.git
cd mini-voxel-engine
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🎮 Controls

**Movement:**
- `W` / `↑` - Move forward
- `S` / `↓` - Move backward  
- `A` / `←` - Move left
- `D` / `→` - Move right
- `Space` - Move up (fly upward)
- `Shift` - Move down / Sprint (hold while moving)
- `Mouse` - Look around

**Interaction:**
- `Left Click` - Break block
- `Right Click` - Place block
- `1-7` - Select block type to place
- `ESC` - Release mouse control

**Getting Started:**
1. Click anywhere on the screen to lock the mouse pointer
2. Use WASD to fly around and explore the world
3. Break blocks by left-clicking
4. Place blocks by right-clicking
5. Watch physics in action as unsupported blocks fall!

## ✨ Gameplay Features

- **Infinite Procedural World** - Chunks load and unload dynamically as you explore
- **Realistic Physics** - Blocks fall when unsupported, structures collapse realistically
- **Cave Exploration** - Discover vast 3D cave networks underground
- **Creative Building** - Place and remove blocks freely
- **7 Block Types:**
  - 🟩 Grass (Type 1)
  - 🟫 Dirt (Type 2)
  - ⬜ Stone (Type 3)
  - 🟨 Sand (Type 4)
  - 🟫 Wood (Type 5)
  - 🟢 Leaves (Type 6)
  - ⬛ Bedrock (Type 7)

## 🏗️ Project Structure

```
mini-voxel-engine/
├── public/
│   └── index.html          # Entry HTML file
├── src/
│   ├── core/
│   │   ├── Chunk.js        # Chunk data structure
│   │   ├── ChunkManager.js # Manages chunk loading
│   │   ├── WorldGenerator.js # Terrain generation
│   │   └── Block.js        # Block type definitions
│   ├── noise/
│   │   ├── PerlinNoise.js  # Perlin noise implementation
│   │   └── SimplexNoise.js # Simplex noise (optional)
│   ├── rendering/
│   │   ├── Renderer.js     # Three.js renderer setup
│   │   └── MeshBuilder.js  # Converts chunks to meshes
│   ├── config.js           # World generation settings
│   └── main.js             # Application entry point
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/01Fred0/mini-voxel-engine.git
cd mini-voxel-engine

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser to `http://localhost:5173` (or the port shown in terminal)

### Building for Production

```bash
npm run build
npm run preview
```

## 🎯 Roadmap

- [x] Initial project setup
- [x] Package configuration
- [x] HTML entry point
- [ ] Noise generation algorithms
- [ ] Chunk system implementation
- [ ] World generator with terrain
- [ ] Three.js renderer
- [ ] Camera controls
- [ ] Cave generation
- [ ] Block textures
- [ ] Lighting system
- [ ] Biomes
- [ ] Water
- [ ] Trees and vegetation

## 🧠 How It Works

### Noise Generation
The engine uses **Perlin noise** for smooth, natural-looking terrain. Multiple octaves of noise are combined (fractal Brownian motion) to create varied landscapes with both large features and fine details.

### Chunk System
The world is divided into **chunks** (e.g., 16×16×64 blocks). Only chunks near the player are generated and rendered, enabling infinite worlds.

### Cave Generation
**3D noise** is used to carve out cave systems. If the noise value at a position is above a threshold, that block becomes air, creating natural cave networks.

## 🛠️ Configuration

Edit `src/config.js` to customize:
- World seed
- Chunk size
- Terrain height/amplitude
- Noise frequency and octaves
- Cave density
- Render distance

## 📚 Learning Resources

- [Perlin Noise Explanation](https://adrianb.io/2014/08/09/perlinnoise.html)
- [Minecraft World Generation](https://www.alanzucconi.com/2022/06/05/minecraft-world-generation/)
- [Three.js Documentation](https://threejs.org/docs/)

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add new features
- Improve generation algorithms
- Optimize performance
- Fix bugs
- Improve documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

Inspired by Minecraft's incredible procedural generation systems and the countless developers who've shared their knowledge about voxel engines.
