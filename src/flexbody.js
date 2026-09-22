/**
 * BeamNG.drive Architecture Flexbody & Deformable Mesh Skinning Engine
 * Tetrahedral Barycentric & Inverse-Distance Nodal Vertex Skinning
 * Dynamic Normal Recomputation for Realistic Specular Highlights on Crumpled Sheet Metal
 * Detachable Assembly Decoupling & Metallic Spark Particle System
 */

import * as THREE from '../libs/three.module.js';

export class FlexbodySkinning {
  constructor(mesh, solver, subAssemblyTag = 'chassis') {
    this.mesh = mesh;
    this.solver = solver;
    this.subAssemblyTag = subAssemblyTag;
    this.geometry = mesh.geometry;
    this.isDetached = false;

    // Cache initial untransformed vertex positions
    const posAttr = this.geometry.attributes.position;
    this.vertexCount = posAttr.count;
    this.initialPositions = new Float32Array(this.vertexCount * 3);

    for (let i = 0; i < this.vertexCount * 3; i++) {
      this.initialPositions[i] = posAttr.array[i];
    }

    // Build K-Nearest Node Skinning Weights for each vertex
    this.skinWeights = []; // [ { nodeIndices: [i, j, k], weights: [w1, w2, w3] }, ... ]
    this.bindNodes();
  }

  /**
   * Bind each visual mesh vertex to its closest soft-body physical nodes
   */
  bindNodes() {
    const nodes = this.solver.nodes;
    if (nodes.length === 0) return;

    for (let v = 0; v < this.vertexCount; v++) {
      const vx = this.initialPositions[v * 3];
      const vy = this.initialPositions[v * 3 + 1];
      const vz = this.initialPositions[v * 3 + 2];

      // Find 3 closest nodes
      const dists = [];
      for (let n = 0; n < nodes.length; n++) {
        const nx = nodes[n].initialPosition[0];
        const ny = nodes[n].initialPosition[1];
        const nz = nodes[n].initialPosition[2];
        const d = Math.hypot(vx - nx, vy - ny, vz - nz);
        dists.push({ index: n, dist: d });
      }

      dists.sort((a, b) => a.dist - b.dist);
      const top3 = dists.slice(0, 3);

      // Inverse distance weighting
      const invD0 = 1.0 / Math.max(0.02, top3[0].dist);
      const invD1 = 1.0 / Math.max(0.02, top3[1].dist);
      const invD2 = 1.0 / Math.max(0.02, top3[2].dist);
      const sumInv = invD0 + invD1 + invD2;

      this.skinWeights.push({
        nodeIndices: [top3[0].index, top3[1].index, top3[2].index],
        weights: [invD0 / sumInv, invD1 / sumInv, invD2 / sumInv]
      });
    }
  }

  /**
   * Deform Visual Mesh based on current Node Lattice state
   */
  updateMeshDeformation() {
    if (!this.geometry || !this.geometry.attributes.position) return;
    const posAttr = this.geometry.attributes.position;
    const nodes = this.solver.nodes;

    for (let v = 0; v < this.vertexCount; v++) {
      const skin = this.skinWeights[v];
      if (!skin) continue;

      const idx0 = skin.nodeIndices[0];
      const idx1 = skin.nodeIndices[1];
      const idx2 = skin.nodeIndices[2];
      const w0 = skin.weights[0];
      const w1 = skin.weights[1];
      const w2 = skin.weights[2];

      const n0 = nodes[idx0];
      const n1 = nodes[idx1];
      const n2 = nodes[idx2];

      // Interpolate nodal displacement from initial position
      const disp0X = n0.position[0] - n0.initialPosition[0];
      const disp0Y = n0.position[1] - n0.initialPosition[1];
      const disp0Z = n0.position[2] - n0.initialPosition[2];

      const disp1X = n1.position[0] - n1.initialPosition[0];
      const disp1Y = n1.position[1] - n1.initialPosition[1];
      const disp1Z = n1.position[2] - n1.initialPosition[2];

      const disp2X = n2.position[0] - n2.initialPosition[0];
      const disp2Y = n2.position[1] - n2.initialPosition[1];
      const disp2Z = n2.position[2] - n2.initialPosition[2];

      const netDispX = w0 * disp0X + w1 * disp1X + w2 * disp2X;
      const netDispY = w0 * disp0Y + w1 * disp0Y + w2 * disp2Y;
      const netDispZ = w0 * disp0Z + w1 * disp1Z + w2 * disp2Z;

      const baseVx = this.initialPositions[v * 3];
      const baseVy = this.initialPositions[v * 3 + 1];
      const baseVz = this.initialPositions[v * 3 + 2];

      posAttr.array[v * 3] = baseVx + netDispX;
      posAttr.array[v * 3 + 1] = baseVy + netDispY;
      posAttr.array[v * 3 + 2] = baseVz + netDispZ;
    }

    posAttr.needsUpdate = true;

    // Dynamic Normal Recomputation (BeamNG reflection distortion on crumpled body panels)
    this.geometry.computeVertexNormals();
  }
}

export class SparkParticleSystem {
  constructor(scene, maxSparks = 500) {
    this.scene = scene;
    this.maxSparks = maxSparks;
    this.positions = new Float32Array(maxSparks * 3);
    this.velocities = new Float32Array(maxSparks * 3);
    this.lifetimes = new Float32Array(maxSparks);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffa500,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, count = 12) {
    let spawned = 0;
    for (let i = 0; i < this.maxSparks && spawned < count; i++) {
      if (this.lifetimes[i] <= 0) {
        this.lifetimes[i] = 0.45 + Math.random() * 0.35;
        this.positions[i * 3] = x + (Math.random() - 0.5) * 0.05;
        this.positions[i * 3 + 1] = y + 0.02;
        this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.05;

        this.velocities[i * 3] = vx + (Math.random() - 0.5) * 8.0;
        this.velocities[i * 3 + 1] = Math.random() * 5.0 + 1.5;
        this.velocities[i * 3 + 2] = vz + (Math.random() - 0.5) * 8.0;
        spawned++;
      }
    }
  }

  update(dt) {
    const posAttr = this.points.geometry.attributes.position;
    for (let i = 0; i < this.maxSparks; i++) {
      if (this.lifetimes[i] > 0) {
        this.lifetimes[i] -= dt;
        this.velocities[i * 3 + 1] -= 9.81 * dt; // gravity

        this.positions[i * 3] += this.velocities[i * 3] * dt;
        this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
        this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

        // Bounce off ground
        if (this.positions[i * 3 + 1] < 0.02) {
          this.positions[i * 3 + 1] = 0.02;
          this.velocities[i * 3 + 1] = -this.velocities[i * 3 + 1] * 0.4;
        }
      } else {
        this.positions[i * 3 + 1] = -100; // hide
      }
    }
    posAttr.needsUpdate = true;
  }
}
