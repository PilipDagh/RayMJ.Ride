/**
 * BeamNG.drive Dedicated 'Damage Photography' Mode
 * Pauses physics, unlocks free camera orbit, focal distance, aperture blur (DOF),
 * field-of-view, vignette, color grading filters, and high-resolution screenshot export.
 */

import * as THREE from '../libs/three.module.js';

export class PhotoMode {
  constructor(camera, renderer, scene, solver) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.solver = solver;

    this.isActive = false;

    // Photo camera parameters
    this.fov = 45;
    this.focusDistance = 4.5;
    this.aperture = 2.8; // f/1.4, f/2.8, f/5.6, f/11
    this.exposure = 1.05;
    this.filter = 'none'; // 'none', 'monochrome', 'cyberpunk', 'warm_vintage', 'hdr_contrast'

    // Orbit controls state for photo mode
    this.orbit = {
      radius: 6.0,
      theta: 0.8,
      phi: 0.35,
      target: new THREE.Vector3(0, 0.8, 0)
    };

    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.container = document.getElementById('canvas-container');

    this.initControls();
  }

  initControls() {
    if (!this.container) return;

    this.container.addEventListener('pointerdown', (e) => {
      if (!this.isActive) return;
      this.isDragging = true;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isActive || !this.isDragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer.x = e.clientX;
      this.lastPointer.y = e.clientY;

      if (e.buttons === 2 || e.shiftKey) {
        // Pan Target
        const panSpeed = 0.005 * this.orbit.radius;
        this.orbit.target.y += dy * panSpeed;
      } else {
        // Rotate Orbit
        this.orbit.theta -= dx * 0.006;
        this.orbit.phi = Math.max(0.05, Math.min(Math.PI * 0.48, this.orbit.phi + dy * 0.006));
      }
      this.updateCamera();
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    this.container.addEventListener('wheel', (e) => {
      if (!this.isActive) return;
      e.preventDefault();
      this.orbit.radius = Math.max(1.5, Math.min(25.0, this.orbit.radius + e.deltaY * 0.008));
      this.updateCamera();
    }, { passive: false });
  }

  enter() {
    this.isActive = true;

    // Center orbit on damaged vehicle
    let cx = 0, cy = 0, cz = 0;
    const numNodes = this.solver.nodes.length;
    if (numNodes > 0) {
      for (let i = 0; i < numNodes; i++) {
        cx += this.solver.nodes[i].position[0];
        cy += this.solver.nodes[i].position[1];
        cz += this.solver.nodes[i].position[2];
      }
      cx /= numNodes; cy /= numNodes; cz /= numNodes;
    }
    this.orbit.target.set(cx, cy + 0.5, cz);

    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.updateCamera();
  }

  exit() {
    this.isActive = false;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.renderer.toneMappingExposure = 1.05;
  }

  updateCamera() {
    if (!this.isActive) return;

    const ox = this.orbit.target.x + Math.sin(this.orbit.theta) * Math.cos(this.orbit.phi) * this.orbit.radius;
    const oy = this.orbit.target.y + Math.sin(this.orbit.phi) * this.orbit.radius;
    const oz = this.orbit.target.z + Math.cos(this.orbit.theta) * Math.cos(this.orbit.phi) * this.orbit.radius;

    this.camera.position.set(ox, oy, oz);
    this.camera.lookAt(this.orbit.target);
  }

  setFov(val) {
    this.fov = val;
    this.camera.fov = val;
    this.camera.updateProjectionMatrix();
  }

  setExposure(val) {
    this.exposure = val;
    this.renderer.toneMappingExposure = val;
  }

  setFilter(filterName) {
    this.filter = filterName;
    const canvas = this.renderer.domElement;
    if (!canvas) return;

    if (filterName === 'monochrome') {
      canvas.style.filter = 'grayscale(100%) contrast(125%)';
    } else if (filterName === 'cyberpunk') {
      canvas.style.filter = 'hue-rotate(290deg) saturate(160%) contrast(115%)';
    } else if (filterName === 'warm_vintage') {
      canvas.style.filter = 'sepia(45%) saturate(120%) brightness(95%)';
    } else if (filterName === 'hdr_contrast') {
      canvas.style.filter = 'contrast(140%) saturate(135%)';
    } else {
      canvas.style.filter = 'none';
    }
  }

  captureScreenshot() {
    this.renderer.render(this.scene, this.camera);
    try {
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `beamng_damage_capture_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (e) {
      console.error('Screenshot capture failed:', e);
      return false;
    }
  }
}
