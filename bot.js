/**
 * ============================================================================
 * Stars Plus TELEGRAM BOT - V4.6 (Complete, Bug-Free, Auto-Order on Balance Approval)
 * ============================================================================
 */

// ---- محافظ خطا: قبل از هر چیز ثبت می‌شود تا ربات با یک خطای ناگهانی خاموش نشود ----
process.on('uncaughtException', (err) => {
    console.error('[FATAL-GUARD] Uncaught Exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[FATAL-GUARD] Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
});

let TelegramModule;
try {
    TelegramModule = require('node-telegram-bot-api');
} catch (e) {
    console.error('[FATAL] پکیج node-telegram-bot-api نصب نیست. در package.json بخش dependencies این پکیج باید باشد (npm install node-telegram-bot-api).');
    console.error(e && e.message ? e.message : e);
    process.exit(1);
}
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

// ============================================================================
// RENDER WEB SERVICE PORT BINDING SERVER
// ============================================================================
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Stars Plus Bot Web Service is running successfully!\n');
});

server.on('error', (err) => {
    console.error(`[Server] HTTP server error (${err && err.code}): ${err && err.message}`);
});

server.listen(PORT, () => {
    console.log(`[Server] HTTP server is listening on port ${PORT}`);
});

// ============================================================================
// ENTERPRISE CONFIGURATION & CONSTANTS
// ============================================================================

// ⚠️ توکن جدید و به‌روز‌شده
const TOKEN = (process.env.BOT_TOKEN || process.env.TOKEN || '8952100092:AAEfk76ez4jFq6VMPCUSVLPcAeaXBb7AX54')
    .toString().trim().replace(/^["']|["']$/g, '');
const TOKEN_LOOKS_VALID = /^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(TOKEN);
const ADMIN_ID_USERNAME = '@shantiaNFT';
const ADMIN_NUMERIC_ID = 8750484397;
const EXTRA_ADMIN_ID = '8942987641';
const DB_FILE = path.join(__dirname, 'database.json');

const FORCE_JOIN_CHANNELS = ['@nova1_shopp'];
const REPORT_CHANNEL = '@nova1_shopp';

const CARD_NUMBER = '6219861452862914';
const CARD_OWNER = 'شنتیا زاهد پور';

const STAR_USD = 0.015;

const FALLBACK_USDT_TOMAN = 65000;
const FALLBACK_GRAM_TOMAN = 311591;

// دکمه‌های پنل مدیریت (یک منبع واحد برای کیبورد و تشخیص دکمه)
const BTN = {
    ADD: '➕ افزایش موجودی کاربر',
    SUB: '➖ کاهش موجودی کاربر',
    BAN: '🚫 بن کردن کاربر',
    UNBAN: '✅ آنبن کردن کاربر',
    CREATE_DISCOUNT: '🏷️ ساخت کد تخفیف',
    LIST_DISCOUNT: '📋 کد های تخفیف فعال و تمام شده',
    ACTIVITY: '📊 فعالیت ها',
    SECOND: '👑 تنظیم مالک دوم',
    TON: '💎 تنظیم قیمت دستی (تون)',
    STAR: '⭐ تنظیم قیمت دستی استارز',
    GIFT: '🎁 تنظیم قیمت دستی گیفت استارزی',
    BACK: '🔙 بازگشت به منوی اصلی'
};

// حذف کاراکترهای نامرئی برای مقایسه مطمئن دکمه‌ها
function norm(s) {
    return (s || '').toString().replace(/[\uFE0E\uFE0F\u200B-\u200F\u202A-\u202E]/g, '').replace(/\s+/g, ' ').trim();
}
function isBtn(text, label) {
    return !!text && norm(text) === norm(label);
}

// ============================================================================
// SYSTEM LOGGING UTILITY
// ============================================================================

class SystemLogger {
    static info(context, message) {
        const timestamp = new Date().toISOString();
        console.log(`[INFO] [${timestamp}] [${context}] - ${message}`);
    }

    static error(context, message, err = null) {
        const timestamp = new Date().toISOString();
        console.error(`[ERROR] [${timestamp}] [${context}] - ${message}`);
        if (err && err.message) {
            console.error(`       Details: ${err.message}`);
        }
    }
}

// ============================================================================
// BOT INITIALIZATION
// ============================================================================

const TelegramBot = typeof TelegramModule === 'function'
    ? TelegramModule
    : (
        TelegramModule.default ||
        TelegramModule.TelegramBot ||
        Object.values(TelegramModule).find(v => typeof v === 'function') ||
        TelegramModule
    );

if (!TOKEN_LOOKS_VALID) {
    SystemLogger.error('Token', '❌ توکن ربات نامعتبر یا تنظیم نشده است!');
}

const bot = new TelegramBot(TOKEN, {
    polling: TOKEN_LOOKS_VALID ? {
        interval: 300,
        autoStart: true,
        params: { timeout: 30, allowed_updates: JSON.stringify(['message', 'callback_query']) }
    } : false,
    filepath: false
});

let fatalPollingHandled = false;
let lastPollingErrorLog = 0;
bot.on('polling_error', (err) => {
    const m = (err && err.message) ? err.message : String(err);
    if (/\b(404|401)\b/.test(m)) {
        if (!fatalPollingHandled) {
            fatalPollingHandled = true;
            SystemLogger.error('Polling', '❌ تلگرام توکن را رد کرد (404/401).', err);
            try { bot.stopPolling(); } catch (e) {}
        }
        return;
    }
    if (/\b409\b/.test(m)) {
        const now = Date.now();
        if (now - lastPollingErrorLog > 30000) {
            lastPollingErrorLog = now;
            SystemLogger.error('Polling', '⚠️ تداخل 409: ربات همزمان در جای دیگری هم اجرا شده.');
        }
        return;
    }
    const now = Date.now();
    if (now - lastPollingErrorLog > 10000) {
        lastPollingErrorLog = now;
        SystemLogger.error('Polling', 'Polling error', err);
    }
});

if (TOKEN_LOOKS_VALID) {
    try {
        if (typeof bot.deleteWebHook === 'function') {
            Promise.resolve(bot.deleteWebHook()).catch(() => {});
        }
    } catch (e) {}
    try {
        Promise.resolve(bot.getMe())
            .then(me => SystemLogger.info('Token', `✅ توکن معتبر است. ربات: @${me.username}`))
            .catch(e => {});
    } catch (e) {}
}

process.removeAllListeners('uncaughtException');
process.removeAllListeners('unhandledRejection');
process.on('uncaughtException', (err) => {
    SystemLogger.error('Process', 'Uncaught Exception', err);
});
process.on('unhandledRejection', (reason, promise) => {
    SystemLogger.error('Process', `Unhandled Rejection at: ${promise}`, new Error(String(reason)));
});

// ============================================================================
// DATABASE
// ============================================================================

let db = {
    users: {},
    orders: {},
    discountCodes: {},
    approvedReceiptsHistory: [],
    processedReceipts: {},
    secondaryAdmin: null,
    manualTonPrice: 0,
    manualStarPrice: 0,
    manualGiftBasePrice: 0
};

function getUserDataTemplate() {
    return {
        firstName: 'کاربر',
        phone: 'ثبت نشده',
        verified: 'انجام نشده',
        cardVerified: false,
        isBanned: false,
        level: 'سطح 1',
        wallet: 0,
        discountWallet: 1766,

        waitingForAmount: false,
        waitingForTicket: false,
        waitingForReceipt: false,
        waitingForDiscountInput: false,
        waitingForRecipient: false,
        waitingForComment: false,
        waitingForTrackingInput: false,
        waitingForSmartSupport: false,

        waitingForGramAmount: false,
        waitingForGramWallet: false,
        waitingForGramMemoChoice: false,
        waitingForGramMemoInput: false,

        waitingForStarCount: false,
        waitingForStarRecipient: false,

        starCount: 50,
        starRecipient: '',
        starPricePerUnit: 0,

        lastAmount: 0,
        appliedDiscountCode: null,
        appliedDiscountPercent: 0,
        currentShopState: null,

        selectedGiftName: '',
        selectedGiftStars: 0,
        recipientUsername: '',
        commentText: 'تنظیم نشده',
        lastInvoiceMessageId: null,

        gramAmount: 0,
        gramPricePerUnit: 0,
        gramWalletAddress: '',
        gramMemo: 'ندارد',

        lastReceiptPhotoId: null,
        lastReceiptCode: null,
        lastReceiptAmount: 0,
        lastReceiptTime: '',
        pendingOrderToAutoPlace: null, // نگهداری سفارش معلق برای ثبت خودکار پس از تایید واریز

        waitingForAdminUserSearch: false,
        waitingForAdminAmount: false,
        waitingForRejectReason: false,
        waitingForOrderRejectReason: false,
        waitingForReceiptRejectReason: false,
        waitingForManualPrice: false,
        waitingForManualStarPrice: false,
        waitingForManualGiftBasePrice: false,
        rejectOrderCode: null,
        adminAction: null,
        targetUserId: null,
        rejectTargetId: null,
        rejectReceiptCode: null,
        adminReplyingTo: null,

        tempDiscount: { percent: 0, capacity: 0, expiryHour: 0, restriction: null },
        waitingForDiscountPercent: false,
        waitingForDiscountCapacity: false,
        waitingForDiscountExpiry: false,
        waitingForDiscountRestriction: false
    };
}

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const loadedDb = JSON.parse(data);

            if (loadedDb.users) {
                for (const [userId, userData] of Object.entries(loadedDb.users)) {
                    db.users[userId] = { ...getUserDataTemplate(), ...userData };
                }
            }
            if (loadedDb.orders) db.orders = loadedDb.orders;
            if (loadedDb.discountCodes) db.discountCodes = loadedDb.discountCodes;
            if (loadedDb.approvedReceiptsHistory) db.approvedReceiptsHistory = loadedDb.approvedReceiptsHistory;
            if (loadedDb.processedReceipts) db.processedReceipts = loadedDb.processedReceipts;
            if (loadedDb.secondaryAdmin) db.secondaryAdmin = loadedDb.secondaryAdmin;
            if (typeof loadedDb.manualTonPrice !== 'undefined') db.manualTonPrice = loadedDb.manualTonPrice;
            if (typeof loadedDb.manualStarPrice !== 'undefined') db.manualStarPrice = loadedDb.manualStarPrice;
            if (typeof loadedDb.manualGiftBasePrice !== 'undefined') db.manualGiftBasePrice = loadedDb.manualGiftBasePrice;

            (db.approvedReceiptsHistory || []).forEach(r => {
                if (r.receiptCode) db.processedReceipts[r.receiptCode] = 'approved';
            });

            SystemLogger.info('Database', 'Successfully loaded records from disk.');
        } else {
            SystemLogger.info('Database', 'No existing database found. Initializing new storage.');
            saveDatabase();
        }
    } catch (e) {
        SystemLogger.error('Database', 'Failed to load database file.', e);
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        SystemLogger.error('Database', 'Failed to write database file.', e);
    }
}

loadDatabase();
SystemLogger.info('System', 'Nova Shop Bot is running with all updates!');

// ============================================================================
// USER STATE
// ============================================================================

function getUserDataById(userId) {
    if (!db.users[userId]) {
        db.users[userId] = getUserDataTemplate();
        saveDatabase();
    }
    return db.users[userId];
}

function getUserData(msg) {
    if (!msg.from) return getUserDataById(msg.chat.id);
    const user = msg.from;
    const userData = getUserDataById(user.id);

    if (user.first_name && userData.firstName === 'کاربر') {
        userData.firstName = user.first_name;
        saveDatabase();
    }
    return userData;
}

function resetUserWaiting(userData) {
    userData.waitingForAmount = false;
    userData.waitingForTicket = false;
    userData.waitingForReceipt = false;
    userData.waitingForDiscountInput = false;
    userData.waitingForRecipient = false;
    userData.waitingForComment = false;
    userData.waitingForTrackingInput = false;
    userData.waitingForSmartSupport = false;

    userData.waitingForGramAmount = false;
    userData.waitingForGramWallet = false;
    userData.waitingForGramMemoChoice = false;
    userData.waitingForGramMemoInput = false;

    userData.waitingForStarCount = false;
    userData.waitingForStarRecipient = false;
    userData.lastInvoiceMessageId = null;
}

function resetAdminFlags(adminData) {
    adminData.adminAction = null;
    adminData.targetUserId = null;
    adminData.adminReplyingTo = null;
    adminData.waitingForAdminUserSearch = false;
    adminData.waitingForAdminAmount = false;
    adminData.waitingForRejectReason = false;
    adminData.waitingForOrderRejectReason = false;
    adminData.waitingForReceiptRejectReason = false;
    adminData.waitingForDiscountPercent = false;
    adminData.waitingForDiscountCapacity = false;
    adminData.waitingForDiscountExpiry = false;
    adminData.waitingForDiscountRestriction = false;
    adminData.waitingForManualPrice = false;
    adminData.waitingForManualStarPrice = false;
    adminData.waitingForManualGiftBasePrice = false;
}

// ============================================================================
// MESSAGING & UI UTILITIES
// ============================================================================

