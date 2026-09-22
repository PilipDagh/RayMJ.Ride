/**
 * BeamNG.drive Architecture Powertrain System
 * 4.0L NA Boxer-6 Engine, 7-Speed PDK Dual-Clutch Transmission,
 * e-LSD Torque Vectoring Differential, Radiator Thermals & Puncture Mechanics
 */

export class EngineSimulation {
  constructor() {
    this.type = '4.0L NA Boxer-6';
    this.displacementCC = 3996;
    this.maxHorsepower = 502; // hp @ 8400 RPM
    this.peakTorqueNm = 470;  // 346 lb-ft @ 6100 RPM
    this.idleRPM = 850;
    this.redlineRPM = 9000;
    this.revLimiterRPM = 9200;
    this.currentRPM = 850;
    this.throttle = 0.0;
    this.flywheelInertia = 0.18; // kg*m^2
    this.engineTorque = 0.0;
    this.isRunning = true;
    this.starterEngaged = false;

    // Turbo / Forced Induction & Nitrous
    this.boostPSI = 0.0;
    this.maxBoostPSI = 0.0; // 0 for NA, adjustable up to 30 PSI in tuning
    this.turboSpool = 0.0;
    this.nitrousActive = false;
    this.nitrousShotHP = 100;
    this.nitrousTankPSI = 950;

    // Thermals & Damage System
    this.coolantTempC = 90.0; // Nominal 90°C
    this.oilTempC = 95.0;
    this.radiatorPunctured = false;
    this.coolantLossRate = 0.0;
    this.headGasketBlown = false;
    this.isSeized = false;
    this.radiatorDeformation = 0.0;

    // Audio & Visual telemetry helpers
    this.limiterBouncing = false;
    this.backfireActive = false;
  }

  /**
   * Authentic Porsche GT3 Naturally Aspirated Flat-6 Torque Curve
   */
  getTorqueCurve(rpm) {
    if (rpm < 500) return 0;
    // Normalized RPM ratio from idle to redline
    const r = Math.max(0, Math.min(1.0, (rpm - 850) / (9000 - 850)));
    // Broad high-rev torque plateau characteristic of 4.0L GT3 engine
    let baseTorque = 280 + 190 * Math.sin(r * Math.PI * 0.85);
    if (rpm > 8400) {
      baseTorque *= (1.0 - (rpm - 8400) / 1200); // slight tapering near redline
    }

    // Add turbo boost contribution if enabled
    if (this.maxBoostPSI > 0) {
      baseTorque += (this.boostPSI / 14.7) * (this.peakTorqueNm * 0.65);
    }

    // Add Nitrous Oxide injection
    if (this.nitrousActive && this.nitrousTankPSI > 100 && this.throttle > 0.8) {
      baseTorque += (this.nitrousShotHP * 1.3558); // hp to Nm approx
      this.nitrousTankPSI -= 0.2;
    }

    return Math.max(0, baseTorque);
  }

  update(dt, loadTorque = 0.0) {
    if (!this.isRunning || this.isSeized) {
      this.currentRPM = Math.max(0, this.currentRPM - 1800 * dt);
      this.engineTorque = 0.0;
      return;
    }

    // Thermals & Radiator Puncture Simulation
    if (this.radiatorPunctured) {
      // Coolant heats up from 90°C towards 140°C
      this.coolantTempC = Math.min(155.0, this.coolantTempC + 4.5 * dt * (this.currentRPM / 5000));
      if (this.coolantTempC > 135.0 && !this.headGasketBlown) {
        this.headGasketBlown = true;
      }
      if (this.coolantTempC >= 148.0) {
        this.isSeized = true;
        this.isRunning = false;
      }
    } else {
      // Normal equilibrium temperature
      const targetTemp = 90.0 + (this.currentRPM / 9000.0) * 12.0;
      this.coolantTempC += (targetTemp - this.coolantTempC) * 0.05 * dt;
    }

    // Turbocharger Spool Physics
    if (this.maxBoostPSI > 0) {
      const targetBoost = this.throttle * this.maxBoostPSI * Math.pow(this.currentRPM / 9000, 1.5);
      this.boostPSI += (targetBoost - this.boostPSI) * 4.5 * dt;
    } else {
      this.boostPSI = 0.0;
    }

    // Rev limiter handling (9200 RPM fuel cut)
    if (this.currentRPM >= this.revLimiterRPM) {
      this.limiterBouncing = true;
      this.engineTorque = 0.0;
      this.currentRPM -= 450;
      this.backfireActive = true;
    } else {
      this.limiterBouncing = false;
      this.backfireActive = false;

      const rawTorque = this.getTorqueCurve(this.currentRPM);
      this.engineTorque = rawTorque * this.throttle;
    }

    // Net rotational acceleration of flywheel
    const netTorque = this.engineTorque - loadTorque - (this.currentRPM * 0.015);
    const rpmAccel = (netTorque / this.flywheelInertia) * (60 / (2 * Math.PI));
    this.currentRPM += rpmAccel * dt;

    if (this.currentRPM < this.idleRPM) {
      this.currentRPM = this.idleRPM;
    }
  }

  damageRadiator(amount) {
    this.radiatorDeformation += amount;
    if (this.radiatorDeformation > 0.08) {
      this.radiatorPunctured = true;
    }
  }

