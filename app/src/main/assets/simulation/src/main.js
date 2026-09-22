/**
 * BeamNG.drive Architecture Main Simulation Loop & Three.js Pipeline
 * 2000Hz Physics Sub-Stepping, WebGL2 PBR Shaders, Dynamic Cascaded Shadows,
 * Weather & Time-of-Day, Damage Photography Mode, Replay System,
 * Granular Graphics Settings Manager, Camera Director (Modes 1-7), Android Bridge
 */

import * as THREE from '../libs/three.module.js';
import { PhysicsSolver } from './physics.js';
import { EngineSimulation, DrivetrainTransmission } from './powertrain.js';
import { Porsche911GT3Generator } from './proceduralCar.js';
import { VehicleFactory, VEHICLE_ROSTER } from './vehicles.js';
import { FlexbodySkinning, SparkParticleSystem } from './flexbody.js';
import { EnvironmentManager } from './environment.js';
import { VehicleTuningSuite } from './tuning.js';
import { MobileController } from './mobile.js';
import { InputManager } from './input.js';
import { SimulationUI } from './ui.js';
import { WeatherSystem } from './weather.js';
import { ReplaySystem } from './replay.js';
import { PhotoMode } from './photoMode.js';
import { GraphicsSettingsManager } from './graphicsSettings.js';

