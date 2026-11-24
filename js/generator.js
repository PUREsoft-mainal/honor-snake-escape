const LevelGenerator = {
    generate(levelId) {
        const targetSnakes = GameDB.getSnakeCountForLevel(levelId);
        const gridSize = Math.max(12, Math.ceil(Math.sqrt(targetSnakes * 4.8)));
        const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
        const snakes = [];
        const barriers = [];

        const barrierCount = Math.floor(levelId / 4);
        for (let b = 0; b < barrierCount; b++) {
            const bx = Math.floor(Math.random() * (gridSize - 4)) + 2;
            const by = Math.floor(Math.random() * (gridSize - 4)) + 2;
            if (!grid[by][bx]) {
                grid[by][bx] = 'BARRIER';
                barriers.push({ x: bx, y: by });
            }
        }

        const dirs = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        let attempts = 0;
        const maxAttempts = targetSnakes * 60;

        while (snakes.length < targetSnakes && attempts < maxAttempts) {
            attempts++;
            const hx = Math.floor(Math.random() * gridSize);
            const hy = Math.floor(Math.random() * gridSize);
            if (grid[hy][hx]) continue;

            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            if (!this.isPathClear(hx, hy, dir, grid, gridSize)) continue;

            const length = Math.floor(Math.random() * 4) + 3;
            const body = [{ x: hx, y: hy }];
            let cx = hx;
            let cy = hy;

            for (let s = 1; s < length; s++) {
                const backDirs = [
                    { dx: -dir.dx, dy: -dir.dy },
                    { dx: dir.dy, dy: dir.dx },
                    { dx: -dir.dy, dy: -dir.dx }
                ];
                let placed = false;
                for (const bd of backDirs) {
                    const nx = cx + bd.dx;
                    const ny = cy + bd.dy;
                    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && !grid[ny][nx]) {
                        body.push({ x: nx, y: ny });
                        cx = nx;
                        cy = ny;
                        placed = true;
                        break;
                    }
                }
                if (!placed) break;
            }

            if (body.length >= 2) {
                const groupColor = GameDB.groupColors[snakes.length % GameDB.groupColors.length];
                const snakeObj = {
                    id: `snake_${snakes.length}`,
                    color: groupColor,
                    body: body,
                    dir: dir,
                    status: 'active'
                };
                body.forEach(seg => { grid[seg.y][seg.x] = snakeObj.id; });
                snakes.push(snakeObj);
            }
        }

        return { levelId, gridSize, snakes, barriers };
    },

    isPathClear(hx, hy, dir, grid, gridSize) {
        let x = hx + dir.dx;
        let y = hy + dir.dy;
        while (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            if (grid[y][x] !== null) return false;
            x += dir.dx;
            y += dir.dy;
        }
        return true;
    }
};

