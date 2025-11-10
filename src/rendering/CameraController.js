import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    
    // Camera rotation
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.euler.setFromQuaternion(camera.quaternion);
    
    // Movement speed
    this.moveSpeed = 10.0; // Units per second
    this.sprintMultiplier = 2.0;
    this.isSprinting = false;
    
    // Mouse sensitivity
    this.mouseSensitivity = 0.002;
    
    // Pointer lock state
    this.isLocked = false;
    
    // Bind event handlers
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onPointerLockError = this.onPointerLockError.bind(this);
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    
    // Mouse events
    document.addEventListener('mousemove', this.onMouseMove);
    
    // Pointer lock events
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
    
    // Click to lock pointer
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });
  }
  
  onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
  }
  
  onPointerLockError() {
    console.error('Pointer lock error');
  }
  
  onMouseMove(event) {
    if (!this.isLocked) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    this.euler.y -= movementX * this.mouseSensitivity;
    this.euler.x -= movementY * this.mouseSensitivity;
    
    // Clamp vertical rotation (prevent camera flip)
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
    
    this.camera.quaternion.setFromEuler(this.euler);
  }
  
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'Space':
        this.moveUp = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveDown = true;
        this.isSprinting = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.moveDown = true;
        break;
    }
  }
  
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'Space':
        this.moveUp = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveDown = false;
        this.isSprinting = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.moveDown = false;
        break;
    }
  }
  
  // Update camera position based on input
  update(deltaTime) {
    if (!this.isLocked) return;
    
    const speed = this.moveSpeed * (this.isSprinting ? this.sprintMultiplier : 1.0);
    const velocity = new THREE.Vector3();
    
    // Get camera direction
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    // Get right vector
    const right = new THREE.Vector3();
    right.crossVectors(this.camera.up, direction).normalize();
    
    // Calculate movement
    if (this.moveForward) {
      velocity.add(direction);
    }
    if (this.moveBackward) {
      velocity.sub(direction);
    }
    if (this.moveRight) {
      velocity.add(right);
    }
    if (this.moveLeft) {
      velocity.sub(right);
    }
    if (this.moveUp) {
      velocity.y += 1;
    }
    if (this.moveDown) {
      velocity.y -= 1;
    }
    
    // Normalize to prevent faster diagonal movement
    if (velocity.length() > 0) {
      velocity.normalize();
    }
    
    // Apply speed and delta time
    velocity.multiplyScalar(speed * deltaTime);
    
    // Update camera position
    this.camera.position.add(velocity);
  }
  
  // Get current position
  getPosition() {
    return this.camera.position.clone();
  }
  
  // Set position
  setPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }
  
  // Cleanup
  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
    
    // Exit pointer lock if active
    if (this.isLocked) {
      document.exitPointerLock();
    }
  }
}
