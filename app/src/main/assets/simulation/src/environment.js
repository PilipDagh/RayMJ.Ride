/**
 * BeamNG.drive Architecture 5-Environment Simulation Engine
 * 1. Physics Proving Grounds & Crash Testing Grid (Drop Tower, Ramps, Crusher Press)
 * 2. Metro City Center (Streets, Curbs, Breakable Hydrants, Overpass)
 * 3. Highland Trails & Mud Proving Ground (Mud Trenches, Suspension Bridge)
 * 4. Mount Akina Touge Pass (Downhill Hairpins, Drainage Gutters, Guardrails)
 * 5. Industrial Container Harbor (Shipping Containers, Docks, Ocean Hydrolock Hazard)
 */

import * as THREE from '../libs/three.module.js';

export class BoxCollider {
  constructor(center, size, friction = 0.7, restitution = 0.15) {
    this.center = center; // [x, y, z]
    this.size = size;     // [sx, sy, sz]
    this.friction = friction;
    this.restitution = restitution;
    this.halfSize = [size[0] * 0.5, size[1] * 0.5, size[2] * 0.5];
  }

  resolveNodeCollision(node, dt) {
    const minX = this.center[0] - this.halfSize[0];
    const maxX = this.center[0] + this.halfSize[0];
    const minY = this.center[1] - this.halfSize[1];
    const maxY = this.center[1] + this.halfSize[1];
    const minZ = this.center[2] - this.halfSize[2];
    const maxZ = this.center[2] + this.halfSize[2];

    const nx = node.position[0];
    const ny = node.position[1];
    const nz = node.position[2];
    const r = node.radius || 0.05;

    if (nx + r > minX && nx - r < maxX &&
        ny + r > minY && ny - r < maxY &&
        nz + r > minZ && nz - r < maxZ) {

      // Determine shallowest penetration axis
      const penLeft = (nx + r) - minX;
      const penRight = maxX - (nx - r);
      const penBottom = (ny + r) - minY;
      const penTop = maxY - (ny - r);
      const penBack = (nz + r) - minZ;
      const penFront = maxZ - (nz - r);

      const minPen = Math.min(penLeft, penRight, penBottom, penTop, penBack, penFront);

      let normal = [0, 1, 0];
      if (minPen === penTop) {
        normal = [0, 1, 0];
        node.position[1] = maxY + r;
      } else if (minPen === penBottom) {
        normal = [0, -1, 0];
        node.position[1] = minY - r;
      } else if (minPen === penLeft) {
        normal = [-1, 0, 0];
        node.position[0] = minX - r;
      } else if (minPen === penRight) {
        normal = [1, 0, 0];
        node.position[0] = maxX + r;
      } else if (minPen === penBack) {
        normal = [0, 0, -1];
        node.position[2] = minZ - r;
      } else if (minPen === penFront) {
        normal = [0, 0, 1];
        node.position[2] = maxZ + r;
      }

      // Penalty normal bounce & Coulomb friction
      const vn = node.velocity[0] * normal[0] + node.velocity[1] * normal[1] + node.velocity[2] * normal[2];
      if (vn < 0) {
        node.velocity[0] -= (1.0 + this.restitution) * vn * normal[0];
        node.velocity[1] -= (1.0 + this.restitution) * vn * normal[1];
        node.velocity[2] -= (1.0 + this.restitution) * vn * normal[2];

        // Friction tangentially
        node.velocity[0] *= (1.0 - this.friction * 0.15);
        node.velocity[2] *= (1.0 - this.friction * 0.15);
      }
      node.inContact = true;
    }
  }
}

export class EnvironmentManager {
  constructor(scene, physicsSolver) {
    this.scene = scene;
    this.solver = physicsSolver;
    this.currentEnvId = 'proving_grounds';
    this.envGroup = new THREE.Group();
    this.scene.add(this.envGroup);
    this.colliders = [];

    // Interactive crusher ram state
    this.crusherMesh = null;
    this.crusherY = 4.5;
    this.crusherSpeed = 1.2;
    this.crusherActive = false;
  }

