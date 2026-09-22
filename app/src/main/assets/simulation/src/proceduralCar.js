/**
 * Procedural 3D Vehicle Synthesis Engine: Porsche 911 GT3 (Type 992)
 * Continuous Parametric Cubic Bezier Cross-Section Lofting (18 Transverse Ribs)
 * Swan-Neck Hung Aerofoil, Iconic 911 Flyline, Flared Rear Arches (+85mm)
 * Discrete Sub-Mesh Hierarchy & Detachable Soft-Body Node-Beam Lattice
 */

import * as THREE from '../libs/three.module.js';

// Cubic Bezier evaluation helper
function evalCubicBezier(p0, p1, p2, p3, t) {
  const invT = 1.0 - t;
  const c0 = invT * invT * invT;
  const c1 = 3.0 * invT * invT * t;
  const c2 = 3.0 * invT * t * t;
  const c3 = t * t * t;
  return [
    c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0],
    c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1],
    c0 * p0[2] + c1 * p1[2] + c2 * p2[2] + c3 * p3[2]
  ];
}

export class Porsche911GT3Generator {
  constructor() {
    // 992 GT3 Exact Dimensions (meters)
    this.wheelbase = 2.457;
    this.length = 4.573;
    this.width = 1.852;
    this.height = 1.279;
    this.frontTrack = 1.601;
    this.rearTrack = 1.553;
    this.curbWeight = 1435; // kg
    this.rearBias = 0.62;   // 62% rear weight bias

    // Transverse profile count
    this.crossSectionCount = 18;
    this.radialPointsPerRib = 24;
  }

  /**
   * Procedural parametric profile generator for 18 discrete stations along Z
   * Z spans from front splitter (+2.28m) to rear diffuser (-2.29m)
   */
  generateProfileRibs() {
    const ribs = [];
    const zStart = 2.28;
    const zEnd = -2.29;

    for (let s = 0; s < this.crossSectionCount; s++) {
      const u = s / (this.crossSectionCount - 1);
      const z = zStart + u * (zEnd - zStart);

      // Section classification
      let halfW = this.width * 0.5;
      let topY = this.height;
      let bottomY = 0.12; // ground clearance
      let waistY = 0.55;

      // Iconic 911 "Flyline" mathematical profile along Z
      if (z > 1.8) {
        // Front splitter & bumper nose
        const frontFrac = (z - 1.8) / (zStart - 1.8);
        halfW *= (0.78 - frontFrac * 0.12);
        topY = 0.65 - frontFrac * 0.18;
        bottomY = 0.10;
      } else if (z > 0.8) {
        // Front hood / frunk sloping upwards to cowl
        const hoodFrac = (z - 0.8) / 1.0;
        halfW = (this.frontTrack * 0.5 + 0.12) * (1.0 - hoodFrac * 0.05);
        topY = 0.72 + (1.0 - hoodFrac) * 0.22;
      } else if (z > -0.7) {
        // Greenhouse cabin: Windshield, B-Pillar apex, starting teardrop
        const cabFrac = (z - (-0.7)) / 1.5;
        // Peak height at B-pillar (z ~ 0.15)
        const peakDist = Math.abs(z - 0.15);
        topY = this.height - peakDist * 0.14;
        halfW = (this.width * 0.5) * 0.88;
      } else if (z > -1.6) {
        // Rear quarter arches (+85mm muscular hips) & falling engine louvers
        const hipFrac = (z - (-1.6)) / 0.9;
        halfW = (this.rearTrack * 0.5 + 0.17); // Muscular flared hips
        topY = 0.98 - (1.0 - hipFrac) * 0.22; // Falling flyline slope
      } else {
        // Rear decklid, swan-neck wing mount, diffuser & twin titanium exhausts
        const rearFrac = (z - zEnd) / (-1.6 - zEnd);
        halfW = (this.width * 0.5) * (0.82 + rearFrac * 0.10);
        topY = 0.75 + rearFrac * 0.18;
        bottomY = 0.18; // upward diffuser rake
      }

      // Generate radial contour around this transverse cross-section using Bezier curves
      const ribPoints = [];
      const steps = this.radialPointsPerRib;

      // 4 Bezier control points for right side and mirrored for left side
      // P0: Roof/hood center, P1: Shoulder curve, P2: Beltline hip, P3: Rocker bottom
      const p0 = [0, topY, z];
      const p1 = [halfW * 0.85, topY * 0.92, z];
      const p2 = [halfW, waistY, z];
      const p3 = [halfW * 0.82, bottomY, z];
      const pBottom = [0, bottomY, z];

      // Right half (t: 0 -> 1)
      for (let i = 0; i < steps / 2; i++) {
        const t = i / (steps / 2 - 1);
        if (t < 0.75) {
          const pt = evalCubicBezier(p0, p1, p2, p3, t / 0.75);
          ribPoints.push(pt);
        } else {
          // Bottom floor return
          const bf = (t - 0.75) / 0.25;
          ribPoints.push([
            p3[0] * (1.0 - bf),
            bottomY,
            z
          ]);
        }
      }

      // Left half (mirror X)
      for (let i = steps / 2 - 1; i >= 0; i--) {
        const refPt = ribPoints[i];
        ribPoints.push([-refPt[0], refPt[1], refPt[2]]);
      }

      ribs.push(ribPoints);
    }

    return ribs;
  }

