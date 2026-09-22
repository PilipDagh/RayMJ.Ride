/**
 * BeamNG.drive Architecture Soft-Body Physics Engine
 * 2000Hz Sub-Stepping Viscoelastic Mass-Spring-Damper Lattice Solver
 * Pacejka '96 Magic Formula Tire Ground Traction Coupling
 * Stamped Metal Plastic Yield Hysteresis & Detachable Assembly Solver
 */

export class SoftBodyNode {
  constructor(id, x, y, z, mass = 12.0, tag = 'chassis', radius = 0.05) {
    this.id = id;
    this.position = [x, y, z];
    this.prevPosition = [x, y, z];
    this.velocity = [0, 0, 0];
    this.force = [0, 0, 0];
    this.mass = mass;
    this.invMass = mass > 0 ? 1.0 / mass : 0.0;
    this.tag = tag; // 'chassis', 'front_bumper', 'hood', 'wing', 'wheel_FL', etc.
    this.radius = radius;
    this.friction = 0.85;
    this.initialPosition = [x, y, z];
    this.isFixed = false;
    this.isDetached = false;
    this.contactNormal = [0, 1, 0];
    this.inContact = false;
  }

  reset(x, y, z) {
    this.position[0] = x !== undefined ? x : this.initialPosition[0];
    this.position[1] = y !== undefined ? y : this.initialPosition[1];
    this.position[2] = z !== undefined ? z : this.initialPosition[2];
    this.prevPosition[0] = this.position[0];
    this.prevPosition[1] = this.position[1];
    this.prevPosition[2] = this.position[2];
    this.velocity[0] = 0;
    this.velocity[1] = 0;
    this.velocity[2] = 0;
    this.force[0] = 0;
    this.force[1] = 0;
    this.force[2] = 0;
    this.isDetached = false;
    this.inContact = false;
  }
}

export class SoftBodyBeam {
  constructor(nodeA, nodeB, stiffness = 6.5e6, dampingRatio = 0.65, breakThreshold = 0.40, type = 'structural') {
    this.nodeA = nodeA;
    this.nodeB = nodeB;
    const dx = nodeB.position[0] - nodeA.position[0];
    const dy = nodeB.position[1] - nodeA.position[1];
    const dz = nodeB.position[2] - nodeA.position[2];
    this.L0 = Math.hypot(dx, dy, dz); // Initial rest length
    this.Lp = this.L0;               // Plastic rest length
    this.nominalStiffness = stiffness; // N/m
    this.stiffness = stiffness;
    this.breakThreshold = breakThreshold; // fractional elongation to rupture
    this.type = type; // 'structural', 'crumple', 'hinge', 'latch', 'suspension', 'reinforcement'
    this.isBroken = false;
    this.stress = 0.0;
    this.strain = 0.0;

    // Critical Viscous Damping: c = 2 * zeta * sqrt(k * m_eff)
    const mEff = (nodeA.mass * nodeB.mass) / Math.max(0.1, nodeA.mass + nodeB.mass);
    this.nominalDamping = 2.0 * dampingRatio * Math.sqrt(Math.max(1.0, stiffness * mEff));
    this.damping = this.nominalDamping;

    // Plasticity parameters: High-Strength Steel & Aluminum
    this.yieldStrain = 0.025; // 2.5% yield threshold
    this.flowRate = 0.18;     // plastic rest-length updating rate
  }

  reset() {
    this.Lp = this.L0;
    this.isBroken = false;
    this.stress = 0.0;
    this.strain = 0.0;
    this.stiffness = this.nominalStiffness;
    this.damping = this.nominalDamping;
  }
}

