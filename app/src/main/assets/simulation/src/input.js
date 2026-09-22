/**
 * BeamNG.drive Architecture Complete 1:1 Input Mapping & Interactive Node Grabber
 * Keyboard, Mouse, Touch, and Physics Wireframe Debug Mode
 */

import * as THREE from '../libs/three.module.js';

export class InputManager {
  constructor(camera, domElement, physicsSolver) {
    this.camera = camera;
    this.domElement = domElement;
    this.solver = physicsSolver;

    // Driving Controls State
    this.throttle = 0.0;
    this.brake = 0.0;
    this.steer = 0.0;
    this.handbrake = false;
    this.clutch = 0.0;
    this.nitrous = false;

    // Virtual Touch Overrides
    this.virtualThrottle = 0.0;
    this.virtualBrake = 0.0;
    this.virtualSteer = 0.0;

    // Simulation Time & Physics States
    this.isPhysicsPaused = false;
    this.slowMoIndex = 0; // 0=1x, 1=2x, 2=4x, 3=8x, 4=16x, 5=100x
    this.slowMoFactors = [1.0, 0.5, 0.25, 0.125, 0.0625, 0.01];

    // Debug Overlays
    this.showNodeBeamDebug = false;

    // Camera Mode (1: Chase, 2: Cockpit, 3: Hood, 4: Bumper, 5: Wheel, 6: Heli, 7: Orbit)
    this.cameraMode = 1;
    this.isFreeCam = false;

    // Node Grabber State (Left Ctrl + Left Mouse Click-Drag)
    this.isCtrlDown = false;
    this.isGrabberActive = false;
    this.raycaster = new THREE.Raycaster();
    this.mouseCoords = new THREE.Vector2();
    this.grabbedNodeIndex = -1;
    this.grabTargetPlane = new THREE.Plane();
    this.grabCursorEl = document.getElementById('grabber-cursor');

    // Key states
    this.keys = {};

    // Event callbacks
    this.callbacks = {
      onReset: null,
      onRepair: null,
      onShiftUp: null,
      onShiftDown: null,
      onToggleTransMode: null,
      onToggleDiffMode: null,
      onToggleESCMode: null,
      onTogglePauseMenu: null,
      onOpenVehicleSelector: null,
      onCycleCamera: null,
      onTeleportF7: null
    };

    this.initListeners();
  }

  setVirtualThrottle(val) { this.virtualThrottle = val; }
  setVirtualBrake(val) { this.virtualBrake = val; }
  setVirtualSteer(val) { this.virtualSteer = val; }

  toggleHandbrake() { this.handbrake = !this.handbrake; }
  toggleNitrous() { this.nitrous = !this.nitrous; }

  toggleSlowMo() {
    this.slowMoIndex = (this.slowMoIndex + 1) % this.slowMoFactors.length;
  }

  resetVehicle() {
    if (this.callbacks.onReset) this.callbacks.onReset();
  }

  cycleCamera() {
    this.cameraMode = (this.cameraMode % 7) + 1;
    if (this.callbacks.onCycleCamera) this.callbacks.onCycleCamera(this.cameraMode);
  }

  togglePauseMenu() {
    if (this.callbacks.onTogglePauseMenu) this.callbacks.onTogglePauseMenu();
  }

  initListeners() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    this.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  onKeyDown(e) {
    this.keys[e.code] = true;
    if (e.key === 'Control') this.isCtrlDown = true;

    // J: Pause/Resume Physics
    if (e.code === 'KeyJ') {
      this.isPhysicsPaused = !this.isPhysicsPaused;
    }

    // Alt + Down / Alt + Up: Slow Motion Step
    if (e.altKey && e.code === 'ArrowDown') {
      this.slowMoIndex = Math.min(this.slowMoFactors.length - 1, this.slowMoIndex + 1);
    }
    if (e.altKey && e.code === 'ArrowUp') {
      this.slowMoIndex = Math.max(0, this.slowMoIndex - 1);
    }

    // R: Reset vehicle
    if (e.code === 'KeyR' && !e.ctrlKey) {
      if (this.callbacks.onReset) this.callbacks.onReset();
    }

    // I: Repair vehicle in-place
    if (e.code === 'KeyI') {
      if (this.callbacks.onRepair) this.callbacks.onRepair();
    }

    // Shift (LeftShift/RightShift): Shift Up
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (this.callbacks.onShiftUp) this.callbacks.onShiftUp();
    }

    // X: Shift Down
    if (e.code === 'KeyX') {
      if (this.callbacks.onShiftDown) this.callbacks.onShiftDown();
    }

    // Q: Toggle Transmission (PDK / Manual)
    if (e.code === 'KeyQ' && !e.ctrlKey) {
      if (this.callbacks.onToggleTransMode) this.callbacks.onToggleTransMode();
    }

    // Ctrl + Q: Toggle ESC / Traction Control
    if (e.code === 'KeyQ' && e.ctrlKey) {
      if (this.callbacks.onToggleESCMode) this.callbacks.onToggleESCMode();
    }

    // V: Differential mode cycle
    if (e.code === 'KeyV') {
      if (this.callbacks.onToggleDiffMode) this.callbacks.onToggleDiffMode();
    }

