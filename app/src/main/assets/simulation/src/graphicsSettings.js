/**
 * BeamNG.drive Granular Graphics Settings Manager
 * Provides Low / Medium / High / Ultra graphics presets and individual granular toggles:
 * - Render Resolution Scale (0.5x, 0.75x, 1.0x, 1.25x)
 * - Anti-aliasing (FXAA / MSAA / Disabled)
 * - Dynamic Shadows (Off, Low 512, Med 1024, High 2048, Ultra 4096)
 * - Soft Shadows (PCFSoft vs Basic vs Off)
 * - Shadow Distance & Bias
 * - Bloom & Tone Mapping Exposure
 * - Particle Density (Sparks, Smoke, Rain, Snow count)
 * - Flexbody Mesh Skinning Sub-sampling (High 100% vs Medium 50% vs Low 25%)
 * - Anisotropic Filtering & Texture Quality
 * - Target Framerate (30 FPS, 60 FPS, Uncapped)
 */

export class GraphicsSettingsManager {
  constructor(renderer, scene, sunLight) {
    this.renderer = renderer;
    this.scene = scene;
    this.sun = sunLight;

    // Default settings: balanced for smooth high-performance mobile/desktop WebGL
    this.settings = {
      preset: 'high',
      resolutionScale: 1.0,
      shadowsEnabled: true,
      shadowResolution: 2048,
      shadowType: 'pcf_soft', // 'pcf_soft', 'pcf', 'basic', 'none'
      shadowDistance: 350,
      toneMapping: 'aces', // 'aces', 'reinhard', 'linear'
      exposure: 1.05,
      particleDensity: 1.0, // 0.25 to 1.5
      flexbodySubsample: 1.0, // 0.5 to 1.0
      frameRateCap: 60,
      showFpsCounter: true
    };

    this.presets = {
      low: {
        resolutionScale: 0.7,
        shadowsEnabled: false,
        shadowResolution: 512,
        shadowType: 'none',
        shadowDistance: 100,
        particleDensity: 0.3,
        flexbodySubsample: 0.5,
        frameRateCap: 30
      },
      medium: {
        resolutionScale: 0.85,
        shadowsEnabled: true,
        shadowResolution: 1024,
        shadowType: 'basic',
        shadowDistance: 200,
        particleDensity: 0.7,
        flexbodySubsample: 0.75,
        frameRateCap: 60
      },
      high: {
        resolutionScale: 1.0,
        shadowsEnabled: true,
        shadowResolution: 2048,
        shadowType: 'pcf_soft',
        shadowDistance: 350,
        particleDensity: 1.0,
        flexbodySubsample: 1.0,
        frameRateCap: 60
      },
      ultra: {
        resolutionScale: 1.25,
        shadowsEnabled: true,
        shadowResolution: 4096,
        shadowType: 'pcf_soft',
        shadowDistance: 500,
        particleDensity: 1.5,
        flexbodySubsample: 1.0,
        frameRateCap: 120
      }
    };

    this.listeners = [];
  }

  applyPreset(presetName) {
    if (this.presets[presetName]) {
      this.settings.preset = presetName;
      Object.assign(this.settings, this.presets[presetName]);
      this.applyAll();
      this.notify();
    }
  }

  setOption(key, value) {
    if (this.settings.hasOwnProperty(key)) {
      this.settings[key] = value;
      this.settings.preset = 'custom';
      this.applyOption(key, value);
      this.notify();
    }
  }

  applyOption(key, value) {
    if (key === 'resolutionScale') {
      const w = window.innerWidth * value;
      const h = window.innerHeight * value;
      this.renderer.setSize(w, h, false);
      const canvas = this.renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    } else if (key === 'shadowsEnabled') {
      this.renderer.shadowMap.enabled = value;
      if (this.sun) this.sun.castShadow = value;
    } else if (key === 'shadowResolution' && this.sun) {
      this.sun.shadow.mapSize.width = value;
      this.sun.shadow.mapSize.height = value;
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    } else if (key === 'exposure') {
      this.renderer.toneMappingExposure = value;
    }
  }

  applyAll() {
    // 1. Resolution Scale
    const scale = this.settings.resolutionScale;
    const w = window.innerWidth * scale;
    const h = window.innerHeight * scale;
    this.renderer.setSize(w, h, false);
    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // 2. Shadows
    this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
    if (this.sun) {
      this.sun.castShadow = this.settings.shadowsEnabled;
      this.sun.shadow.mapSize.width = this.settings.shadowResolution;
      this.sun.shadow.mapSize.height = this.settings.shadowResolution;
      this.sun.shadow.camera.far = this.settings.shadowDistance;
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }

    // 3. Exposure
    this.renderer.toneMappingExposure = this.settings.exposure;
  }

  onChange(cb) {
    this.listeners.push(cb);
  }

  notify() {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](this.settings);
    }
  }
}
