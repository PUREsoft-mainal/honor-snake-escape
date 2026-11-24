const GameCamera = {
    scale: 1,
    minScale: 1,
    maxScale: 6,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    hasMoved: false,
    lastX: 0,
    lastY: 0,
    initialPinchDist: null,
    initialScale: 1,

    reset() {
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.hasMoved = false;
        this.initialPinchDist = null;
    },

    screenToGrid(clientX, clientY, canvas, cellSize) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        const worldX = (canvasX - this.offsetX) / this.scale;
        const worldY = (canvasY - this.offsetY) / this.scale;

        return {
            gridX: Math.floor(worldX / cellSize),
            gridY: Math.floor(worldY / cellSize)
        };
    },

    zoomBy(factor, canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        this.setZoom(this.scale * factor, centerX, centerY, canvas);
    },

    setZoom(newScale, focalX, focalY, canvas) {
        const clampedScale = Math.min(this.maxScale, Math.max(this.minScale, newScale));
        const ratio = clampedScale / this.scale;

        this.offsetX = focalX - (focalX - this.offsetX) * ratio;
        this.offsetY = focalY - (focalY - this.offsetY) * ratio;
        this.scale = clampedScale;
        this.clampOffsets(canvas);
    },

    clampOffsets(canvas) {
        if (this.scale <= 1) {
            this.offsetX = 0;
            this.offsetY = 0;
            return;
        }
        const maxOffsetX = 0;
        const minOffsetX = canvas.width * (1 - this.scale);
        const maxOffsetY = 0;
        const minOffsetY = canvas.height * (1 - this.scale);

        this.offsetX = Math.min(maxOffsetX, Math.max(minOffsetX, this.offsetX));
        this.offsetY = Math.min(maxOffsetY, Math.max(minOffsetY, this.offsetY));
    },

    bindEvents(canvas, onTapCallback) {
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.hasMoved = false;
                this.lastX = e.touches.item(0).clientX;
                this.lastY = e.touches.item(0).clientY;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                this.initialPinchDist = Math.hypot(
                    e.touches.item(0).clientX - e.touches.item(1).clientX,
                    e.touches.item(0).clientY - e.touches.item(1).clientY
                );
                this.initialScale = this.scale;
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                const dx = e.touches.item(0).clientX - this.lastX;
                const dy = e.touches.item(0).clientY - this.lastY;
                if (Math.hypot(dx, dy) > 6) this.hasMoved = true;

                this.offsetX += dx;
                this.offsetY += dy;
                this.clampOffsets(canvas);

                this.lastX = e.touches.item(0).clientX;
                this.lastY = e.touches.item(0).clientY;
            } else if (e.touches.length === 2 && this.initialPinchDist) {
                this.hasMoved = true;
                const dist = Math.hypot(
                    e.touches.item(0).clientX - e.touches.item(1).clientX,
                    e.touches.item(0).clientY - e.touches.item(1).clientY
                );
                const rect = canvas.getBoundingClientRect();
                const midX = ((e.touches.item(0).clientX + e.touches.item(1).clientX) / 2) - rect.left;
                const midY = ((e.touches.item(0).clientY + e.touches.item(1).clientY) / 2) - rect.top;

                this.setZoom(this.initialScale * (dist / this.initialPinchDist), midX, midY, canvas);
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                if (this.isDragging && !this.hasMoved && e.changedTouches.length === 1) {
                    onTapCallback(e.changedTouches.item(0).clientX, e.changedTouches.item(0).clientY);
                }
                this.isDragging = false;
                this.initialPinchDist = null;
            }
        });



        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.hasMoved = false;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            if (Math.hypot(dx, dy) > 5) this.hasMoved = true;

            this.offsetX += dx;
            this.offsetY += dy;
            this.clampOffsets(canvas);

            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                if (!this.hasMoved) onTapCallback(e.clientX, e.clientY);
                this.isDragging = false;
            }
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const factor = e.deltaY < 0 ? 1.2 : 0.85;
            this.setZoom(this.scale * factor, e.clientX - rect.left, e.clientY - rect.top, canvas);
        }, { passive: false });
    }
};