  loadEnvironment(envId) {
    this.currentEnvId = envId;
    this.colliders = [];

    // Clear previous environment meshes
    while (this.envGroup.children.length > 0) {
      const obj = this.envGroup.children[0];
      this.envGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    if (envId === 'proving_grounds') {
      this.buildProvingGrounds();
    } else if (envId === 'metro_city') {
      this.buildMetroCity();
    } else if (envId === 'highland_trails') {
      this.buildHighlandTrails();
    } else if (envId === 'akina_touge') {
      this.buildAkinaTouge();
    } else if (envId === 'container_harbor') {
      this.buildContainerHarbor();
    }

    this.solver.setEnvironmentColliders(this.colliders, 0.0);
  }

  /**
   * 1. Physics Proving Grounds & Crash Testing Grid
   */
  buildProvingGrounds() {
    // 4km High-Contrast Testing Grid Ground
    const gridGeo = new THREE.PlaneGeometry(1200, 1200, 60, 60);
    const gridMat = new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.85,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(gridGeo, gridMat);
    ground.rotation.x = -Math.PI * 0.5;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // Grid lines helper
    const gridHelper = new THREE.GridHelper(1200, 120, 0xff6b00, 0x334155);
    gridHelper.position.y = 0.01;
    this.envGroup.add(gridHelper);

    // Heavy Concrete Crash Barriers
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
    const barrierGeo = new THREE.BoxGeometry(20, 3.5, 4);
    const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
    barrierMesh.position.set(0, 1.75, 40);
    barrierMesh.castShadow = true;
    barrierMesh.receiveShadow = true;
    this.envGroup.add(barrierMesh);
    this.colliders.push(new BoxCollider([0, 1.75, 40], [20, 3.5, 4], 0.8, 0.05));

    // High Launch Ramps (15°, 30°, 45°)
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
    const ramp15 = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 12), rampMat);
    ramp15.position.set(-25, 0.8, 25);
    ramp15.rotation.x = 0.26; // 15 deg
    ramp15.castShadow = true;
    this.envGroup.add(ramp15);
    this.colliders.push(new BoxCollider([-25, 0.8, 25], [8, 2.5, 12], 0.7, 0.1));

