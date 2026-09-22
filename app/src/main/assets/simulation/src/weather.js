/**
 * BeamNG.drive Dynamic Weather & Time-of-Day Atmosphere Engine
 * Day-Night Sun/Moon celestial arc, dynamic shadows, ambient sky transitions,
 * Fog density, Rain particle system & wet road reflections, Snow particle system,
 * Wet/Ice/Snow surface friction modifier on Pacejka tire grip.
 */

import * as THREE from '../libs/three.module.js';

export class WeatherSystem {
  constructor(scene, sunLight, hemiLight) {
    this.scene = scene;
    this.sun = sunLight;
    this.hemi = hemiLight;

    // Time of day: 0.0 to 24.0 hours (default: 14.0 = 2 PM sunny afternoon)
    this.timeOfDay = 14.0;
    this.dayCycleSpeed = 0.0; // 0 = static, >0 = speed scale (e.g. 0.2 = 5 min full day)
    this.isCycleActive = false;

    // Weather type: 'clear', 'rain', 'fog', 'snow', 'storm'
    this.weatherType = 'clear';

    // Surface conditions affecting tire grip (multiplier 1.0 = dry asphalt)
    this.gripMultiplier = 1.0;
    this.visibilityDistance = 1000;

    // Particle systems for Precipitation
    this.precipitationGroup = new THREE.Group();
    this.scene.add(this.precipitationGroup);
    this.rainParticles = null;
    this.snowParticles = null;

    // Additional Moon Light
    this.moon = new THREE.DirectionalLight(0x88aaff, 0.0);
    this.moon.position.set(-80, -140, -60);
    this.scene.add(this.moon);

    this.initPrecipitation();
    this.applyTimeAndWeather();
  }

