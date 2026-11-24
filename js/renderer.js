const GameRenderer = {
    canvas: null,
    ctx: null,
    cellSize: 0,

    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
    },

    resize(gridSize) {
        const size = Math.min(window.innerWidth - 24, window.innerHeight - 150, 500);
        this.canvas.width = size;
        this.canvas.height = size;
        this.cellSize = size / gridSize;
    },

    draw(levelState) {
        const { gridSize, snakes, barriers } = levelState;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(GameCamera.offsetX, GameCamera.offsetY);
        this.ctx.scale(GameCamera.scale, GameCamera.scale);

        // رسم الشبكة الخفيفة
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1 / GameCamera.scale;
        for (let i = 0; i <= gridSize; i++) {
            const pos = i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }

        // رسم الحواجز
        barriers.forEach(b => {
            const pad = this.cellSize * 0.15;
            this.ctx.fillStyle = '#334155';
            this.ctx.beginPath();
            this.ctx.roundRect(
                b.x * this.cellSize + pad,
                b.y * this.cellSize + pad,
                this.cellSize - pad * 2,
                this.cellSize - pad * 2,
                4
            );
            this.ctx.fill();
        });

        // رسم الثعابين الحقيقية
        snakes.forEach(snake => {
            if (snake.status === 'gone') return;
            this.drawRealisticSnake(snake);
        });

        // رسم جزيئات الاحتراق
        GameEffects.updateAndDraw(this.ctx);

        this.ctx.restore();
    },

    drawRealisticSnake(snake) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const isBurning = snake.status === 'burning';

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = isBurning ? '#ff4500' : snake.color;
        ctx.shadowColor = isBurning ? '#ff0000' : snake.color;
        ctx.shadowBlur = isBurning ? 10 : 3;

        const bodyWidth = Math.max(2.2, cs * 0.28);
        ctx.lineWidth = bodyWidth;

        ctx.beginPath();
        snake.body.forEach((seg, index) => {
            const px = (seg.x + 0.5) * cs;
            const py = (seg.y + 0.5) * cs;
            if (index === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();

        const head = snake.body.at(0);
        const hx = (head.x + 0.5) * cs;
        const hy = (head.y + 0.5) * cs;
        const angle = Math.atan2(snake.dir.dy, snake.dir.dx);

        ctx.translate(hx, hy);
        ctx.rotate(angle);

        const headLength = Math.max(5, cs * 0.65);
        const headWidth = Math.max(4, cs * 0.52);

        ctx.fillStyle = isBurning ? '#ff2a00' : snake.color;
        ctx.beginPath();
        ctx.moveTo(headLength * 0.6, 0);
        ctx.quadraticCurveTo(0, -headWidth * 0.65, -headLength * 0.45, -headWidth * 0.35);
        ctx.lineTo(-headLength * 0.45, headWidth * 0.35);
        ctx.quadraticCurveTo(0, headWidth * 0.65, headLength * 0.6, 0);
        ctx.closePath();
        ctx.fill();

        if (cs * GameCamera.scale >= 8 && !isBurning) {
            ctx.fillStyle = '#070d1f';
            const eyeR = Math.max(0.8, cs * 0.07);
            ctx.beginPath();
            ctx.arc(headLength * 0.1, -headWidth * 0.22, eyeR, 0, Math.PI * 2);
            ctx.arc(headLength * 0.1, headWidth * 0.22, eyeR, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
};

