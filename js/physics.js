const GamePhysics = {
    checkMoveOutcome(snake, levelState) {
        const { dir, body } = snake;
        let checkX = body.at(0).x + dir.dx;
        let checkY = body.at(0).y + dir.dy;
        let stepsToImpact = 0;

        while (checkX >= 0 && checkX < levelState.gridSize && checkY >= 0 && checkY < levelState.gridSize) {
            stepsToImpact++;

            const hitBarrier = levelState.barriers.some(b => b.x === checkX && b.y === checkY);
            if (hitBarrier) {
                return { outcome: 'burn', steps: stepsToImpact };
            }

            const hitSnake = levelState.snakes.some(other => {
                if (other.id === snake.id || other.status === 'gone' || other.status === 'burning') return false;
                return other.body.some(seg => seg.x === checkX && seg.y === checkY);
            });

            if (hitSnake) {
                return { outcome: 'burn', steps: stepsToImpact };
            }

            checkX += dir.dx;
            checkY += dir.dy;
        }

        return { outcome: 'escape', steps: stepsToImpact };
    },

    findSnakeAt(gridX, gridY, levelState) {
        return levelState.snakes.find(snake =>
            snake.status === 'active' &&
            snake.body.some(seg => seg.x === gridX && seg.y === gridY)
        );
    }
};

