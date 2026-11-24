const GameController = {
    currentLevelId: 1,
    levelState: null,
    rescuedCount: 0,
    burnedCount: 0,
    animLoopId: null,
    pendingBuyLevelId: null,

    init() {
        GameRenderer.init(document.getElementById('gameCanvas'));
        document.getElementById('contract-address').textContent = HonorWallet.CONTRACT_ADDRESS;
        this.bindEvents();
        this.updateAllBalancesUI();
    },

    updateAllBalancesUI() {
        const bal = HonorWallet.getBalance().toFixed(2);
        document.getElementById('device-id-display').textContent = DeviceAuth.DEVICE_ID;
        document.getElementById('menu-unlocked').textContent = GameDB.getUnlockedLevel();
        document.getElementById('menu-balance').textContent = bal;
        document.getElementById('wallet-balance').textContent = bal;
        document.getElementById('levels-balance').textContent = bal;
        document.getElementById('wallet-address').textContent = HonorWallet.getAddress();
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        this.updateAllBalancesUI();
    },

    startLevel(levelId) {
        this.currentLevelId = levelId;
        this.rescuedCount = 0;
        this.burnedCount = 0;
        GameEffects.clear();
        GameCamera.reset();

        this.levelState = LevelGenerator.generate(levelId);
        document.getElementById('level-title').textContent = `المرحلة ${levelId} (${this.levelState.snakes.length} ثعبان)`;
        document.getElementById('win-modal').classList.remove('active');

        const post25El = document.getElementById('post25-counter');
        if (levelId > 25) {
            post25El.classList.remove('hidden');
        } else {
            post25El.classList.add('hidden');
        }

        this.updateHUD();
        this.showScreen('game-screen');
        GameRenderer.resize(this.levelState.gridSize);
        this.startRenderLoop();
    },

    startRenderLoop() {
        if (this.animLoopId) cancelAnimationFrame(this.animLoopId);
        const loop = () => {
            GameRenderer.draw(this.levelState);
            this.animLoopId = requestAnimationFrame(loop);
        };
        loop();
    },

    updateHUD() {
        const remaining = this.levelState.snakes.filter(s => s.status === 'active' || s.status === 'escaping').length;
        document.getElementById('snakes-counter').textContent =
            `المتبقي: ${remaining} | المحرر: ${this.rescuedCount} | المحترق: ${this.burnedCount}`;

        if (this.currentLevelId > 25) {
            const totalAfter25 = GameDB.getSavedCountAfter25() + this.rescuedCount;
            document.getElementById('post25-counter').textContent =
                `🔥 رصيد التحرير الصحيح (بعد 25): ${totalAfter25}`;
        }
    },


    renderLevelsMenu() {
        const grid = document.getElementById('levels-grid');
        grid.innerHTML = '';
        const unlocked = GameDB.getUnlockedLevel();

        for (let i = 1; i <= GameDB.MAX_LEVELS; i++) {
            const btn = document.createElement('button');
            const isLocked = i > unlocked;
            btn.className = `level-btn ${isLocked ? 'locked' : ''}`;

            if (!isLocked) {
                btn.innerHTML = `<span>${i}</span><span class="level-price">مفتوحة</span>`;
                btn.onclick = () => this.startLevel(i);
            } else {
                const price = HonorWallet.getLevelUnlockPrice(i);
                btn.innerHTML = `<span>🔒 ${i}</span><span class="level-price">${HonorWallet.formatPrice(price)} HNR</span>`;
                btn.onclick = () => this.openBuyModal(i, price);
            }
            grid.appendChild(btn);
        }
    },

    openBuyModal(levelId, price) {
        this.pendingBuyLevelId = levelId;
        document.getElementById('buy-modal-title').textContent = `🔒 شراء المرحلة ${levelId}`;
        document.getElementById('buy-modal-desc').textContent =
            `هل تريد فتح المرحلة ${levelId} مباشرة مقابل ${price.toLocaleString()} HONOR؟ (سيتم فتحها وفتح جميع المراحل التي تسبقها)`;
        document.getElementById('buy-modal').classList.add('active');
    },

    handleTap(clientX, clientY) {
        const { gridX, gridY } = GameCamera.screenToGrid(
            clientX, clientY, GameRenderer.canvas, GameRenderer.cellSize
        );

        const snake = GamePhysics.findSnakeAt(gridX, gridY, this.levelState);
        if (!snake) return;

        const check = GamePhysics.checkMoveOutcome(snake, this.levelState);

        if (check.outcome === 'escape') {
            this.executeEscape(snake);
        } else {
            this.executeBurn(snake, check.steps);
        }
    },

    executeEscape(snake) {
        snake.status = 'escaping';
        GameAudio.playEscape();

        const moveStep = () => {
            snake.body.unshift({
                x: snake.body.at(0).x + snake.dir.dx,
                y: snake.body.at(0).y + snake.dir.dy
            });

            snake.body.pop();

            const stillInside = snake.body.some(seg =>
                seg.x >= 0 && seg.x < this.levelState.gridSize &&
                seg.y >= 0 && seg.y < this.levelState.gridSize
            );

            if (stillInside) {
                setTimeout(moveStep, 25);
            } else {
                snake.status = 'gone';
                this.rescuedCount++;
                this.updateHUD();
                this.checkLevelEnd();
            }
        };
        moveStep();
    },

    executeBurn(snake, stepsToImpact) {
        snake.status = 'burning';
        let moved = 0;

        const advanceToCrash = () => {
            if (moved < stepsToImpact - 1) {
                snake.body.unshift({
                    x: snake.body.at(0).x + snake.dir.dx,
                    y: snake.body.at(0).y + snake.dir.dy
                });
    
                snake.body.pop();
                moved++;
                setTimeout(advanceToCrash, 25);
            } else {
                GameAudio.playBurn();
                GameEffects.igniteSnake(snake, GameRenderer.cellSize);
                setTimeout(() => {
                    snake.status = 'gone';
                    this.burnedCount++;
                    this.updateHUD();
                    this.checkLevelEnd();
                }, 400);
            }
        };
        advanceToCrash();
    },

    checkLevelEnd() {
        const activeOrMoving = this.levelState.snakes.some(
            s => s.status === 'active' || s.status === 'escaping' || s.status === 'burning'
        );
        if (!activeOrMoving) {
            if (this.currentLevelId > 25 && this.rescuedCount > 0) {
                GameDB.addSavedCountAfter25(this.rescuedCount);
            }

            if (this.rescuedCount > 0) {
                GameAudio.playWin();
                GameDB.unlockNextLevel(this.currentLevelId);
                HonorWallet.addBalance(0.25);
                DeviceAuth.exportDeviceBackup();
                document.getElementById('modal-title').textContent = `🎉 اجتزت المرحلة ${this.currentLevelId}! (+0.25 HONOR)`;
                document.getElementById('btn-next-level').classList.remove('hidden');
            } else {
                document.getElementById('modal-title').textContent = `🔥 احترقت جميع الثعابين!`;
                document.getElementById('btn-next-level').classList.add('hidden');
            }

            document.getElementById('modal-stats').textContent =
                `تم تحرير: ${this.rescuedCount} ثعبان بنجاح | احترق: ${this.burnedCount} ثعبان`;
            document.getElementById('win-modal').classList.add('active');
        }
    },

    bindEvents() {
        document.getElementById('btn-play').onclick = () => this.startLevel(GameDB.getUnlockedLevel());
        document.getElementById('btn-levels').onclick = () => {
            this.renderLevelsMenu();
            this.showScreen('levels-screen');
        };
        document.getElementById('btn-open-wallet').onclick = () => this.showScreen('wallet-screen');
        document.getElementById('btn-wallet-back').onclick = () => this.showScreen('menu-screen');
        document.getElementById('btn-back-menu').onclick = () => this.showScreen('menu-screen');
        document.getElementById('btn-home').onclick = () => this.showScreen('menu-screen');
        document.getElementById('btn-restart').onclick = () => this.startLevel(this.currentLevelId);
        document.getElementById('btn-retry-level').onclick = () => this.startLevel(this.currentLevelId);
        document.getElementById('btn-next-level').onclick = () => {
            const next = Math.min(this.currentLevelId + 1, GameDB.MAX_LEVELS);
            this.startLevel(next);
        };

        document.getElementById('btn-copy-addr').onclick = () => {
            navigator.clipboard?.writeText(HonorWallet.getAddress());
            alert('تم نسخ معرّف محفظتك: ' + HonorWallet.getAddress());
        };

        document.getElementById('btn-save-device').onclick = () => {
            DeviceAuth.downloadSaveFile();
            alert('تم حفظ ملف التقدم والعملات المرتبط بمعرف جهازك (' + DeviceAuth.DEVICE_ID + ') في مجلد التنزيلات لحمايته عند حذف اللعبة.');
        };

        document.getElementById('btn-restore-device').onclick = () => {
            const code = prompt('الصق محتوى ملف الاستعادة الخاص بجهازك هنا:');
            if (!code) return;
            const res = DeviceAuth.restoreFromBackup(code);
            if (!res.success) {
                alert(res.message);
                return;
            }
            this.updateAllBalancesUI();
            alert('تمت استعادة حسابك بنجاح! المرحلة: ' + res.level + ' | الرصيد: ' + res.balance + ' HONOR');
        };


        document.getElementById('btn-send-honor').onclick = () => {
            const to = document.getElementById('transfer-to').value;
            const amount = document.getElementById('transfer-amount').value;
            const res = HonorWallet.createTransferPacket(to, amount);
            if (!res.success) {
                alert(res.message);
                return;
            }
            this.updateAllBalancesUI();
            navigator.clipboard?.writeText(res.code);
            prompt('تم خصم الرصيد ونسخ كود التحويل. الصقه في اللعبة أو الموقع المستلم:', res.code);
        };

        document.getElementById('btn-import-honor').onclick = () => {
            const code = document.getElementById('import-code').value;
            const res = HonorWallet.redeemTransferPacket(code);
            if (!res.success) {
                alert(res.message);
                return;
            }
            document.getElementById('import-code').value = '';
            this.updateAllBalancesUI();
            alert(`تم استلام ${res.amount} HONOR بنجاح من ${res.from}!`);
        };

        document.getElementById('btn-confirm-buy').onclick = () => {
            if (!this.pendingBuyLevelId) return;
            const res = HonorWallet.purchaseLevel(this.pendingBuyLevelId);
            if (!res.success) {
                alert(res.message);
                return;
            }
            document.getElementById('buy-modal').classList.remove('active');
            this.updateAllBalancesUI();
            this.renderLevelsMenu();
            this.startLevel(this.pendingBuyLevelId);
        };

        document.getElementById('btn-cancel-buy').onclick = () => {
            document.getElementById('buy-modal').classList.remove('active');
        };

        const canvas = document.getElementById('gameCanvas');
        GameCamera.bindEvents(canvas, (x, y) => this.handleTap(x, y));

        document.getElementById('btn-zoom-in').onclick = () => GameCamera.zoomBy(1.3, canvas);
        document.getElementById('btn-zoom-out').onclick = () => GameCamera.zoomBy(0.75, canvas);
        document.getElementById('btn-zoom-reset').onclick = () => GameCamera.reset();

        window.addEventListener('resize', () => {
            if (this.levelState) {
                GameRenderer.resize(this.levelState.gridSize);
            }
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GameController.init());
} else {
    GameController.init();
}

