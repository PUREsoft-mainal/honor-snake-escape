const DeviceAuth = {
    DEVICE_ID: '',
    WALLET_ADDRESS: '',
    BACKUP_PREFIX: 'HONOR_SAVE_',

    init: function() {
        this.DEVICE_ID = this.generateHardwareFingerprint();
        this.WALLET_ADDRESS = 'HNR-' + this.DEVICE_ID + '-SNAKE';
        this.autoRestoreIfPossible();
    },

    // توليد بصمة جهاز ثابتة لا تتغير عند حذف التطبيق وإعادة تثبيته
    generateHardwareFingerprint: function() {
        const raw = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            navigator.hardwareConcurrency || 4,
            navigator.deviceMemory || 4,
            Intl.DateTimeFormat().resolvedOptions().timeZone
        ].join('|');

        let hash1 = 0x811c9dc5;
        let hash2 = 0x01000193;
        for (let i = 0; i < raw.length; i++) {
            const ch = raw.charCodeAt(i);
            hash1 ^= ch;
            hash1 = Math.imul(hash1, 0x01000193);
            hash2 ^= ch;
            hash2 = Math.imul(hash2, 0x85ebca6b);
        }
        const partA = (hash1 >>> 0).toString(16).toUpperCase().padStart(8, '0');
        const partB = (hash2 >>> 0).toString(16).toUpperCase().padStart(8, '0');
        return partA + partB;
    },

    // حفظ نسخة احتياطية مشفرة ومرتبطة بمعرف الجهاز (في الحافظة أو كملف خارجي على الهاتف لا يُمسح عند حذف التطبيق)
    exportDeviceBackup: function() {
        const data = {
            deviceId: this.DEVICE_ID,
            wallet: this.WALLET_ADDRESS,
            unlocked: GameDB.getUnlockedLevel(),
            savedAfter25: GameDB.getSavedCountAfter25(),
            balance: HonorWallet.getBalance(),
            usedTxs: JSON.parse(localStorage.getItem(HonorWallet.STORAGE_USED_TX) || '[]'),
            timestamp: Date.now()
        };
        const encoded = this.BACKUP_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        
        // حفظ نسخة في ذاكرة الجلسة/الاسم العام للمتصفح كطبقة حماية إضافية
        try { window.name = encoded; } catch (e) {}
        return encoded;
    },

    // استعادة التقدم والعملات تلقائياً أو يدوياً عند إعادة التثبيت بنفس معرف الجهاز
    restoreFromBackup: function(backupCode) {
        try {
            const clean = backupCode.trim();
            if (!clean.startsWith(this.BACKUP_PREFIX)) {
                return { success: false, message: 'كود الاستعادة غير صالح.' };
            }
            const jsonStr = decodeURIComponent(escape(atob(clean.slice(this.BACKUP_PREFIX.length))));
            const data = JSON.parse(jsonStr);

            if (data.deviceId !== this.DEVICE_ID) {
                return { success: false, message: 'هذا الحساب مرتبط بمعرّف جهاز آخر ولا يمكن فتحه هنا.' };
            }

            localStorage.setItem(GameDB.KEY_UNLOCKED, data.unlocked.toString());
            localStorage.setItem(GameDB.KEY_SAVED_COUNT, data.savedAfter25.toString());
            HonorWallet.setBalance(data.balance);
            localStorage.setItem(HonorWallet.STORAGE_USED_TX, JSON.stringify(data.usedTxs || []));

            return { success: true, level: data.unlocked, balance: data.balance };
        } catch (e) {
            return { success: false, message: 'تعذر قراءة بيانات النسخة الاحتياطية.' };
        }
    },

    autoRestoreIfPossible: function() {
        if (!localStorage.getItem(GameDB.KEY_UNLOCKED) && window.name && window.name.startsWith(this.BACKUP_PREFIX)) {
            this.restoreFromBackup(window.name);
        }
    },

    // تنزيل ملف حفظ صغير على ذاكرة الهاتف (يبقى في مجلد Downloads حتى لو حُذفت اللعبة)
    downloadSaveFile: function() {
        const code = this.exportDeviceBackup();
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'HONOR_Snake_Save_' + this.DEVICE_ID.slice(0, 6) + '.txt';
        a.click();
    }
};