function escapeHTML(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function safeDeleteMessage(chatId, messageId) {
    try {
        if (messageId) {
            await bot.deleteMessage(chatId, messageId);
        }
    } catch (err) {}
}

async function safeSendMessage(chatId, text, options = {}) {
    try {
        const finalOptions = { parse_mode: 'HTML', ...options };
        return await bot.sendMessage(chatId, text, finalOptions);
    } catch (err) {
        SystemLogger.error('TelegramAPI', `Failed to send message to ${chatId}`, err);
    }
}

async function safeSendPhoto(chatId, photo, options = {}) {
    try {
        const finalOptions = { parse_mode: 'HTML', ...options };
        let photoData = photo;
        if (typeof photo === 'string') {
            if (fs.existsSync(photo)) {
                photoData = fs.createReadStream(photo);
            } else {
                return await safeSendMessage(chatId, options.caption, { reply_markup: options.reply_markup });
            }
        }
        return await bot.sendPhoto(chatId, photoData, finalOptions);
    } catch (err) {
        if (options.caption) {
            return await safeSendMessage(chatId, options.caption, { reply_markup: options.reply_markup });
        }
    }
}

async function safeAnswer(callbackId, options = {}) {
    try {
        await bot.answerCallbackQuery(callbackId, options);
    } catch (e) {}
}

function isUserAdmin(chatId) {
    const idStr = chatId.toString();
    return idStr === ADMIN_NUMERIC_ID.toString() ||
           idStr === EXTRA_ADMIN_ID.toString() ||
           (db.secondaryAdmin && idStr === db.secondaryAdmin.toString());
}

function getAdminIds() {
    const ids = [ADMIN_NUMERIC_ID.toString(), EXTRA_ADMIN_ID.toString()];
    if (db.secondaryAdmin) ids.push(db.secondaryAdmin.toString());
    return [...new Set(ids)];
}

async function notifyAdmins(text, options = {}) {
    for (const id of getAdminIds()) {
        await safeSendMessage(id, text, options);
    }
}

async function notifyAdminsPhoto(photoId, options = {}) {
    for (const id of getAdminIds()) {
        try {
            await bot.sendPhoto(id, photoId, options);
        } catch (e) {
            SystemLogger.error('TelegramAPI', `Failed to send photo to admin ${id}`, e);
        }
    }
}

async function editAdminMessage(msg, text) {
    try {
        if (msg.photo || msg.caption !== undefined) {
            await bot.editMessageCaption(text, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] }
            });
        } else {
            await bot.editMessageText(text, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: [] }
            });
        }
    } catch (e) {}
}

async function setReaction(chatId, messageId) {
    try {
        if (bot.setMessageReaction) {
            const reactionsList = ['❤️‍🔥', '💥', '💫', '⚡', '🔥', '❤', '🎉', '🤩', '🏆', '🌟', '✨'];
            const randomEmoji = reactionsList[Math.floor(Math.random() * reactionsList.length)];
            await bot.setMessageReaction(chatId, messageId, {
                reaction: [{ type: 'emoji', emoji: randomEmoji }]
            });
        }
    } catch (err) {}
}

function getTehranDate() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
}

function getFormattedTime() {
    const tehranTime = getTehranDate();
    const y = tehranTime.getFullYear();
    const m = String(tehranTime.getMonth() + 1).padStart(2, '0');
    const d = String(tehranTime.getDate()).padStart(2, '0');
    const hh = String(tehranTime.getHours()).padStart(2, '0');
    const mm = String(tehranTime.getMinutes()).padStart(2, '0');
    const ss = String(tehranTime.getSeconds()).padStart(2, '0');
    return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
}

async function sendChannelReport(order) {
    try {
        const userIdStr = order.userId.toString();
        let maskedUserId = userIdStr;
        if (userIdStr.length >= 6) {
            const start = userIdStr.substring(0, 2);
            const end = userIdStr.slice(-2);
            maskedUserId = start + '....' + end;
        } else if (userIdStr.length > 2) {
            maskedUserId = userIdStr[0] + '..' + userIdStr.slice(-1);
        }

        const formattedTime = getFormattedTime();

        const reportMsg =
            `گزارشات | نوا شاپ\n` +
            `گزارش #خرید_موفق 🛍\n\n` +
            `👤 خریدار: <code>${maskedUserId}</code>\n` +
            `🛒 سفارش: ${escapeHTML(order.giftName)}
` +
            `💳 مبلغ پرداخت شده: ${order.amount.toLocaleString()} تومان\n\n` +
            `🕰 ${formattedTime}\n` +
            `🐺 @nova1_shopp`;

        await bot.sendMessage(REPORT_CHANNEL, reportMsg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🤖 | برای خرید اقدام کن!', url: 'https://t.me/nova1_shopp' }]
                ]
            }
        });
        return null;
    } catch (err) {
        SystemLogger.error('ChannelReport', 'Failed to send report to channel', err);
        return (err && err.message) ? err.message : 'unknown error';
    }
}

// ============================================================================
// FORCE JOIN
// ============================================================================
async function checkMembership(userId) {
    try {
        for (const channel of FORCE_JOIN_CHANNELS) {
            const chatMember = await bot.getChatMember(channel, userId);
            const isJoined = ['creator', 'administrator', 'member', 'restricted'].includes(chatMember.status);
            if (!isJoined) {
                return false;
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}

// ============================================================================
// DISCOUNT HELPERS
// ============================================================================

function discountTypeForState(state) {
    if (state === 'star_invoice') return 'stars';
    if (state === 'gift_invoice') return 'gift_stars';
    if (state === 'gram_invoice') return 'gram';
    return null;
}

function isDiscountFinished(obj) {
    if (!obj) return true;
    if (obj.expiresAt && Date.now() > obj.expiresAt) return true;
    if (obj.capacity && obj.usedCount >= obj.capacity) return true;
    return false;
}

function validateDiscount(codeInput, userData) {
    const obj = db.discountCodes[codeInput];
    if (!obj) return { ok: false, error: 'کد تخفیف وارد شده نامعتبر است.' };
    if (obj.expiresAt && Date.now() > obj.expiresAt) return { ok: false, error: 'مهلت استفاده از این کد تخفیف تمام شده است.' };
    if (obj.capacity && obj.usedCount >= obj.capacity) return { ok: false, error: 'ظرفیت این کد تخفیف تمام شده است.' };
    const type = discountTypeForState(userData.currentShopState);
    if (obj.restriction && type && obj.restriction !== type) {
        return { ok: false, error: 'این کد تخفیف برای این بخش قابل استفاده نیست.' };
    }
    return { ok: true, obj };
}

function consumeDiscount(userData) {
    if (userData.appliedDiscountCode && db.discountCodes[userData.appliedDiscountCode]) {
        db.discountCodes[userData.appliedDiscountCode].usedCount =
            (db.discountCodes[userData.appliedDiscountCode].usedCount || 0) + 1;
    }
    userData.appliedDiscountCode = null;
    userData.appliedDiscountPercent = 0;
    saveDatabase();
}

// ============================================================================
// FINANCIAL API INTEGRATIONS
// ============================================================================

async function getWallexUsdtPriceInToman() {
    return new Promise((resolve) => {
        const url = `https://api.wallex.ir/v1/markets`;
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 StarsPlusBot',
                'Cache-Control': 'no-cache'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.result && parsed.result.symbols && parsed.result.symbols.USDTTMN) {
                        const stats = parsed.result.symbols.USDTTMN.stats;
                        const usdtPrice = parseFloat(stats.lastPrice || stats.bidPrice);
                        if (!isNaN(usdtPrice) && usdtPrice > 0) {
                            resolve(Math.round(usdtPrice));
                            return;
                        }
                    }
                    resolve(FALLBACK_USDT_TOMAN);
                } catch (e) {
                    resolve(FALLBACK_USDT_TOMAN);
                }
            });
        }).on('error', () => {
            resolve(FALLBACK_USDT_TOMAN);
        });
    });
}

async function getBinanceTONPriceInToman() {
    if (db.manualTonPrice && db.manualTonPrice > 0) {
        return db.manualTonPrice;
    }

    const usdtToman = await getWallexUsdtPriceInToman();

    return new Promise((resolve) => {
        const url = `https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT`;
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 StarsPlusBot',
                'Cache-Control': 'no-cache'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.price) {
                        const tonUsdt = parseFloat(parsed.price);
                        if (!isNaN(tonUsdt) && tonUsdt > 0) {
                            const calculatedToman = Math.round(tonUsdt * usdtToman);
                            resolve(calculatedToman > 0 ? calculatedToman : FALLBACK_GRAM_TOMAN);
                            return;
                        }
                    }
                    resolve(FALLBACK_GRAM_TOMAN);
                } catch (e) {
                    resolve(FALLBACK_GRAM_TOMAN);
                }
            });
        }).on('error', () => {
            resolve(FALLBACK_GRAM_TOMAN);
        });
    });
}

async function fetchStarsPrice() {
    if (db.manualStarPrice && db.manualStarPrice > 0) {
        return db.manualStarPrice;
    }

    const tonToman = await getBinanceTONPriceInToman();
    const starUnitBase = (STAR_USD / 5.5) * tonToman;

    if (db.manualTonPrice && db.manualTonPrice > 0) {
        return Math.round(starUnitBase);
    }

    return Math.round(starUnitBase * 1.10);
}

async function fetchGramData() {
    const rawBinanceBase = await getBinanceTONPriceInToman();

    let finalPrice = Math.round(rawBinanceBase * 1.10);
    if (db.manualTonPrice && db.manualTonPrice > 0) {
        finalPrice = rawBinanceBase;
    }

    const usdtToman = await getWallexUsdtPriceInToman();
    return { gramUsd: (rawBinanceBase / usdtToman).toFixed(2), finalPrice, usdtToman: rawBinanceBase };
}

// ============================================================================
// KEYBOARDS
// ============================================================================

function getMainKeyboard(isAdmin) {
    let rows = [
        [{ text: '🛒 خرید محصول' }],
        [{ text: '➕ افزایش موجودی' }, { text: '💳 حساب کاربری' }],
        [{ text: '📞 پشتیبانی' }, { text: '📦 پیگیری سفارش' }],
        [{ text: '❤️ چطوری میتوانم به شما اعتماد کنم' }]
    ];
    if (isAdmin) {
        rows.push([{ text: '🔧 پنل مدیریت' }]);
    }
    return { reply_markup: { keyboard: rows, resize_keyboard: true, is_persistent: true } };
}

function getShopKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '📦 سفارش های اخیر من' }],
                [{ text: '⭐️ استارز' }],
                [{ text: '💠 خرید ارز گرام ( GRAM )' }],
                [{ text: '🎁 گیفت استارزی' }],
                [{ text: 'برگشت ↩️' }]
            ],
            resize_keyboard: true
        }
    };
}

function getBackKeyboard() {
    return {
        reply_markup: {
            keyboard: [[{ text: 'برگشت ↩️' }]],
            resize_keyboard: true
        }
    };
}

function getAccountKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '📦 سفارش های معلق من' }, { text: '📦 سفارش های اخیر من' }],
                [{ text: 'برگشت ↩️' }]
            ],
            resize_keyboard: true
        }
    };
}

function getAdminPanelKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: BTN.ADD }, { text: BTN.SUB }],
                [{ text: BTN.BAN }, { text: BTN.UNBAN }],
                [{ text: BTN.CREATE_DISCOUNT }, { text: BTN.LIST_DISCOUNT }],
                [{ text: BTN.ACTIVITY }, { text: BTN.SECOND }],
                [{ text: BTN.TON }, { text: BTN.STAR }],
                [{ text: BTN.GIFT }],
                [{ text: BTN.BACK }]
            ],
            resize_keyboard: true
        }
    };
}

// ============================================================================
// INVOICES & DISCOUNT PRICING
// ============================================================================

function clearDiscount(userData) {
    userData.appliedDiscountCode = null;
    userData.appliedDiscountPercent = 0;
}

function getActiveDiscountPercent(userData, type) {
    if (!userData.appliedDiscountCode || !userData.appliedDiscountPercent) return 0;
    const codeObj = db.discountCodes[userData.appliedDiscountCode];
    if (!codeObj) return 0;
    if (codeObj.restriction && codeObj.restriction !== type) return 0;
    return userData.appliedDiscountPercent;
}

function buildTotals(total, percent) {
    const discount = percent > 0 ? Math.round(total * (percent / 100)) : 0;
    return { total, percent, discount, final: Math.max(0, total - discount) };
}

async function calcStar(userData) {
    const unitPrice = userData.starPricePerUnit || await fetchStarsPrice();
    const total = Math.round(unitPrice * userData.starCount);
    return buildTotals(total, getActiveDiscountPercent(userData, 'stars'));
}

async function calcGift(userData) {
    let starziTomanPerUnit;
    if (db.manualGiftBasePrice && db.manualGiftBasePrice > 0) {
        const base15Price = db.manualGiftBasePrice;
        starziTomanPerUnit = Math.round((base15Price / 15) * userData.selectedGiftStars);
    } else {
        const tonToman = await getBinanceTONPriceInToman();
        const starziUsdPrice = userData.selectedGiftStars * STAR_USD;
        const baseGiftToman = (starziUsdPrice / 5.5) * tonToman;

        starziTomanPerUnit = Math.round(baseGiftToman * 1.10);
        if (db.manualTonPrice && db.manualTonPrice > 0) {
            starziTomanPerUnit = Math.round(baseGiftToman);
        }
    }
    const total = Math.round(starziTomanPerUnit);
    return buildTotals(total, getActiveDiscountPercent(userData, 'gift_stars'));
}

async function calcGram(userData) {
    const freshGramData = await fetchGramData();
    userData.gramPricePerUnit = freshGramData.finalPrice;
    const total = Math.round(userData.gramAmount * userData.gramPricePerUnit);
    return buildTotals(total, getActiveDiscountPercent(userData, 'gram'));
}