export class SoftBodyWheel {
  constructor(id, nodeHub, nodeTireList, isFront = false, isDriven = true) {
    this.id = id;
    this.nodeHub = nodeHub;
    this.nodeTireList = nodeTireList; // Ring of perimeter nodes
    this.isFront = isFront;
    this.isDriven = isDriven;
    this.angularVelocity = 0.0; // rad/s
    this.effectiveRadius = 0.33; // meters (20-inch / 21-inch wheel approx)
    this.nominalRadius = 0.33;
    this.inertia = 1.45; // kg*m^2
    this.pressurePSI = 32.0;
    this.nominalPSI = 32.0;
    this.isBlown = false;
    this.steerAngle = 0.0; // radians
    this.slipRatio = 0.0;
    this.slipAngle = 0.0;
    this.longForce = 0.0;
    this.latForce = 0.0;
    this.normalForce = 3500.0; // Newtons
    this.brakeTorque = 0.0;
    this.driveTorque = 0.0;
    this.camberAngle = -0.02; // rad
    this.toeAngle = 0.0;

    // Pacejka '96 Coefficients
    this.pacejka = {
      Bx: 10.0, Cx: 1.65, Dx: 1.15, Ex: -0.5,
      By: 9.0,  Cy: 1.30, Dy: 1.15, Ey: -0.3
    };
  }

  puncture() {
    this.isBlown = true;
    this.pressurePSI = 0.0;
    this.effectiveRadius = this.nominalRadius * 0.72; // drops to bare rim
    this.pacejka.Dx = 0.42; // metal scraping friction
    this.pacejka.Dy = 0.35;
  }

  reset() {
    this.isBlown = false;
    this.pressurePSI = this.nominalPSI;
    this.effectiveRadius = this.nominalRadius;
    this.angularVelocity = 0.0;
    this.pacejka.Dx = 1.15;
    this.pacejka.Dy = 1.15;
    this.steerAngle = 0.0;
  }
}

export class PhysicsSolver {
  constructor() {
    this.subStepFrequency = 2000; // Hz
    this.dt = 1.0 / this.subStepFrequency; // 0.0005 seconds
    this.gravity = [0, -9.81, 0];
    this.airDensity = 1.225; // kg/m^3
    this.maxDisplacementClamping = 0.035; // 35mm per sub-step anti-explosion cap

    this.nodes = [];
    this.beams = [];
    this.wheels = [];
    this.subAssemblies = {}; // e.g. 'front_bumper': { beams: [], detached: false }

    // Stabilization Relaxation Phase
    this.relaxationSteps = 0;
    this.relaxationMaxSteps = 30;
    this.isRelaxing = false;

    // Interactive Node Grabber
    this.grabbedNodeIndex = -1;
    this.grabTarget = [0, 0, 0];
    this.grabStiffness = 3.5e5;
    this.grabDamping = 1200;

    // Environment Colliders Hook
    this.environmentColliders = [];
    this.groundY = 0.0;

    // Telemetry & Statistics
    this.stepCount = 0;
    this.brokenBeamCount = 0;
    this.maxGForce = 1.0;
    this.totalDeformationEnergy = 0.0;
  }

  addNode(x, y, z, mass = 12.0, tag = 'chassis', radius = 0.05) {
    const id = this.nodes.length;
    const node = new SoftBodyNode(id, x, y, z, mass, tag, radius);
    this.nodes.push(node);
    return node;
  }

  addBeam(indexA, indexB, stiffness = 6.5e6, dampingRatio = 0.65, breakThreshold = 0.40, type = 'structural') {
    const nodeA = this.nodes[indexA];
    const nodeB = this.nodes[indexB];
    if (!nodeA || !nodeB) return null;
    const beam = new SoftBodyBeam(nodeA, nodeB, stiffness, dampingRatio, breakThreshold, type);
    this.beams.push(beam);
    return beam;
  }

  setEnvironmentColliders(colliders, groundY = 0.0) {
    this.environmentColliders = colliders;
    this.groundY = groundY;
  }

