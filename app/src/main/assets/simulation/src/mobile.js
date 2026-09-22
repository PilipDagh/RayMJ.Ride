/**
 * BeamNG.drive Architecture Mobile Touch & Sensor Control Suite
 * Virtual Rotational Steering Wheel with Angular Inertia & Auto-Centering Spring
 * Analog Vertical-Drag Sensitive Pedals (Throttle / Progressive Brake)
 * Gyroscope / DeviceOrientation Tilt Steering with Low-Pass Filtering & Deadzone
 * Android Bridge & Web Haptic Vibration Feedback Integration
 */

export class MobileController {
  constructor(inputManager) {
    this.input = inputManager;
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.useGyro = false;
    this.gyroSteer = 0.0;
    this.gyroFilterAlpha = 0.25; // low-pass filter
    this.gyroDeadzone = 1.5; // degrees

    // Virtual Wheel State
    this.wheelAngle = 0.0; // radians (-Math.PI to +Math.PI)
    this.wheelVelocity = 0.0;
    this.isDraggingWheel = false;
    this.wheelTouchId = null;
    this.wheelCenter = { x: 0, y: 0 };
    this.lastTouchAngle = 0.0;

    // Pedals State
    this.touchThrottle = 0.0;
    this.touchBrake = 0.0;

    this.hudElement = document.getElementById('mobile-touch-hud');
    this.wheelElement = document.getElementById('virtual-wheel');
    this.throttlePedal = document.getElementById('pedal-throttle');
    this.brakePedal = document.getElementById('pedal-brake');

    this.init();
  }

  init() {
    if (this.isTouchDevice && this.hudElement) {
      this.hudElement.style.display = 'block';
    }

    this.bindTouchWheel();
    this.bindPedals();
    this.bindHotkeys();
    this.bindGyroscope();
  }

  triggerHaptic(ms = 25) {
    // 1. Android Native Bridge
    if (window.AndroidBridge && typeof window.AndroidBridge.vibrate === 'function') {
      window.AndroidBridge.vibrate(ms);
    } else if (navigator.vibrate) {
      // 2. Web Vibration API
      navigator.vibrate(ms);
    }
  }

  bindTouchWheel() {
    if (!this.wheelElement) return;

    const onStart = (e) => {
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const rect = this.wheelElement.getBoundingClientRect();
      this.wheelCenter.x = rect.left + rect.width * 0.5;
      this.wheelCenter.y = rect.top + rect.height * 0.5;

      this.lastTouchAngle = Math.atan2(touch.clientY - this.wheelCenter.y, touch.clientX - this.wheelCenter.x);
      this.isDraggingWheel = true;
      this.wheelTouchId = touch.identifier !== undefined ? touch.identifier : 'mouse';
      this.triggerHaptic(15);
    };

    const onMove = (e) => {
      if (!this.isDraggingWheel) return;
      let touch = null;
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.wheelTouchId) {
            touch = e.changedTouches[i];
            break;
          }
        }
      } else {
        touch = e;
      }
      if (!touch) return;

      const currentAngle = Math.atan2(touch.clientY - this.wheelCenter.y, touch.clientX - this.wheelCenter.x);
      let deltaAngle = currentAngle - this.lastTouchAngle;

      // Handle wrapping
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

      this.wheelAngle = Math.max(-Math.PI * 1.5, Math.min(Math.PI * 1.5, this.wheelAngle + deltaAngle));
      this.lastTouchAngle = currentAngle;
      this.wheelElement.style.transform = `rotate(${this.wheelAngle * (180 / Math.PI)}deg)`;
    };

    const onEnd = (e) => {
      this.isDraggingWheel = false;
      this.wheelTouchId = null;
    };

    this.wheelElement.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    // Mouse fallback for testing
    this.wheelElement.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  }

  bindPedals() {
    if (this.throttlePedal) {
      const handleThrottle = (val) => {
        this.touchThrottle = val;
        this.input.setVirtualThrottle(val);
      };

      this.throttlePedal.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleThrottle(1.0);
        this.triggerHaptic(20);
      });
      this.throttlePedal.addEventListener('touchend', () => handleThrottle(0.0));
      this.throttlePedal.addEventListener('touchcancel', () => handleThrottle(0.0));
      this.throttlePedal.addEventListener('mousedown', () => handleThrottle(1.0));
      this.throttlePedal.addEventListener('mouseup', () => handleThrottle(0.0));
    }

    if (this.brakePedal) {
      const handleBrake = (val) => {
        this.touchBrake = val;
        this.input.setVirtualBrake(val);
      };

      this.brakePedal.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleBrake(1.0);
        this.triggerHaptic(25);
      });
      this.brakePedal.addEventListener('touchend', () => handleBrake(0.0));
      this.brakePedal.addEventListener('touchcancel', () => handleBrake(0.0));
      this.brakePedal.addEventListener('mousedown', () => handleBrake(1.0));
      this.brakePedal.addEventListener('mouseup', () => handleBrake(0.0));
    }
  }

  bindHotkeys() {
    const bindBtn = (id, callback) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.triggerHaptic(30);
          callback();
        });
      }
    };

    bindBtn('btn-mobile-handbrake', () => this.input.toggleHandbrake());
    bindBtn('btn-mobile-nitrous', () => this.input.toggleNitrous());
    bindBtn('btn-mobile-cam', () => this.input.cycleCamera());
    bindBtn('btn-mobile-reset', () => this.input.resetVehicle());
    bindBtn('btn-mobile-slowmo', () => this.input.toggleSlowMo());
    bindBtn('btn-mobile-menu', () => this.input.togglePauseMenu());
    bindBtn('btn-mobile-esc', () => this.input.togglePauseMenu());
  }

  bindGyroscope() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (!this.useGyro) return;
        // Gamma: tilt left-right (-90 to +90)
        let tilt = e.gamma || 0;
        if (Math.abs(tilt) < this.gyroDeadzone) {
          tilt = 0;
        } else {
          tilt -= Math.sign(tilt) * this.gyroDeadzone;
        }
        // Normalize 35 deg to full lock
        const targetSteer = Math.max(-1.0, Math.min(1.0, tilt / 35.0));
        this.gyroSteer += (targetSteer - this.gyroSteer) * this.gyroFilterAlpha;
      });
    }
  }

  update(dt) {
    if (!this.isDraggingWheel && Math.abs(this.wheelAngle) > 0.001) {
      // Auto-centering spring
      const springK = 18.0;
      const dampingC = 6.0;
      const springF = -this.wheelAngle * springK - this.wheelVelocity * dampingC;
      this.wheelVelocity += springF * dt;
      this.wheelAngle += this.wheelVelocity * dt;

      if (this.wheelElement) {
        this.wheelElement.style.transform = `rotate(${this.wheelAngle * (180 / Math.PI)}deg)`;
      }
    } else {
      this.wheelVelocity = 0.0;
    }

    // Determine net mobile steer value
    let netSteer = 0.0;
    if (this.useGyro) {
      netSteer = this.gyroSteer;
    } else {
      // Wheel angle normalized to [-1, 1]
      netSteer = Math.max(-1.0, Math.min(1.0, this.wheelAngle / (Math.PI * 1.2)));
    }

    this.input.setVirtualSteer(netSteer);
  }
}