function priceBlock(c, label) {
    if (c.discount > 0) {
        return `${label}: <s>${c.total.toLocaleString()}</s> تومان\n` +
               `🎫 تخفیف کد (${c.percent}%): ${c.discount.toLocaleString()} تومان\n`;
    }
    return `${label}: ${c.total.toLocaleString()} تومان\n`;
}

function starInvoiceKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: 'تأیید ✅' }, { text: 'لغو خرید ❌' }],
                [{ text: 'اعمال تخفیف 🎁' }, { text: 'اعمال کد تخفیف 🎫' }],
                [{ text: '🔙 بازگشت به پکیج‌ها' }, { text: '🏠 منوی اصلی' }]
            ],
            resize_keyboard: true
        }
    };
}

function giftInvoiceKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '✅ تایید' }, { text: 'لغو خرید ❌' }],
                [{ text: '💳 اعمال کد تخفیف' }],
                [{ text: '💬 تنظیم کامنت' }],
                [{ text: 'برگشت ↩️' }]
            ],
            resize_keyboard: true
        }
    };
}

function gramInvoiceKeyboard() {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '✅ تایید گرام' }, { text: 'لغو خرید ❌' }],
                [{ text: '💳 اعمال کد تخفیف' }],
                [{ text: 'برگشت ↩️' }]
            ],
            resize_keyboard: true
        }
    };
}

function getInvoiceKeyboardForState(state) {
    if (state === 'star_invoice') return starInvoiceKeyboard();
    if (state === 'gift_invoice') return giftInvoiceKeyboard();
    if (state === 'gram_invoice') return gramInvoiceKeyboard();
    return null;
}

function getInvoiceShowerForState(state) {
    if (state === 'star_invoice') return showStarInvoice;
    if (state === 'gift_invoice') return showGiftInvoice;
    if (state === 'gram_invoice') return showGramInvoice;
    return null;
}