  beginRelaxation() {
    this.isRelaxing = true;
    this.relaxationSteps = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].velocity[0] = 0;
      this.nodes[i].velocity[1] = 0;
      this.nodes[i].velocity[2] = 0;
    }
  }

  /**
   * Symplectic (Semi-Implicit) Euler Sub-Step Execution
   */
  subStep(simParams = {}) {
    const dt = this.dt;
    const isRelaxing = this.isRelaxing;
    let stiffnessFactor = 1.0;

    if (isRelaxing) {
      stiffnessFactor = Math.min(1.0, (this.relaxationSteps + 1) / this.relaxationMaxSteps);
      this.relaxationSteps++;
      if (this.relaxationSteps >= this.relaxationMaxSteps) {
        this.isRelaxing = false;
      }
    }

    const aeroSpeed = simParams.chassisSpeed || 0;
    const downforceCoeff = simParams.wingAngleCoeff || 0.8;
    const wingArea = 0.42; // m^2
    const totalDownforce = 0.5 * this.airDensity * aeroSpeed * aeroSpeed * downforceCoeff * wingArea;

    // 1. Reset Forces & Apply Gravity + Aero
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.isFixed) {
        node.force[0] = 0; node.force[1] = 0; node.force[2] = 0;
        continue;
      }

      // Gravity: F = m * g
      node.force[0] = node.mass * this.gravity[0];
      node.force[1] = node.mass * this.gravity[1];
      node.force[2] = node.mass * this.gravity[2];

      // Aerodynamic Drag & Downforce on upper nodes
      if (node.tag === 'rear_wing') {
        node.force[1] -= (totalDownforce / 6.0); // distributed over wing nodes
        node.force[2] -= (0.5 * this.airDensity * aeroSpeed * aeroSpeed * 0.28 * 0.1);
      } else if (node.tag === 'front_splitter') {
        node.force[1] -= (0.5 * totalDownforce * 0.45 / 4.0);
      }

      // Air resistance damping on all nodes
      const vMagSq = node.velocity[0] * node.velocity[0] + node.velocity[1] * node.velocity[1] + node.velocity[2] * node.velocity[2];
      if (vMagSq > 0.001) {
        const vMag = Math.sqrt(vMagSq);
        const dragF = 0.5 * this.airDensity * 0.32 * 0.02 * vMagSq;
        node.force[0] -= (node.velocity[0] / vMag) * dragF;
        node.force[1] -= (node.velocity[1] / vMag) * dragF;
        node.force[2] -= (node.velocity[2] / vMag) * dragF;
      }
    }

    // 2. Interactive Node Grabber Force
    if (this.grabbedNodeIndex >= 0 && this.grabbedNodeIndex < this.nodes.length) {
      const gNode = this.nodes[this.grabbedNodeIndex];
      const dx = this.grabTarget[0] - gNode.position[0];
      const dy = this.grabTarget[1] - gNode.position[1];
      const dz = this.grabTarget[2] - gNode.position[2];
      gNode.force[0] += this.grabStiffness * dx - this.grabDamping * gNode.velocity[0];
      gNode.force[1] += this.grabStiffness * dy - this.grabDamping * gNode.velocity[1];
      gNode.force[2] += this.grabStiffness * dz - this.grabDamping * gNode.velocity[2];
    }

    // 3. Beam Internal Forces & Non-Linear Plasticity
    for (let b = 0; b < this.beams.length; b++) {
      const beam = this.beams[b];
      if (beam.isBroken) continue;

      const nodeA = beam.nodeA;
      const nodeB = beam.nodeB;

      const rx = nodeB.position[0] - nodeA.position[0];
      const ry = nodeB.position[1] - nodeA.position[1];
      const rz = nodeB.position[2] - nodeA.position[2];
      const dist = Math.hypot(rx, ry, rz);

      if (dist < 1e-6) continue;

      const invDist = 1.0 / dist;
      const nx = rx * invDist;
      const ny = ry * invDist;
      const nz = rz * invDist;

      // Dynamic elongation relative to plastic rest length Lp
      const deltaL = dist - beam.Lp;
      const strain = deltaL / beam.L0;
      beam.strain = strain;

      // Rupture & Part Detachment Check
      if (Math.abs(dist - beam.L0) >= beam.breakThreshold * beam.L0) {
        beam.isBroken = true;
        this.brokenBeamCount++;
        continue;
      }

      // Plastic Flow Yielding (stamped automotive sheet metal & aluminum)
      if (Math.abs(strain) > beam.yieldStrain) {
        const excessStrain = (Math.abs(deltaL) - beam.yieldStrain * beam.L0);
        const dLp = Math.sign(deltaL) * excessStrain * beam.flowRate;
        beam.Lp += dLp;
      }

      // Relative velocity along beam unit vector: L_dot = (vB - vA) . n
      const relVx = nodeB.velocity[0] - nodeA.velocity[0];
      const relVy = nodeB.velocity[1] - nodeA.velocity[1];
      const relVz = nodeB.velocity[2] - nodeA.velocity[2];
      const lDot = relVx * nx + relVy * ny + relVz * nz;

      // Kelvin-Voigt Internal Force: F = k*(L - Lp) + c*L_dot
      const currentK = beam.stiffness * stiffnessFactor;
      const currentC = beam.damping * (isRelaxing ? 2.0 : 1.0);
      const forceMag = currentK * (dist - beam.Lp) + currentC * lDot;
      beam.stress = forceMag;

      const fx = forceMag * nx;
      const fy = forceMag * ny;
      const fz = forceMag * nz;

      if (!nodeA.isFixed) {
        nodeA.force[0] += fx;
        nodeA.force[1] += fy;
        nodeA.force[2] += fz;
      }
      if (!nodeB.isFixed) {
        nodeB.force[0] -= fx;
        nodeB.force[1] -= fy;
        nodeB.force[2] -= fz;
      }
    }

    // 4. Ground & Environment Rigid Contact Penalties
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.isFixed) continue;

      node.inContact = false;

      // Ground plane collision (y = groundY)
      const contactDist = node.position[1] - (this.groundY + node.radius);
      if (contactDist < 0.0) {
        node.inContact = true;
        node.contactNormal[0] = 0; node.contactNormal[1] = 1; node.contactNormal[2] = 0;

        // Ground spring-damper penalty force
        const penetration = -contactDist;
        const kContact = 8.5e6;
        const cContact = 6.0e4;
        const normalF = kContact * penetration - cContact * node.velocity[1];
        if (normalF > 0) {
          node.force[1] += normalF;

          // Coulomb sliding friction
          const mu = node.tag.startsWith('wheel') ? 1.15 : (node.tag.startsWith('rim') ? 0.42 : 0.65);
          const fFrictionMax = mu * normalF;
          const vtX = node.velocity[0];
          const vtZ = node.velocity[2];
          const vtMag = Math.hypot(vtX, vtZ);

          if (vtMag > 1e-4) {
            const frictionRatio = Math.min(1.0, fFrictionMax / (vtMag * node.mass / dt));
            node.force[0] -= vtX * (frictionRatio * node.mass / dt);
            node.force[2] -= vtZ * (frictionRatio * node.mass / dt);
          }
        }
      }

      // Check external custom environment colliders (boxes, ramps, cylinders)
      for (let c = 0; c < this.environmentColliders.length; c++) {
        const col = this.environmentColliders[c];
        col.resolveNodeCollision(node, dt);
      }
    }

    // 5. Pacejka Tire Traction Coupling to Wheels
    this.resolveTireKinematics(dt, simParams);

    // 6. Symplectic Euler Integration with Displacement Clamping
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.isFixed) continue;

      if (isRelaxing) {
        // Clamp velocities during 30-step relaxation phase
        node.velocity[0] = 0;
        node.velocity[1] = 0;
        node.velocity[2] = 0;
        continue;
      }

      // a = F * invMass
      const ax = node.force[0] * node.invMass;
      const ay = node.force[1] * node.invMass;
      const az = node.force[2] * node.invMass;

      // v_{t+dt} = v_t + a * dt
      node.velocity[0] += ax * dt;
      node.velocity[1] += ay * dt;
      node.velocity[2] += az * dt;

      // Displacement Clamping Guard: cap ||v * dt|| <= 0.035m to prevent catapulting
      const dispX = node.velocity[0] * dt;
      const dispY = node.velocity[1] * dt;
      const dispZ = node.velocity[2] * dt;
      const dispMag = Math.hypot(dispX, dispY, dispZ);

      if (dispMag > this.maxDisplacementClamping) {
        const scale = this.maxDisplacementClamping / dispMag;
        node.velocity[0] *= scale;
        node.velocity[1] *= scale;
        node.velocity[2] *= scale;
      }

      // x_{t+dt} = x_t + v * dt
      node.position[0] += node.velocity[0] * dt;
      node.position[1] += node.velocity[1] * dt;
      node.position[2] += node.velocity[2] * dt;
    }

    this.stepCount++;
  }

  /**
   * Pacejka '96 Magic Formula Wheel Force Calculation
   */
  resolveTireKinematics(dt, simParams) {
    for (let w = 0; w < this.wheels.length; w++) {
      const wheel = this.wheels[w];
      const hub = wheel.nodeHub;
      if (!hub) continue;

      const steer = wheel.isFront ? (simParams.steer || 0.0) : 0.0;
      wheel.steerAngle = steer;

      // Vehicle coordinate frame at wheel
      const cosS = Math.cos(steer);
      const sinS = Math.sin(steer);

      // Transform hub velocity into wheel longitudinal and lateral axes
      const vxWorld = hub.velocity[0];
      const vzWorld = hub.velocity[2];

      const vxWheel = vxWorld * sinS - vzWorld * cosS;
      const vyWheel = vxWorld * cosS + vzWorld * sinS;

      // Longitudinal Slip Ratio: kappa = (omega * R - Vx) / max(|Vx|, 0.1)
      const linearSpeed = wheel.angularVelocity * wheel.effectiveRadius;
      const denomLong = Math.max(Math.abs(vxWheel), 0.1);
      const kappa = (linearSpeed - vxWheel) / denomLong;
      wheel.slipRatio = Math.max(-1.5, Math.min(1.5, kappa));

      // Lateral Slip Angle: alpha = arctan(Vy / max(|Vx|, 0.1))
      const alpha = Math.atan2(vyWheel, denomLong);
      wheel.slipAngle = alpha;

      // Pacejka '96 Formula for Long/Lat Force
      const p = wheel.pacejka;
      const Fz = wheel.normalForce;
      const gripMul = simParams.gripMultiplier !== undefined ? simParams.gripMultiplier : 1.0;

      // Fx = D * sin(C * arctan(B*phi - E*(B*phi - arctan(B*phi))))
      const phiX = p.Bx * wheel.slipRatio;
      const fxNorm = p.Dx * Math.sin(p.Cx * Math.atan(phiX - p.Ex * (phiX - Math.atan(phiX))));
      const fx = fxNorm * Fz * gripMul;

      const phiY = p.By * wheel.slipAngle;
      const fyNorm = p.Dy * Math.sin(p.Cy * Math.atan(phiY - p.Ey * (phiY - Math.atan(phiY))));
      const fy = -fyNorm * Fz * gripMul;

      wheel.longForce = fx;
      wheel.latForce = fy;

      // Apply tractive & cornering ground reaction forces back to hub node
      if (hub.inContact || hub.position[1] - (this.groundY + wheel.effectiveRadius) < 0.08) {
        // World space force projection
        const fWorldX = fx * sinS + fy * cosS;
        const fWorldZ = -fx * cosS + fy * sinS;

        hub.force[0] += fWorldX;
        hub.force[2] += fWorldZ;

        // Dynamic Wheel Rotational Acceleration: I * d_omega = T_drive - T_brake - Fx * R
        const driveT = wheel.isDriven ? (wheel.driveTorque || 0.0) : 0.0;
        const brakeT = Math.sign(wheel.angularVelocity) * (wheel.brakeTorque || 0.0);
        const reactionT = fx * wheel.effectiveRadius;

        const netTorque = driveT - brakeT - reactionT;
        const alphaWheel = netTorque / wheel.inertia;
        wheel.angularVelocity += alphaWheel * dt;
      }
    }
  }

  /**
   * Safe spawn / respawn method with clearance and relaxation
   */
  spawnAt(targetY = 0.0) {
    // 1. Calculate lowest node Y
    let minY = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].position[1] < minY) {
        minY = this.nodes[i].position[1];
      }
    }

    // Clearance offset: lowest tire node at terrain + 0.30 m
    const offset = (targetY + 0.30) - minY;
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].position[1] += offset;
      this.nodes[i].prevPosition[1] = this.nodes[i].position[1];
      this.nodes[i].velocity[0] = 0;
      this.nodes[i].velocity[1] = 0;
      this.nodes[i].velocity[2] = 0;
    }

    this.beginRelaxation();
  }
}
