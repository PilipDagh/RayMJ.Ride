/**
 * BeamNG.drive Architecture Complete 10-Vehicle Roster
 * Complete specifications, powertrain configs, suspension parameters,
 * and procedural visual geometry generators for all 10 vehicles.
 */

import * as THREE from '../libs/three.module.js';

export const VEHICLE_ROSTER = [
  {
    id: 'porsche_911_gt3',
    name: 'Porsche 911 GT3 (992)',
    year: '2022',
    category: 'Track-Focused Supercar',
    layout: 'Rear-Engine RWD',
    weightKg: 1435,
    rearBias: 0.62,
    nodesCount: 1450,
    beamsCount: 4900,
    engineName: '4.0L Naturally Aspirated Flat-6',
    horsepower: 502,
    torqueNm: 470,
    redline: 9000,
    transmission: '7-Speed PDK Dual-Clutch',
    topSpeedKmh: 318,
    color: 0x0055d4, // Shark Blue
    stiffness: 7.2e6,
    damping: 0.65,
    features: ['Swan-Neck Wing', 'PCCB Brakes', 'e-LSD', '4-Wheel Steer']
  },
  {
    id: 'hirochi_apex_ns98',
    name: 'Hirochi Apex NS-98',
    year: '1998',
    category: 'Mid-Engine Japanese Supercar',
    layout: 'Mid-Engine RWD',
    weightKg: 1388,
    rearBias: 0.58,
    nodesCount: 1420,
    beamsCount: 4800,
    engineName: '3.2L DOHC V6 (NA/Twin-Turbo)',
    horsepower: 290,
    torqueNm: 304,
    redline: 8200,
    transmission: '6-Speed Manual',
    topSpeedKmh: 282,
    color: 0xe11d48, // Grand Prix Red
    stiffness: 6.2e6,
    damping: 0.62,
    features: ['Pop-Up Headlights', 'Aluminum Monocoque', 'Helical LSD']
  },
  {
    id: 'bruckell_venom_vx10',
    name: 'Bruckell Venom VX-10',
    year: '2016',
    category: 'American Big-Displacement Supercar',
    layout: 'Front Mid-Engine RWD',
    weightKg: 1528,
    rearBias: 0.50,
    nodesCount: 1650,
    beamsCount: 5400,
    engineName: '8.4L Naturally Aspirated V10',
    horsepower: 645,
    torqueNm: 813,
    redline: 6500,
    transmission: '6-Speed Tremec Manual',
    topSpeedKmh: 332,
    color: 0x15803d, // Snakebite Green
    stiffness: 6.8e6,
    damping: 0.68,
    features: ['Clamshell Hood', 'Carbon Shatter', 'Extreme Torque']
  },
  {
    id: 'solis_ecowagon_v',
    name: 'Solis EcoWagon V',
    year: '2012',
    category: 'Hybrid Aerodynamic Wagon',
    layout: 'Front-Engine FWD',
    weightKg: 1483,
    rearBias: 0.42,
    nodesCount: 1280,
    beamsCount: 4100,
    engineName: '1.8L Atkinson I4 + Hybrid eCVT',
    horsepower: 134,
    torqueNm: 207,
    redline: 5500,
    transmission: 'Electronic CVT',
    topSpeedKmh: 180,
    color: 0x0284c7, // Sky Blue Eco
    stiffness: 5.2e6,
    damping: 0.70,
    features: ['Deep Front Crumple Zones', 'Regen Brakes', 'Eco Drag Aero']
  },
  {
    id: 'hirochi_crossstar_hv',
    name: 'Hirochi CrossStar HV',
    year: '2021',
    category: 'Modern Crossover SUV',
    layout: 'Front-Engine Electric AWD (e-AWD)',
    weightKg: 1741,
    rearBias: 0.48,
    nodesCount: 1510,
    beamsCount: 4950,
    engineName: '2.5L DOHC Hybrid e-AWD',
    horsepower: 219,
    torqueNm: 221,
    redline: 6200,
    transmission: 'e-CVT AWD',
    topSpeedKmh: 195,
    color: 0x475569, // Modern Slate Grey
    stiffness: 6.4e6,
    damping: 0.72,
    features: ['High-Riding Suspension', 'Ultra-Stiff Passenger Cell', 'e-AWD']
  },
  {
    id: 'bruckell_executive_v8',
    name: 'Bruckell Executive V8',
    year: '1988',
    category: 'Full-Size Boxy Luxury Sedan',
    layout: 'Front-Engine RWD',
    weightKg: 1868,
    rearBias: 0.46,
    nodesCount: 1100,
    beamsCount: 3900,
    engineName: '5.0L (302) Pushrod V8',
    horsepower: 180,
    torqueNm: 366,
    redline: 4800,
    transmission: '4-Speed Overdrive Automatic',
    topSpeedKmh: 185,
    color: 0x1e293b, // Midnight Blue Metallic
    stiffness: 4.5e6,
    damping: 0.55,
    features: ['Perimeter Ladder Frame', 'Low Torsional Rigidity', 'Heavy Body Roll']
  },
  {
    id: 'hirochi_surge_turbo_rally',
    name: 'Hirochi Surge Turbo Rally',
    year: '1998',
    category: 'Japanese AWD Hot Hatch / Rally Spec',
    layout: 'Front-Engine AWD',
    weightKg: 1197,
    rearBias: 0.47,
    nodesCount: 1350,
    beamsCount: 4400,
    engineName: '2.0L Turbocharged DOHC I4',
    horsepower: 276,
    torqueNm: 353,
    redline: 7800,
    transmission: '5-Speed Close-Ratio Manual',
    topSpeedKmh: 245,
    color: 0xfacc15, // Championship Yellow
    stiffness: 6.9e6,
    damping: 0.65,
    features: ['Rally Widebody', 'Multi-Point Roll Cage', 'Adjustable Center Diff']
  },
  {
    id: 'scintilla_velocita_v12',
    name: 'Scintilla Velocita V12',
    year: '2023',
    category: 'European Exotic Flagship Hypercar',
    layout: 'Mid-Engine RWD',
    weightKg: 1428,
    rearBias: 0.57,
    nodesCount: 1800,
    beamsCount: 6100,
    engineName: '6.5L High-Revving V12',
    horsepower: 780,
    torqueNm: 720,
    redline: 8700,
    transmission: '7-Speed Independent Shift Rod (ISR)',
    topSpeedKmh: 355,
    color: 0xea580c, // Arancio Borealis Pearl
    stiffness: 8.2e6,
    damping: 0.66,
    features: ['Carbon Monocoque Tub', 'Detachable Subframes', 'Active Aerodynamics']
  },
  {
    id: 'gavril_d15_heavy_duty',
    name: 'Gavril D15 Heavy-Duty',
    year: '2018',
    category: 'American 4x4 Dually Heavy-Duty Pickup',
    layout: 'Front-Engine 4WD (Part-Time 4WD / Low-Range)',
    weightKg: 3107,
    rearBias: 0.49,
    nodesCount: 1750,
    beamsCount: 5800,
    engineName: '6.7L Turbo-Diesel V8',
    horsepower: 475,
    torqueNm: 1423,
    redline: 3800,
    transmission: '10-Speed Heavy-Duty TorqShift',
    topSpeedKmh: 175,
    color: 0xd97706, // Sedona Orange Dually
    stiffness: 7.8e6,
    damping: 0.75,
    features: ['Boxed Steel Ladder Frame', 'Dually Rear Axle', 'Functional Heavy Hitch']
  },
  {
    id: 'gavril_barricade_429',
    name: 'Gavril Barricade 429',
    year: '1970',
    category: 'Big-Block Fastback Muscle Car',
    layout: 'Front-Engine RWD',
    weightKg: 1669,
    rearBias: 0.45,
    nodesCount: 1220,
    beamsCount: 4050,
    engineName: '7.0L (429 cu in) Cobra-Jet V8',
    horsepower: 375,
    torqueNm: 610,
    redline: 5800,
    transmission: '4-Speed Toploader Manual',
    topSpeedKmh: 215,
    color: 0x991b1b, // Candy Apple Red
    stiffness: 4.8e6,
    damping: 0.58,
    features: ['Live Rear Axle with Leaf Springs', 'Rear-Quarter Crumple', 'Shaker Hood Scoop']
  },
  {
    id: 'etk_856_tdb_sportwagon',
    name: 'ETK 856 tdb SportWagon',
    year: '2020',
    category: 'German High-Performance Estate',
    layout: 'Front-Engine AWD',
    weightKg: 1859,
    rearBias: 0.49,
    nodesCount: 1590,
    beamsCount: 5200,
    engineName: '3.0L Twin-Turbo Inline-6',
    horsepower: 503,
    torqueNm: 650,
    redline: 7200,
    transmission: '8-Speed Steptronic M Sport',
    topSpeedKmh: 290,
    color: 0x059669, // Isle of Man Green
    stiffness: 6.8e6,
    damping: 0.67,
    features: ['Composite Unibody', 'Panoramic Glass Roof Failure', 'M-xDrive Drift Mode']
  }
];

