window.onload = function () {
  const canvas = document.getElementById("bokehCanvas");
  const ctx = canvas.getContext("2d");

  let _WIDTH = 0;
  let _HEIGHT = 0;
  const numOfBokehs = 32;
  let bokehArray = [];

  const mouse = {
    x: null,
    y: null,
    radius: 280,
    active: false
  };

  function resizeCanvas() {
    _WIDTH = canvas.width = window.innerWidth;
    _HEIGHT = canvas.height = window.innerHeight;
  }

  function updatePointerPosition(clientX, clientY) {
    mouse.x = clientX;
    mouse.y = clientY;
    mouse.active = true;
  }

  window.addEventListener("mousemove", (e) => {
    updatePointerPosition(e.clientX, e.clientY);
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      updatePointerPosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.x = null;
    mouse.y = null;
  });

  window.addEventListener("touchend", () => {
    mouse.active = false;
    mouse.x = null;
    mouse.y = null;
  });

  class Bokeh {
    constructor() {
      this.init();
    }

    init() {
      this.size = Math.random() * 90 + 50;
      this.x = Math.random() * (_WIDTH - this.size * 2) + this.size;
      this.y = Math.random() * (_HEIGHT - this.size * 2) + this.size;
      this.H = Math.floor(Math.random() * 120 + 180);
      this.S = Math.floor(Math.random() * 40 + 60);
      this.L = Math.floor(Math.random() * 40 + 25);
      this.vx = (Math.random() - 0.5) * 1.2;
      this.vy = (Math.random() - 0.5) * 1.2;
      this.angleX = Math.random() * Math.PI * 2;
      this.angleY = Math.random() * Math.PI * 2;
      this.friction = 0.95;
    }

    update() {
      let dx = Math.cos(this.angleX) * 0.8 + this.vx;
      let dy = Math.sin(this.angleY) * 0.8 + this.vy;

      if (mouse.active && mouse.x !== null && mouse.y !== null) {
        const distX = this.x - mouse.x;
        const distY = this.y - mouse.y;
        const distance = Math.hypot(distX, distY);

        if (distance < mouse.radius && distance > 0) {
          const force = (mouse.radius - distance) / mouse.radius;
          const pushX = (distX / distance) * force * 6.5;
          const pushY = (distY / distance) * force * 6.5;
          this.vx += pushX * 0.18;
          this.vy += pushY * 0.18;
        }
      }

      this.vx *= this.friction;
      this.vy *= this.friction;
      this.x += dx;
      this.y += dy;

      if (this.x <= this.size) {
        this.x = this.size;
        this.vx *= -1;
        this.angleX += Math.PI;
      } else if (this.x >= _WIDTH - this.size) {
        this.x = _WIDTH - this.size;
        this.vx *= -1;
        this.angleX += Math.PI;
      }

      if (this.y <= this.size) {
        this.y = this.size;
        this.vy *= -1;
        this.angleY += Math.PI;
      } else if (this.y >= _HEIGHT - this.size) {
        this.y = _HEIGHT - this.size;
        this.vy *= -1;
        this.angleY += Math.PI;
      }

      this.angleX += 0.006;
      this.angleY += 0.006;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
      ctx.fillStyle = `hsl(${this.H}, ${this.S}%, ${this.L}%)`;
      ctx.fill();
    }
  }

  function initBokehs() {
    bokehArray = [];
    for (let i = 0; i < numOfBokehs; i++) bokehArray.push(new Bokeh());
  }

  window.addEventListener("dblclick", () => initBokehs());
  window.addEventListener("resize", () => {
    resizeCanvas();
    initBokehs();
  });

  function animate() {
    ctx.clearRect(0, 0, _WIDTH, _HEIGHT);
    for (let i = 0; i < bokehArray.length; i++) {
      bokehArray[i].update();
      bokehArray[i].draw();
    }
    requestAnimationFrame(animate);
  }

  resizeCanvas();
  initBokehs();
  animate();
};
