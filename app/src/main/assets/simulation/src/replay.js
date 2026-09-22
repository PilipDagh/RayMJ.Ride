/**
 * BeamNG.drive Replay Recording & Multi-Perspective Playback Engine
 * Captures full structural node-beam lattices, velocities, broken states, wheel rotations,
 * and allows variable playback speed (0.1x - 2.0x), timeline scrubbing, and multi-cam review.
 */

export class ReplaySystem {
  constructor(solver, flexbody, powertrain) {
    this.solver = solver;
    this.flexbody = flexbody;
    this.powertrain = powertrain;

    this.isRecording = true;
    this.isPlaying = false;
    this.isPaused = false;

    this.frames = []; // Array of snapshot frames
    this.maxFrames = 300; // ~10 seconds at 30fps capture - optimal buffer size
    this.recordInterval = 1.0 / 30.0; // 30Hz snapshot
    this.recordTimer = 0.0;

    this.currentPlaybackIndex = 0;
    this.playbackSpeed = 1.0;
    this.savedReplays = [];

    // Callbacks for UI updates
    this.onTimelineUpdate = null;
    this.onStateChange = null;
  }

  setSolver(solver, flexbody, powertrain) {
    this.solver = solver;
    this.flexbody = flexbody;
    this.powertrain = powertrain;
  }

  clear() {
    this.frames = [];
    this.currentPlaybackIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
  }

  startRecording() {
    this.clear();
    this.isRecording = true;
    this.isPlaying = false;
    if (this.onStateChange) this.onStateChange('RECORDING');
  }

  stopRecording() {
    this.isRecording = false;
    if (this.onStateChange) this.onStateChange('STOPPED');
  }

  startPlayback() {
    if (this.frames.length === 0) return;
    this.isRecording = false;
    this.isPlaying = true;
    this.isPaused = false;
    if (this.onStateChange) this.onStateChange('PLAYING');
  }

  pausePlayback() {
    this.isPaused = !this.isPaused;
    if (this.onStateChange) this.onStateChange(this.isPaused ? 'PAUSED' : 'PLAYING');
  }

  stopPlayback() {
    this.isPlaying = false;
    this.isPaused = false;
    this.isRecording = true; // resume live mode
    if (this.onStateChange) this.onStateChange('LIVE');
  }

  setSpeed(speed) {
    this.playbackSpeed = speed;
  }

  seek(progress01) {
    if (this.frames.length === 0) return;
    const targetIdx = Math.floor(progress01 * (this.frames.length - 1));
    this.currentPlaybackIndex = Math.max(0, Math.min(this.frames.length - 1, targetIdx));
    this.applyFrame(this.frames[this.currentPlaybackIndex]);
  }

  saveCurrentReplay(name = 'Epic Crash Replay') {
    if (this.frames.length === 0) return false;
    const clonedFrames = this.frames.map(f => ({
      nodePositions: new Float32Array(f.nodePositions),
      brokenBeams: [...f.brokenBeams],
      wheelStates: f.wheelStates.map(w => ({ ...w })),
      speed: f.speed
    }));
    const replayData = {
      id: 'replay_' + Date.now(),
      name: `${name} (${(this.frames.length / 30).toFixed(1)}s)`,
      timestamp: new Date().toLocaleTimeString(),
      frameCount: this.frames.length,
      frames: clonedFrames
    };
    this.savedReplays.push(replayData);
    return true;
  }

  loadReplay(replayId) {
    const found = this.savedReplays.find(r => r.id === replayId);
    if (found) {
      this.frames = found.frames.map(f => ({
        nodePositions: new Float32Array(f.nodePositions),
        brokenBeams: [...f.brokenBeams],
        wheelStates: f.wheelStates.map(w => ({ ...w })),
        speed: f.speed
      }));
      this.currentPlaybackIndex = 0;
      this.startPlayback();
      return true;
    }
    return false;
  }

  captureSnapshot() {
    if (!this.solver || this.solver.nodes.length === 0) return;

    const numNodes = this.solver.nodes.length;
    const nodePositions = new Float32Array(numNodes * 3);

    for (let i = 0; i < numNodes; i++) {
      const pos = this.solver.nodes[i].position;
      nodePositions[i * 3 + 0] = pos[0];
      nodePositions[i * 3 + 1] = pos[1];
      nodePositions[i * 3 + 2] = pos[2];
    }

    // Capture broken beams status (bitmask or array of indices)
    const brokenBeams = [];
    for (let b = 0; b < this.solver.beams.length; b++) {
      if (this.solver.beams[b].isBroken) {
        brokenBeams.push(b);
      }
    }

    // Capture wheel rotations & steer
    const wheelStates = [];
    for (let w = 0; w < this.solver.wheels.length; w++) {
      const wh = this.solver.wheels[w];
      wheelStates.push({
        rot: wh.angularVelocity,
        steer: wh.steerAngle,
        blown: wh.isBlown
      });
    }

    const frame = {
      nodePositions,
      brokenBeams,
      wheelStates,
      speed: this.solver.wheels.length > 0 ? this.solver.wheels[0].angularVelocity : 0
    };

    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  applyFrame(frame) {
    if (!frame || !this.solver) return;

    const numNodes = Math.min(this.solver.nodes.length, frame.nodePositions.length / 3);
    for (let i = 0; i < numNodes; i++) {
      this.solver.nodes[i].position[0] = frame.nodePositions[i * 3 + 0];
      this.solver.nodes[i].position[1] = frame.nodePositions[i * 3 + 1];
      this.solver.nodes[i].position[2] = frame.nodePositions[i * 3 + 2];
    }

    // Reconstruct broken beams
    const brokenSet = new Set(frame.brokenBeams);
    for (let b = 0; b < this.solver.beams.length; b++) {
      this.solver.beams[b].isBroken = brokenSet.has(b);
    }

    // Apply wheel states
    if (frame.wheelStates && frame.wheelStates.length === this.solver.wheels.length) {
      for (let w = 0; w < this.solver.wheels.length; w++) {
        this.solver.wheels[w].isBlown = frame.wheelStates[w].blown;
        this.solver.wheels[w].steerAngle = frame.wheelStates[w].steer;
      }
    }

    // Update flexbody mesh visual deformation
    if (this.flexbody) {
      this.flexbody.updateMeshDeformation();
    }
  }

  update(dt) {
    if (this.isRecording) {
      this.recordTimer += dt;
      if (this.recordTimer >= this.recordInterval) {
        this.recordTimer = 0.0;
        this.captureSnapshot();
        if (this.onTimelineUpdate) {
          this.onTimelineUpdate(1.0, this.frames.length, this.frames.length);
        }
      }
    } else if (this.isPlaying && !this.isPaused) {
      if (this.frames.length === 0) return;

      this.currentPlaybackIndex += this.playbackSpeed;
      if (this.currentPlaybackIndex >= this.frames.length) {
        this.currentPlaybackIndex = 0; // Loop replay
      }

      const frameIdx = Math.floor(this.currentPlaybackIndex);
      this.applyFrame(this.frames[frameIdx]);

      if (this.onTimelineUpdate) {
        this.onTimelineUpdate(frameIdx / (this.frames.length - 1), frameIdx, this.frames.length);
      }
    }
  }
}
