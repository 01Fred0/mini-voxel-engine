/**
 * UIManager - Manages static DOM elements, HUD overlays, instructions, and quality toggles
 * Decouples DOM styling and template generation from the main engine loop
 */
export class UIManager {
  constructor(canvas, currentQuality = 'MEDIUM') {
    this.canvas = canvas;
    this.fpsElement = document.getElementById('fps-counter');
    this.instructionsElement = document.getElementById('instructions-overlay');
    this.loadingElement = document.getElementById('loading');

    // Hide loading screen after 1 second
    if (this.loadingElement) {
      setTimeout(() => {
        this.loadingElement.style.opacity = '0';
        setTimeout(() => {
          this.loadingElement.style.display = 'none';
        }, 500);
      }, 1000);
    }

    this.setupPointerLockHandlers();
    this.setupQualitySelector(currentQuality);
  }

  /**
   * Listen to PointerLock changes to seamlessly show/hide the controls instructions overlay
   */
  setupPointerLockHandlers() {
    const handlePointerLockChange = () => {
      if (document.pointerLockElement === this.canvas) {
        if (this.instructionsElement) {
          this.instructionsElement.style.opacity = '0';
          setTimeout(() => {
            if (document.pointerLockElement === this.canvas) {
              this.instructionsElement.style.display = 'none';
            }
          }, 300);
        }
      } else {
        if (this.instructionsElement) {
          this.instructionsElement.style.display = 'block';
          // Force a CSS reflow so the transition animation behaves nicely
          this.instructionsElement.offsetHeight;
          this.instructionsElement.style.opacity = '1';
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    this._cleanupListener = () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }

  /**
   * Set up quality preset selection button handlers
   */
  setupQualitySelector(currentQuality) {
    const presets = ['low', 'medium', 'high'];
    presets.forEach(p => {
      const btn = document.getElementById(`btn-quality-${p}`);
      if (btn) {
        if (p.toUpperCase() === currentQuality) {
          btn.classList.add('active');
        }

        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Avoid locking the pointer when clicking a button
          localStorage.setItem('graphics_quality', p.toUpperCase());
          // Reload page to instantly apply quality settings
          window.location.reload();
        });
      }
    });
  }

  /**
   * Update the FPS overlay counter text
   */
  updateFPS(fps, chunkCount) {
    if (this.fpsElement) {
      this.fpsElement.textContent = `FPS: ${fps} | Chunks: ${chunkCount}`;
    }
  }

  /**
   * Dispose event listeners
   */
  dispose() {
    if (this._cleanupListener) {
      this._cleanupListener();
    }
  }
}