    const ramp30 = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 12), rampMat);
    ramp30.position.set(25, 1.5, 25);
    ramp30.rotation.x = 0.52; // 30 deg
    ramp30.castShadow = true;
    this.envGroup.add(ramp30);
    this.colliders.push(new BoxCollider([25, 1.5, 25], [8, 4.5, 12], 0.7, 0.1));

    // Steel Crash Bollards
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.2 });
    for (let b = -4; b <= 4; b++) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.4, 16), bollardMat);
      bollard.position.set(b * 3.5, 0.7, 70);
      bollard.castShadow = true;
      this.envGroup.add(bollard);
      this.colliders.push(new BoxCollider([b * 3.5, 0.7, 70], [0.5, 1.4, 0.5], 0.6, 0.1));
    }

    // Dynamic Hydraulic Car Crusher Press Structure
    const pressFrameMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 });
    const pressPillars = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 1), pressFrameMat);
    pressPillars.position.set(0, 4, -40);
    this.envGroup.add(pressPillars);

    // Moving Hydraulic Ram
    const ramGeo = new THREE.BoxGeometry(8, 1.2, 5);
    const ramMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    this.crusherMesh = new THREE.Mesh(ramGeo, ramMat);
    this.crusherMesh.position.set(0, 4.5, -40);
    this.crusherMesh.castShadow = true;
    this.envGroup.add(this.crusherMesh);
    this.crusherCollider = new BoxCollider([0, 4.5, -40], [8, 1.2, 5], 0.85, 0.02);
    this.colliders.push(this.crusherCollider);
    this.crusherActive = true;
  }

  /**
   * 2. Metro City Center
   */
  buildMetroCity() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), roadMat);
    ground.rotation.x = -Math.PI * 0.5;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // Downtown Skyscrapers & Buildings Colliders
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
    for (let x = -3; x <= 3; x++) {
      if (x === 0) continue;
      for (let z = -3; z <= 3; z++) {
        const height = 30 + Math.abs(x * z) * 15;
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(40, height, 40), bldgMat);
        bldg.position.set(x * 65, height * 0.5, z * 65);
        bldg.castShadow = true;
        this.envGroup.add(bldg);
        this.colliders.push(new BoxCollider([x * 65, height * 0.5, z * 65], [40, height, 40], 0.9, 0.05));
      }
    }

    // Elevated Highway Overpass
    const overpassMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(300, 2.5, 18), overpassMat);
    deck.position.set(0, 12, 0);
    deck.castShadow = true;
    this.envGroup.add(deck);
    this.colliders.push(new BoxCollider([0, 12, 0], [300, 2.5, 18], 0.85, 0.1));
  }

  /**
   * 3. Highland Trails & Mud Proving Ground
   */
  buildHighlandTrails() {
    // Terrain with mud track
    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, 40, 40);
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x3f2e18, roughness: 0.95 });
    const ground = new THREE.Mesh(terrainGeo, terrainMat);
    ground.rotation.x = -Math.PI * 0.5;
    ground.receiveShadow = true;
    this.envGroup.add(ground);

    // Flexible Timber Suspension Bridge
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    for (let i = -10; i <= 10; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 2.5), woodMat);
      plank.position.set(0, 5 - Math.abs(i) * 0.2, i * 2.8 + 50);
      plank.castShadow = true;
      this.envGroup.add(plank);
      this.colliders.push(new BoxCollider([0, 5 - Math.abs(i) * 0.2, i * 2.8 + 50], [10, 0.4, 2.5], 0.9, 0.05));
    }
  }

  /**
   * 4. Mount Akina Touge Pass
   */
  buildAkinaTouge() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), roadMat);
    ground.rotation.x = -Math.PI * 0.5;
    this.envGroup.add(ground);

    // Downhill Hairpins & Guardrails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    for (let g = -50; g <= 50; g += 4) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 4), railMat);
      rail.position.set(-14, 0.5, g);
      this.envGroup.add(rail);
      this.colliders.push(new BoxCollider([-14, 0.5, g], [0.3, 0.8, 4], 0.75, 0.15));

      const railRight = rail.clone();
      railRight.position.x = 14;
      this.envGroup.add(railRight);
      this.colliders.push(new BoxCollider([14, 0.5, g], [0.3, 0.8, 4], 0.75, 0.15));
    }
  }

  /**
   * 5. Industrial Container Harbor
   */
  buildContainerHarbor() {
    const dockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const dock = new THREE.Mesh(new THREE.BoxGeometry(400, 4, 400), dockMat);
    dock.position.set(0, -2, 0);
    this.envGroup.add(dock);

    // Stackable Shipping ISO Containers
    const containerColors = [0xb91c1c, 0x1d4ed8, 0x15803d, 0xd97706, 0x475569];
    for (let c = 0; c < 24; c++) {
      const cMat = new THREE.MeshStandardMaterial({
        color: containerColors[c % containerColors.length],
        roughness: 0.6,
        metalness: 0.4
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 14), cMat);
      const row = Math.floor(c / 6);
      const col = c % 6;
      box.position.set((col - 2.5) * 16, 3, (row - 1.5) * 22 + 40);
      box.castShadow = true;
      this.envGroup.add(box);
      this.colliders.push(new BoxCollider(
        [(col - 2.5) * 16, 3, (row - 1.5) * 22 + 40],
        [6, 6, 14],
        0.8, 0.08
      ));
    }
  }

  update(dt) {
    // Animate hydraulic car crusher if active
    if (this.crusherActive && this.crusherMesh && this.crusherCollider) {
      this.crusherY -= this.crusherSpeed * dt;
      if (this.crusherY < 0.8) {
        this.crusherSpeed = -Math.abs(this.crusherSpeed);
      } else if (this.crusherY > 5.0) {
        this.crusherSpeed = Math.abs(this.crusherSpeed);
      }
      this.crusherMesh.position.y = this.crusherY;
      this.crusherCollider.center[1] = this.crusherY;
    }
  }
}
