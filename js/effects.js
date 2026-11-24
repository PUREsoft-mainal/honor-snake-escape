const GameEffects = {
    particles: [],

    igniteSnake(snake, cellSize) {
        snake.body.forEach(seg => {
            const cx = (seg.x + 0.5) * cellSize;
            const cy = (seg.y + 0.5) * cellSize;
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 3 - 1,
                    life: 1.0,
                    size: Math.max(2, cellSize * 0.25),
                    color: Math.random() > 0.4 ? '#ff4500' : '#ffbe0b'
                });
            }
        });
    },

    updateAndDraw(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    },

    clear() {
        this.particles = [];
    }
};

