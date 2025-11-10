# AI-README: Mini Voxel Engine Development Guide

## Project Overview

This is a guide for AI assistants working on the **mini-voxel-engine** project - a 3D open-world voxel game built with Electron and JavaScript.

### Primary Goals
1. **Create a fully functional 3D voxel engine** similar to Minecraft
2. **Procedurally generate terrain** using Perlin/Simplex noise
3. **Implement 3D cave systems** for exploration
4. **Build a standalone .exe application** for Windows
5. **Optimize performance** for smooth gameplay

### Technical Stack
- **Language**: JavaScript 98.8%, HTML 1.2%
- **Framework**: Electron (for standalone app)
- **Graphics**: THREE.js (or similar 3D library)
- **Build Tool**: Vite
- **Git Integration**: GitHub with branch protection and automated builds

### Current Development Status
- **Branch Protection**: Main branch is protected - all changes require pull requests
- **Jules AI Access**: Google Labs Jules bot can bypass branch restrictions for automated fixes
- **Project Board**: "Voxel Engine Development" board tracks features, bugs, and milestones
- **Issue Labels**: Tagged with gameplay, rendering, lighting, terrain, performance

---

## Key Systems & Architecture

### Terrain Generation
- Uses Perlin/Simplex noise for natural terrain variation
- Implements chunk-based system for infinite world
- Dynamic cave generation using noise functions

### Rendering Pipeline
- Voxel mesh generation and optimization
- Lighting system with shaders for realistic visuals
- Performance optimization through frustum culling and LOD

### Gameplay Mechanics
- Player movement and camera controls
- Block placement/destruction
- Inventory system
- Physics interactions

---

## AI Development Notes & Collaboration

This section is for AI assistants to document findings, decisions, and guidance for future AI work on this project.

### Notes from Previous AI Sessions

#### Session 1 - Project Setup & Infrastructure (November 10, 2025)
- ✅ Resolved merge conflicts in MeshBuilder.js
- ✅ Set up branch protection for main branch with Jules AI bypass
- ✅ Created "Voxel Engine Development" project board
- ✅ Added custom labels: terrain, lighting, performance, rendering, gameplay
- ⏳ TODO: Create issue templates (bug reports, feature requests)
- ⏳ TODO: Set up GitHub Actions workflow for automated Electron builds
- ⏳ TODO: Create first GitHub Release
- ⏳ TODO: Set up GitHub Wiki with full documentation

**Key Decision**: Jules AI was whitelisted in branch protection to allow automated fixes and improvements while maintaining code quality through required PRs for other contributors.

---

## How to Add Notes for Future AI

1. Before starting work, check this file for previous session notes
2. At the end of your session, add a new section:
   ```
   #### Session N - [Description] ([Date])
   - ✅ Completed tasks
   - ⏳ TODO items
   - 🔍 Issues discovered
   - 💡 Design decisions made
   ```
3. Include any important technical findings or gotchas
4. Document any new setup required or configuration changes
5. Link to relevant issues or PRs

---

## Quick Reference: Common Tasks

### Creating an Issue
- Use labels: gameplay, rendering, lighting, terrain, performance, bug, enhancement, documentation
- Reference relevant code files
- Include steps to reproduce (for bugs)

### Making Changes
1. Create a feature branch from main
2. Make changes and test
3. Push and create a pull request
4. Jules AI may auto-fix style/build issues
5. Merge when ready

### Running the Application
```bash
npm install       # Install dependencies
npm run dev       # Development mode
npm run build     # Build Electron app
```

---

## Important Project Links

- **Project Board**: https://github.com/01Fred0/mini-voxel-engine/projects/1
- **Labels**: https://github.com/01Fred0/mini-voxel-engine/labels
- **Issues**: https://github.com/01Fred0/mini-voxel-engine/issues
- **Wiki**: (To be created)
- **Releases**: https://github.com/01Fred0/mini-voxel-engine/releases

---

*Last Updated: November 10, 2025*
*Maintained by: Development Team & AI Assistants*