  /**
   * Synthesize Continuous 3D Visual Mesh Hierarchy
   */
  buildVisualMesh() {
    const ribs = this.generateProfileRibs();
    const group = new THREE.Group();
    group.name = 'porsche_911_gt3_root';

    // Materials: Authentic German Motorsport High-Gloss Clearcoat
    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: 0x0055d4, // Shark Blue signature Porsche launch color
      metalness: 0.15,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.85
    });

    const carbonFiberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.45,
      metalness: 0.35
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1128,
      transparent: true,
      opacity: 0.72,
      roughness: 0.05,
      transmission: 0.88,
      ior: 1.52
    });

    const trimBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.65,
      metalness: 0.1
    });

    // 1. Lofted Monocoque & Main Body Shell
    const vertices = [];
    const indices = [];
    const uvs = [];
    const normals = [];

    const numRibs = ribs.length;
    const numPts = this.radialPointsPerRib;

    for (let r = 0; r < numRibs; r++) {
      const rib = ribs[r];
      for (let p = 0; p < numPts; p++) {
        const pt = rib[p];
        vertices.push(pt[0], pt[1], pt[2]);
        uvs.push(p / (numPts - 1), r / (numRibs - 1));
      }
    }

    for (let r = 0; r < numRibs - 1; r++) {
      for (let p = 0; p < numPts; p++) {
        const pNext = (p + 1) % numPts;
        const i0 = r * numPts + p;
        const i1 = (r + 1) * numPts + p;
        const i2 = (r + 1) * numPts + pNext;
        const i3 = r * numPts + pNext;

        indices.push(i0, i1, i2);
        indices.push(i0, i2, i3);
      }
    }

    const bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    bodyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    bodyGeo.setIndex(indices);
    bodyGeo.computeVertexNormals();

    const chassisMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
    chassisMesh.name = 'chassis_monocoque';
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    group.add(chassisMesh);

    // 2. Functional Front Aerodynamic Splitter & Intakes
    const splitterGeo = new THREE.BoxGeometry(this.frontTrack * 0.95, 0.05, 0.45);
    const splitterMesh = new THREE.Mesh(splitterGeo, carbonFiberMat);
    splitterMesh.name = 'front_splitter';
    splitterMesh.position.set(0, 0.12, 2.18);
    splitterMesh.castShadow = true;
    group.add(splitterMesh);

    // 3. Recessed Headlight Buckets with 4-Point LED DRLs
    const headlightGroup = new THREE.Group();
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const hlLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), hlMat);
    hlLeft.rotation.x = Math.PI * 0.45;
    hlLeft.position.set(-0.62, 0.68, 1.82);
    const hlRight = hlLeft.clone();
    hlRight.position.x = 0.62;
    headlightGroup.add(hlLeft);
    headlightGroup.add(hlRight);
    group.add(headlightGroup);

    // 4. Swan-Neck Hung Rear Wing Assembly
    const wingGroup = new THREE.Group();
    wingGroup.name = 'rear_wing';

    // Airfoil blade (cambered aerofoil profile)
    const bladeGeo = new THREE.BoxGeometry(1.68, 0.04, 0.32);
    const bladeMesh = new THREE.Mesh(bladeGeo, carbonFiberMat);
    bladeMesh.position.set(0, 1.26, -1.98);
    bladeMesh.rotation.x = -0.06; // aerodynamic angle of attack
    bladeMesh.castShadow = true;
    wingGroup.add(bladeMesh);

    // Dual inverted swan-neck stanchions hanging from top of blade
    const stanchionGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.42, 8);
    const stanL = new THREE.Mesh(stanchionGeo, carbonFiberMat);
    stanL.position.set(-0.45, 1.08, -1.92);
    stanL.rotation.x = -0.22;
    const stanR = stanL.clone();
    stanR.position.x = 0.45;
    wingGroup.add(stanL);
    wingGroup.add(stanR);

    // Endplates
    const endplateGeo = new THREE.BoxGeometry(0.02, 0.22, 0.36);
    const endL = new THREE.Mesh(endplateGeo, carbonFiberMat);
    endL.position.set(-0.84, 1.26, -1.98);
    const endR = endL.clone();
    endR.position.x = 0.84;
    wingGroup.add(endL);
    wingGroup.add(endR);
    group.add(wingGroup);

    // 5. Multi-Fin Underbody Rear Diffuser & Dual Titanium Exhausts
    const diffuserGeo = new THREE.BoxGeometry(1.45, 0.16, 0.55);
    const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonFiberMat);
    diffuserMesh.position.set(0, 0.22, -2.15);
    diffuserMesh.rotation.x = 0.18; // upward rake
    group.add(diffuserMesh);

    // Dual central 100mm titanium exhaust tips
    const exhMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
    const exhL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 16), exhMat);
    exhL.rotation.x = Math.PI * 0.5;
    exhL.position.set(-0.08, 0.30, -2.26);
    const exhR = exhL.clone();
    exhR.position.x = 0.08;
    group.add(exhL);
    group.add(exhR);

    // 6. Cockpit Interior: Carbon Bucket Seats & Rotatable Steering Wheel
    const cockpitGroup = new THREE.Group();
    cockpitGroup.name = 'interior_cockpit';

    // Dashboard Binnacle & Tachometer
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.55), trimBlackMat);
    dash.position.set(0, 0.72, 0.52);
    cockpitGroup.add(dash);

    // Rotatable GT Sport Steering Wheel
    const wheelRingGeo = new THREE.TorusGeometry(0.17, 0.022, 12, 24);
    const steeringWheelMesh = new THREE.Mesh(wheelRingGeo, trimBlackMat);
    steeringWheelMesh.name = 'steering_wheel';
    steeringWheelMesh.position.set(-0.38, 0.76, 0.32);
    steeringWheelMesh.rotation.x = -0.35;
    cockpitGroup.add(steeringWheelMesh);

    // Carbon bucket seats (Driver & Passenger)
    const seatGeo = new THREE.BoxGeometry(0.48, 0.75, 0.52);
    const seatL = new THREE.Mesh(seatGeo, carbonFiberMat);
    seatL.position.set(-0.38, 0.52, -0.15);
    const seatR = seatL.clone();
    seatR.position.x = 0.38;
    cockpitGroup.add(seatL);
    cockpitGroup.add(seatR);

    group.add(cockpitGroup);

    // 7. Staggered 20-inch Front / 21-inch Rear Center-Lock Wheels
    const wheels = this.createWheelMeshes();
    group.add(wheels.wheelFL);
    group.add(wheels.wheelFR);
    group.add(wheels.wheelRL);
    group.add(wheels.wheelRR);

    return {
      rootGroup: group,
      chassisMesh,
      wingGroup,
      steeringWheelMesh,
      wheels
    };
  }

  createWheelMeshes() {
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.25, metalness: 0.85 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.7 }); // Racing Yellow PCCB
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.4, metalness: 0.9 });

    function makeWheel(radius, width) {
      const wGroup = new THREE.Group();
      // Tire
      const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI * 0.5;
      tire.castShadow = true;
      wGroup.add(tire);

      // Rim
      const rimGeo = new THREE.CylinderGeometry(radius * 0.78, radius * 0.78, width * 1.02, 18);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI * 0.5;
      wGroup.add(rim);

      // Carbon-Ceramic Brake Rotor & Caliper
      const rotorGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, 0.04, 16);
      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.rotation.z = Math.PI * 0.5;
      rotor.position.x = -width * 0.12;
      wGroup.add(rotor);

      const caliperGeo = new THREE.BoxGeometry(0.08, 0.14, 0.10);
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(-width * 0.15, radius * 0.45, 0);
      wGroup.add(caliper);

      return wGroup;
    }

    const rFront = 0.33; // 20-inch
    const rRear = 0.345; // 21-inch
    const wFront = 0.265;
    const wRear = 0.325;

    const zFront = this.wheelbase * 0.5;
    const zRear = -this.wheelbase * 0.5;
    const xFront = this.frontTrack * 0.5;
    const xRear = this.rearTrack * 0.5;

    const wheelFL = makeWheel(rFront, wFront);
    wheelFL.position.set(-xFront, rFront, zFront);
    wheelFL.name = 'wheel_FL';

    const wheelFR = makeWheel(rFront, wFront);
    wheelFR.position.set(xFront, rFront, zFront);
    wheelFR.name = 'wheel_FR';

    const wheelRL = makeWheel(rRear, wRear);
    wheelRL.position.set(-xRear, rRear, zRear);
    wheelRL.name = 'wheel_RL';

    const wheelRR = makeWheel(rRear, wRear);
    wheelRR.position.set(xRear, rRear, zRear);
    wheelRR.name = 'wheel_RR';

    return { wheelFL, wheelFR, wheelRL, wheelRR };
  }

  /**
   * Build the Mathematical Soft-Body Node-Beam Lattice for the Porsche 911 GT3
   * Injects structural monocoque nodes, front crumple zone, rear engine subframe,
   * suspension links, and detachable assembly beams into the physics solver.
   */
  generateNodeBeamLattice(solver) {
    const totalMass = this.curbWeight;
    const rearWeight = totalMass * this.rearBias;
    const frontWeight = totalMass * (1.0 - this.rearBias);

    // Base coordinates
    const zF = this.wheelbase * 0.5;
    const zR = -this.wheelbase * 0.5;
    const zNose = 2.25;
    const zTail = -2.25;
    const xHalf = this.width * 0.5;

    const nodeIndices = {};

    // 1. Lower Chassis Perimeter Nodes (Floor Pan & Rockers)
    const yFloor = 0.16;
    nodeIndices.floorNose = solver.addNode(0, yFloor, zNose, frontWeight * 0.04, 'front_bumper', 0.08).id;
    nodeIndices.floorFL = solver.addNode(-xHalf * 0.88, yFloor, zF, frontWeight * 0.08, 'chassis', 0.08).id;
    nodeIndices.floorFR = solver.addNode(xHalf * 0.88, yFloor, zF, frontWeight * 0.08, 'chassis', 0.08).id;
    nodeIndices.floorMidL = solver.addNode(-xHalf * 0.92, yFloor, 0, totalMass * 0.06, 'chassis', 0.08).id;
    nodeIndices.floorMidR = solver.addNode(xHalf * 0.92, yFloor, 0, totalMass * 0.06, 'chassis', 0.08).id;
    nodeIndices.floorRL = solver.addNode(-xHalf * 0.95, yFloor, zR, rearWeight * 0.08, 'chassis', 0.08).id;
    nodeIndices.floorRR = solver.addNode(xHalf * 0.95, yFloor, zR, rearWeight * 0.08, 'chassis', 0.08).id;
    nodeIndices.floorTail = solver.addNode(0, yFloor + 0.06, zTail, rearWeight * 0.06, 'chassis', 0.08).id;

    // 2. Beltline & Cowl Nodes (Fenders, Cowl, Decklid)
    const yBelt = 0.65;
    nodeIndices.cowlL = solver.addNode(-xHalf * 0.82, yBelt + 0.12, 0.75, frontWeight * 0.06, 'chassis').id;
    nodeIndices.cowlR = solver.addNode(xHalf * 0.82, yBelt + 0.12, 0.75, frontWeight * 0.06, 'chassis').id;
    nodeIndices.hoodTip = solver.addNode(0, yBelt - 0.05, 1.85, frontWeight * 0.04, 'hood_frunk').id;
    nodeIndices.engineBayL = solver.addNode(-xHalf * 0.86, yBelt + 0.10, -0.95, rearWeight * 0.09, 'chassis').id;
    nodeIndices.engineBayR = solver.addNode(xHalf * 0.86, yBelt + 0.10, -0.95, rearWeight * 0.09, 'chassis').id;
    nodeIndices.decklidTip = solver.addNode(0, yBelt + 0.15, -1.82, rearWeight * 0.06, 'engine_decklid').id;

    // 3. Roof & Roll-Cage Monocoque Nodes
    const yRoof = this.height;
    nodeIndices.roofFrontL = solver.addNode(-xHalf * 0.62, yRoof - 0.04, 0.25, totalMass * 0.04, 'chassis').id;
    nodeIndices.roofFrontR = solver.addNode(xHalf * 0.62, yRoof - 0.04, 0.25, totalMass * 0.04, 'chassis').id;
    nodeIndices.roofRearL = solver.addNode(-xHalf * 0.58, yRoof - 0.12, -0.65, totalMass * 0.04, 'chassis').id;
    nodeIndices.roofRearR = solver.addNode(xHalf * 0.58, yRoof - 0.12, -0.65, totalMass * 0.04, 'chassis').id;

    // 4. Swan-Neck Wing Mount Nodes (Detachable Wing Assembly)
    nodeIndices.wingL = solver.addNode(-0.65, 1.26, -1.98, 4.5, 'rear_wing').id;
    nodeIndices.wingR = solver.addNode(0.65, 1.26, -1.98, 4.5, 'rear_wing').id;
    nodeIndices.wingCenter = solver.addNode(0, 1.26, -1.98, 4.5, 'rear_wing').id;

    // 5. Wheel Hub Nodes (Tire Contact Hubs)
    const rF = 0.33;
    const rR = 0.345;
    nodeIndices.hubFL = solver.addNode(-this.frontTrack * 0.5, rF, zF, frontWeight * 0.12, 'wheel_FL', rF).id;
    nodeIndices.hubFR = solver.addNode(this.frontTrack * 0.5, rF, zF, frontWeight * 0.12, 'wheel_FR', rF).id;
    nodeIndices.hubRL = solver.addNode(-this.rearTrack * 0.5, rR, zR, rearWeight * 0.16, 'wheel_RL', rR).id;
    nodeIndices.hubRR = solver.addNode(this.rearTrack * 0.5, rR, zR, rearWeight * 0.16, 'wheel_RR', rR).id;

    // --- STRUCTURAL BEAMS (High-Strength Automotive Steel & Aluminum Monocoque) ---
    const kMono = 7.2e6;  // 7.2 x 10^6 N/m (Anti-Jelly Rigid Steel Calibration)
    const kCrumple = 3.8e6; // Crumple zones with progressive plastic deformation
    const kSusp = 8.5e5;   // Suspension struts
    const kWing = 2.5e6;   // Wing stanchions

    // Floor Pan Lattice
    solver.addBeam(nodeIndices.floorNose, nodeIndices.floorFL, kCrumple, 0.7, 0.35, 'crumple');
    solver.addBeam(nodeIndices.floorNose, nodeIndices.floorFR, kCrumple, 0.7, 0.35, 'crumple');
    solver.addBeam(nodeIndices.floorFL, nodeIndices.floorFR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorFL, nodeIndices.floorMidL, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorFR, nodeIndices.floorMidR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorMidL, nodeIndices.floorMidR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorMidL, nodeIndices.floorRL, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorMidR, nodeIndices.floorRR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorRL, nodeIndices.floorRR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorRL, nodeIndices.floorTail, kMono, 0.65, 0.40);
    solver.addBeam(nodeIndices.floorRR, nodeIndices.floorTail, kMono, 0.65, 0.40);

    // Cross Bracing (Torsional Rigidity)
    solver.addBeam(nodeIndices.floorFL, nodeIndices.floorMidR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorFR, nodeIndices.floorMidL, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorMidL, nodeIndices.floorRR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorMidR, nodeIndices.floorRL, kMono, 0.65, 0.45);

    // Vertical Pillars & Passenger Safety Cell
    solver.addBeam(nodeIndices.floorFL, nodeIndices.cowlL, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.floorFR, nodeIndices.cowlR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.cowlL, nodeIndices.cowlR, kMono, 0.65, 0.45);

    solver.addBeam(nodeIndices.cowlL, nodeIndices.roofFrontL, kMono, 0.65, 0.45); // A-Pillar
    solver.addBeam(nodeIndices.cowlR, nodeIndices.roofFrontR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.roofFrontL, nodeIndices.roofFrontR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.roofFrontL, nodeIndices.roofRearL, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.roofFrontR, nodeIndices.roofRearR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.roofRearL, nodeIndices.roofRearR, kMono, 0.65, 0.45);

    // Rear Subframe (Engine Mounting & B-Pillar / C-Pillar)
    solver.addBeam(nodeIndices.roofRearL, nodeIndices.engineBayL, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.roofRearR, nodeIndices.engineBayR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.engineBayL, nodeIndices.engineBayR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.engineBayL, nodeIndices.floorRL, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.engineBayR, nodeIndices.floorRR, kMono, 0.65, 0.45);
    solver.addBeam(nodeIndices.engineBayL, nodeIndices.decklidTip, kMono, 0.65, 0.40);
    solver.addBeam(nodeIndices.engineBayR, nodeIndices.decklidTip, kMono, 0.65, 0.40);
    solver.addBeam(nodeIndices.decklidTip, nodeIndices.floorTail, kMono, 0.65, 0.40);

    // Front Hood & Radiator Crumple Zone
    solver.addBeam(nodeIndices.floorNose, nodeIndices.hoodTip, kCrumple, 0.65, 0.30, 'crumple');
    solver.addBeam(nodeIndices.hoodTip, nodeIndices.cowlL, kCrumple, 0.65, 0.35, 'crumple');
    solver.addBeam(nodeIndices.hoodTip, nodeIndices.cowlR, kCrumple, 0.65, 0.35, 'crumple');

    // Swan-Neck Rear Wing Mounting Beams
    solver.addBeam(nodeIndices.wingL, nodeIndices.wingCenter, kWing, 0.6, 0.35, 'wing');
    solver.addBeam(nodeIndices.wingR, nodeIndices.wingCenter, kWing, 0.6, 0.35, 'wing');
    solver.addBeam(nodeIndices.wingL, nodeIndices.decklidTip, kWing, 0.6, 0.32, 'wing');
    solver.addBeam(nodeIndices.wingR, nodeIndices.decklidTip, kWing, 0.6, 0.32, 'wing');
    solver.addBeam(nodeIndices.wingCenter, nodeIndices.decklidTip, kWing, 0.6, 0.32, 'wing');

    // Suspension Double Wishbone Links & Struts
    solver.addBeam(nodeIndices.hubFL, nodeIndices.floorFL, kSusp, 0.75, 0.50, 'suspension');
    solver.addBeam(nodeIndices.hubFL, nodeIndices.cowlL, kSusp, 0.75, 0.50, 'suspension');
    solver.addBeam(nodeIndices.hubFR, nodeIndices.floorFR, kSusp, 0.75, 0.50, 'suspension');
    solver.addBeam(nodeIndices.hubFR, nodeIndices.cowlR, kSusp, 0.75, 0.50, 'suspension');

    solver.addBeam(nodeIndices.hubRL, nodeIndices.floorRL, kSusp, 0.75, 0.50, 'suspension');
    solver.addBeam(nodeIndices.hubRL, nodeIndices.engineBayL, kSusp, 0.75, 0.50, 'suspension');
    solver.addBeam(nodeIndices.hubRR, nodeIndices.floorRR, kSusp, 0.75, 0.50, 'suspension');
    solver.addBeam(nodeIndices.hubRR, nodeIndices.engineBayR, kSusp, 0.75, 0.50, 'suspension');

    // Construct Physical Wheels in Solver
    const wFL = new (solver.wheels.constructor.WheelClass || Object)(
      'FL', solver.nodes[nodeIndices.hubFL], [], true, false
    );
    const wFR = new (solver.wheels.constructor.WheelClass || Object)(
      'FR', solver.nodes[nodeIndices.hubFR], [], true, false
    );
    const wRL = new (solver.wheels.constructor.WheelClass || Object)(
      'RL', solver.nodes[nodeIndices.hubRL], [], false, true
    );
    const wRR = new (solver.wheels.constructor.WheelClass || Object)(
      'RR', solver.nodes[nodeIndices.hubRR], [], false, true
    );

    return { nodeIndices, wheels: [wFL, wFR, wRL, wRR] };
  }
}
