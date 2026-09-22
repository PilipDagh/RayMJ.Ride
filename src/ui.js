/**
 * BeamNG.drive Architecture Simulation UI & Telemetry HUD Engine
 * Analog/Digital Speedometer, Tachometer, Gear Readout, G-Force Vector,
 * Tire Pressure Pods, ESC Drawer, Vehicle Selector, Tuning Panel, AI Pit Crew Dialogue
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
    this.toastContainer = document.getElementById('toast-container');
    this.aiPitBody = document.getElementById('ai-pit-text');

    this.currentTab = 'vehicles';
    this.unitKmh = true;

    this.initDrawer();
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
      // Circumference is approx 565
      const offset = 565 - (rpmFrac * 565 * 0.75); // 270 degree sweep
      this.gaugeProgress.style.strokeDashoffset = offset.toString();
      if (rpm > maxRpm * 0.92) {
        this.gaugeProgress.style.stroke = '#ef4444'; // Redline glow
      } else {
        this.gaugeProgress.style.stroke = '#ff6b00';
      }
    }

    // Telemetry readouts
    if (this.gForceDisplay) this.gForceDisplay.innerText = `${gForce.toFixed(2)} G`;
    if (this.boostDisplay) this.boostDisplay.innerText = `${boostPSI.toFixed(1)} PSI`;
    if (this.tempDisplay) {
      this.tempDisplay.innerText = `${Math.round(coolantTempC)} °C`;
      if (coolantTempC > 125) {
        this.tempDisplay.style.color = '#ef4444';
      } else {
        this.tempDisplay.style.color = '#f1f5f9';
      }
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

  toggleDrawer(open) {
    if (!this.drawerOverlay) return;
    const shouldOpen = open !== undefined ? open : (this.drawerOverlay.style.display !== 'flex');
    this.drawerOverlay.style.display = shouldOpen ? 'flex' : 'none';
    if (shouldOpen) {
      this.renderDrawerContent();
    }
  }

  initDrawer() {
    // Tab switching
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
    const btnVehicles = document.getElementById('btn-top-vehicles');
    if (btnVehicles) btnVehicles.addEventListener('click', () => {
      this.currentTab = 'vehicles';
      this.toggleDrawer(true);
    });

    const btnMaps = document.getElementById('btn-top-maps');
    if (btnMaps) btnMaps.addEventListener('click', () => {
      this.currentTab = 'environments';
      this.toggleDrawer(true);
    });

    const btnTuning = document.getElementById('btn-top-tuning');
    if (btnTuning) btnTuning.addEventListener('click', () => {
      this.currentTab = 'tuning';
      this.toggleDrawer(true);
    });

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

    // Bind slider listeners
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
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>Shift + C</strong> / <strong>F7</strong></td><td>Free Camera Toggle / Teleport Vehicle to Camera Look-At</td></tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding:6px 0;"><strong>Ctrl + B</strong></td><td>Toggle Soft-Body Node & Beam Wireframe Overlay</td></tr>
        </table>
        <h3 style="color:var(--secondary-accent); margin-bottom:8px;">Mobile Touch Controls</h3>
        <p>Virtual Rotational Steering Wheel with progressive spring centering, analog vertical-drag pedals, and gyroscope tilt steering.</p>
      </div>
    `;
  }
}
