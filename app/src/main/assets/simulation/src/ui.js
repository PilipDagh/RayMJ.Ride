/**
 * BeamNG.drive Architecture Simulation UI & Telemetry HUD Engine
 * Analog/Digital Speedometer, Tachometer, Gear Readout, G-Force Vector,
 * Tire Pressure Pods, ESC Drawer, Vehicle Selector, Tuning Panel,
 * Main Menu, Graphics Settings, Replay Bar, Damage Photography, Weather Controls
 */

import { VEHICLE_ROSTER } from './vehicles.js';

export class SimulationUI {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;

    // Cache HUD DOM elements
    this.speedDisplay = document.getElementById('speed-val');
    this.gearDisplay = document.getElementById('gear-val');
    this.rpmBar = document.getElementById('rpm-fill');
    this.gaugeProgress = document.getElementById('gauge-progress-circle');
    this.gForceDisplay = document.getElementById('telemetry-gforce');
    this.boostDisplay = document.getElementById('telemetry-boost');
    this.tempDisplay = document.getElementById('telemetry-temp');
    this.damageDisplay = document.getElementById('telemetry-damage');

    // Tire cells
    this.tireFL = document.getElementById('tire-fl');
    this.tireFR = document.getElementById('tire-fr');
    this.tireRL = document.getElementById('tire-rl');
    this.tireRR = document.getElementById('tire-rr');

    // Drawer & Modals
    this.drawerOverlay = document.getElementById('drawer-overlay');
    this.mainMenuOverlay = document.getElementById('main-menu-overlay');
    this.toastContainer = document.getElementById('toast-container');
    this.aiPitBody = document.getElementById('ai-pit-text');

    // Specialized Toolbars
    this.photoBar = document.getElementById('photo-mode-bar');
    this.replayBar = document.getElementById('replay-bar');

    this.currentTab = 'vehicles';
    this.unitKmh = true;