    // B: Nitrous
    if (e.code === 'KeyB' && !e.ctrlKey) {
      this.nitrous = true;
    }

    // Ctrl + B: Toggle Node-Beam Wireframe Skeleton Overlay
    if (e.code === 'KeyB' && e.ctrlKey) {
      this.showNodeBeamDebug = !this.showNodeBeamDebug;
    }

    // C: Cycle Camera Views
    if (e.code === 'KeyC' && !e.shiftKey) {
      this.cycleCamera();
    }

    // Shift + C: Toggle Free Camera
    if (e.code === 'KeyC' && e.shiftKey) {
      this.isFreeCam = !this.isFreeCam;
    }

    // F7: Teleport vehicle to free cam position
    if (e.code === 'F7') {
      if (this.callbacks.onTeleportF7) this.callbacks.onTeleportF7();
    }

    // Direct Camera Selection (1-7)
    if (e.code >= 'Digit1' && e.code <= 'Digit7') {
      this.cameraMode = parseInt(e.key);
      if (this.callbacks.onCycleCamera) this.callbacks.onCycleCamera(this.cameraMode);
    }

    // Esc: Pause menu
    if (e.code === 'Escape') {
      this.togglePauseMenu();
    }

    // Ctrl + E: Vehicle Selector
    if (e.code === 'KeyE' && e.ctrlKey) {
      e.preventDefault();
      if (this.callbacks.onOpenVehicleSelector) this.callbacks.onOpenVehicleSelector();
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
    if (e.key === 'Control') {
      this.isCtrlDown = false;
      this.cancelNodeGrab();
    }
    if (e.code === 'KeyB') {
      this.nitrous = false;
    }
  }

  onMouseDown(e) {
    if (this.isCtrlDown && e.button === 0) {
      this.startNodeGrab(e);
    }
  }

  onMouseMove(e) {
    this.mouseCoords.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseCoords.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (this.isGrabberActive && this.grabbedNodeIndex >= 0) {
      this.updateNodeGrab(e);
    }
  }

  onMouseUp(e) {
    if (e.button === 0) {
      this.cancelNodeGrab();
    }
  }

  startNodeGrab(e) {
    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    const nodes = this.solver.nodes;
    let closestDist = Infinity;
    let closestIdx = -1;

    // Find node closest to ray
    for (let i = 0; i < nodes.length; i++) {
      const nodePos = new THREE.Vector3(nodes[i].position[0], nodes[i].position[1], nodes[i].position[2]);
      const rayDist = this.raycaster.ray.distanceToPoint(nodePos);
      if (rayDist < 0.45 && rayDist < closestDist) {
        closestDist = rayDist;
        closestIdx = i;
      }
    }

    if (closestIdx >= 0) {
      this.isGrabberActive = true;
      this.grabbedNodeIndex = closestIdx;
      this.solver.grabbedNodeIndex = closestIdx;

      // Plane perpendicular to camera through grabbed node
      const nPos = new THREE.Vector3(nodes[closestIdx].position[0], nodes[closestIdx].position[1], nodes[closestIdx].position[2]);
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      this.grabTargetPlane.setFromNormalAndCoplanarPoint(camDir.negate(), nPos);

      if (this.grabCursorEl) {
        this.grabCursorEl.style.display = 'block';
        this.grabCursorEl.style.left = `${e.clientX}px`;
        this.grabCursorEl.style.top = `${e.clientY}px`;
      }
    }
  }

  updateNodeGrab(e) {
    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    const target3D = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.grabTargetPlane, target3D);

    if (target3D) {
      this.solver.grabTarget[0] = target3D.x;
      this.solver.grabTarget[1] = target3D.y;
      this.solver.grabTarget[2] = target3D.z;
    }

    if (this.grabCursorEl) {
      this.grabCursorEl.style.left = `${e.clientX}px`;
      this.grabCursorEl.style.top = `${e.clientY}px`;
    }
  }

  cancelNodeGrab() {
    this.isGrabberActive = false;
    this.grabbedNodeIndex = -1;
    this.solver.grabbedNodeIndex = -1;
    if (this.grabCursorEl) {
      this.grabCursorEl.style.display = 'none';
    }
  }

  update(dt) {
    // Determine driving inputs from keyboard
    let targetThrottle = 0.0;
    let targetBrake = 0.0;
    let targetSteer = 0.0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) targetThrottle += 1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) targetBrake += 1.0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetSteer -= 1.0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) targetSteer += 1.0;
    if (this.keys['Space'] || this.keys['KeyP']) this.handbrake = true;
    else if (!this.keys['Space'] && !this.keys['KeyP']) this.handbrake = false;

    // Blend with virtual mobile controls
    this.throttle = Math.max(targetThrottle, this.virtualThrottle);
    this.brake = Math.max(targetBrake, this.virtualBrake);
    this.steer = Math.abs(this.virtualSteer) > 0.01 ? this.virtualSteer : targetSteer;

    return {
      throttle: this.throttle,
      brake: this.brake,
      steer: this.steer,
      handbrake: this.handbrake,
      nitrous: this.nitrous,
      dtScale: this.isPhysicsPaused ? 0.0 : this.slowMoFactors[this.slowMoIndex]
    };
  }
}