  initPrecipitation() {
    // 1. Rain Particles (Instanced or Points)
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      rainPositions[i * 3 + 1] = Math.random() * 35;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      rainVelocities[i] = 25 + Math.random() * 20;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainVelocities = rainVelocities;

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.18,
      transparent: true,
      opacity: 0.75,
      blending: THREE.NormalBlending
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.precipitationGroup.add(this.rainParticles);

    // 2. Snow Particles
    const snowCount = 1500;
    const snowGeo = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);
    const snowVelocities = new Float32Array(snowCount);

    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      snowPositions[i * 3 + 1] = Math.random() * 30;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      snowVelocities[i] = 2.5 + Math.random() * 3.5;
    }

    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    this.snowVelocities = snowVelocities;

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.32,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.snowParticles = new THREE.Points(snowGeo, snowMat);
    this.snowParticles.visible = false;
    this.precipitationGroup.add(this.snowParticles);
  }

  setTimeOfDay(hour) {
    this.timeOfDay = ((hour % 24) + 24) % 24;
    this.applyTimeAndWeather();
  }

  setWeather(type) {
    this.weatherType = type;
    this.applyTimeAndWeather();
  }

  applyTimeAndWeather() {
    const t = this.timeOfDay;
    // Calculate solar angle (noon = 12h = sun at peak, 6h = sunrise, 18h = sunset, 0h = midnight)
    const sunAngle = ((t - 6.0) / 24.0) * Math.PI * 2.0;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 0.8;
    const sunZ = Math.cos(sunAngle * 0.5) * 0.4;

    const isDay = sunY > 0;
    const dayFactor = Math.max(0, Math.min(1.0, sunY * 3.0));

    // Base Sky & Fog Colors
    let skyColor = new THREE.Color(0x0f172a);
    let fogDensity = 0.0035;

    // Morning / Evening sunset golden hour
    if (t >= 5.5 && t <= 7.5) {
      // Sunrise
      skyColor.set(0xff7733).lerp(new THREE.Color(0x38bdf8), (t - 5.5) / 2.0);
    } else if (t > 7.5 && t < 17.0) {
      // Daylight Blue
      skyColor.set(0x38bdf8);
    } else if (t >= 17.0 && t <= 19.5) {
      // Sunset Golden / Magenta
      skyColor.set(0xf97316).lerp(new THREE.Color(0x312e81), (t - 17.0) / 2.5);
    } else {
      // Deep Night Sky
      skyColor.set(0x050b14);
    }

    // Weather modifications
    this.gripMultiplier = 1.0;
    if (this.weatherType === 'clear') {
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.snowParticles) this.snowParticles.visible = false;
      this.gripMultiplier = 1.0;
      fogDensity = isDay ? 0.0025 : 0.004;
    } else if (this.weatherType === 'rain') {
      if (this.rainParticles) this.rainParticles.visible = true;
      if (this.snowParticles) this.snowParticles.visible = false;
      this.gripMultiplier = 0.65; // Wet asphalt slip
      skyColor.lerp(new THREE.Color(0x475569), 0.75); // Overcast gray
      fogDensity = 0.008;
    } else if (this.weatherType === 'fog') {
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.snowParticles) this.snowParticles.visible = false;
      this.gripMultiplier = 0.85; // Moist surface
      skyColor.lerp(new THREE.Color(0x64748b), 0.8);
      fogDensity = 0.028; // Heavy Dense Fog
    } else if (this.weatherType === 'snow') {
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.snowParticles) this.snowParticles.visible = true;
      this.gripMultiplier = 0.38; // Slippery icy packed snow
      skyColor.lerp(new THREE.Color(0x94a3b8), 0.7);
      fogDensity = 0.012;
    } else if (this.weatherType === 'storm') {
      if (this.rainParticles) this.rainParticles.visible = true;
      if (this.snowParticles) this.snowParticles.visible = false;
      this.gripMultiplier = 0.52; // Standing water hydroplaning risk
      skyColor.lerp(new THREE.Color(0x1e293b), 0.9);
      fogDensity = 0.016;
    }

    // Apply to Scene Background & Fog
    this.scene.background.copy(skyColor);
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyColor);
      this.scene.fog.density = fogDensity;
    }

    // Directional Sun lighting
    if (this.sun) {
      const sunDist = 160;
      this.sun.position.set(sunX * sunDist, Math.max(5, sunY * sunDist), (sunZ + 0.3) * sunDist);

      let sunIntensity = Math.max(0.05, dayFactor * 1.45);
      if (this.weatherType === 'rain' || this.weatherType === 'storm') {
        sunIntensity *= 0.35;
      } else if (this.weatherType === 'fog') {
        sunIntensity *= 0.25;
      } else if (this.weatherType === 'snow') {
        sunIntensity *= 0.55;
      }
      this.sun.intensity = sunIntensity;

      if (t >= 6.0 && t <= 8.0) {
        this.sun.color.set(0xffaa44);
      } else if (t >= 16.5 && t <= 19.5) {
        this.sun.color.set(0xff7722);
      } else {
        this.sun.color.set(0xfffaed);
      }
    }

    // Hemisphere Ambient Lighting
    if (this.hemi) {
      const hemiSky = skyColor.clone().multiplyScalar(0.7);
      const hemiGround = new THREE.Color(0x0f172a);
      this.hemi.color.copy(hemiSky);
      this.hemi.groundColor.copy(hemiGround);
      this.hemi.intensity = Math.max(0.18, dayFactor * 0.65);
    }

    // Moon illumination at night
    if (this.moon) {
      if (!isDay) {
        const moonFactor = Math.abs(Math.min(0, sunY));
        this.moon.intensity = moonFactor * 0.35;
        this.moon.position.set(-sunX * 120, -sunY * 120, -sunZ * 120);
      } else {
        this.moon.intensity = 0.0;
      }
    }
  }

  update(dt, carPos = { x: 0, y: 0, z: 0 }) {
    // Dynamic Day-Night cycle progression
    if (this.isCycleActive && this.dayCycleSpeed > 0) {
      this.timeOfDay = (this.timeOfDay + dt * this.dayCycleSpeed) % 24.0;
      this.applyTimeAndWeather();
    }

    // Reposition precipitation relative to vehicle
    if (this.precipitationGroup) {
      this.precipitationGroup.position.set(carPos.x, 0, carPos.z);
    }

    // Animate Rain
    if (this.rainParticles && this.rainParticles.visible) {
      const posAttr = this.rainParticles.geometry.attributes.position;
      const arr = posAttr.array;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] -= this.rainVelocities[i] * dt;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 30 + Math.random() * 5;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 80;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Animate Snow
    if (this.snowParticles && this.snowParticles.visible) {
      const posAttr = this.snowParticles.geometry.attributes.position;
      const arr = posAttr.array;
      const count = arr.length / 3;

      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] -= this.snowVelocities[i] * dt;
        arr[i * 3 + 0] += Math.sin(arr[i * 3 + 1] * 0.5 + i) * 0.02;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 25 + Math.random() * 5;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 80;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
      }
      posAttr.needsUpdate = true;
    }
  }
}
