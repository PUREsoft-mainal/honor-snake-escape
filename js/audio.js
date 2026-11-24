const GameAudio = {
    ctx: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playTone(freq, type, duration) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playEscape() {
        this.playTone(580, 'sine', 0.12);
        setTimeout(() => this.playTone(860, 'sine', 0.15), 80);
    },

    playBurn() {
        this.playTone(130, 'sawtooth', 0.35);
        setTimeout(() => this.playTone(90, 'square', 0.3), 100);
    },

    playWin() {
        const notes = new Array(523, 659, 784, 1046);
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.22), i * 90);
        });
    }


};