class SimulationApplication {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Three.js Core
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0035);

    this.camera = new THREE.PerspectiveCamera(60, Math.max(1, this.width) / Math.max(1, this.height), 0.1, 1500);
    
    // Robust WebGL Renderer Initialization with safe fallback
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false
      });
    } catch (e) {
      console.warn('WebGL initialization failed, retrying basic WebGLRenderer', e);
      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        preserveDrawingBuffer: false
      });
    }

    this.renderer.setSize(this.width || 800, this.height || 600);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1.0, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // Context loss & restore handling
    this.isContextLost = false;
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('Simulation WebGL context lost! Pausing render loop.');
      this.isContextLost = true;
    }, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.info('Simulation WebGL context restored! Resuming render loop.');
      this.isContextLost = false;
    }, false);

    // Setup Lighting & Sun
    this.setupLighting();

    // Physics & Powertrain
    this.solver = new PhysicsSolver();
    this.engine = new EngineSimulation();
    this.powertrain = new DrivetrainTransmission(this.engine);
    this.tuningSuite = new VehicleTuningSuite();

    // Environment & Weather
    this.environment = new EnvironmentManager(this.scene, this.solver);
    this.weather = new WeatherSystem(this.scene, this.sun, this.hemiLight);
    this.sparks = new SparkParticleSystem(this.scene, 600);

    // Active Vehicle State
    this.activeVehicleId = 'porsche_911_gt3';
    this.vehicleData = null;
    this.flexbody = null;
    this.chassisNodes = [];

    // Replay & Photo Mode
    this.replay = new ReplaySystem(this.solver, this.flexbody, this.powertrain);
    this.photoMode = new PhotoMode(this.camera, this.renderer, this.scene, this.solver);
    this.graphicsManager = new GraphicsSettingsManager(this.renderer, this.scene, this.sun);

    // Camera & Audio
    this.cameraMode = 1; // 1: Chase, 2: Cockpit, 3: Hood, 4: Bumper, 5: Wheel, 6: Heli, 7: Orbit
    this.camTargetPos = new THREE.Vector3();
    this.camLookTarget = new THREE.Vector3();
    this.orbitAngle = { theta: 0, phi: 0.3, radius: 6.5 };
    this.initAudio();

    // Input & UI
    this.input = new InputManager(this.camera, this.renderer.domElement, this.solver);
    this.mobile = new MobileController(this.input);
    this.ui = new SimulationUI({
      onReset: () => this.resetVehicle(),
      onRepair: () => this.repairVehicle(),
      onShiftUp: () => this.powertrain.shiftUp(),
      onShiftDown: () => this.powertrain.shiftDown(),
      onToggleTransMode: () => {
        this.powertrain.mode = this.powertrain.mode === 'PDK_AUTO' ? 'MANUAL' : 'PDK_AUTO';
        this.ui.showToast(`Transmission: ${this.powertrain.mode}`);
      },
      onToggleDiffMode: () => {
        const modes = ['eLSD', 'Open', 'Welded', 'Spool'];
        const nextIdx = (modes.indexOf(this.powertrain.diffMode) + 1) % modes.length;
        this.powertrain.diffMode = modes[nextIdx];
        this.ui.showToast(`Differential: ${this.powertrain.diffMode}`);
      },
      onSelectVehicle: (id) => this.loadVehicle(id),
      onSelectEnvironment: (mapId) => this.environment.loadEnvironment(mapId),
      onTogglePauseMenu: () => this.ui.toggleDrawer(),
      onCycleCamera: (mode) => {
        this.cameraMode = mode;
        this.ui.showToast(`Camera Mode: ${this.getCameraModeName(mode)}`);
      },
      onTogglePhotoMode: (active) => this.togglePhotoMode(active),
      onPhotoCapture: () => this.photoMode.captureScreenshot(),
      onPhotoFov: (fov) => this.photoMode.setFov(fov),
      onPhotoFilter: (filter) => this.photoMode.setFilter(filter),
      onPhotoExposure: (exp) => this.photoMode.setExposure(exp),
      onReplayRecord: () => this.replay.startRecording(),
      onReplayPlay: () => this.replay.startPlayback(),
      onReplayPause: () => this.replay.pausePlayback(),
      onReplayLive: () => this.replay.stopPlayback(),
      onReplaySeek: (val) => this.replay.seek(val),
      onReplaySpeed: (spd) => this.replay.setSpeed(spd),
      onReplaySave: () => this.replay.saveCurrentReplay(),
      getTuningSuite: () => this.tuningSuite,
      getWeatherSystem: () => this.weather,
      getReplaySystem: () => this.replay,
      getGraphicsManager: () => this.graphicsManager
    });

    this.input.callbacks = this.ui.callbacks;
    this.tuningSuite.onChange(() => {
      this.tuningSuite.applyToVehicle(this.vehicleData, this.solver, this.powertrain);
    });

    // Connect replay timeline listener to UI
    this.replay.onTimelineUpdate = (progress01, cur, tot) => {
      this.ui.updateReplayTimeline(progress01, cur, tot);
    };

    // Time Tracking
    this.lastTime = performance.now();
    this.physicsAccumulator = 0;

    this.environment.loadEnvironment('proving_grounds');
    this.loadVehicle('porsche_911_gt3');
    this.initResizeListener();
    this.initDragDrop();

    // Start Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  getCameraModeName(mode) {
    const names = ['', 'Chase Cam', 'Cockpit View', 'Hood Cam', 'Bumper Cam', 'Suspension Cam', 'Heli Tracking', 'Orbit Inspection'];
    return names[mode] || 'Chase Cam';
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.65);
    this.hemiLight.position.set(0, 100, 0);
    this.scene.add(this.hemiLight);

    const sun = new THREE.DirectionalLight(0xfffaed, 1.35);
    sun.position.set(80, 140, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 350;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    this.sun = sun;
  }

  togglePhotoMode(active) {
    if (active) {
      this.photoMode.enter();
      this.ui.setPhotoModeVisible(true);
    } else {
      this.photoMode.exit();
      this.ui.setPhotoModeVisible(false);
    }
  }

  initAudio() {
    this.audioCtx = null;
    const init = () => {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
          this.engineOsc = this.audioCtx.createOscillator();
          this.engineOsc.type = 'sawtooth';
          this.engineGain = this.audioCtx.createGain();
          this.engineGain.gain.value = 0.04;
          this.engineOsc.connect(this.engineGain);
          this.engineGain.connect(this.audioCtx.destination);
          this.engineOsc.start();
        }
      }
      window.removeEventListener('click', init);
      window.removeEventListener('keydown', init);
      window.removeEventListener('touchstart', init);
    };
    window.addEventListener('click', init);
    window.addEventListener('keydown', init);
    window.addEventListener('touchstart', init);
  }

  loadVehicle(vehicleId) {
    this.activeVehicleId = vehicleId;

    // Remove existing vehicle from scene
    if (this.vehicleData && this.vehicleData.rootGroup) {
      this.scene.remove(this.vehicleData.rootGroup);
    }

    // Reset physics solver
    this.solver.nodes = [];
    this.solver.beams = [];
    this.solver.wheels = [];

    if (vehicleId === 'porsche_911_gt3') {
      const porscheGen = new Porsche911GT3Generator();
      this.vehicleData = porscheGen.buildVisualMesh();
      this.scene.add(this.vehicleData.rootGroup);

      // Generate Node-Beam Lattice
      const lattice = porscheGen.generateNodeBeamLattice(this.solver);
      this.solver.wheels = lattice.wheels;

      // Flexbody skinning
      this.flexbody = new FlexbodySkinning(this.vehicleData.chassisMesh, this.solver);
    } else {
      this.vehicleData = VehicleFactory.createProceduralVehicle(vehicleId);
      this.scene.add(this.vehicleData.rootGroup);

      // Construct standard vehicle lattice
      const porscheGen = new Porsche911GT3Generator();
      porscheGen.curbWeight = this.vehicleData.spec.weightKg;
      porscheGen.rearBias = this.vehicleData.spec.rearBias;
      const lattice = porscheGen.generateNodeBeamLattice(this.solver);
      this.solver.wheels = lattice.wheels;

      this.flexbody = new FlexbodySkinning(this.vehicleData.chassisMesh, this.solver);
    }

    // Update replay system solver reference
    this.replay.setSolver(this.solver, this.flexbody, this.powertrain);

    // Spawn vehicle cleanly with 30-step relaxation phase
    this.solver.spawnAt(0.0);
    this.powertrain.reset();
    this.tuningSuite.applyToVehicle(this.vehicleData, this.solver, this.powertrain);

    // Update Top Brand Name & Subname
    const spec = VEHICLE_ROSTER.find(v => v.id === vehicleId) || VEHICLE_ROSTER[0];
    const brandEl = document.getElementById('hud-brand-title');
    const subEl = document.getElementById('hud-vehicle-sub');
    if (brandEl) brandEl.innerText = spec.name.toUpperCase();
    if (subEl) subEl.innerText = `${spec.year} | ${spec.engineName}`;
  }

  resetVehicle() {
    this.solver.spawnAt(0.0);
    this.powertrain.reset();
    if (this.flexbody) {
      this.flexbody.bindNodes();
    }
    this.ui.showToast('Vehicle Reset to Spawn Point');
  }

  repairVehicle() {
    for (let b = 0; b < this.solver.beams.length; b++) {
      this.solver.beams[b].reset();
    }
    for (let n = 0; n < this.solver.nodes.length; n++) {
      this.solver.nodes[n].reset();
    }
    for (let w = 0; w < this.solver.wheels.length; w++) {
      this.solver.wheels[w].reset();
    }
    this.solver.spawnAt(0.0);
    this.powertrain.reset();
    this.ui.showToast('Vehicle Repaired In-Place');
  }

  initDragDrop() {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
          this.ui.showToast(`Loading External Model: ${file.name}...`);
        }
      }
    });
  }

  initResizeListener() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      if (this.graphicsManager) {
        this.graphicsManager.applyAll();
      } else {
        this.renderer.setSize(this.width, this.height);
      }
    });
  }

  /**
   * Main Simulation Loop
   */
  animate(currentTime) {
    requestAnimationFrame(this.animate);
    if (this.isContextLost) return;

    const rawDt = Math.min(0.05, (currentTime - this.lastTime) * 0.001);
    this.lastTime = currentTime;

    // In Damage Photography Mode, freeze physics loop completely
    if (this.photoMode.isActive) {
      this.photoMode.updateCamera();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // In Replay Playback mode, animate buffer playback
    if (this.replay.isPlaying) {
      this.replay.update(rawDt);
      this.updateCamera(rawDt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Normal Driving Simulation Mode
    const inputState = this.input.update(rawDt);
    this.mobile.update(rawDt);

    const simDt = rawDt * inputState.dtScale;

    // Fixed Sub-Stepping at 2000Hz (dt = 0.0005s)
    if (simDt > 0) {
      this.physicsAccumulator += simDt;
      const subStepDt = this.solver.dt; // 0.0005s
      const maxSubStepsPerFrame = 35;
      let stepsRun = 0;

      // Calculate vehicle velocity and speed
      let avgVx = 0, avgVy = 0, avgVz = 0;
      let cx = 0, cy = 0, cz = 0;
      const numNodes = this.solver.nodes.length;
      if (numNodes > 0) {
        for (let i = 0; i < numNodes; i++) {
          avgVx += this.solver.nodes[i].velocity[0];
          avgVy += this.solver.nodes[i].velocity[1];
          avgVz += this.solver.nodes[i].velocity[2];
          cx += this.solver.nodes[i].position[0];
          cy += this.solver.nodes[i].position[1];
          cz += this.solver.nodes[i].position[2];
        }
        avgVx /= numNodes; avgVy /= numNodes; avgVz /= numNodes;
        cx /= numNodes; cy /= numNodes; cz /= numNodes;
      }
      const speedMs = Math.hypot(avgVx, avgVz);

      // Wheel speeds for powertrain
      const wL = this.solver.wheels[2] ? this.solver.wheels[2].angularVelocity : 0;
      const wR = this.solver.wheels[3] ? this.solver.wheels[3].angularVelocity : 0;

      // Update powertrain transmission
      const pwr = this.powertrain.update(
        rawDt, wL, wR, inputState.throttle, inputState.brake, inputState.handbrake
      );

      // Distribute drive and brake torques to wheels
      if (this.solver.wheels.length >= 4) {
        this.solver.wheels[0].brakeTorque = pwr.frontBrake;
        this.solver.wheels[1].brakeTorque = pwr.frontBrake;
        this.solver.wheels[2].brakeTorque = pwr.rearBrake;
        this.solver.wheels[3].brakeTorque = pwr.rearBrake;

        this.solver.wheels[2].driveTorque = pwr.torqueL;
        this.solver.wheels[3].driveTorque = pwr.torqueR;
      }

      // Weather surface grip factor
      const gripFactor = this.weather ? this.weather.gripMultiplier : 1.0;

      while (this.physicsAccumulator >= subStepDt && stepsRun < maxSubStepsPerFrame) {
        this.solver.subStep({
          steer: inputState.steer * 0.48, // max 27.5 degrees steering angle
          chassisSpeed: speedMs,
          wingAngleCoeff: 0.8 + (this.tuningSuite.currentTuning.wingAngleDeg / 18.0) * 0.4,
          gripMultiplier: gripFactor
        });
        this.physicsAccumulator -= subStepDt;
        stepsRun++;
      }

      // Update Flexbody visual deformation
      if (this.flexbody) {
        this.flexbody.updateMeshDeformation();
      }

      // Update Wheel Visual Mesh Positions & Steering Angles
      this.updateWheelMeshes(inputState.steer);

      // Environment, Weather & Particles
      this.environment.update(simDt);
      this.weather.update(simDt, { x: cx, y: cy, z: cz });
      this.sparks.update(simDt);

      // Update replay capture buffer
      this.replay.update(simDt);

      // Scrape Sparks Trigger
      for (let i = 0; i < numNodes; i++) {
        const n = this.solver.nodes[i];
        if (n.inContact && (n.tag === 'chassis' || n.tag === 'front_bumper')) {
          const vMag = Math.hypot(n.velocity[0], n.velocity[2]);
          if (vMag > 5.0) {
            this.sparks.emit(n.position[0], n.position[1], n.position[2], n.velocity[0], n.velocity[1], n.velocity[2], 3);
            if (window.AndroidBridge && currentTime - (this._lastScrapeVibrate || 0) > 150) {
              this._lastScrapeVibrate = currentTime;
              window.AndroidBridge.vibrate(15);
            }
          }
        }
      }

      // Audio frequency modulation
      if (this.engineOsc && this.engineGain) {
        const targetFreq = 45 + (pwr.rpm / 9000) * 380;
        this.engineOsc.frequency.setValueAtTime(targetFreq, this.audioCtx.currentTime);
        this.engineGain.gain.setValueAtTime(0.02 + inputState.throttle * 0.05, this.audioCtx.currentTime);
      }

      // Update UI Telemetry
      const gForceVal = 1.0 + (Math.hypot(avgVx, avgVz) * 0.04);
      this.ui.updateTelemetry({
        speedMs,
        rpm: pwr.rpm,
        maxRpm: this.engine.redlineRPM,
        gear: pwr.gearDisplay,
        boostPSI: pwr.boost,
        coolantTempC: pwr.coolantTemp,
        gForce: gForceVal,
        damagedBeams: this.solver.brokenBeamCount,
        tires: this.solver.wheels
      });
    }

    // Update Camera
    this.updateCamera(rawDt);

    // Update Sun shadow follow
    if (this.sun && this.vehicleData && this.vehicleData.rootGroup) {
      this.sun.target.position.copy(this.vehicleData.rootGroup.position);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateWheelMeshes(steer) {
    if (!this.vehicleData || !this.vehicleData.wheels) return;
    const wheels = this.vehicleData.wheels;

    // Synchronize wheel meshes to physical hub node positions
    const syncWheel = (mesh, physWheel, isFront) => {
      if (!mesh || !physWheel || !physWheel.nodeHub) return;
      const hub = physWheel.nodeHub;
      mesh.position.set(hub.position[0], hub.position[1], hub.position[2]);

      // Steering angle
      if (isFront) {
        mesh.rotation.y = steer * 0.48;
      }
      // Spin
      mesh.rotation.x += physWheel.angularVelocity * 0.016;
    };

    syncWheel(wheels.wheelFL, this.solver.wheels[0], true);
    syncWheel(wheels.wheelFR, this.solver.wheels[1], true);
    syncWheel(wheels.wheelRL, this.solver.wheels[2], false);
    syncWheel(wheels.wheelRR, this.solver.wheels[3], false);

    // Interior Steering Wheel Rotation
    if (this.vehicleData.steeringWheelMesh) {
      this.vehicleData.steeringWheelMesh.rotation.z = -steer * 2.8;
    }
  }

  /**
   * Camera View Director (Modes 1-7)
   */
  updateCamera(dt) {
    // Determine vehicle center of mass
    let cx = 0, cy = 0, cz = 0;
    const numNodes = this.solver.nodes.length;
    if (numNodes === 0) return;

    for (let i = 0; i < numNodes; i++) {
      cx += this.solver.nodes[i].position[0];
      cy += this.solver.nodes[i].position[1];
      cz += this.solver.nodes[i].position[2];
    }
    cx /= numNodes; cy /= numNodes; cz /= numNodes;

    if (this.cameraMode === 1) {
      // 1. Dynamic Spring-Damped Chase Cam with velocity look-ahead
      const targetPos = new THREE.Vector3(cx, cy + 1.85, cz + 5.8);
      this.camera.position.lerp(targetPos, 0.12);
      this.camera.lookAt(cx, cy + 0.65, cz);
    } else if (this.cameraMode === 2) {
      // 2. Cockpit / Interior Cam (Driver head eye-level overlooking tachometer)
      this.camera.position.set(cx - 0.38, cy + 0.92, cz + 0.12);
      this.camera.lookAt(cx - 0.38, cy + 0.85, cz + 25.0);
    } else if (this.cameraMode === 3) {
      // 3. Hood Cam (Cowl / frunk overlooking front fenders)
      this.camera.position.set(cx, cy + 0.82, cz + 0.75);
      this.camera.lookAt(cx, cy + 0.65, cz + 30.0);
    } else if (this.cameraMode === 4) {
      // 4. Bumper Cam (Ground-skimming front bumper view for intense speed sensation)
      this.camera.position.set(cx, cy + 0.28, cz + 2.15);
      this.camera.lookAt(cx, cy + 0.25, cz + 40.0);
    } else if (this.cameraMode === 5) {
      // 5. Wheel / Suspension Cam (Pointed at front-left wheel flexing and compressing)
      this.camera.position.set(cx - 1.25, cy + 0.45, cz + 1.6);
      this.camera.lookAt(cx - 0.8, cy + 0.35, cz + 1.2);
    } else if (this.cameraMode === 6) {
      // 6. Helicopter / Cinematic Fly-by Cam
      this.camera.position.set(cx + 18, cy + 14, cz + 18);
      this.camera.lookAt(cx, cy, cz);
    } else if (this.cameraMode === 7) {
      // 7. Orbit / Inspection Cam
      this.orbitAngle.theta += dt * 0.3;
      const ox = cx + Math.sin(this.orbitAngle.theta) * this.orbitAngle.radius;
      const oz = cz + Math.cos(this.orbitAngle.theta) * this.orbitAngle.radius;
      const oy = cy + 2.2;
      this.camera.position.set(ox, oy, oz);
      this.camera.lookAt(cx, cy + 0.5, cz);
    }
  }
}

function initSimulation() {
  if (!window.simApp) {
    try {
      window.simApp = new SimulationApplication();
    } catch (err) {
      console.error('SimulationApplication failed to start:', err);
    }
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initSimulation);
} else {
  initSimulation();
}
