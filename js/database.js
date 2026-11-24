const GameDB = {
    KEY_UNLOCKED: 'snake_real_unlocked_v3',
    KEY_SAVED_COUNT: 'snake_real_saved_after25_v3',
    MAX_LEVELS: 100,

    getSnakeCountForLevel(levelId) {
        if (levelId >= 100) return 1000;
        return 15 + (levelId - 1) * 10;
    },

    groupColors: [
        '#ff0055', // أحمر نيون
        '#00f5d4', // تركواز
        '#ffd166', // ذهبي
        '#9b5de5', // بنفسجي
        '#00bbf9', // أزرق سماوي
        '#ff6b35', // برتقالي
        '#06d6a0'  // أخضر زمردي
    ],

    getUnlockedLevel() {
        const val = localStorage.getItem(this.KEY_UNLOCKED);
        return val ? parseInt(val, 10) : 1;
    },

    unlockLevelUpTo(targetId) {
        const unlocked = this.getUnlockedLevel();
        if (targetId > unlocked && targetId <= this.MAX_LEVELS) {
            localStorage.setItem(this.KEY_UNLOCKED, targetId.toString());
        }
    },

    unlockNextLevel(currentId) {
        this.unlockLevelUpTo(currentId + 1);
    },

    getSavedCountAfter25() {
        const val = localStorage.getItem(this.KEY_SAVED_COUNT);
        return val ? parseInt(val, 10) : 0;
    },

    addSavedCountAfter25(count) {
        const current = this.getSavedCountAfter25();
        localStorage.setItem(this.KEY_SAVED_COUNT, (current + count).toString());
    }
};

