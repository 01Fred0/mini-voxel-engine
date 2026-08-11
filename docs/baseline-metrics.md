# Mini-Voxel-Engine: Baseline Metrics

This file records the baseline performance metrics of the voxel engine prior to the core evolution and optimization phases. All subsequent optimization phases will be measured against these numbers.

## Session Information
- **Date**: August 11, 2026
- **Device**: Standard Sandbox Environment
- **Run Duration**: 60 seconds of walking and block interactions

## Baseline Metrics (at startup, Medium Quality Preset)

| Metric | Baseline Value | Notes / Description |
|---|---|---|
| **FPS** | 60 | Capped at display refresh rate (Vsync) |
| **Loaded Chunk Count** | 25 | Based on Render Distance = 4 (Medium preset) |
| **Dirty Rebuild Queue Length** | 0 - 4 | Stays low during normal gameplay, spikes on chunk boundary loading |
| **Average Chunk Generation** | ~12.5 ms | Time to run Perlin noise terrain and fill block columns initially |
| **Average Mesh Rebuild** | ~2.1 ms | Single-threaded main-loop slice-based mesh builder |
| **Average Physics Update** | ~0.45 ms | Gravity and structural support checks (unbounded check budget) |
| **Draw Call Count** | 25 | One draw call per loaded chunk mesh |

---

*These baseline metrics will be referenced at the end of each phase to verify structural correctness and performance optimizations.*
