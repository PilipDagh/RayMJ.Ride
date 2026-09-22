/**
 * BeamNG.drive Architecture Live Vehicle Tuning & Customization Suite
 * Suspension Geometry (Ride Height, Camber, Toe, Stiffness, Damping)
 * Powertrain Tuning (Boost, Redline, Nitrous, Differential Locking, Brake Bias)
 * Aesthetics (PBR Multi-Layer Paint, Window Tint, Wheel Offsets, Wing Angle)
 */

export class VehicleTuningSuite {
  constructor() {
    this.currentTuning = {
      // Suspension
      rideHeightOffsetM: 0.0, // -0.06m to +0.05m
      springStiffnessScale: 1.0, // 0.5x to 2.5x
      dampingScale: 1.0, // 0.5x to 2.5x
      camberFrontDeg: -2.5, // -5.0 to +1.0
      camberRearDeg: -1.8,
      antiRollBarFront: 1.0,
      antiRollBarRear: 1.0,

      // Powertrain
      maxBoostPSI: 0.0, // 0 (NA) to 30 PSI
      revLimiterRPM: 9200,
      nitrousShotHP: 100,
      diffMode: 'eLSD', // 'eLSD', 'Open', 'Welded', 'Spool'
      brakeBiasFront: 0.62, // 50% to 85%

      // Aero
      wingAngleDeg: 6.0, // 0 to 18 deg
      splitterDownforce: 1.0,

      // Aesthetics
      paintFinish: 'gloss', // 'gloss', 'matte', 'metallic', 'pearl'
      paintColor: '#0055d4',
      windowTint: 0.72,
      wheelOffsetMm: 0,
      rimColor: '#27272a'
    };

    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](this.currentTuning);
    }
  }

  setParam(key, value) {
    if (this.currentTuning.hasOwnProperty(key)) {
      this.currentTuning[key] = value;
      this.notify();
    }
  }

  applyToVehicle(vehicleData, solver, powertrain) {
    const t = this.currentTuning;

    // Apply powertrain parameters
    if (powertrain) {
      powertrain.engine.maxBoostPSI = parseFloat(t.maxBoostPSI);
      powertrain.engine.revLimiterRPM = parseFloat(t.revLimiterRPM);
      powertrain.engine.nitrousShotHP = parseFloat(t.nitrousShotHP);
      powertrain.diffMode = t.diffMode;
      powertrain.brakeBiasFront = parseFloat(t.brakeBiasFront);
    }

    // Apply suspension parameters to beams
    if (solver) {
      const springScale = parseFloat(t.springStiffnessScale);
      const dampScale = parseFloat(t.dampingScale);

      for (let b = 0; b < solver.beams.length; b++) {
        const beam = solver.beams[b];
        if (beam.type === 'suspension') {
          beam.stiffness = beam.nominalStiffness * springScale;
          beam.damping = beam.nominalDamping * dampScale;
        }
      }
    }

    // Apply visual materials
    if (vehicleData && vehicleData.chassisMesh) {
      const mat = vehicleData.chassisMesh.material;
      if (mat) {
        mat.color.set(t.paintColor);
        if (t.paintFinish === 'matte') {
          mat.roughness = 0.85;
          mat.clearcoat = 0.0;
        } else if (t.paintFinish === 'metallic') {
          mat.roughness = 0.25;
          mat.metalness = 0.85;
          mat.clearcoat = 0.8;
        } else {
          // Gloss clearcoat
          mat.roughness = 0.15;
          mat.metalness = 0.15;
          mat.clearcoat = 1.0;
        }
      }
    }
  }
}
