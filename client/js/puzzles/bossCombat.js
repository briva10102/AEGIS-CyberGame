// HTML5 Canvas Boss Visualizer (Adapted from Malware Defense APT Boss concepts)
class BossCombatEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.running = false;
    this.weakpoint = 'CENTER_CORE';
    this.time = 0;
    this.particles = [];
  }

  start() {
    this.running = true;
    this.animate();
  }

  stop() {
    this.running = false;
  }

  setWeakpoint(wp) {
    this.weakpoint = wp;
    // Spawn transition particles
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 30
      });
    }
  }

  animate() {
    if (!this.running) return;
    this.time += 0.05;
    this.ctx.fillStyle = 'rgba(4, 6, 10, 0.25)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Draw connecting neural tendrils
    this.ctx.strokeStyle = '#1c2738';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 200, cy);
    this.ctx.lineTo(cx, cy);
    this.ctx.lineTo(cx + 200, cy);
    this.ctx.stroke();

    // Cores: Left, Center, Right
    const cores = [
      { id: 'LEFT_CORE', x: cx - 180, y: cy + Math.sin(this.time) * 15, r: 35 },
      { id: 'CENTER_CORE', x: cx, y: cy + Math.cos(this.time) * 15, r: 50 },
      { id: 'RIGHT_CORE', x: cx + 180, y: cy - Math.sin(this.time) * 15, r: 35 }
    ];

    cores.forEach((core) => {
      const isWeak = (core.id === this.weakpoint);
      this.ctx.beginPath();
      this.ctx.arc(core.x, core.y, core.r, 0, Math.PI * 2);

      if (isWeak) {
        this.ctx.fillStyle = 'rgba(255, 51, 102, 0.4)';
        this.ctx.strokeStyle = '#ff3366';
        this.ctx.lineWidth = 4;
      } else {
        this.ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.lineWidth = 2;
      }
      this.ctx.fill();
      this.ctx.stroke();

      // Core label
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px "IBM Plex Mono"';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(core.id.replace('_', ' '), core.x, core.y + 4);
    });

    // Particle dynamics
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      this.ctx.fillStyle = 'rgba(255, 51, 102, ' + (p.life / 30) + ')';
      this.ctx.fillRect(p.x, p.y, 3, 3);
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    requestAnimationFrame(() => this.animate());
  }
}