async function tryEditInvoice(chatId, messageId, text) {
    if (!messageId) return false;
    const opts = { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' };
    try {
        await bot.editMessageCaption(text, opts);
        return true;
    } catch (e1) {
        if (/not modified/i.test((e1 && e1.message) || '')) return true;
        try {
            await bot.editMessageText(text, opts);
            return true;
        } catch (e2) {
            if (/not modified/i.test((e2 && e2.message) || '')) return true;
            return false;
        }
    }
}

async function revalidateAppliedDiscount(chatId, userData, showFn) {
    if (!userData.appliedDiscountCode) return true;
    const r = validateDiscount(userData.appliedDiscountCode, userData);
    if (r.ok) return true;
    clearDiscount(userData);
    saveDatabase();
    await safeSendMessage(chatId, `⚠️ ${r.error}\nکد تخفیف از فاکتور حذف شد، لطفاً فاکتور جدید را بررسی کنید.`);
    await showFn(chatId, userData, false);
    return false;
}

async function showStarInvoice(chatId, userData, edit = false) {
    const c = await calcStar(userData);
    const availableDiscountWallet = userData.discountWallet || 1766;
    userData.lastAmount = c.final;
    saveDatabase();

    const invoiceMsg =
        `<b>فاکتور خرید استارز</b>\n\n` +
        `💫 مقدار خرید: ${userData.starCount}
` +
        `👤 یوزر دریافت‌کننده: @${escapeHTML(userData.starRecipient)}
\n` +
        priceBlock(c, '💰 مبلغ فاکتور') +
        `🎁 کل موجودی تخفیف: ${availableDiscountWallet.toLocaleString()} تومان\n\n` +
        `🩵 مبلغ نهایی: <b>${c.final.toLocaleString()} تومان</b>\n\n` +
        `💼 در صورتی که جزئیات بالا مورد تأیید شماست ✓ روی دکمه تأیید کلیک کنید.`;

    if (edit && await tryEditInvoice(chatId, userData.lastInvoiceMessageId, invoiceMsg)) return;

    await safeDeleteMessage(chatId, userData.lastInvoiceMessageId);
    const sent = await safeSendPhoto(chatId, '1000002626.jpg', { caption: invoiceMsg, reply_markup: starInvoiceKeyboard().reply_markup });
    if (sent && sent.message_id) {
        userData.lastInvoiceMessageId = sent.message_id;
        saveDatabase();
    }
}

async function showGiftInvoice(chatId, userData, edit = false) {
    const c = await calcGift(userData);
    userData.lastAmount = c.final;
    saveDatabase();

    const invoiceMsg =
        `<b>فاکتور خرید گیفت</b>\n\n` +
        `محصول: ${escapeHTML(userData.selectedGiftName)} (${userData.selectedGiftStars} استارز)
` +
        `یوزر دریافت‌‌کننده: @${escapeHTML(userData.recipientUsername)}
\n` +
        `کامنت: ${escapeHTML(userData.commentText)}
\n` +
        priceBlock(c, '💰 مبلغ فاکتور') +
        `\nمبلغ نهایی: <b>${c.final.toLocaleString()} تومان</b>\n\n` +
        `در صورتی که جزئیات بالا مورد تأیید شماست ، روی دکمه تایید کلیک کنید.`;

    if (edit && await tryEditInvoice(chatId, userData.lastInvoiceMessageId, invoiceMsg)) return;

    await safeDeleteMessage(chatId, userData.lastInvoiceMessageId);
    const sent = await safeSendMessage(chatId, invoiceMsg, giftInvoiceKeyboard());
    if (sent && sent.message_id) {
        userData.lastInvoiceMessageId = sent.message_id;
        saveDatabase();
    }
}

async function showGramInvoice(chatId, userData, edit = false) {
    const c = await calcGram(userData);
    userData.lastAmount = c.final;
    saveDatabase();

    const invoiceMsg =
        `<b>[ فاکتور خرید ارز گرام ( GRAM ) ]</b>\n\n` +
        `مقدار خرید: ${userData.gramAmount} گرام
` +
        `آدرس ولت: <code>${escapeHTML(userData.gramWalletAddress)}</code>
` +
        `کامنت (مم): ${escapeHTML(userData.gramMemo)}
\n` +
        priceBlock(c, '💰 مبلغ فاکتور') +
        `\nمبلغ نهایی: <b>${c.final.toLocaleString()} تومان</b>\n\n` +
        `در صورتی که جزئیات بالا مورد تأیید شماست ، روی دکمه تایید کلیک کنید.`;

    if (edit && await tryEditInvoice(chatId, userData.lastInvoiceMessageId, invoiceMsg)) return;

    await safeDeleteMessage(chatId, userData.lastInvoiceMessageId);
    const sent = await safeSendMessage(chatId, invoiceMsg, gramInvoiceKeyboard());
    if (sent && sent.message_id) {
        userData.lastInvoiceMessageId = sent.message_id;
        saveDatabase();
    }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

bot.on('message', async (msg) => {
    try {
        await handleMessage(msg);
    } catch (err) {
        SystemLogger.error('MessageHandler', 'Error while handling message', err);
    }
});

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const contact = msg.contact;
    const photo = msg.photo;

    if (msg.message_id) {
        await setReaction(chatId, msg.message_id);
    }

    const isAdmin = isUserAdmin(chatId);
    const userData = getUserData(msg);
    const adminData = userData;

    if (userData.isBanned) {
        await safeSendMessage(chatId, 'حساب کاربری شما توسط ادمین مسدود شده است.');
        return;
    }

    if (!isAdmin) {
        const isMember = await checkMembership(msg.from.id);
        if (!isMember) {
            const joinMarkup = {
                inline_keyboard: [
                    [{ text: '📢 عضویت در کانال ربات', url: 'https://t.me/nova1_shopp' }],
                    [{ text: '✅ تایید عضویت', callback_data: 'check_join' }]
                ]
            };
            await safeSendMessage(chatId, '❌ <b>برای استفاده از ربات و دریافت خدمات، ابتدا باید در کانال ما عضو شوید.</b>', { reply_markup: joinMarkup });
            return;
        }
    }

    const mainKeyboard = getMainKeyboard(isAdmin);
    const backKeyboard = getBackKeyboard();
    const accountKeyboard = getAccountKeyboard();
    const adminPanelMarkup = getAdminPanelKeyboard();

    if (text && text.startsWith('/start')) {
        resetUserWaiting(userData);
        if (isAdmin) resetAdminFlags(adminData);
        userData.currentShopState = null;
        saveDatabase();
        const welcomeText = `به ربات نوا شاپ خوش آمدید ! 🌟\nمجموعه‌ای کامل برای خدمات تلگرامی شما.`;
        await safeSendPhoto(chatId, '1000002624.jpg', { caption: welcomeText, reply_markup: mainKeyboard.reply_markup });
        return;
    }

    if (text === 'لغو خرید ❌' || text === '❌ لغو خرید') {
        userData.currentShopState = null;
        userData.lastInvoiceMessageId = null;
        userData.appliedDiscountCode = null;
        userData.appliedDiscountPercent = 0;
        userData.pendingOrderToAutoPlace = null;
        resetUserWaiting(userData);
        saveDatabase();
        await safeSendMessage(chatId, 'خرید شما لغو شد.', mainKeyboard);
        return;
    }

    const backCommands = [
        '🔙 بازگشت', 'برگشت ↩️', '🔙 برگشت', '🏠 منوی اصلی',
        'انصراف', '↶ برگشت', '🔙 بازگشت به منوی اصلی', '🔙 بازگشت به پکیج‌ها'
    ];

    if (text && backCommands.some(c => norm(c) === norm(text))) {
        resetUserWaiting(userData);
        if (isAdmin) resetAdminFlags(adminData);
        saveDatabase();

        if (text === '🏠 منوی اصلی' || text === '🔙 بازگشت به منوی اصلی' || !userData.currentShopState || userData.currentShopState === 'main_shop' || userData.currentShopState === 'star_menu') {
            userData.currentShopState = null;
            saveDatabase();
            await safeSendMessage(chatId, 'به منوی اصلی برگشتید.', mainKeyboard);
            return;
        }

        if (text === '🔙 بازگشت به پکیج‌ها' || userData.currentShopState === 'star_recipient' || userData.currentShopState === 'star_invoice') {
            clearDiscount(userData);
            userData.currentShopState = 'star_menu';
            userData.waitingForStarCount = true;
            saveDatabase();
            const starPrice = await fetchStarsPrice();
            userData.starPricePerUnit = starPrice;
            saveDatabase();

            const starMsg =
                `💥 وقت درخشیدن با استارز تلگرامه !\n\n` +
                `🎯 کاربردهای استارز :\n` +
                `✨ فعال‌سازی ری‌اکشن‌های استارز در چت‌ها\n` +
                `🎯 خرید یا تمدید اکانت پرمیوم تلگرام\n` +
                `💸 پرداخت هزینه تبلیغات تلگرام\n\n` +
                `🪐 لطفاً تعداد استارز مورد نظر خود را ارسال کنید:`;

            const starMenuKeyboard = {
                reply_markup: {
                    keyboard: [
                        [{ text: 'محاسبه با موجودی من 🔄' }],
                        [{ text: 'برگشت ↩️️' }]
                    ],
                    resize_keyboard: true
                }
            };
            await safeSendPhoto(chatId, '1000002624.jpg', { caption: starMsg, reply_markup: starMenuKeyboard.reply_markup });
            return;
        } else {
            userData.currentShopState = 'main_shop';
            saveDatabase();
            await safeSendMessage(chatId, 'وقته محصول رو انتخاب کنی !\n\n🚀 تمامی سفارشات با بالاترین سرعت انجام میشن !', getShopKeyboard());
            return;
        }
    }

    if (isAdmin && text) {
        const adminButtonTexts = getAdminPanelKeyboard().reply_markup.keyboard.flat().map(b => b.text);
        const isAdminButton = adminButtonTexts.some(b => isBtn(text, b)) || text === '🔧 پنل مدیریت' || text === '/admin';
        if (isAdminButton) {
            resetAdminFlags(adminData);
            saveDatabase();
        }
    }

    if (isAdmin && (text === '🔧 پنل مدیریت' || text === '/admin')) {
        await safeSendMessage(chatId, 'پنل مدیریت:', adminPanelMarkup);
        return;
    }

    if (isAdmin && text === '/diag') {
        try {
            const info = await bot.getWebHookInfo();
            await safeSendMessage(chatId,
                `<b>🔎 تشخیص ربات</b>\n\n` +
                `Webhook: <code>${escapeHTML(info.url || 'ندارد')}</code>\n` +
                `پیام‌های در انتظار: ${info.pending_update_count}
` +
                `آخرین خطا: ${escapeHTML(info.last_error_message || 'ندارد')}`,
                adminPanelMarkup);
        } catch (e) {
            await safeSendMessage(chatId, `❌ خطا در تشخیص: ${escapeHTML(e.message)}`, adminPanelMarkup);
        }
        return;
    }

    if (isAdmin && adminData.waitingForManualPrice && text) {
        const cleanText = text.replace(/,/g, '').trim();
        const newPrice = parseInt(cleanText);
        if (isNaN(newPrice) || newPrice < 0) {
            await safeSendMessage(chatId, '❌ لطفاً یک عدد معتبر به تومان وارد کنید:');
            return;
        }
        db.manualTonPrice = newPrice;
        adminData.waitingForManualPrice = false;
        saveDatabase();
        const statusMsg = newPrice === 0
            ? '✅ قیمت دستی غیرفعال شد.'
            : `✅ قیمت دستی به مبلغ <b>${newPrice.toLocaleString()} تومان</b> ذخیره شد.`;
        await safeSendMessage(chatId, `<b>[ بروزرسانی قیمت ]</b>\n\n${statusMsg}`, adminPanelMarkup);
        return;
    }

    if (isAdmin && adminData.waitingForManualStarPrice && text) {
        const cleanText = text.replace(/,/g, '').trim();
        const newPrice = parseInt(cleanText);
        if (isNaN(newPrice) || newPrice < 0) {
            await safeSendMessage(chatId, '❌ لطفاً یک عدد معتبر وارد کنید:');
            return;
        }
        db.manualStarPrice = newPrice;
        adminData.waitingForManualStarPrice = false;
        saveDatabase();
        const statusMsg = newPrice === 0
            ? '✅ قیمت دستی استارز غیرفعال شد.'
            : `✅ قیمت دستی هر واحد استارز به مبلغ <b>${newPrice.toLocaleString()} تومان</b> ذخیره شد.`;
        await safeSendMessage(chatId, `<b>[ بروزرسانی قیمت استارز ]</b>\n\n${statusMsg}`, adminPanelMarkup);
        return;
    }

    if (isAdmin && adminData.waitingForManualGiftBasePrice && text) {
        const cleanText = text.replace(/,/g, '').trim();
        const newPrice = parseInt(cleanText);
        if (isNaN(newPrice) || newPrice < 0) {
            await safeSendMessage(chatId, '❌ لطفاً یک مبلغ معتبر وارد کنید:');
            return;
        }
        db.manualGiftBasePrice = newPrice;
        adminData.waitingForManualGiftBasePrice = false;
        saveDatabase();
        const statusMsg = newPrice === 0
            ? '✅ قیمت دستی گیفت غیرفعال شد.'
            : `✅ قیمت دستی گیفت ۱۵ استارزی به مبلغ <b>${newPrice.toLocaleString()} تومان</b> تنظیم شد.`;
        await safeSendMessage(chatId, `<b>[ تنظیم قیمت گیفت‌های استارزی ]</b>\n\n${statusMsg}`, adminPanelMarkup);
        return;
    }

    if (isAdmin && adminData.waitingForOrderRejectReason && text) {
        const orderCode = adminData.rejectOrderCode;
        const reason = escapeHTML(text);
        adminData.waitingForOrderRejectReason = false;
        adminData.rejectOrderCode = null;
        saveDatabase();

        const order = db.orders[orderCode];
        if (order && order.status === 'pending') {
            order.status = 'rejected';
            const orderUser = getUserDataById(order.userId);
            orderUser.wallet += order.amount;
            saveDatabase();
            await safeSendMessage(order.userId,
                `❌ سفارش شما با کد پیگیری <code>${escapeHTML(orderCode)}</code> توسط مدیریت رد شد.\n\n` +
                `دلیل: ${reason}\n\n` +
                `💰 مبلغ ${order.amount.toLocaleString()} تومان به موجودی حساب شما برگردانده شد.`);
            await safeSendMessage(chatId, `✅ دلیل رد سفارش برای کاربر ارسال شد و مبلغ برگشت.`, adminPanelMarkup);
        } else {
            await safeSendMessage(chatId, `این سفارش قبلاً بررسی شده است.`, adminPanelMarkup);
        }
        return;
    }

    if (isAdmin && adminData.waitingForReceiptRejectReason && text) {
        const targetUserId = adminData.rejectTargetId;
        const receiptCode = adminData.rejectReceiptCode;
        const reason = escapeHTML(text);
        adminData.waitingForReceiptRejectReason = false;
        adminData.rejectTargetId = null;
        adminData.rejectReceiptCode = null;

        if (receiptCode && db.processedReceipts[receiptCode]) {
            saveDatabase();
            await safeSendMessage(chatId, `این رسید قبلاً بررسی شده است.`, adminPanelMarkup);
            return;
        }
        if (receiptCode) db.processedReceipts[receiptCode] = 'rejected';
        
        // پاکسازی سفارش معتبری که برای این افزایش موجودی منتظر بود
        const targetUserObj = getUserDataById(targetUserId);
        targetUserObj.pendingOrderToAutoPlace = null;
        saveDatabase();

        await safeSendMessage(targetUserId, `❌ رسید پرداخت شما توسط مدیریت رد شد.\n\nدلیل: ${reason}`);
        await safeSendMessage(chatId, `✅ دلیل رد رسید برای کاربر ارسال شد.`, adminPanelMarkup);
        return;
    }

    if (isAdmin) {
        if (adminData.waitingForDiscountPercent && text) {
            const percent = parseInt(text);
            if (isNaN(percent) || percent <= 0 || percent > 100) {
                await safeSendMessage(chatId, 'لطفاً یک عدد معتبر بین 1 تا 100 وارد کنید:');
                return;
            }
            adminData.tempDiscount.percent = percent;
            adminData.waitingForDiscountPercent = false;
            adminData.waitingForDiscountCapacity = true;
            saveDatabase();
            await safeSendMessage(chatId, 'ظرفیت این کد را وارد کنید:');
            return;
        }

        if (adminData.waitingForDiscountCapacity && text) {
            const capacity = parseInt(text);
            if (isNaN(capacity) || capacity <= 0) {
                await safeSendMessage(chatId, 'لطفاً یک عدد صحیح بزرگتر از صفر وارد کنید:');
                return;
            }
            adminData.tempDiscount.capacity = capacity;
            adminData.waitingForDiscountCapacity = false;
            adminData.waitingForDiscountExpiry = true;
            saveDatabase();
            await safeSendMessage(chatId, 'ساعت اتمام اعتبار کد به وقت تهران را وارد کنید (0 تا 23):');
            return;
        }

        if (adminData.waitingForDiscountExpiry && text) {
            const expiryHour = parseInt(text);
            if (isNaN(expiryHour) || expiryHour < 0 || expiryHour > 23) {
                await safeSendMessage(chatId, 'لطفاً یک ساعت معتبر بین 0 تا 23 وارد کنید:');
                return;
            }
            adminData.tempDiscount.expiryHour = expiryHour;
            adminData.waitingForDiscountExpiry = false;
            adminData.waitingForDiscountRestriction = true;
            saveDatabase();

            const restrictionKeyboard = {
                reply_markup: {
                    keyboard: [
                        [{ text: '🌐 بدون محدودیت' }, { text: '⭐ محدودیت برای استارز' }],
                        [{ text: '💠 محدودیت برای گرام' }, { text: '🎁 محدودیت برای گیفت‌ها' }],
                        [{ text: 'برگشت ↩️' }]
                    ],
                    resize_keyboard: true
                }
            };
            await safeSendMessage(chatId, 'لطفاً نوع محدودیت کد تخفیف را انتخاب کنید:', restrictionKeyboard);
            return;
        }

        if (adminData.waitingForDiscountRestriction && text) {
            const t = norm(text);
            let restriction = null;
            if (t.includes('محدودیت برای استارز')) restriction = 'stars';
            else if (t.includes('محدودیت برای گرام')) restriction = 'gram';
            else if (t.includes('محدودیت برای گیفت')) restriction = 'gift_stars';
            else if (t.includes('بدون محدودیت')) restriction = null;
            else {
                await safeSendMessage(chatId, 'لطفاً یکی از دکمه‌های محدودیت را انتخاب کنید.');
                return;
            }

            adminData.waitingForDiscountRestriction = false;
            adminData.tempDiscount.restriction = restriction;

            const th = getTehranDate();
            let hoursUntil = (adminData.tempDiscount.expiryHour - th.getHours() + 24) % 24;
            if (hoursUntil === 0) hoursUntil = 24;
            const msIntoHour = th.getMinutes() * 60000 + th.getSeconds() * 1000;
            const expiresAt = Date.now() + hoursUntil * 3600000 - msIntoHour;

            let code;
            do {
                code = 'PLUS-' + Math.floor(1000 + Math.random() * 9000);
            } while (db.discountCodes[code]);

            db.discountCodes[code] = {
                percent: adminData.tempDiscount.percent,
                capacity: adminData.tempDiscount.capacity,
                usedCount: 0,
                expiryHour: adminData.tempDiscount.expiryHour,
                expiresAt: expiresAt,
                restriction: adminData.tempDiscount.restriction
            };
            saveDatabase();

            await safeSendMessage(chatId,
                `<b>✅ کد تخفیف ساخته شد</b>\n\n` +
                `کد تخفیف: <tg-spoiler>${code}</tg-spoiler>
` +
                `کد قابل کپی: <code>${code}</code>
` +
                `درصد: ${adminData.tempDiscount.percent}%
` +
                `ظرفیت: ${adminData.tempDiscount.capacity}
` +
                `اعتبار تا ساعت: ${adminData.tempDiscount.expiryHour}:00 (وقت تهران)
` +
                `محدودیت: ${adminData.tempDiscount.restriction || 'بدون محدودیت'}`,
                adminPanelMarkup
            );
            return;
        }
    }

    if (isAdmin && adminData.adminReplyingTo) {
        const targetUserToReply = adminData.adminReplyingTo;
        adminData.adminReplyingTo = null;
        saveDatabase();
        if (text) {
            await safeSendMessage(targetUserToReply, `پاسخ پشتیبانی از طرف مدیریت:\n\n${escapeHTML(text)}`);
            await safeSendMessage(chatId, `✅ پاسخ شما با موفقیت ارسال شد.`, adminPanelMarkup);
            return;
        }
    }

    if (isAdmin && adminData.adminAction) {
        if (adminData.waitingForAdminUserSearch && text) {
            const targetId = text.trim();
            if (!/^\d+$/.test(targetId)) {
                await safeSendMessage(chatId, '❌ آیدی عددی معتبر وارد کنید:');
                return;
            }
            adminData.waitingForAdminUserSearch = false;
            adminData.targetUserId = targetId;
            saveDatabase();
            const targetUser = getUserDataById(targetId);

            if (adminData.adminAction === 'BAN') {
                targetUser.isBanned = true;
                adminData.adminAction = null;
                adminData.targetUserId = null;
                saveDatabase();
                await safeSendMessage(chatId, `کاربر <code>${targetId}</code> بن شد.`, adminPanelMarkup);
                return;
            } else if (adminData.adminAction === 'UNBAN') {
                targetUser.isBanned = false;
                adminData.adminAction = null;
                adminData.targetUserId = null;
                saveDatabase();
                await safeSendMessage(chatId, `کاربر <code>${targetId}</code> آنبن شد.`, adminPanelMarkup);
                return;
            } else if (adminData.adminAction === 'SECOND') {
                db.secondaryAdmin = targetId;
                adminData.adminAction = null;
                adminData.targetUserId = null;
                saveDatabase();
                await safeSendMessage(chatId, `کاربر <code>${targetId}</code> به عنوان مالک دوم ثبت شد.`, adminPanelMarkup);
                return;
            }

            adminData.waitingForAdminAmount = true;
            saveDatabase();
            if (adminData.adminAction === 'ADD') await safeSendMessage(chatId, `مبلغ افزایشی (تومان):`);
            else if (adminData.adminAction === 'SUB') await safeSendMessage(chatId, `مبلغ کاهشی (تومان):`);
            return;
        }

        if (adminData.waitingForAdminAmount && adminData.targetUserId && text) {
            const targetId = adminData.targetUserId;
            const targetUser = getUserDataById(targetId);
            const action = adminData.adminAction;
            const amount = parseInt(text.replace(/,/g, ''));

            if (isNaN(amount) || amount <= 0) {
                await safeSendMessage(chatId, '❌ یک عدد معتبر وارد کنید:');
                return;
            }

            if (action === 'ADD') {
                targetUser.wallet += amount;
                saveDatabase();
                await safeSendMessage(chatId, `${amount.toLocaleString()} تومان افزوده شد.`, adminPanelMarkup);
                await safeSendMessage(targetId, `مبلغ ${amount.toLocaleString()} تومان توسط مدیریت به حساب شما واریز شد.`);
            } else if (action === 'SUB') {
                targetUser.wallet = Math.max(0, targetUser.wallet - amount);
                saveDatabase();
                await safeSendMessage(chatId, `${amount.toLocaleString()} تومان کسر شد.`, adminPanelMarkup);
            }

            adminData.adminAction = null;
            adminData.targetUserId = null;
            adminData.waitingForAdminAmount = false;
            saveDatabase();
            return;
        }
    }

    if (userData.waitingForStarCount && text && text !== 'محاسبه با موجودی من 🔄') {
        const countInput = parseInt(text);
        if (isNaN(countInput) || countInput < 50 || countInput > 100000) {
            await safeSendMessage(chatId, '❌ تعداد استارز باید عددی بین ۵۰ تا ۱۰۰,۰۰۰ باشد:', backKeyboard);
            return;
        }

        userData.starCount = countInput;
        userData.waitingForStarCount = false;
        userData.currentShopState = 'star_recipient';
        saveDatabase();

        const selfName = escapeHTML(msg.from.first_name) || 'کاربر';
        const recipientKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: `برای خودم ( ${selfName} ) 🪪` }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        const recipientMsg =
            `🔗 انتخاب اکانت دریافت‌‌کننده\n\n` +
            `✔️ اگر برای خودتان است، روی «برای خودم» کلیک کنید.\n` +
            `✔️ اگر برای شخص دیگری است، یوزرنیم او را بدون @ بفرستید.`;

        await safeSendPhoto(chatId, '1000002625.jpg', { caption: recipientMsg, reply_markup: recipientKeyboard.reply_markup });
        return;
    }

    if (userData.currentShopState === 'star_recipient' && text) {
        let usernameInput = text.trim();
        if (usernameInput.includes('برای خودم')) {
            usernameInput = msg.from.username || msg.from.id.toString();
        } else {
            if (usernameInput.startsWith('@')) {
                usernameInput = usernameInput.substring(1);
            }
        }

        userData.starRecipient = usernameInput;
        userData.currentShopState = 'star_invoice';
        saveDatabase();
        await showStarInvoice(chatId, userData);
        return;
    }

    if (userData.waitingForGramAmount && text) {
        if (text === 'محاسبه با موجودی من 🔄') {
            const liveGramData = await fetchGramData();
            userData.gramPricePerUnit = liveGramData.finalPrice;
            saveDatabase();
            const balanceGram = (userData.wallet / userData.gramPricePerUnit).toFixed(2);
            await safeSendMessage(chatId, `موجودی شما: ${userData.wallet.toLocaleString()} تومان
معادل ${balanceGram} گرام.
لطفاً تعداد گرام را وارد کنید:`, backKeyboard);
            return;
        }

        const gramInput = parseFloat(text);
        if (isNaN(gramInput) || gramInput < 0.1) {
            await safeSendMessage(chatId, '❌ حداقل خرید ۰.۱ گرام است.', backKeyboard);
            return;
        }
        userData.gramAmount = gramInput;
        userData.waitingForGramAmount = false;
        userData.waitingForGramWallet = true;
        saveDatabase();

        await safeSendMessage(chatId, `لطفاً آدرس ولت گرام خود را ارسال کنید:`, backKeyboard);
        return;
    }

    if (userData.waitingForGramWallet && text) {
        const walletInput = text.trim();
        const isValidTonWallet = /^(UQ|EQ)[a-zA-Z0-9\-_]{46}$/.test(walletInput) || /^0:[a-fA-F0-9]{64}$/.test(walletInput) || (walletInput.length >= 40 && (walletInput.startsWith('UQ') || walletInput.startsWith('EQ') || walletInput.startsWith('0:')));

        if (!isValidTonWallet) {
            await safeSendMessage(chatId, '❌ آدرس ولت وارد شده معتبر نیست.', backKeyboard);
            return;
        }

        userData.gramWalletAddress = walletInput;
        userData.waitingForGramWallet = false;
        userData.waitingForGramMemoChoice = true;
        saveDatabase();

        const memoKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '💬 بله، کامنت دارم' }, { text: '❌ رد کردن' }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, 'آیا برای واریز گرام کامنت (ممو) دارید؟', memoKeyboard);
        return;
    }

    if (userData.waitingForGramMemoChoice && text) {
        if (text === '❌ رد کردن') {
            userData.gramMemo = 'ندارد';
            userData.waitingForGramMemoChoice = false;
            userData.currentShopState = 'gram_invoice';
            saveDatabase();
            await showGramInvoice(chatId, userData);
            return;
        } else if (text === '💬 بله، کامنت دارم') {
            userData.waitingForGramMemoChoice = false;
            userData.waitingForGramMemoInput = true;
            saveDatabase();
            await safeSendMessage(chatId, 'لطفاً متن کامنت خود را وارد کنید:', backKeyboard);
            return;
        }
    }

    if (userData.waitingForGramMemoInput && text) {
        userData.gramMemo = text.trim();
        userData.waitingForGramMemoInput = false;
        userData.currentShopState = 'gram_invoice';
        saveDatabase();
        await showGramInvoice(chatId, userData);
        return;
    }

    if (userData.waitingForTrackingInput && text) {
        userData.waitingForTrackingInput = false;
        saveDatabase();
        const trackingCode = text.trim();
        const order = db.orders[trackingCode];

        if (!order || String(order.userId) !== String(chatId)) {
            await safeSendMessage(chatId, 'سفارشی با این کد پیگیری یافت نشد.', backKeyboard);
            return;
        }

        let statusStr = 'در حال بررسی توسط مدیریت';
        if (order.status === 'completed') statusStr = 'انجام شده و تکمیل شده';
        if (order.status === 'rejected') statusStr = 'رد شده توسط مدیریت';

        const trackResultMsg = `<b>[ نتیجه پیگیری سفارش ]</b>\n\nکد: <code>${escapeHTML(trackingCode)}</code>
محصول: ${escapeHTML(order.giftName)}
مبلغ: ${order.amount.toLocaleString()} تومان
وضعیت: ${statusStr}`;
        await safeSendMessage(chatId, trackResultMsg, backKeyboard);
        return;
    }

    if (userData.waitingForComment && text) {
        userData.waitingForComment = false;
        userData.commentText = text.trim();
        saveDatabase();
        await showGiftInvoice(chatId, userData);
        return;
    }

    // ---------------- Smart Support (AI) Section ----------------
    if (userData.waitingForSmartSupport && text) {
        if (text === '🔙 بازگشت به منوی اصلی' || text === 'برگشت ↩️') {
            userData.waitingForSmartSupport = false;
            saveDatabase();
            await safeSendMessage(chatId, 'به منوی اصلی برگشتید.', mainKeyboard);
            return;
        }

        const userQ = text.toLowerCase();
        let aiReply = "سلام! من پشتیبانی هوشمند نوا شاپ هستم. تمامی سفارشات شما، وضعیت رسیدها، نحوه خرید استارز، گرام و گیفت‌ها به صورت خودکار بررسی و پشتیبانی می‌شوند. سوال یا مشکل خود را به صورت دقیق بفرمایید تا راهنمایی‌تان کنم.";

        if (userQ.includes('استارز') || userQ.includes('star')) {
            aiReply = "⭐ برای خرید استارز، از منوی اصلی به بخش «خرید محصول» و سپس «استارز» بروید. تعداد مورد نظر را انتخاب کرده و آیدی دریافت‌کننده را وارد کنید. فاکتور صادر شده و پس از تأیید و کسر مبلغ از موجودی، در سریع‌ترین زمان توسط مدیریت اعمال می‌شود.";
        } else if (userQ.includes('گرام') || userQ.includes('gram')) {
            aiReply = "💠 برای خرید ارز گرام، به بخش محصولات رفته، مقدار گرام را وارد کنید، آدرس ولت خود و در صورت نیاز ممو (کامنت) را ثبت کنید تا فاکتور نهایی صادر شود.";
        } else if (userQ.includes('گیفت') || userQ.includes('gift')) {
            aiReply = "🎁 گیفت‌های استارزی شامل انواع عادی (مثل قلب، تدی، کادو و...) هستند که می‌توانید با انتخاب محصول و تعیین دریافت‌کننده، آن‌ها را سفارش دهید.";
        } else if (userQ.includes('رسید') || userQ.includes('واریز') || userQ.includes('افزایش موجودی')) {
            aiReply = "💳 برای افزایش موجودی، از منوی اصلی روی «➕ افزایش موجودی» کلیک کنید، مبلغ را به تومان وارد نمایید، به شماره کارت اعلام شده واریز کرده و عکس رسید را در ربات بفرستید تا پس از بررسی مدیریت، موجودی‌تان شارژ شود.";
        } else if (userQ.includes('پیگیری') || userQ.includes('سفارش')) {
            aiReply = "📦 برای پیگیری سفارشات خود می‌توانید از گزینه «📦 پیگیری سفارش» در منوی اصلی استفاده کرده و کد پیگیری خود را ارسال کنید تا وضعیت آن (معلق، تکمیل یا رد شده) را مشاهده کنید.";
        } else if (userQ.includes('اعتماد') || userQ.includes('امنیت')) {
            aiReply = "❤️ نوا شاپ با سابقه درخشان و رضایت هزاران مشتری فعال به صورت کاملاً امن فعالیت می‌کند. کانال رضایت و اعتماد ما در ربات بخش مشخصی دارد.";
        }

        await safeSendMessage(chatId, `🤖 <b>پشتیبانی هوشمند نوا شاپ:</b>\n\n${aiReply}`, {
            reply_markup: {
                keyboard: [
                    [{ text: '🔙 بازگشت به منوی اصلی' }]
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    // ---------------- Discount code input & live invoice edit ----------------
    if (userData.waitingForDiscountInput && text) {
        userData.waitingForDiscountInput = false;
        saveDatabase();

        const state = userData.currentShopState;
        const showFn = getInvoiceShowerForState(state);
        const invoiceKb = getInvoiceKeyboardForState(state) || backKeyboard;

        if (!showFn) {
            await safeSendMessage(chatId, 'ابتدا یک محصول انتخاب کنید و به مرحله فاکتور برسید.', mainKeyboard);
            return;
        }

        const codeInput = text.trim().toUpperCase();
        const result = validateDiscount(codeInput, userData);

        if (!result.ok) {
            await safeSendMessage(chatId, `❌ ${result.error}`, invoiceKb);
            return;
        }

        userData.appliedDiscountCode = codeInput;
        userData.appliedDiscountPercent = result.obj.percent;
        saveDatabase();

        // ویرایش زنده فاکتور و اعمال قیمت جدید با خط زدن قیمت قبلی
        await showFn(chatId, userData, true);
        await safeSendMessage(chatId, `✅ کد تخفیف ${result.obj.percent}% با موفقیت روی فاکتور شما اعمال شد.`, invoiceKb);
        return;
    }

    if (text === 'محاسبه با موجودی من 🔄' && userData.currentShopState === 'star_menu') {
        const maxStars = Math.floor(userData.wallet / (userData.starPricePerUnit || await fetchStarsPrice()));
        await safeSendMessage(chatId, `موجودی شما: ${userData.wallet.toLocaleString()} تومان
حداکثر ${maxStars} استارز می‌توانید بخرید.`, backKeyboard);
        return;
    }

    if (text === 'اعمال تخفیف 🎁' && userData.currentShopState === 'star_invoice') {
        const availableDiscountWallet = userData.discountWallet || 1766;
        if (availableDiscountWallet <= 0) {
            await safeSendMessage(chatId, 'موجودی کیف پول تخفیف کافی نیست.', backKeyboard);
        } else {
            await safeSendMessage(chatId, `تخفیف به مبلغ ${availableDiscountWallet.toLocaleString()} تومان اعمال شد.`);
        }
        return;
    }

    if (text === 'اعمال کد تخفیف 🎫' && userData.currentShopState === 'star_invoice') {
        userData.waitingForDiscountInput = true;
        saveDatabase();
        await safeSendMessage(chatId, 'لطفاً کد تخفیف خود را ارسال کنید:', backKeyboard);
        return;
    }

    const shortageReply = async (orderType, orderDetails) => {
        const shortage = userData.lastAmount - userData.wallet;
        
        // ذخیره اطلاعات سفارش در صف انتظار کاربر تا پس از تأیید واریز به صورت خودکار ثبت شود
        userData.pendingOrderToAutoPlace = {
            type: orderType,
            ...orderDetails
        };
        saveDatabase();

        const shortageKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `➕ افزایش موجودی (${shortage.toLocaleString()} تومان)`, callback_data: `add_balance_${shortage}` }]
                ]
            }
        };
        await safeSendMessage(chatId, `❌ موجودی حساب شما کافی نیست!\n\n💳 مبلغ کسری: ${shortage.toLocaleString()} تومان\n\nبا کلیک بر روی دکمه زیر می‌توانید مبلغ کسری را شارژ کنید تا پس از تأیید مدیریت، سفارش شما به صورت خودکار ثبت شود:`, shortageKeyboard);
    };

    const adminOrderMarkupFor = (trackingCode) => ({
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ انجام شد', callback_data: `order_done_${trackingCode}` }, { text: '❌ رد شد', callback_data: `order_reject_${trackingCode}` }]
            ]
        }
    });

    if (text === 'تأیید ✅' && userData.currentShopState === 'star_invoice') {
        if (!(await revalidateAppliedDiscount(chatId, userData, showStarInvoice))) return;
        userData.lastAmount = (await calcStar(userData)).final;
        saveDatabase();
        if (userData.wallet < userData.lastAmount) {
            await shortageReply('star', {
                starCount: userData.starCount,
                starRecipient: userData.starRecipient
            });
            return;
        }

        userData.wallet -= userData.lastAmount;
        const trackingCode = 'STR-' + Math.floor(10000 + Math.random() * 90000);
        const now = getFormattedTime();

        db.orders[trackingCode] = {
            userId: chatId,
            firstName: userData.firstName,
            giftName: `استارز تلگرام (${userData.starCount} عدد)`,
            count: userData.starCount,
            recipient: userData.starRecipient,
            comment: 'ندارد',
            amount: userData.lastAmount,
            time: now,
            status: 'pending'
        };
        userData.lastInvoiceMessageId = null;
        userData.pendingOrderToAutoPlace = null;
        saveDatabase();
        consumeDiscount(userData);

        const userConfirmMsg = `سفارش ثبت شد و مبلغ از حساب شما کسر گردید.\n\nکد پیگیری: <code>${trackingCode}</code>
مقدار: ${userData.starCount} استارز
مبلغ: ${db.orders[trackingCode].amount.toLocaleString()} تومان`;
        await safeSendMessage(chatId, userConfirmMsg, mainKeyboard);

        const adminOrderMsg =
            `<b>[ سفارش جدید استارز ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}
` +
            `🆔 آیدی عددی: <code>${chatId}</code>
` +
            `🏷️ کد پیگیری: <code>${trackingCode}</code>
` +
            `💫 تعداد استارز: ${userData.starCount}
` +
            `📥 دریافت‌کننده: @${escapeHTML(userData.starRecipient)}
` +
            `💰 مبلغ کل: ${db.orders[trackingCode].amount.toLocaleString()} تومان
` +
            `⏰ زمان ثبت: ${now}`;

        await notifyAdmins(adminOrderMsg, adminOrderMarkupFor(trackingCode));
        userData.currentShopState = null;
        saveDatabase();
        return;
    }

    if (text === '✅ تایید' && userData.currentShopState === 'gift_invoice') {
        if (!(await revalidateAppliedDiscount(chatId, userData, showGiftInvoice))) return;
        userData.lastAmount = (await calcGift(userData)).final;
        saveDatabase();
        if (userData.wallet < userData.lastAmount) {
            await shortageReply('gift', {
                selectedGiftName: userData.selectedGiftName,
                selectedGiftStars: userData.selectedGiftStars,
                recipientUsername: userData.recipientUsername,
                commentText: userData.commentText
            });
            return;
        }

        userData.wallet -= userData.lastAmount;
        const trackingCode = 'STZ-' + Math.floor(10000 + Math.random() * 90000);
        const now = getFormattedTime();

        db.orders[trackingCode] = {
            userId: chatId,
            firstName: userData.firstName,
            giftName: userData.selectedGiftName,
            count: 1,
            recipient: userData.recipientUsername,
            comment: userData.commentText,
            amount: userData.lastAmount,
            time: now,
            status: 'pending'
        };
        userData.lastInvoiceMessageId = null;
        userData.pendingOrderToAutoPlace = null;
        saveDatabase();
        consumeDiscount(userData);

        const userConfirmMsg = `سفارش گیفت ثبت شد و مبلغ کسر گردید.\n\nکد پیگیری: <code>${trackingCode}</code>
مبلغ: ${db.orders[trackingCode].amount.toLocaleString()} تومان`;
        await safeSendMessage(chatId, userConfirmMsg, mainKeyboard);

        const adminOrderMsg =
            `<b>[ سفارش جدید گیفت استارزی ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}
` +
            `🆔 آیدی عددی: <code>${chatId}</code>
` +
            `🏷️ کد پیگیری: <code>${trackingCode}</code>
` +
            `🎁 نام گیفت: ${escapeHTML(userData.selectedGiftName)} (${userData.selectedGiftStars} استارز)
` +
            `📥 دریافت‌کننده: @${escapeHTML(userData.recipientUsername)}
` +
            `💬 کامنت: ${escapeHTML(userData.commentText)}
` +
            `💰 مبلغ کل: ${db.orders[trackingCode].amount.toLocaleString()} تومان
` +
            `⏰ زمان ثبت: ${now}`;

        await notifyAdmins(adminOrderMsg, adminOrderMarkupFor(trackingCode));
        userData.currentShopState = null;
        saveDatabase();
        return;
    }

    if (text === '✅ تایید گرام' && userData.currentShopState === 'gram_invoice') {
        if (!(await revalidateAppliedDiscount(chatId, userData, showGramInvoice))) return;
        userData.lastAmount = (await calcGram(userData)).final;
        saveDatabase();

        if (userData.wallet < userData.lastAmount) {
            await shortageReply('gram', {
                gramAmount: userData.gramAmount,
                gramWalletAddress: userData.gramWalletAddress,
                gramMemo: userData.gramMemo
            });
            return;
        }

        userData.wallet -= userData.lastAmount;
        const trackingCode = 'GRAM-' + Math.floor(10000 + Math.random() * 90000);
        const now = getFormattedTime();

        db.orders[trackingCode] = {
            userId: chatId,
            firstName: userData.firstName,
            giftName: `ارز گرام (${userData.gramAmount} GRAM)`,
            count: userData.gramAmount,
            recipient: userData.gramWalletAddress,
            comment: userData.gramMemo,
            amount: userData.lastAmount,
            time: now,
            status: 'pending'
        };
        userData.lastInvoiceMessageId = null;
        userData.pendingOrderToAutoPlace = null;
        saveDatabase();
        consumeDiscount(userData);

        const userConfirmMsg = `سفارش گرام ثبت شد و مبلغ کسر گردید.\n\nکد پیگیری: <code>${trackingCode}</code>`;
        await safeSendMessage(chatId, userConfirmMsg, mainKeyboard);

        const adminOrderMsg =
            `<b>[ سفارش جدید ارز گرام ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}
` +
            `🆔 آیدی عددی: <code>${chatId}</code>
` +
            `🏷️ کد پیگیری: <code>${trackingCode}</code>
` +
            `💠 مقدار گرام: ${userData.gramAmount}
` +
            `📫 آدرس ولت: <code>${escapeHTML(userData.gramWalletAddress)}</code>
` +
            `💬 ممو / کامنت: ${escapeHTML(userData.gramMemo)}
` +
            `💰 مبلغ کل: ${db.orders[trackingCode].amount.toLocaleString()} تومان
` +
            `⏰ زمان ثبت: ${now}`;

        await notifyAdmins(adminOrderMsg, adminOrderMarkupFor(trackingCode));
        userData.currentShopState = null;
        saveDatabase();
        return;
    }

    if (photo && userData.waitingForReceipt) {
        const photoId = photo[photo.length - 1].file_id;
        userData.waitingForReceipt = false;

        const amount = userData.lastAmount;
        const receiptCode = 'RCP-' + Math.floor(1000 + Math.random() * 9000);

        userData.lastReceiptPhotoId = photoId;
        userData.lastReceiptCode = receiptCode;
        userData.lastReceiptAmount = amount;
        userData.lastReceiptTime = getFormattedTime();
        saveDatabase();

        const uname = msg.from.username ? '@' + escapeHTML(msg.from.username) : 'ندارد';
        const adminCaption =
            `<b>[ رسید پرداخت جدید ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}
` +
            `🔗 یوزرنیم: ${uname}
` +
            `🆔 آیدی عددی: <code>${chatId}</code>
` +
            `📱 شماره: ${escapeHTML(userData.phone)}
` +
            `💼 موجودی فعلی: ${userData.wallet.toLocaleString()} تومان
` +
            `🏷 شماره رسید: <code>${receiptCode}</code>
` +
            `💰 مبلغ: ${amount.toLocaleString()} تومان
` +
            `⏰ زمان: ${userData.lastReceiptTime}`;

        const adminMarkup = {
            inline_keyboard: [
                [
                    { text: '✅ تایید', callback_data: `approve_receipt_${chatId}_${amount}_${receiptCode}` },
                    { text: '❌ رد', callback_data: `reject_receipt_${chatId}_${receiptCode}` }
                ],
                [{ text: '💬 پاسخ به کاربر', callback_data: `reply_${chatId}` }]
            ]
        };

        await notifyAdminsPhoto(photoId, { caption: adminCaption, parse_mode: 'HTML', reply_markup: adminMarkup });

        const userMarkup = {
            inline_keyboard: [[{ text: '💬 پیگیری رسید', callback_data: 'track_receipt_main' }]]
        };

        await safeSendMessage(chatId,
            `✅ <b>رسید شما دریافت شد</b>\n\n` +
            `🏷️ شماره رسید: <code>${receiptCode}</code>
` +
            `💰 مبلغ: ${amount.toLocaleString()} تومان\n\n` +
            `⏳ لطفاً منتظر تایید رسید توسط مدیریت باشید.`,
            { reply_markup: userMarkup });
        return;
    }

    if (contact) {
        let phoneNum = contact.phone_number;
        if (!phoneNum.startsWith('+')) phoneNum = '+' + phoneNum;
        if (phoneNum.startsWith('+98')) {
            userData.phone = phoneNum;
            userData.verified = 'انجام شده';
            saveDatabase();
            await safeSendMessage(chatId, `شماره موبایل شما تایید شد!`, mainKeyboard);
        }
        return;
    }

    if (userData.waitingForTicket && text) {
        userData.waitingForTicket = false;
        saveDatabase();
        await safeSendMessage(chatId, 'تیکت شما ارسال شد.', backKeyboard);

        const adminTicketMsg = `تیکت جدید:\nنام: ${escapeHTML(userData.firstName)}
آیدی: <code>${chatId}</code>
متن:
${escapeHTML(text)}`;
        const replyMarkup = {
            reply_markup: {
                inline_keyboard: [[{ text: '💬 پاسخ به کاربر', callback_data: `reply_${chatId}` }]]
            }
        };
        await notifyAdmins(adminTicketMsg, replyMarkup);
        return;
    }

    if (isAdmin && isBtn(text, BTN.ACTIVITY)) {
        let actMsg = `<b>📊 بخش فعالیت‌های پنل مدیریت</b>\n\n`;
        actMsg += `<b>✔️ رسیدهای تایید شده:</b>\n`;
        if (db.approvedReceiptsHistory && db.approvedReceiptsHistory.length > 0) {
            db.approvedReceiptsHistory.slice(-10).forEach((rec, idx) => {
                actMsg += `${idx + 1}. کاربر: <code>${rec.userId}</code> | مبلغ: ${Number(rec.amount).toLocaleString()} تومان | رسید: ${rec.receiptCode} | تاریخ: ${rec.time}
`;
            });
        } else {
            actMsg += `هنوز رسیدی تایید نشده است.
`;
        }

        actMsg += `\n<b>🛍️️ تفکیک فاکتورها و سفارشات:</b>\n`;
        const ordersList = Object.entries(db.orders);
        if (ordersList.length > 0) {
            ordersList.slice(-10).forEach(([code, ord], idx) => {
                actMsg += `${idx + 1}. کد: <code>${code}</code> | محصول: ${escapeHTML(ord.giftName)} | مبلغ: ${ord.amount.toLocaleString()} تومان | وضعیت: ${ord.status}
`;
            });
        } else {
            actMsg += `سفارشی ثبت نشده است.
`;
        }
        await safeSendMessage(chatId, actMsg, adminPanelMarkup);
        return;
    }

    if (isAdmin && isBtn(text, BTN.LIST_DISCOUNT)) {
        let codesMsg = `<b>🏷️ لیست کدهای تخفیف سیستم:</b>\n\n`;
        const codes = Object.entries(db.discountCodes);
        if (codes.length === 0) {
            codesMsg += `هیچ کد تخفیفی ساخته نشده است.`;
        } else {
            codes.forEach(([cName, cObj], idx) => {
                const status = isDiscountFinished(cObj) ? '🔴 تمام شده' : '🟢 فعال';
                codesMsg += `${idx + 1}. کد: <code>${cName}</code> ${status}
   درصد: ${cObj.percent}%
   ظرفیت: ${cObj.capacity} | استفاده شده: ${cObj.usedCount}
   محدودیت: ${cObj.restriction || 'ندارد'}

`;
            });
        }
        await safeSendMessage(chatId, codesMsg, adminPanelMarkup);
        return;
    }

    if (isAdmin && isBtn(text, BTN.TON)) {
        adminData.waitingForManualPrice = true;
        saveDatabase();
        const currentPriceText = db.manualTonPrice > 0
            ? `<b>${db.manualTonPrice.toLocaleString()} تومان (دستی)</b>`
            : `<b>خودکار</b>`;
        await safeSendMessage(chatId, `<b>[ تنظیم قیمت دستی تون ]</b>\n\nوضعیت فعلی: ${currentPriceText}\n\nلطفاً قیمت پایه جدید را به تومان وارد کنید (0 برای حالت آنلاین):`, backKeyboard);
        return;
    }

    if (isAdmin && isBtn(text, BTN.STAR)) {
        adminData.waitingForManualStarPrice = true;
        saveDatabase();
        const currentPriceText = db.manualStarPrice > 0
            ? `<b>${db.manualStarPrice.toLocaleString()} تومان (دستی)</b>`
            : `<b>خودکار</b>`;
        await safeSendMessage(chatId, `<b>[ تنظیم قیمت دستی استارز ]</b>\n\nوضعیت فعلی: ${currentPriceText}\n\nلطفاً قیمت هر واحد استارز را وارد کنید (0 برای حالت خودکار):`, backKeyboard);
        return;
    }

    if (isAdmin && isBtn(text, BTN.GIFT)) {
        adminData.waitingForManualGiftBasePrice = true;
        saveDatabase();
        const currentBasePriceText = db.manualGiftBasePrice > 0
            ? `<b>${db.manualGiftBasePrice.toLocaleString()} تومان (15 استارز)</b>`
            : `<b>محاسبه خودکار</b>`;
        await safeSendMessage(chatId, `<b>[ تنظیم قیمت دستی گیفت‌های استارزی ]</b>\n\nوضعیت فعلی: ${currentBasePriceText}\n\nقیمت گیفت 15 استارزی را وارد کنید (0 برای حالت خودکار):`, backKeyboard);
        return;
    }

    if (isAdmin && text) {
        const actionMap = [
            ['ADD', BTN.ADD], ['SUB', BTN.SUB], ['BAN', BTN.BAN],
            ['UNBAN', BTN.UNBAN], ['SECOND', BTN.SECOND]
        ];
        const found = actionMap.find(([, label]) => isBtn(text, label));
        if (found) {
            adminData.adminAction = found[0];
            adminData.waitingForAdminUserSearch = true;
            saveDatabase();
            await safeSendMessage(chatId, `آیدی عددی کاربر مورد نظر را وارد کنید:`, backKeyboard);
            return;
        }
    }

    if (isAdmin && text && (isBtn(text, BTN.CREATE_DISCOUNT) || norm(text).includes('ساخت کد تخفیف'))) {
        adminData.tempDiscount = { percent: 0, capacity: 0, expiryHour: 0, restriction: null };
        adminData.waitingForDiscountPercent = true;
        saveDatabase();
        await safeSendMessage(chatId, 'درصد تخفیف (عدد بین 1 تا 100):', backKeyboard);
        return;
    }

    if (text === '🛒 خرید محصول') {
        userData.currentShopState = 'main_shop';
        saveDatabase();
        await safeSendMessage(chatId, 'وقته محصول رو انتخاب کنی !', getShopKeyboard());
    }
    else if (text === '⭐️ استارز' || text === '⭐ استارز تلگرام (Telegram Stars)' || isBtn(text, '⭐️ استارز')) {
        clearDiscount(userData);
        userData.currentShopState = 'star_menu';
        userData.waitingForStarCount = true;
        const starsPrice = await fetchStarsPrice();
        userData.starPricePerUnit = starsPrice;
        saveDatabase();

        const starMsg =
            `💥 وقت درخشیدن با استارز تلگرامه !\n\n` +
            `🎯 کاربردهای استارز :\n` +
            `✨ فعال‌سازی ری‌‌اکشن‌ها\n` +
            `🎯 خرید اکانت پرمیوم\n\n` +
            `🪐 لطفاً تعداد استارز مورد نظر خود را ارسال کنید:`;

        const starMenuKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: 'محاسبه با موجودی من 🔄' }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendPhoto(chatId, '1000002624.jpg', { caption: starMsg, reply_markup: starMenuKeyboard.reply_markup });
    }
    else if (text === '💠 خرید ارز گرام ( GRAM )') {
        clearDiscount(userData);
        userData.currentShopState = 'gram_wallet_flow';
        saveDatabase();
        const gramData = await fetchGramData();
        userData.gramPricePerUnit = gramData.finalPrice;
        saveDatabase();

        const gramWalletFlowKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: 'محاسبه با موجودی من 🔄' }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, `تعداد گرام مورد نظر را وارد کنید:`, gramWalletFlowKeyboard);
        userData.waitingForGramAmount = true;
        saveDatabase();
    }
    else if (text === '🎁 گیفت استارزی' || text === '🎁 گیفت‌های استارزی') {
        userData.currentShopState = 'gift_category';
        saveDatabase();

        const giftCategoryMsg = `🎁 هدیه دادن گیفت ، تجربه‌ای خاص در تلگرام!\n\nلطفاً دسته‌بندی گیفت مورد نظر خود را انتخاب کنید :`;
        const giftCategoryKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '🧸 گیفت های عادی' }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, giftCategoryMsg, giftCategoryKeyboard);
    }
    else if (text === '🧸 گیفت های عادی') {
        clearDiscount(userData);
        userData.currentShopState = 'gift_list';
        saveDatabase();

        const giftListMsg = `🎁 گیفت های عادی\n\n💫 لطفاً گیفت مورد نظر خود را انتخاب کنید :`;
        const giftListKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '💖 گیفت قلب ( 15 )' }, { text: '🧸 گیفت تدی ( 15 )' }],
                    [{ text: '🎁 گیفت کادو ( 25 )' }, { text: '🌹 گیفت گل رز ( 25 )' }],
                    [{ text: '🎂 گیفت کیک ( 50 )' }, { text: '🌷 گیفت گل ( 50 )' }],
                    [{ text: '🍾 گیفت بطری ( 50 )' }, { text: '🚀 گیفت سفینه ( 50 )' }],
                    [{ text: '🏆 گیفت جام ( 100 )' }, { text: '💍 گیفت حلقه ( 100 )' }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, giftListMsg, giftListKeyboard);
    }
    else if (userData.currentShopState === 'gift_list' && text && text.includes('گیفت')) {
        userData.selectedGiftName = text;
        if (text.includes('15')) userData.selectedGiftStars = 15;
        else if (text.includes('25')) userData.selectedGiftStars = 25;
        else if (text.includes('50')) userData.selectedGiftStars = 50;
        else if (text.includes('100')) userData.selectedGiftStars = 100;
        else userData.selectedGiftStars = 15;

        userData.currentShopState = 'gift_recipient';
        saveDatabase();

        const selfName = escapeHTML(msg.from.first_name) || 'کاربر';
        const recipientKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: `برای خودم ( ${selfName} ) 🪪` }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, `انتخاب اکانت دریافت‌کننده گیفت`, recipientKeyboard);
    }
    else if (userData.currentShopState === 'gift_recipient' && text) {
        let usernameInput = text.trim();
        if (usernameInput.includes('برای خودم')) {
            usernameInput = msg.from.username || msg.from.id.toString();
        } else {
            if (usernameInput.startsWith('@')) {
                usernameInput = usernameInput.substring(1);
            }
        }
        userData.recipientUsername = usernameInput;
        userData.currentShopState = 'gift_invoice';
        saveDatabase();
        await showGiftInvoice(chatId, userData);
    }
    else if (text === '💳 اعمال کد تخفیف') {
        userData.waitingForDiscountInput = true;
        saveDatabase();
        await safeSendMessage(chatId, 'کد تخفیف خود را ارسال کنید:', backKeyboard);
    }
    else if (text === '💬 تنظیم کامنت') {
        userData.waitingForComment = true;
        saveDatabase();
        await safeSendMessage(chatId, 'کامنت دلخواه خود را بفرستید:', backKeyboard);
    }
    else if (text === '❤️ چطوری میتوانم به شما اعتماد کنم' || isBtn(text, '❤️ چطوری میتوانم به شما اعتماد کنم')) {
        await safeSendMessage(chatId, `نوا شاپ با رضایت هزاران مشتری فعال در خدمت شماست.\n\nکانال اعتماد:\n@nova1_shopp`, backKeyboard);
    }
    else if (text === '📦 پیگیری سفارش') {
        userData.waitingForTrackingInput = true;
        saveDatabase();
        await safeSendMessage(chatId, `کد پیگیری سفارش خود را ارسال کنید:`, backKeyboard);
    }
    else if (text === '💳 حساب کاربری') {
        const userInfo = `<b>حساب کاربری شما</b>\n\nنام: ${escapeHTML(userData.firstName)}
آیدی: <code>${chatId}</code>
موجودی اصلی: ${userData.wallet.toLocaleString()} تومان`;
        await safeSendMessage(chatId, userInfo, accountKeyboard);
    }
    else if (text === '➕ افزایش موجودی') {
        const increaseKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '💳 پرداخت ریالی' }],
                    [{ text: '🔙 بازگشت به منوی اصلی' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, `افزایش موجودی حساب...`, increaseKeyboard);
    }
    else if (text === '💳 پرداخت ریالی') {
        userData.waitingForAmount = true;
        saveDatabase();
        await safeSendMessage(chatId, `مبلغی که می‌‌خواهید حساب را شارژ کنید وارد نمایید (تومان - فقط عدد):`, backKeyboard);
    }
    else if (userData.waitingForAmount && text && /^\d+$/.test(text)) {
        const enteredAmount = parseInt(text);
        userData.waitingForAmount = false;
        userData.lastAmount = enteredAmount;
        userData.waitingForReceipt = true;
        saveDatabase();

        const rialAmount = enteredAmount * 10;
        const cardPaymentMsg =
            `💳 <b>افزایش موجودی</b>\n\n` +
            `مبلغ انتخابی: ${enteredAmount.toLocaleString()} تومان
` +
            `مبلغ قابل واریز: <b>${rialAmount.toLocaleString()} ریال</b>\n\n` +
            `شماره کارت:
<code>${CARD_NUMBER}</code>
` +
            `به نام: ${CARD_OWNER}`;

        const paymentKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📋 کپی شماره کارت', copy_text: { text: CARD_NUMBER } }],
                    [{ text: '📋 کپی دقیق مبلغ (ریال)', copy_text: { text: String(rialAmount) } }]
                ]
            }
        };
        await safeSendMessage(chatId, cardPaymentMsg, paymentKeyboard);
        await safeSendMessage(chatId, '📸 پس از واریز، عکس رسید را همین‌جا ارسال کنید.', backKeyboard);
    }
    else if (text === '📞 پشتیبانی') {
        const supportKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '👤 پشتیبانی مستقیم' }, { text: '🤖 پشتیبانی هوشمند' }],
                    [{ text: '🎫 ارسال تیکت (غیرمستقیم)' }],
                    [{ text: '🔙 بازگشت به منوی اصلی' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, `بخش پشتیبانی:`, supportKeyboard);
    }
    else if (text === '👤 پشتیبانی مستقیم') await safeSendMessage(chatId, `ارتباط با ادمین:
${ADMIN_ID_USERNAME}`, backKeyboard);
    else if (text === '🤖 پشتیبانی هوشمند') {
        userData.waitingForSmartSupport = true;
        saveDatabase();
        await safeSendMessage(chatId, `🤖 سلام! من پشتیبانی هوشمند نوا شاپ هستم. از صفر تا صد مسلط به تمامی بخش‌های رباتم.\nسفارش‌ها، رسیدها، استارز، گرام و راهنمایی‌ها را از من بپرسید:\n\nلطفاً سوال خود را بپرسید:`, backKeyboard);
    }
    else if (text === '🎫 ارسال تیکت (غیرمستقیم)') {
        userData.waitingForTicket = true;
        saveDatabase();
        await safeSendMessage(chatId, `پیام خود را ارسال کنید:`, backKeyboard);
    }
    else if (text === '📦 سفارش های اخیر من' || text === 'سفارش های اخیر من 📥') {
        let userOrders = Object.entries(db.orders).filter(([code, order]) => String(order.userId) === String(chatId));
        if (userOrders.length === 0) {
            await safeSendMessage(chatId, 'شما سفارشی ثبت نکرده‌اید.', backKeyboard);
        } else {
            let msgText = `<b>[ سفارش‌های اخیر شما ]</b>\n\n`;
            userOrders.slice(-5).forEach(([code, order], idx) => {
                msgText += `${idx + 1}. 📦 کد: <code>${escapeHTML(code)}</code>
   محصول: ${escapeHTML(order.giftName)}
   مبلغ: ${order.amount.toLocaleString()} تومان

`;
            });
            await safeSendMessage(chatId, msgText, backKeyboard);
        }
    }
    else if (text === '📦 سفارش های معلق من') {
        let userOrders = Object.entries(db.orders).filter(([code, order]) => String(order.userId) === String(chatId) && order.status === 'pending');
        if (userOrders.length === 0) {
            await safeSendMessage(chatId, 'سفارش معلقی ندارید.', backKeyboard);
        } else {
            let msgText = `<b>[ سفارش‌های معلق شما ]</b>\n\n`;
            userOrders.forEach(([code, order], idx) => {
                msgText += `${idx + 1}. 📦 کد: <code>${escapeHTML(code)}</code>
   محصول: ${escapeHTML(order.giftName)}

`;
            });
            await safeSendMessage(chatId, msgText, backKeyboard);
        }
    }
}

