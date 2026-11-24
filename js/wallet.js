const HonorWallet = {
    CONTRACT_ADDRESS: '0x9990x999HONOR21000000coinho010no27r411most921afa953DESHA01080GALAXY166413',
    STORAGE_BALANCE: 'honor_ecosystem_balance_v1',
    STORAGE_ADDR: 'honor_ecosystem_wallet_id_v1',
    STORAGE_USED_TX: 'honor_ecosystem_redeemed_tx_v1',

    init() {
        DeviceAuth.init();
        if (localStorage.getItem(this.STORAGE_BALANCE) === null) {
            localStorage.setItem(this.STORAGE_BALANCE, '2.00');
        }
    },

    getAddress() {
        return DeviceAuth.WALLET_ADDRESS;
    },


    getBalance() {
        return parseFloat(localStorage.getItem(this.STORAGE_BALANCE) || '0');
    },

    setBalance(amount) {
        const clean = Math.max(0, parseFloat(amount.toFixed(4)));
        localStorage.setItem(this.STORAGE_BALANCE, clean.toString());
    },

    addBalance(amount) {
        this.setBalance(this.getBalance() + amount);
    },

    // حساب سعر فتح المرحلة: المرحلة 2 = 0.5 HONOR، وتزيد كل مرحلة بنسبة 45% عن التي قبلها
    getLevelUnlockPrice(levelId) {
        if (levelId <= 1) return 0;
        const price = 0.5 * Math.pow(1.45, levelId - 2);
        return parseFloat(price.toFixed(2));
    },

    formatPrice(price) {
        if (price >= 1e9) return (price / 1e9).toFixed(2) + 'B';
        if (price >= 1e6) return (price / 1e6).toFixed(2) + 'M';
        if (price >= 1e3) return (price / 1e3).toFixed(2) + 'K';
        return price.toFixed(2);
    },

    purchaseLevel(levelId) {
        const price = this.getLevelUnlockPrice(levelId);
        const currentBal = this.getBalance();
        if (currentBal < price) {
            return { success: false, message: 'رصيد HONOR غير كافٍ لفتح هذه المرحلة.' };
        }
        this.setBalance(currentBal - price);
        GameDB.unlockLevelUpTo(levelId);
        return { success: true };
    },

    // إنشاء حزمة تحويل مشفرة لإرسالها إلى أي لعبة أو تطبيق أو موقع يحمل نفس المحفظة
    createTransferPacket(recipientId, amount) {
        const val = parseFloat(amount);
        if (!recipientId || isNaN(val) || val <= 0) {
            return { success: false, message: 'يرجى إدخال معرّف المستلم والمبلغ بشكل صحيح.' };
        }
        if (this.getBalance() < val) {
            return { success: false, message: 'رصيدك الحالي غير كافٍ لإتمام التحويل.' };
        }

        this.setBalance(this.getBalance() - val);

        const payload = {
            contract: this.CONTRACT_ADDRESS,
            txId: 'TX-' + Date.now() + '-' + Math.floor(Math.random() * 9999),
            from: this.getAddress(),
            to: recipientId.trim(),
            amount: val
        };

        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        return { success: true, code: encoded };
    },

    // استلام رصيد قادم من لعبة أخرى أو موقع ويب
    redeemTransferPacket(code) {
        try {
            const decodedStr = decodeURIComponent(escape(atob(code.trim())));
            const payload = JSON.parse(decodedStr);

            if (payload.contract !== this.CONTRACT_ADDRESS) {
                return { success: false, message: 'العقد الذكي غير مطابق لعملة HONOR المعتمدة.' };
            }
            if (payload.to && payload.to !== this.getAddress()) {
                return { success: false, message: 'هذا التحويل مخصص لمحفظة أخرى (' + payload.to + ').' };
            }

            if (!payload.amount || payload.amount <= 0) {
                return { success: false, message: 'كود التحويل غير صالح.' };
            }

            const usedTxs = JSON.parse(localStorage.getItem(this.STORAGE_USED_TX) || '[]');
            if (usedTxs.includes(payload.txId)) {
                return { success: false, message: 'تم استخدام كود التحويل هذا مسبقاً.' };
            }

            usedTxs.push(payload.txId);
            localStorage.setItem(this.STORAGE_USED_TX, JSON.stringify(usedTxs));
            this.addBalance(parseFloat(payload.amount));

            return { success: true, amount: payload.amount, from: payload.from };
        } catch (e) {
            return { success: false, message: 'صيغة كود التحويل غير صحيحة.' };
        }
    }
};

HonorWallet.init();