    this.initMainMenu();
    this.initDrawer();
    this.initPhotoModeBar();
    this.initReplayBar();
  }

  showToast(message) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2600);
  }

  setAIPitMessage(text) {
    if (this.aiPitBody) {
      this.aiPitBody.innerText = text;
    }
  }

  initMainMenu() {
    const btnPlay = document.getElementById('menu-btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.toggleMainMenu(false);
        this.showToast('Starting Soft-Body Physics Simulation');
      });
    }

    const btnVehicles = document.getElementById('menu-btn-vehicles');
    if (btnVehicles) {
      btnVehicles.addEventListener('click', () => {
        this.toggleMainMenu(false);
        this.openTab('vehicles');
      });
    }

    const btnMaps = document.getElementById('menu-btn-maps');
    if (btnMaps) {
      btnMaps.addEventListener('click', () => {
        this.toggleMainMenu(false);
        this.openTab('environments');
      });
    }

    const btnPhoto = document.getElementById('menu-btn-photo');
    if (btnPhoto) {
      btnPhoto.addEventListener('click', () => {
        this.toggleMainMenu(false);
        if (this.callbacks.onTogglePhotoMode) {
          this.callbacks.onTogglePhotoMode(true);
        }
      });
    }

    const btnSettings = document.getElementById('menu-btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        this.toggleMainMenu(false);
        this.openTab('graphics');
      });
    }
  }

  toggleMainMenu(force) {
    if (!this.mainMenuOverlay) return;
    const isVisible = this.mainMenuOverlay.style.display !== 'none';
    const nextState = force !== undefined ? force : !isVisible;
    this.mainMenuOverlay.style.display = nextState ? 'flex' : 'none';
  }

  initPhotoModeBar() {
    const btnSnap = document.getElementById('photo-btn-snap');
    if (btnSnap) {
      btnSnap.addEventListener('click', () => {
        if (this.callbacks.onPhotoCapture) {
          this.callbacks.onPhotoCapture();
          this.showToast('Damage Photo Captured & Saved!');
        }
      });
    }

    const btnExit = document.getElementById('photo-btn-exit');
    if (btnExit) {
      btnExit.addEventListener('click', () => {
        if (this.callbacks.onTogglePhotoMode) {
          this.callbacks.onTogglePhotoMode(false);
        }
      });
    }

    const fovSlider = document.getElementById('photo-fov-slider');
    const fovVal = document.getElementById('photo-fov-val');
    if (fovSlider && fovVal) {
      fovSlider.addEventListener('input', (e) => {
        fovVal.innerText = `${e.target.value}°`;
        if (this.callbacks.onPhotoFov) {
          this.callbacks.onPhotoFov(parseFloat(e.target.value));
        }
      });
    }

    const filterSelect = document.getElementById('photo-filter-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        if (this.callbacks.onPhotoFilter) {
          this.callbacks.onPhotoFilter(e.target.value);
        }
      });
    }

    const expSlider = document.getElementById('photo-exposure-slider');
    if (expSlider) {
      expSlider.addEventListener('input', (e) => {
        if (this.callbacks.onPhotoExposure) {
          this.callbacks.onPhotoExposure(parseFloat(e.target.value));
        }
      });
    }
  }

  setPhotoModeVisible(visible) {
    if (this.photoBar) {
      this.photoBar.style.display = visible ? 'flex' : 'none';
    }
    const bottomCluster = document.getElementById('hud-bottom-cluster');
    if (bottomCluster) {
      bottomCluster.style.display = visible ? 'none' : 'flex';
    }
    if (visible) {
      this.showToast('Damage Photography Mode Active (Orbit camera around impact)');
    }
  }

  initReplayBar() {
    const btnRecord = document.getElementById('replay-btn-record');
    if (btnRecord) {
      btnRecord.addEventListener('click', () => {
        if (this.callbacks.onReplayRecord) this.callbacks.onReplayRecord();
        this.showToast('Recording Crash & Deformation...');
      });
    }

    const btnPlay = document.getElementById('replay-btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (this.callbacks.onReplayPlay) this.callbacks.onReplayPlay();
      });
    }

    const btnPause = document.getElementById('replay-btn-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (this.callbacks.onReplayPause) this.callbacks.onReplayPause();
      });
    }

    const btnLive = document.getElementById('replay-btn-live');
    if (btnLive) {
      btnLive.addEventListener('click', () => {
        if (this.callbacks.onReplayLive) this.callbacks.onReplayLive();
        this.setReplayBarVisible(false);
        this.showToast('Resumed Live Simulation');
      });
    }

    const scrubber = document.getElementById('replay-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        if (this.callbacks.onReplaySeek) {
          this.callbacks.onReplaySeek(parseFloat(e.target.value));
        }
      });
    }

    const speedSelect = document.getElementById('replay-speed-select');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        if (this.callbacks.onReplaySpeed) {
          this.callbacks.onReplaySpeed(parseFloat(e.target.value));
        }
      });
    }

    const btnSave = document.getElementById('replay-btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        if (this.callbacks.onReplaySave) {
          this.callbacks.onReplaySave();
          this.showToast('Replay Clip Saved to Gallery!');
        }
      });
    }
  }

  setReplayBarVisible(visible) {
    if (this.replayBar) {
      this.replayBar.style.display = visible ? 'flex' : 'none';
    }
  }

  updateReplayTimeline(progress01, currentFrame, totalFrames) {
    const scrubber = document.getElementById('replay-scrubber');
    const timeText = document.getElementById('replay-time-text');
    if (scrubber && document.activeElement !== scrubber) {
      scrubber.value = progress01;
    }
    if (timeText) {
      const curSec = (currentFrame / 30.0).toFixed(1);
      const totSec = (totalFrames / 30.0).toFixed(1);
      timeText.innerText = `${curSec}s / ${totSec}s`;
    }
  }

  updateTelemetry(data) {
    const {
      speedMs = 0,
      rpm = 850,
      maxRpm = 9000,
      gear = '1',
      boostPSI = 0,
      coolantTempC = 90,
      gForce = 1.0,
      damagedBeams = 0,
      tires = []
    } = data;

    // Speed calculation
    const speed = this.unitKmh ? Math.round(speedMs * 3.6) : Math.round(speedMs * 2.23694);
    if (this.speedDisplay) {
      this.speedDisplay.innerText = speed.toString();
    }

    // Gear
    if (this.gearDisplay) {
      this.gearDisplay.innerText = gear;
    }

    // RPM Gauge Progress
    const rpmFrac = Math.max(0, Math.min(1.0, (rpm - 800) / (maxRpm - 800)));
    if (this.rpmBar) {
      this.rpmBar.style.width = `${rpmFrac * 100}%`;
    }

    if (this.gaugeProgress) {
      const offset = 565 - (rpmFrac * 565 * 0.75);
      this.gaugeProgress.style.strokeDashoffset = offset.toString();
      if (rpm > maxRpm * 0.92) {
        this.gaugeProgress.style.stroke = '#ef4444';
      } else {
        this.gaugeProgress.style.stroke = '#ff6b00';
      }
    }

    // Telemetry readouts
    if (this.gForceDisplay) this.gForceDisplay.innerText = `${gForce.toFixed(2)} G`;
    if (this.boostDisplay) this.boostDisplay.innerText = `${boostPSI.toFixed(1)} PSI`;
    if (this.tempDisplay) {
      this.tempDisplay.innerText = `${Math.round(coolantTempC)} °C`;
      this.tempDisplay.style.color = coolantTempC > 125 ? '#ef4444' : '#f1f5f9';
    }
    if (this.damageDisplay) {
      this.damageDisplay.innerText = damagedBeams > 0 ? `${damagedBeams} Broken` : 'Nominal';
    }

    // Tires
    if (tires.length >= 4) {
      const updateTireCell = (cell, tire) => {
        if (!cell) return;
        const valEl = cell.querySelector('.tire-val');
        if (valEl) valEl.innerText = `${Math.round(tire.pressurePSI)} PSI`;
        if (tire.isBlown) {
          cell.classList.add('blown');
        } else {
          cell.classList.remove('blown');
        }
      };

      updateTireCell(this.tireFL, tires[0]);
      updateTireCell(this.tireFR, tires[1]);
      updateTireCell(this.tireRL, tires[2]);
      updateTireCell(this.tireRR, tires[3]);
    }
  }

  toggleDrawer(force) {
    if (!this.drawerOverlay) return;
    const isVisible = this.drawerOverlay.style.display === 'flex';
    const nextState = force !== undefined ? force : !isVisible;

    this.drawerOverlay.style.display = nextState ? 'flex' : 'none';
    if (nextState) {
      this.renderDrawerContent();
    }
  }

  openTab(tabName) {
    this.currentTab = tabName;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
      if (t.dataset.tab === tabName) t.classList.add('active');
      else t.classList.remove('active');
    });
    this.toggleDrawer(true);
  }

  initDrawer() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.renderDrawerContent();
      });
    });

    const closeBtn = document.getElementById('drawer-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggleDrawer(false));
    }

    // Top action buttons
    const bindBtn = (id, tabName) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => this.openTab(tabName));
      }
    };

    bindBtn('btn-top-vehicles', 'vehicles');
    bindBtn('btn-top-maps', 'environments');
    bindBtn('btn-top-weather', 'weather');
    bindBtn('btn-top-settings', 'graphics');

    const btnMenu = document.getElementById('btn-top-menu');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => this.toggleMainMenu(true));
    }

    const btnPhoto = document.getElementById('btn-top-photo');
    if (btnPhoto) {
      btnPhoto.addEventListener('click', () => {
        if (this.callbacks.onTogglePhotoMode) {
          this.callbacks.onTogglePhotoMode(true);
        }
      });
    }

    const btnReplay = document.getElementById('btn-top-replay');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        this.setReplayBarVisible(true);
        if (this.callbacks.onReplayPlay) this.callbacks.onReplayPlay();
        this.showToast('Replay Scrubbing Active');
      });
    }

    const btnReset = document.getElementById('btn-top-reset');
    if (btnReset && this.callbacks.onReset) {
      btnReset.addEventListener('click', () => this.callbacks.onReset());
    }
  }

  renderDrawerContent() {
    const container = document.getElementById('drawer-content-body');
    if (!container) return;
    container.innerHTML = '';

    if (this.currentTab === 'vehicles') {
      this.renderVehiclesTab(container);
    } else if (this.currentTab === 'environments') {
      this.renderEnvironmentsTab(container);
    } else if (this.currentTab === 'weather') {
      this.renderWeatherTab(container);
    } else if (this.currentTab === 'graphics') {
      this.renderGraphicsTab(container);
    } else if (this.currentTab === 'replay') {
      this.renderReplayTab(container);
    } else if (this.currentTab === 'tuning') {
      this.renderTuningTab(container);
    } else if (this.currentTab === 'controls') {
      this.renderControlsTab(container);
    }
  }

  renderVehiclesTab(container) {
    const grid = document.createElement('div');
    grid.className = 'vehicle-grid';

    VEHICLE_ROSTER.forEach(car => {
      const card = document.createElement('div');
      card.className = 'vehicle-card';
      card.innerHTML = `
        <div class="card-title">${car.name}</div>
        <div class="card-specs">
          <div><strong>Type:</strong> ${car.category}</div>
          <div><strong>Engine:</strong> ${car.engineName}</div>
          <div><strong>Power:</strong> ${car.horsepower} HP | ${car.torqueNm} Nm</div>
          <div><strong>Weight:</strong> ${car.weightKg} kg (${car.layout})</div>
          <div><strong>Nodes / Beams:</strong> ${car.nodesCount} / ${car.beamsCount}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        if (this.callbacks.onSelectVehicle) {
          this.callbacks.onSelectVehicle(car.id);
          this.toggleDrawer(false);
          this.showToast(`Spawned ${car.name}`);
        }
      });
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  renderEnvironmentsTab(container) {
    const maps = [
      { id: 'proving_grounds', name: 'Physics Proving Grounds & Crash Testing Grid', desc: '100m Drop Tower, 15°/30°/45° launch ramps, hydraulic car crusher press, concrete barriers.' },
      { id: 'metro_city', name: 'Metro City Center', desc: 'Downtown streets, high-rise colliders, elevated highway overpass, curbs.' },
      { id: 'highland_trails', name: 'Highland Trails & Mud Proving Ground', desc: 'Displacement mud trenches, flexible timber suspension bridge, off-road trails.' },
      { id: 'akina_touge', name: 'Mount Akina Touge Pass', desc: '2-lane mountain pass, downhill hairpins, drainage gutters for gutter runs, guardrails.' },
      { id: 'container_harbor', name: 'Industrial Container Harbor', desc: 'Stackable shipping containers, dock cranes, ocean water immersion hazard.' }
    ];

    const grid = document.createElement('div');
    grid.className = 'vehicle-grid';

    maps.forEach(map => {
      const card = document.createElement('div');
      card.className = 'vehicle-card';
      card.innerHTML = `
        <div class="card-title">${map.name}</div>
        <div class="card-specs">${map.desc}</div>
      `;
      card.addEventListener('click', () => {
        if (this.callbacks.onSelectEnvironment) {
          this.callbacks.onSelectEnvironment(map.id);
          this.toggleDrawer(false);
          this.showToast(`Loaded ${map.name}`);
        }
      });
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  renderWeatherTab(container) {
    const weatherSys = this.callbacks.getWeatherSystem ? this.callbacks.getWeatherSystem() : null;
    const currentHour = weatherSys ? weatherSys.timeOfDay : 14.0;
    const currentWeather = weatherSys ? weatherSys.weatherType : 'clear';
    const isCycleActive = weatherSys ? weatherSys.isCycleActive : false;

    container.innerHTML = `
      <div class="tuning-group">
        <div class="group-title">Time of Day & Sun Arc</div>
        <div class="slider-row">
          <span class="slider-label">Sun Position (Hour):</span>
          <input type="range" class="slider-input" min="0" max="24" step="0.25" value="${currentHour}" id="weather-time-slider">
          <span class="slider-val" id="weather-time-val">${Math.floor(currentHour)}:${Math.floor((currentHour % 1) * 60).toString().padStart(2, '0')}</span>
        </div>
        <div style="display:flex; gap:10px; margin-top:8px;">
          <button class="preset-btn" id="btn-time-morning">🌅 Sunrise (06:30)</button>
          <button class="preset-btn" id="btn-time-noon">☀️ Noon (12:00)</button>
          <button class="preset-btn" id="btn-time-sunset">🌇 Golden (18:30)</button>
          <button class="preset-btn" id="btn-time-midnight">🌙 Midnight (00:00)</button>
        </div>
        <div style="margin-top:14px; display:flex; align-items:center; gap:10px;">
          <label style="font-size:13px; font-weight:700; cursor:pointer;">
            <input type="checkbox" id="check-day-cycle" ${isCycleActive ? 'checked' : ''} style="margin-right:6px;">
            Dynamic Day-Night Cycle (Continuous Sun Arc)
          </label>
        </div>
      </div>

      <div class="tuning-group">
        <div class="group-title">Dynamic Weather & Atmospheric Conditions</div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
          Weather modifies sky color, volumetric fog, dynamic precipitation particles, and <strong>Pacejka '96 tire grip friction coefficients</strong>.
        </p>
        <div class="preset-grid">
          <button class="preset-btn ${currentWeather === 'clear' ? 'active' : ''}" data-weather="clear">☀️ Clear Dry (100% Grip)</button>
          <button class="preset-btn ${currentWeather === 'rain' ? 'active' : ''}" data-weather="rain">🌧️ Rain (65% Grip)</button>
          <button class="preset-btn ${currentWeather === 'fog' ? 'active' : ''}" data-weather="fog">🌫️ Dense Fog (85% Grip)</button>
          <button class="preset-btn ${currentWeather === 'snow' ? 'active' : ''}" data-weather="snow">❄️ Snow & Ice (38% Grip)</button>
        </div>
      </div>
    `;

    const timeSlider = document.getElementById('weather-time-slider');
    const timeVal = document.getElementById('weather-time-val');
    if (timeSlider && timeVal && weatherSys) {
      timeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        weatherSys.setTimeOfDay(val);
        timeVal.innerText = `${Math.floor(val)}:${Math.floor((val % 1) * 60).toString().padStart(2, '0')}`;
      });
    }

    const setTimeBtn = (id, hour) => {
      const el = document.getElementById(id);
      if (el && weatherSys) {
        el.addEventListener('click', () => {
          weatherSys.setTimeOfDay(hour);
          this.renderWeatherTab(container);
          this.showToast(`Set time to ${hour}:00`);
        });
      }
    };
    setTimeBtn('btn-time-morning', 6.5);
    setTimeBtn('btn-time-noon', 12.0);
    setTimeBtn('btn-time-sunset', 18.5);
    setTimeBtn('btn-time-midnight', 0.0);

    const cycleCheck = document.getElementById('check-day-cycle');
    if (cycleCheck && weatherSys) {
      cycleCheck.addEventListener('change', (e) => {
        weatherSys.isCycleActive = e.target.checked;
        weatherSys.dayCycleSpeed = e.target.checked ? 0.3 : 0.0;
        this.showToast(e.target.checked ? 'Day-Night Cycle Active' : 'Day-Night Cycle Paused');
      });
    }

    const weatherBtns = container.querySelectorAll('[data-weather]');
    weatherBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.weather;
        if (weatherSys) {
          weatherSys.setWeather(type);
          this.renderWeatherTab(container);
          this.showToast(`Weather changed to: ${type.toUpperCase()}`);
        }
      });
    });
  }

  renderGraphicsTab(container) {
    const gfxManager = this.callbacks.getGraphicsManager ? this.callbacks.getGraphicsManager() : null;
    const s = gfxManager ? gfxManager.settings : {};

    container.innerHTML = `
      <div class="tuning-group">
        <div class="group-title">Graphics Performance Presets</div>
        <div class="preset-grid">
          <button class="preset-btn ${s.preset === 'low' ? 'active' : ''}" data-preset="low">🟢 Low (Max FPS)</button>
          <button class="preset-btn ${s.preset === 'medium' ? 'active' : ''}" data-preset="medium">🟡 Medium</button>
          <button class="preset-btn ${s.preset === 'high' ? 'active' : ''}" data-preset="high">🟠 High (Default)</button>
          <button class="preset-btn ${s.preset === 'ultra' ? 'active' : ''}" data-preset="ultra">🔴 Ultra AAA</button>
        </div>
      </div>

      <div class="tuning-group">
        <div class="group-title">Granular Rendering Settings</div>
        <div class="slider-row">
          <span class="slider-label">Resolution Scale:</span>
          <input type="range" class="slider-input" min="0.5" max="1.5" step="0.05" value="${s.resolutionScale || 1.0}" id="gfx-scale">
          <span class="slider-val" id="val-gfx-scale">${Math.round((s.resolutionScale || 1.0) * 100)}%</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Shadow Map Resolution:</span>
          <select class="hud-select-mini" id="gfx-shadow-res">
            <option value="512" ${s.shadowResolution === 512 ? 'selected' : ''}>512x512 (Fast)</option>
            <option value="1024" ${s.shadowResolution === 1024 ? 'selected' : ''}>1024x1024 (Balanced)</option>
            <option value="2048" ${s.shadowResolution === 2048 ? 'selected' : ''}>2048x2048 (High)</option>
            <option value="4096" ${s.shadowResolution === 4096 ? 'selected' : ''}>4096x4096 (Ultra)</option>
          </select>
        </div>
        <div class="slider-row">
          <span class="slider-label">Dynamic Shadows:</span>
          <input type="checkbox" id="gfx-shadows-check" ${s.shadowsEnabled ? 'checked' : ''} style="transform:scale(1.3); cursor:pointer;">
        </div>
        <div class="slider-row">
          <span class="slider-label">Exposure & Tone Mapping:</span>
          <input type="range" class="slider-input" min="0.5" max="2.0" step="0.05" value="${s.exposure || 1.05}" id="gfx-exposure">
          <span class="slider-val" id="val-gfx-exp">${(s.exposure || 1.05).toFixed(2)}</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Particle Density (Sparks/Rain):</span>
          <input type="range" class="slider-input" min="0.2" max="1.5" step="0.1" value="${s.particleDensity || 1.0}" id="gfx-particles">
          <span class="slider-val" id="val-gfx-particles">${Math.round((s.particleDensity || 1.0) * 100)}%</span>
        </div>
      </div>
    `;

    if (!gfxManager) return;

    // Preset buttons
    const presetBtns = container.querySelectorAll('[data-preset]');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        gfxManager.applyPreset(btn.dataset.preset);
        this.renderGraphicsTab(container);
        this.showToast(`Applied ${btn.dataset.preset.toUpperCase()} Graphics Preset`);
      });
    });

    const scaleSlider = document.getElementById('gfx-scale');
    const scaleVal = document.getElementById('val-gfx-scale');
    if (scaleSlider && scaleVal) {
      scaleSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        scaleVal.innerText = `${Math.round(val * 100)}%`;
        gfxManager.setOption('resolutionScale', val);
      });
    }

    const shadowRes = document.getElementById('gfx-shadow-res');
    if (shadowRes) {
      shadowRes.addEventListener('change', (e) => {
        gfxManager.setOption('shadowResolution', parseInt(e.target.value));
      });
    }

    const shadowCheck = document.getElementById('gfx-shadows-check');
    if (shadowCheck) {
      shadowCheck.addEventListener('change', (e) => {
        gfxManager.setOption('shadowsEnabled', e.target.checked);
      });
    }

    const expSlider = document.getElementById('gfx-exposure');
    const expVal = document.getElementById('val-gfx-exp');
    if (expSlider && expVal) {
      expSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        expVal.innerText = val.toFixed(2);
        gfxManager.setOption('exposure', val);
      });
    }
  }

  renderReplayTab(container) {
    const replaySys = this.callbacks.getReplaySystem ? this.callbacks.getReplaySystem() : null;
    const saved = replaySys ? replaySys.savedReplays : [];

    container.innerHTML = `
      <div class="tuning-group">
        <div class="group-title">Replay Timeline & Action Capture</div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
          Buffer records 2000Hz soft-body beam deformation, wheel rotations, and telemetry at 30 FPS.
        </p>
        <div style="display:flex; gap:10px;">
          <button class="menu-btn primary-btn" id="btn-replay-open-bar" style="padding:10px 18px; font-size:14px;">
            📼 Open Replay Scrubbing Bar
          </button>
          <button class="hud-btn" id="btn-replay-save-current">
            💾 Save Buffer
          </button>
        </div>
      </div>

      <div class="tuning-group">
        <div class="group-title">Saved Replays Gallery (${saved.length})</div>
        ${saved.length === 0 ? '<p style="font-size:12px; color:var(--text-muted);">No saved replays yet. Crash your car and hit "Save Buffer"!</p>' : ''}
        <div class="vehicle-grid">
          ${saved.map(r => `
            <div class="vehicle-card" data-replay-id="${r.id}">
              <div class="card-title">${r.name}</div>
              <div class="card-specs">Saved: ${r.timestamp} &bull; ${r.frameCount} Frames</div>
              <button class="hud-btn-mini" style="margin-top:8px;">▶ Play Clip</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const openBarBtn = document.getElementById('btn-replay-open-bar');
    if (openBarBtn) {
      openBarBtn.addEventListener('click', () => {
        this.toggleDrawer(false);
        this.setReplayBarVisible(true);
        if (this.callbacks.onReplayPlay) this.callbacks.onReplayPlay();
      });
    }

    const saveBtn = document.getElementById('btn-replay-save-current');
    if (saveBtn && replaySys) {
      saveBtn.addEventListener('click', () => {
        const ok = replaySys.saveCurrentReplay();
        if (ok) {
          this.showToast('Replay saved to gallery!');
          this.renderReplayTab(container);
        } else {
          this.showToast('No replay frames captured yet.');
        }
      });
    }

    const replayCards = container.querySelectorAll('[data-replay-id]');
    replayCards.forEach(card => {
      card.addEventListener('click', () => {
        if (replaySys) {
          replaySys.loadReplay(card.dataset.replayId);
          this.toggleDrawer(false);
          this.setReplayBarVisible(true);
          this.showToast(`Loaded ${card.dataset.replayId}`);
        }
      });
    });
  }

  renderTuningTab(container) {
    const tuningSuite = this.callbacks.getTuningSuite ? this.callbacks.getTuningSuite() : null;
    if (!tuningSuite) return;

    const t = tuningSuite.currentTuning;

    container.innerHTML = `
      <div class="tuning-group">
        <div class="group-title">Powertrain & Forced Induction</div>
        <div class="slider-row">
          <span class="slider-label">Turbo Boost (PSI):</span>
          <input type="range" class="slider-input" min="0" max="30" step="0.5" value="${t.maxBoostPSI}" id="tune-boost">
          <span class="slider-val" id="val-boost">${t.maxBoostPSI} PSI</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Rev Limiter (RPM):</span>
          <input type="range" class="slider-input" min="6000" max="10000" step="100" value="${t.revLimiterRPM}" id="tune-rpm">
          <span class="slider-val" id="val-rpm">${t.revLimiterRPM}</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Nitrous Shot (HP):</span>
          <input type="range" class="slider-input" min="50" max="300" step="25" value="${t.nitrousShotHP}" id="tune-nos">
          <span class="slider-val" id="val-nos">${t.nitrousShotHP} HP</span>
        </div>
      </div>

      <div class="tuning-group">
        <div class="group-title">Suspension & Geometry</div>
        <div class="slider-row">
          <span class="slider-label">Spring Stiffness:</span>
          <input type="range" class="slider-input" min="0.5" max="2.5" step="0.1" value="${t.springStiffnessScale}" id="tune-spring">
          <span class="slider-val" id="val-spring">${t.springStiffnessScale}x</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Damper Rate:</span>
          <input type="range" class="slider-input" min="0.5" max="2.5" step="0.1" value="${t.dampingScale}" id="tune-damp">
          <span class="slider-val" id="val-damp">${t.dampingScale}x</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Front Brake Bias:</span>
          <input type="range" class="slider-input" min="0.50" max="0.85" step="0.02" value="${t.brakeBiasFront}" id="tune-bias">
          <span class="slider-val" id="val-bias">${Math.round(t.brakeBiasFront * 100)}%</span>
        </div>
      </div>

      <div class="tuning-group">
        <div class="group-title">Aesthetics & Finish</div>
        <div class="slider-row">
          <span class="slider-label">Paint Color:</span>
          <input type="color" value="${t.paintColor}" id="tune-color" style="height:32px; width:64px; border:none; border-radius:4px; cursor:pointer;">
          <span class="slider-val"></span>
        </div>
      </div>
    `;

    const bindSlider = (id, valId, key, suffix = '') => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(valId);
      if (el && valEl) {
        el.addEventListener('input', (e) => {
          valEl.innerText = `${e.target.value}${suffix}`;
          tuningSuite.setParam(key, e.target.value);
        });
      }
    };

    bindSlider('tune-boost', 'val-boost', 'maxBoostPSI', ' PSI');
    bindSlider('tune-rpm', 'val-rpm', 'revLimiterRPM', '');
    bindSlider('tune-nos', 'val-nos', 'nitrousShotHP', ' HP');
    bindSlider('tune-spring', 'val-spring', 'springStiffnessScale', 'x');
    bindSlider('tune-damp', 'val-damp', 'dampingScale', 'x');
    bindSlider('tune-bias', 'val-bias', 'brakeBiasFront', '');

    const colorPicker = document.getElementById('tune-color');
    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        tuningSuite.setParam('paintColor', e.target.value);
      });
    }
  }

  renderControlsTab(container) {
    container.innerHTML = `
      <div style="line-height: 1.8; font-size: 13px;">
        <h3 style="color:var(--primary-accent); margin-bottom:8px;">1:1 BeamNG.drive Controls Reference</h3>
        <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>W / S</strong> or <strong>Up / Down</strong></td><td>Throttle / Progressive Brake & Reverse</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>A / D</strong> or <strong>Left / Right</strong></td><td>Steering Angle</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>Space</strong> or <strong>P</strong></td><td>Handbrake</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>Shift / X</strong></td><td>PDK / Manual Shift Up / Shift Down</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>Q</strong></td><td>Toggle Transmission Mode (PDK Auto / Manual)</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>Ctrl + Left Click Drag</strong></td><td><strong>Interactive Node Grabber</strong> (Pull and deform vehicle mesh!)</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>R</strong></td><td>Instant Vehicle Reset to Spawn Point</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>I</strong></td><td>Repair Vehicle In-Place</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>J</strong></td><td>Pause / Resume Physics</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>Alt + Down / Alt + Up</strong></td><td>Slow-Motion Toggle (1x, 2x, 4x, 8x, 16x, 100x)</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>C</strong> / <strong>1-7</strong></td><td>Cycle Camera Views (Chase, Cockpit, Hood, Bumper, Wheel, Heli, Orbit)</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>ESC</strong></td><td>Toggle Main Menu & Simulation Manager</td></tr>
        </table>
        <h3 style="color:var(--secondary-accent); margin-bottom:8px;">Mobile Touch Controls</h3>
        <p>Virtual Rotational Steering Wheel with progressive spring centering, analog vertical-drag pedals, and quick action hotkeys.</p>
      </div>
    `;
  }
}