// ============================================================================
// INLINE CALLBACK QUERY HANDLER (100% FIXED & ROBUST)
// ============================================================================

bot.on('callback_query', async (callbackQuery) => {
    try {
        await handleCallback(callbackQuery);
    } catch (err) {
        SystemLogger.error('CallbackHandler', `Error while handling callback "${callbackQuery && callbackQuery.data}"`, err);
        await safeAnswer(callbackQuery.id, { text: '⚠️ خطایی رخ داد، دوباره تلاش کنید.', show_alert: true });
    }
});

async function handleCallback(callbackQuery) {
    const action = callbackQuery.data || '';
    const msg = callbackQuery.message;
    const fromId = callbackQuery.from.id;
    SystemLogger.info('Callback', `received from=${fromId} data=${action}`);

    if (!msg) {
        await safeAnswer(callbackQuery.id);
        return;
    }

    const chatId = msg.chat.id;
    const userData = getUserDataById(fromId);
    const isAdmin = isUserAdmin(fromId);

    if (action === 'copy_card') {
        await safeAnswer(callbackQuery.id, { text: `شماره کارت کپی شد:
${CARD_NUMBER}`, show_alert: true });
        return;
    }

    if (action.startsWith('copy_rial_')) {
        const rialVal = action.replace('copy_rial_', '');
        await safeAnswer(callbackQuery.id, { text: `مبلغ ریالی کپی شد:
${rialVal}`, show_alert: true });
        return;
    }

    if (action === 'check_join') {
        const isMember = await checkMembership(fromId);
        if (isMember) {
            await safeAnswer(callbackQuery.id);
            await safeDeleteMessage(chatId, msg.message_id);
            await safeSendMessage(chatId, '✅ عضویت شما تایید شد!', getMainKeyboard(isAdmin));
        } else {
            await safeAnswer(callbackQuery.id, { text: '❌ شما هنوز در کانال ربات عضو نشده‌اید!', show_alert: true });
        }
        return;
    }

    if (!isAdmin) {
        const isMember = await checkMembership(fromId);
        if (!isMember) {
            await safeAnswer(callbackQuery.id, { text: '❌ لطفاً ابتدا در کانال عضو شوید!', show_alert: true });
            return;
        }
    }

    if (action.startsWith('add_balance_')) {
        const shortage = parseInt(action.replace('add_balance_', ''));
        if (isNaN(shortage) || shortage <= 0) {
            await safeAnswer(callbackQuery.id);
            return;
        }
        userData.waitingForAmount = false;
        userData.lastAmount = shortage;
        userData.waitingForReceipt = true;
        saveDatabase();

        const rialAmount = shortage * 10;
        const cardPaymentMsg =
            `💳 <b>افزایش موجودی (مبلغ کسری)</b>\n\n` +
            `مبلغ: ${shortage.toLocaleString()} تومان
` +
            `مبلغ قابل واریز: <b>${rialAmount.toLocaleString()} ریال</b>\n\n` +
            `شماره کارت:
<code>${CARD_NUMBER}</code>
` +
            `به نام: ${CARD_OWNER}`;

        const paymentKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📋 کپی شماره کارت', copy_text: { text: CARD_NUMBER } }],
                    [{ text: '📋 کپی دقیق مبلغ (ریال)', copy_text: { text: String(rialAmount) } }]
                ]
            }
        };
        await safeAnswer(callbackQuery.id);
        await safeSendMessage(chatId, cardPaymentMsg, paymentKeyboard);
        await safeSendMessage(chatId, '📸 پس از واریز، عکس رسید را همین‌جا ارسال کنید.', getBackKeyboard());
        return;
    }

    if (action === 'track_receipt_main') {
        if (!userData.lastReceiptPhotoId || !userData.lastReceiptCode) {
            await safeAnswer(callbackQuery.id, { text: 'رسیدی برای پیگیری یافت نشد.', show_alert: true });
            return;
        }

        const status = db.processedReceipts[userData.lastReceiptCode];
        if (status === 'approved') {
            await safeAnswer(callbackQuery.id, { text: '✅ این رسید قبلاً تایید شده است.', show_alert: true });
            return;
        }
        if (status === 'rejected') {
            await safeAnswer(callbackQuery.id, { text: '❌ این رسید رد شده است.', show_alert: true });
            return;
        }

        const uname = callbackQuery.from.username ? '@' + escapeHTML(callbackQuery.from.username) : 'ندارد';
        const trackCaption =
            `🔔 <b>[ پیگیری رسید توسط کاربر ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}
` +
            `🔗 یوزرنیم: ${uname}
` +
            `🆔 آیدی عددی: <code>${fromId}</code>
` +
            `🏷️ شماره رسید: <code>${userData.lastReceiptCode}</code>
` +
            `💰 مبلغ: ${(userData.lastReceiptAmount || 0).toLocaleString()} تومان`;

        const trackMarkup = {
            inline_keyboard: [
                [
                    { text: '✅ تایید', callback_data: `approve_receipt_${fromId}_${userData.lastReceiptAmount}_${userData.lastReceiptCode}` },
                    { text: '❌ رد', callback_data: `reject_receipt_${fromId}_${userData.lastReceiptCode}` }
                ],
                [{ text: '💬 پاسخ به کاربر', callback_data: `reply_${fromId}` }]
            ]
        };

        await safeAnswer(callbackQuery.id);
        await notifyAdminsPhoto(userData.lastReceiptPhotoId, { caption: trackCaption, parse_mode: 'HTML', reply_markup: trackMarkup });
        await safeSendMessage(chatId, '✅ درخواست پیگیری برای مدیران ارسال شد.');
        return;
    }

    // بررسی دسترسی ادمین برای دکمه‌های مدیریتی
    const adminActions = ['order_done_', 'order_reject_', 'approve_receipt_', 'reject_receipt_', 'reply_'];
    if (adminActions.some(p => action.startsWith(p)) && !isAdmin) {
        await safeAnswer(callbackQuery.id, { text: '⛔ شما دسترسی ندارید.', show_alert: true });
        return;
    }

    const adminData = getUserDataById(fromId);

    // 1. انجام سفارش (تایید سفارش)
    if (action.startsWith('order_done_')) {
        const trackingCode = action.replace('order_done_', '');
        const order = db.orders[trackingCode];
        if (!order) {
            await safeAnswer(callbackQuery.id, { text: 'سفارش پیدا نشد.', show_alert: true });
            return;
        }
        if (order.status !== 'pending') {
            await safeAnswer(callbackQuery.id, { text: 'این سفارش قبلاً بررسی شده است.', show_alert: true });
            await editAdminMessage(msg, `<b>[ این سفارش قبلاً بررسی شده ]</b>\n\nکد: <code>${escapeHTML(trackingCode)}</code>`);
            return;
        }

        order.status = 'completed';
        order.completedAt = getFormattedTime();
        saveDatabase();
        await safeAnswer(callbackQuery.id, { text: '✅ سفارش انجام شد؛ فاکتور برای کاربر و گزارش برای کانال ارسال شد.' });

        // ارسال فاکتور تایید شده برای کاربر
        const completedInvoiceText =
            `<b>✅ سفارش شما انجام شد</b>\n` +
            `🏷️ کد پیگیری: <code>${escapeHTML(trackingCode)}</code>\n\n` +
            `📦 محصول: ${escapeHTML(order.giftName)}
` +
            `💰 مبلغ پرداختی: ${order.amount.toLocaleString()} تومان
` +
            `📅 تاریخ ثبت: ${order.time}
` +
            `✅ تاریخ انجام: ${order.completedAt}\n\n` +
            `✨ با تشکر از خرید شما از نوا شاپ!`;

        await safeSendMessage(order.userId, completedInvoiceText);

        // ارسال گزارش خرید به کانال گزارشات
        await sendChannelReport(order);

        await editAdminMessage(msg, `<b>[ سفارش انجام شد ✓ ]</b>\n\nکد پیگیری: <code>${escapeHTML(trackingCode)}</code>
خریدار: <code>${order.userId}</code>
محصول: ${escapeHTML(order.giftName)}`);
        return;
    }

    // 2. رد سفارش
    if (action.startsWith('order_reject_')) {
        const trackingCode = action.replace('order_reject_', '');
        const order = db.orders[trackingCode];
        if (!order || order.status !== 'pending') {
            await safeAnswer(callbackQuery.id, { text: 'این سفارش معتبر نیست یا قبلاً بررسی شده.', show_alert: true });
            return;
        }

        adminData.waitingForOrderRejectReason = true;
        adminData.rejectOrderCode = trackingCode;
        saveDatabase();

        await safeAnswer(callbackQuery.id);
        await safeSendMessage(fromId, `لطفاً دلیل رد سفارش با کد پیگیری <code>${escapeHTML(trackingCode)}</code> را ارسال کنید:`);
        return;
    }

    // 3. تایید رسید پرداخت (همراه با ثبت خودکار سفارش معلق در صورت وجود)
    if (action.startsWith('approve_receipt_')) {
        const parts = action.replace('approve_receipt_', '').split('_');
        const targetUserId = parts[0];
        const amount = parseInt(parts[1]) || 0;
        const receiptCode = parts[2];

        if (receiptCode && db.processedReceipts[receiptCode]) {
            await safeAnswer(callbackQuery.id, { text: 'این رسید قبلاً پردازش شده است.', show_alert: true });
            return;
        }

        if (receiptCode) db.processedReceipts[receiptCode] = 'approved';
        const targetUser = getUserDataById(targetUserId);
        targetUser.wallet += amount;

        if (!db.approvedReceiptsHistory) db.approvedReceiptsHistory = [];
        db.approvedReceiptsHistory.push({
            userId: targetUserId,
            amount: amount,
            receiptCode: receiptCode,
            time: getFormattedTime()
        });

        // بررسی اینکه آیا کاربر سفارش معلقی برای ثبت خودکار دارد یا خیر
        let autoPlacedOrderInfo = null;
        if (targetUser.pendingOrderToAutoPlace) {
            const pOrder = targetUser.pendingOrderToAutoPlace;
            let calculatedCost = 0;
            let giftNameStr = '';
            let countVal = 1;
            let recipientVal = '';
            let commentVal = 'ندارد';
            let trackingPrefix = 'STR-';

            if (pOrder.type === 'star') {
                const unitP = targetUser.starPricePerUnit || await fetchStarsPrice();
                calculatedCost = Math.round(unitP * pOrder.starCount);
                giftNameStr = `استارز تلگرام (${pOrder.starCount} عدد)`;
                countVal = pOrder.starCount;
                recipientVal = pOrder.starRecipient;
                trackingPrefix = 'STR-';
            } else if (pOrder.type === 'gift') {
                const tonTomanVal = await getBinanceTONPriceInToman();
                const starziUsdPrice = pOrder.selectedGiftStars * STAR_USD;
                const baseGiftToman = (starziUsdPrice / 5.5) * tonTomanVal;
                calculatedCost = Math.round(baseGiftToman * 1.10);
                giftNameStr = pOrder.selectedGiftName;
                countVal = 1;
                recipientVal = pOrder.recipientUsername;
                commentVal = pOrder.commentText;
                trackingPrefix = 'STZ-';
            } else if (pOrder.type === 'gram') {
                const freshGData = await fetchGramData();
                calculatedCost = Math.round(pOrder.gramAmount * freshGData.finalPrice);
                giftNameStr = `ارز گرام (${pOrder.gramAmount} GRAM)`;
                countVal = pOrder.gramAmount;
                recipientVal = pOrder.gramWalletAddress;
                commentVal = pOrder.gramMemo;
                trackingPrefix = 'GRAM-';
            }

            if (calculatedCost > 0 && targetUser.wallet >= calculatedCost) {
                targetUser.wallet -= calculatedCost;
                const trackingCode = trackingPrefix + Math.floor(10000 + Math.random() * 90000);
                const now = getFormattedTime();

                db.orders[trackingCode] = {
                    userId: targetUserId,
                    firstName: targetUser.firstName,
                    giftName: giftNameStr,
                    count: countVal,
                    recipient: recipientVal,
                    comment: commentVal,
                    amount: calculatedCost,
                    time: now,
                    status: 'pending'
                };

                autoPlacedOrderInfo = { trackingCode, giftName: giftNameStr, amount: calculatedCost };
                targetUser.pendingOrderToAutoPlace = null;

                // ارسال اعلان سفارش جدید به مدیران
                const adminOrderMsg =
                    `<b>[ ثبت خودکار سفارش پس از واریز ]</b>\n\n` +
                    `👤 نام کاربر: ${escapeHTML(targetUser.firstName)}
` +
                    `🆔 آیدی عددی: <code>${targetUserId}</code>
` +
                    `🏷️ کد پیگیری: <code>${trackingCode}</code>
` +
                    `📦 محصول: ${escapeHTML(giftNameStr)}
` +
                    `💰 مبلغ کل: ${calculatedCost.toLocaleString()} تومان
` +
                    `⏰ زمان ثبت: ${now}`;

                await notifyAdmins(adminOrderMsg, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ انجام شد', callback_data: `order_done_${trackingCode}` }, { text: '❌ رد شد', callback_data: `order_reject_${trackingCode}` }]
                        ]
                    }
                });
            }
        }

        saveDatabase();

        await safeAnswer(callbackQuery.id, { text: '✅ رسید تایید شد و مبلغ به حساب کاربر واریز گردید.' });

        // پیام تایید رسید و افزایش موجودی برای کاربر همراه با اطلاع‌رسانی ثبت خودکار سفارش
        let userMsgText = 
            `✅ <b>رسید پرداخت شما تایید شد!</b>\n\n` +
            `🏷️ شماره رسید: <code>${escapeHTML(receiptCode)}</code>\n` +
            `💰 مبلغ واریزشده: ${amount.toLocaleString()} تومان\n` +
            `💳 <b>این مبلغ به حساب کاربری شما اضافه شد.</b>`;

        if (autoPlacedOrderInfo) {
            userMsgText += `\n\n🛒 <b>سفارش معلق شما به صورت خودکار ثبت شد!</b>\n` +
                           `📦 محصول: ${escapeHTML(autoPlacedOrderInfo.giftName)}\n` +
                           `🏷️ کد پیگیری: <code>${autoPlacedOrderInfo.trackingCode}</code>\n` +
                           `مبلغ از موجودی شما کسر و برای بررسی به مدیریت ارسال شد.`;
        }

        await safeSendMessage(targetUserId, userMsgText);

        await editAdminMessage(msg, `<b>[ رسید تایید شد ✓ ]</b>\n\nرسید: <code>${escapeHTML(receiptCode)}</code>
مبلغ: ${amount.toLocaleString()} تومان
کاربر: <code>${targetUserId}</code>${autoPlacedOrderInfo ? '\n<i>(سفارش معلق کاربر به طور خودکار ثبت شد)</i>' : ''}`);
        return;
    }

    // 4. رد رسید پرداخت
    if (action.startsWith('reject_receipt_')) {
        const parts = action.replace('reject_receipt_', '').split('_');
        const targetUserId = parts[0];
        const receiptCode = parts[1];

        if (receiptCode && db.processedReceipts[receiptCode]) {
            await safeAnswer(callbackQuery.id, { text: 'این رسید قبلاً پردازش شده است.', show_alert: true });
            return;
        }

        adminData.waitingForReceiptRejectReason = true;
        adminData.rejectTargetId = targetUserId;
        adminData.rejectReceiptCode = receiptCode;
        saveDatabase();

        await safeAnswer(callbackQuery.id);
        await safeSendMessage(fromId, `لطفاً دلیل رد رسید <code>${escapeHTML(receiptCode)}</code> برای کاربر <code>${targetUserId}</code> را ارسال کنید:`);
        return;
    }

    // 5. پاسخ به کاربر
    if (action.startsWith('reply_')) {
        const targetUserId = action.replace('reply_', '');
        adminData.adminReplyingTo = targetUserId;
        saveDatabase();

        await safeAnswer(callbackQuery.id);
        await safeSendMessage(fromId, `لطفاً متن پاسخ خود را برای کاربر <code>${targetUserId}</code> ارسال کنید:`);
        return;
    }
}