export class VehicleFactory {
  static createProceduralVehicle(vehicleId) {
    const spec = VEHICLE_ROSTER.find(v => v.id === vehicleId) || VEHICLE_ROSTER[0];
    const group = new THREE.Group();
    group.name = `vehicle_${spec.id}`;

    // Compute dimensions according to vehicle category
    let length = 4.57;
    let width = 1.85;
    let height = 1.28;
    let groundClearance = 0.12;
    let wheelRadius = 0.33;

    if (spec.id === 'gavril_d15_heavy_duty') {
      length = 6.2; width = 2.45; height = 2.05; groundClearance = 0.35; wheelRadius = 0.46;
    } else if (spec.id === 'bruckell_executive_v8') {
      length = 5.4; width = 2.02; height = 1.48; groundClearance = 0.18; wheelRadius = 0.35;
    } else if (spec.id === 'hirochi_surge_turbo_rally') {
      length = 4.15; width = 1.76; height = 1.38; groundClearance = 0.15; wheelRadius = 0.32;
    } else if (spec.id === 'solis_ecowagon_v' || spec.id === 'etk_856_tdb_sportwagon') {
      length = 4.85; width = 1.88; height = 1.44; groundClearance = 0.14; wheelRadius = 0.34;
    } else if (spec.id === 'hirochi_crossstar_hv') {
      length = 4.65; width = 1.89; height = 1.68; groundClearance = 0.22; wheelRadius = 0.36;
    }

    const paintMat = new THREE.MeshPhysicalMaterial({
      color: spec.color,
      metalness: 0.2,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });

    const trimMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      transmission: 0.85
    });

    // 1. Aerodynamic Main Body Shell
    // Generate curved body using segmented rounded profile
    const bodyGeo = new THREE.BoxGeometry(width, height * 0.55, length, 8, 4, 12);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Curve fenders & roofline
      const zNorm = z / (length * 0.5);
      if (y > 0) {
        // Taper roof inwards
        x *= (1.0 - (y / height) * 0.28);
        // Aerodynamic hood slope down at front
        if (zNorm > 0.4) {
          y -= (zNorm - 0.4) * (height * 0.35);
        }
      }
      pos.setXYZ(i, x, y, z);
    }
    bodyGeo.computeVertexNormals();

    const mainBody = new THREE.Mesh(bodyGeo, paintMat);
    mainBody.position.y = groundClearance + height * 0.35;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    mainBody.name = 'chassis_monocoque';
    group.add(mainBody);

    // 2. Cabin Greenhouse & Glass
    const cabGeo = new THREE.BoxGeometry(width * 0.82, height * 0.42, length * 0.52, 6, 2, 6);
    const cabMesh = new THREE.Mesh(cabGeo, glassMat);
    cabMesh.position.set(0, groundClearance + height * 0.72, -length * 0.04);
    group.add(cabMesh);

    // 3. Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.2 });

    function makeWheel() {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.28, 20), tireMat);
      tire.rotation.z = Math.PI * 0.5;
      tire.castShadow = true;
      wg.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.75, wheelRadius * 0.75, 0.29, 16), rimMat);
      rim.rotation.z = Math.PI * 0.5;
      wg.add(rim);
      return wg;
    }

    const xTrack = width * 0.48;
    const zWheelbase = length * 0.32;

    const wFL = makeWheel(); wFL.position.set(-xTrack, wheelRadius, zWheelbase); wFL.name = 'wheel_FL'; group.add(wFL);
    const wFR = makeWheel(); wFR.position.set(xTrack, wheelRadius, zWheelbase); wFR.name = 'wheel_FR'; group.add(wFR);
    const wRL = makeWheel(); wRL.position.set(-xTrack, wheelRadius, -zWheelbase); wRL.name = 'wheel_RL'; group.add(wRL);
    const wRR = makeWheel(); wRR.position.set(xTrack, wheelRadius, -zWheelbase); wRR.name = 'wheel_RR'; group.add(wRR);

    return {
      rootGroup: group,
      chassisMesh: mainBody,
      wheels: { wheelFL: wFL, wheelFR: wFR, wheelRL: wRL, wheelRR: wRR },
      spec
    };
  }
}