  reset() {
    this.currentRPM = this.idleRPM;
    this.isRunning = true;
    this.isSeized = false;
    this.headGasketBlown = false;
    this.radiatorPunctured = false;
    this.radiatorDeformation = 0.0;
    this.coolantTempC = 90.0;
    this.boostPSI = 0.0;
    this.nitrousTankPSI = 950;
  }
}

export class DrivetrainTransmission {
  constructor(engine) {
    this.engine = engine;
    this.mode = 'PDK_AUTO'; // 'PDK_AUTO', 'MANUAL'
    this.ratios = [
      -3.42, // Reverse (Index 0: R)
      0.0,   // Neutral (Index 1: N)
      3.75,  // 1st
      2.38,  // 2nd
      1.72,  // 3rd
      1.34,  // 4th
      1.11,  // 5th
      0.96,  // 6th
      0.84   // 7th (Overdrive)
    ];
    this.currentGearIndex = 2; // Start in 1st gear
    this.finalDriveRatio = 3.97;
    this.clutchEngagement = 1.0; // 0.0 = disengaged, 1.0 = locked
    this.shiftCooldown = 0.0;
    this.shiftDuration = 0.08; // 80ms PDK instant paddle shift

    // Differential Config: 'eLSD', 'Open', 'Welded', 'Spool'
    this.diffMode = 'eLSD';
    this.diffLockingBias = 0.45;
    this.brakeBiasFront = 0.62; // 62% Front / 38% Rear GT3 carbon-ceramic bias
  }

  shiftUp() {
    if (this.currentGearIndex < this.ratios.length - 1 && this.shiftCooldown <= 0) {
      this.currentGearIndex++;
      this.shiftCooldown = this.shiftDuration;
    }
  }

  shiftDown() {
    if (this.currentGearIndex > 0 && this.shiftCooldown <= 0) {
      this.currentGearIndex--;
      this.shiftCooldown = this.shiftDuration;
    }
  }

  setGear(gearIdx) {
    if (gearIdx >= 0 && gearIdx < this.ratios.length) {
      this.currentGearIndex = gearIdx;
    }
  }

  getGearDisplay() {
    if (this.currentGearIndex === 0) return 'R';
    if (this.currentGearIndex === 1) return 'N';
    return (this.currentGearIndex - 1).toString();
  }

  update(dt, wheelSpeedL, wheelSpeedR, requestedThrottle, requestedBrake, requestedHandbrake) {
    if (this.shiftCooldown > 0) {
      this.shiftCooldown -= dt;
    }

    const currentRatio = this.ratios[this.currentGearIndex];

    // Automatic PDK shift logic
    if (this.mode === 'PDK_AUTO' && this.currentGearIndex >= 2) {
      if (this.engine.currentRPM > 8500 && this.currentGearIndex < this.ratios.length - 1) {
        this.shiftUp();
      } else if (this.engine.currentRPM < 2800 && this.currentGearIndex > 2) {
        this.shiftDown();
      }
    }

    // Average driven axle wheel rotational speed (rad/s)
    const avgWheelSpeed = (wheelSpeedL + wheelSpeedR) * 0.5;
    const totalReduction = currentRatio * this.finalDriveRatio;

    // Calculate engine load and synchronize RPM with drivetrain
    if (Math.abs(totalReduction) > 0.01 && this.clutchEngagement > 0.1) {
      const drivetrainRPM = Math.abs(avgWheelSpeed * totalReduction * (60 / (2 * Math.PI)));
      const syncWeight = 0.25 * this.clutchEngagement;
      this.engine.currentRPM = this.engine.currentRPM * (1.0 - syncWeight) + drivetrainRPM * syncWeight;
    }

    this.engine.throttle = requestedThrottle;
    this.engine.update(dt, 0.0);

    // Total transmission output torque delivered to differential
    const outputTorque = this.engine.engineTorque * totalReduction * this.clutchEngagement;

    // Differential Torque Distribution (e-LSD with dynamic torque vectoring)
    let torqueL = outputTorque * 0.5;
    let torqueR = outputTorque * 0.5;

    if (this.diffMode === 'Welded' || this.diffMode === 'Spool') {
      // 50/50 rigid lock
      torqueL = outputTorque * 0.5;
      torqueR = outputTorque * 0.5;
    } else if (this.diffMode === 'eLSD') {
      const speedDiff = wheelSpeedR - wheelSpeedL;
      const transfer = Math.tanh(speedDiff * 0.5) * (outputTorque * this.diffLockingBias);
      torqueL += transfer;
      torqueR -= transfer;
    }

    // Brake Torque Distribution
    const baseBrakeTorque = requestedBrake * 3800; // Nm per axle
    const frontBrake = baseBrakeTorque * this.brakeBiasFront;
    const rearBrake = baseBrakeTorque * (1.0 - this.brakeBiasFront);
    const handbrakeTorque = requestedHandbrake ? 4500.0 : 0.0;

    return {
      torqueL,
      torqueR,
      frontBrake,
      rearBrake: rearBrake + handbrakeTorque,
      gearDisplay: this.getGearDisplay(),
      rpm: this.engine.currentRPM,
      boost: this.engine.boostPSI,
      coolantTemp: this.engine.coolantTempC
    };
  }

  reset() {
    this.currentGearIndex = 2; // 1st gear
    this.shiftCooldown = 0.0;
    this.engine.reset();
  }
}
