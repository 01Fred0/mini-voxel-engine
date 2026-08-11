# mini-voxel-engine

A high-performance, simplified Minecraft-like voxel engine built from scratch with procedural terrain generation and volumetric 3D cave systems.

---

## 🎮 Core Features

- **Procedural Infinite Terrain** generated dynamically using multi-octave fractal Perlin noise.
- **3D Cave Systems** carved using volumetric 3D noise patterns.
- **Advanced Terrain Polishers** simulating sharp-edge smoothing and erosion.
- **Physics-Based Mechanics** with Rust-like structural integrity constraints and falling gravity.
- **High-Performance Greedy Meshing** reducing vertex and triangle count on the hot-path by up to 100x.
- **Voxel Particle System** for dynamic micro-voxel block destruction effects.
- **Modular Architecture** with cleanly separated rendering, input, physics, and world generation layers.
- **Configurable Quality Presets** (Low, Medium, High) dynamically scaling device pixel ratio, shadow resolution, and render distance.

---

## ⌨️ Game Controls

- **W, A, S, D** / **Arrow Keys** — Move around
- **Mouse** — Look around (360° perspective)
- **Space** — Ascend / Fly upward
- **Control** — Descend / Fly downward
- **Shift** — Hold to Sprint
- **Left Click** — Break/Destroy Block
- **Right Click** — Place Selected Block
- **1 - 7** — Select Block Type to Place:
  - `1` : Grass
  - `2` : Dirt
  - `3` : Stone
  - `4` : Sand
  - `5` : Wood
  - `6` : Leaves
  - `7` : Bedrock
- **ESC** — Release pointer lock & show pause overlay

---

## 🚀 Setup & Running Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- npm or yarn

### Quick Start
1. Clone the repository and navigate into the folder:
   ```bash
   git clone https://github.com/01Fred0/mini-voxel-engine.git
   cd mini-voxel-engine
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Spin up the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL printed in the terminal (typically `http://localhost:5173/`).

---

## ⚙️ Graphics & Customization

The engine can be customized by editing options in `src/config.js` or via URL queries/localStorage.

### Graphics Quality Selectors
- You can change graphics quality on the startup instructions screen.
- Choosing **Low**, **Medium**, or **High** configures the renderer and dynamically updates:
  - **Device Pixel Ratio (DPR)** (low-end device optimization)
  - **Real-time Shadows** (enabled/disabled, shadow map resolution)
  - **Fog distance & clear distance**
  - **Dynamic chunk render distance**

---

## 🖥️ Building Standalone Executable

The project includes pre-configured **Electron** bundling scripts to package the voxel engine into a standalone desktop `.exe` application.

```bash
# Package into standalone Windows application (.exe)
npm run electron:build:win

# Test Electron app locally in window mode
npm run electron
```

---

## 🤝 Contributing

Contributions are always welcome! Feel free to raise issues or open pull requests for:
- Optimizing physics ticks
- Adding new biomes or structures
- Enhancing light maps and lighting propagation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
