/**
 * ============================================================================
 * Stars Plus TELEGRAM BOT - V3.5 (ENTERPRISE RESTRUCTURED & USDT NOBITEX SYNCED)
 * ============================================================================
 */

const TelegramModule = require('node-telegram-bot-api');
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

server.listen(PORT, () => {
    console.log(`[Server] HTTP server is listening on port ${PORT}`);
});

// ============================================================================
// ENTERPRISE CONFIGURATION & CONSTANTS
// ============================================================================

const TOKEN = '8696660217:AAEBI6iOD-OAZpWbCIGy2KU-s-Fc5OQwwVE';
const ADMIN_ID_USERNAME = '@R3EUO';
const ADMIN_NUMERIC_ID = 8942987641; 
const DB_FILE = path.join(__dirname, 'database.json');

/**
 * Fixed USD Price for single Telegram Star unit.
 */
const STAR_USD = 0.015;

/**
 * Fallback prices
 */
const FALLBACK_USDT_TOMAN = 227000; 
const FALLBACK_GRAM_TOMAN = 314210; 

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

    static apiTrace(service, data) {
        const timestamp = new Date().toISOString();
        console.log(`[API] [${timestamp}] [${service}] - ${data}`);
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

const bot = new TelegramBot(TOKEN, { 
    polling: { 
        interval: 10, 
        autoStart: true,
        params: { timeout: 30 }
    }, 
    filepath: false 
});

process.on('uncaughtException', (err) => { 
    SystemLogger.error('Process', 'Uncaught Exception', err);
});
process.on('unhandledRejection', (reason, promise) => { 
    SystemLogger.error('Process', `Unhandled Rejection at: ${promise}`, new Error(String(reason)));
});

// ============================================================================
// DATABASE ARCHITECTURE & MANAGEMENT
// ============================================================================

let db = { 
    users: {}, 
    orders: {}, 
    discountCodes: {},
    secondaryAdmin: null
};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(data);
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
SystemLogger.info('System', 'Stars Plus Bot is running!');

// ============================================================================
// USER STATE MACHINE & DATA MANAGEMENT
// ============================================================================

function getUserDataById(userId) {
    if (!db.users[userId]) {
        db.users[userId] = {
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
            giftCount: 1,
            recipientUsername: '',
            isHided: false,
            commentText: 'تنظیم نشده',
            lastInvoiceMessageId: null,
            
            gramAmount: 0,
            gramPricePerUnit: 0,
            gramWalletAddress: '',
            gramMemo: 'ندارد',
            
            waitingForAdminUserSearch: false,
            waitingForAdminAmount: false,
            waitingForRejectReason: false,
            waitingForOrderRejectReason: false,
            waitingForReceiptRejectReason: false,
            rejectOrderCode: null,
            adminAction: null,
            targetUserId: null,
            rejectTargetId: null,
            adminReplyingTo: null,
            
            tempDiscount: { percent: 0, capacity: 0, expiryHour: 0, restriction: null },
            waitingForDiscountPercent: false,
            waitingForDiscountCapacity: false,
            waitingForDiscountExpiry: false,
            waitingForDiscountRestriction: false
        };
        saveDatabase();
    }
    return db.users[userId];
}

function getUserData(msg) {
    if (!msg.from) return getUserDataById(msg.chat.id);
    const user = msg.from;
    const chatId = user.id;
    const userData = getUserDataById(chatId);
    
    if (user.first_name && userData.firstName === 'کاربر') {
        userData.firstName = user.first_name;
        saveDatabase();
    }
    return userData;
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
        if (typeof photo === 'string' && fs.existsSync(photo)) {
            photoData = fs.createReadStream(photo);
        }
        return await bot.sendPhoto(chatId, photoData, finalOptions);
    } catch (err) {
        SystemLogger.error('TelegramAPI', `Failed to send photo to ${chatId}. Falling back to text.`, err);
        if (options.caption) {
            return await safeSendMessage(chatId, options.caption, { reply_markup: options.reply_markup });
        }
    }
}

async function notifyAdmins(text, options = {}) {
    await safeSendMessage(ADMIN_NUMERIC_ID, text, options);
    if (db.secondaryAdmin && db.secondaryAdmin.toString() !== ADMIN_NUMERIC_ID.toString()) {
        await safeSendMessage(db.secondaryAdmin, text, options);
    }
}

async function notifyAdminsPhoto(photoId, options = {}) {
    try {
        await bot.sendPhoto(ADMIN_NUMERIC_ID, photoId, options);
        if (db.secondaryAdmin && db.secondaryAdmin.toString() !== ADMIN_NUMERIC_ID.toString()) {
            await bot.sendPhoto(db.secondaryAdmin, photoId, options);
        }
    } catch (e) {
        SystemLogger.error('API', 'Failed to send photo to admins', e);
    }
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

// ============================================================================
// FINANCIAL API INTEGRATIONS (NOBITEX USDT & GRAM)
// ============================================================================

async function getNobitexUSDTPrice() {
    return new Promise((resolve) => {
        https.get('https://api.nobitex.ir/market/stats', { headers: { 'User-Agent': 'Mozilla/5.0 StarsPlusBot' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.stats) {
                        const statKey = Object.keys(parsed.stats).find(k => k.toLowerCase().startsWith('usdt'));
                        if (statKey && parsed.stats[statKey]) {
                            const latestPrice = parseFloat(parsed.stats[statKey].latest || parsed.stats[statKey].lastPrice);
                            if (!isNaN(latestPrice)) {
                                resolve(latestPrice);
                                return;
                            }
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

async function getNobitexGramBasePrice() {
    return new Promise((resolve) => {
        https.get('https://api.nobitex.ir/market/stats', { headers: { 'User-Agent': 'Mozilla/5.0 StarsPlusBot' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed.stats) {
                        const statKey = Object.keys(parsed.stats).find(k => k.startsWith('gram'));
                        if (statKey && parsed.stats[statKey]) {
                            const latestPrice = parseFloat(parsed.stats[statKey].latest || parsed.stats[statKey].lastPrice);
                            if (!isNaN(latestPrice)) {
                                resolve(latestPrice);
                                return;
                            }
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
    const usdtToman = await getNobitexUSDTPrice();
    const starUnitBase = STAR_USD * usdtToman; 
    return Math.round(starUnitBase * 1.10); // ۱۰ درصد افزایش قیمت روی فاکتور
}

async function fetchGramData() {
    const rawNobitexBase = await getNobitexGramBasePrice();
    const finalPrice = Math.round(rawNobitexBase + 30000);
    return { gramUsd: (rawNobitexBase / 230000).toFixed(2), finalPrice, usdtToman: rawNobitexBase };
}

// ============================================================================
// KEYBOARD GENERATOR FACTORIES 
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
                [{ text: '⭐️ استارز' }, { text: '💎 پرمیوم' }],
                [{ text: '💠 خرید ارز گرام ( GRAM )' }],
                [{ text: '🎁 گیفت استارزی' }, { text: '✨ بوست تلگرام' }],
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

// ============================================================================
// ISOLATED INVOICE GENERATION MODULES
// ============================================================================

async function showStarInvoice(chatId, userData) {
    const unitPrice = userData.starPricePerUnit || await fetchStarsPrice(); 
    let totalPrice = unitPrice * userData.starCount;

    let discountVal = 0;
    if (userData.appliedDiscountPercent > 0) {
        const codeObj = db.discountCodes[userData.appliedDiscountCode];
        if (!codeObj || codeObj.restriction === 'stars' || codeObj.restriction === null) {
            discountVal = Math.round(totalPrice * (userData.appliedDiscountPercent / 100));
        }
    }
    
    const availableDiscountWallet = userData.discountWallet || 1766;
    const finalAmount = Math.max(0, totalPrice - discountVal);
    userData.lastAmount = finalAmount;
    saveDatabase();

    const invoiceMsg = 
        `<b>فاکتور خرید استارز</b>\n\n` +
        `💫 مقدار خرید: ${userData.starCount}\n` +
        `👤 یوزر دریافت‌کننده: @${escapeHTML(userData.starRecipient)}\n\n` +
        `💰 مبلغ فاکتور: ${totalPrice.toLocaleString()} تومان\n` +
        `🎁 کل موجودی تخفیف: ${availableDiscountWallet.toLocaleString()} تومان\n\n` +
        `🩵 مبلغ نهایی: <b>${finalAmount.toLocaleString()} تومان</b>\n\n` +
        `💼 در صورتی که جزئیات بالا مورد تأیید شماست ✓ روی دکمه تأیید کلیک کنید.`;

    const invoiceKeyboard = {
        reply_markup: {
            keyboard: [
                [{ text: 'تأیید ✅' }, { text: 'لغو خرید ❌' }],
                [{ text: 'اعمال تخفیف 🎁' }, { text: 'اعمال کد تخفیف 🎫' }],
                [{ text: '🔙 بازگشت به پکیج‌ها' }, { text: '🏠 منوی اصلی' }]
            ],
            resize_keyboard: true
        }
    };

    await safeDeleteMessage(chatId, userData.lastInvoiceMessageId);
    const sent = await safeSendPhoto(chatId, '1000002626.jpg', { caption: invoiceMsg, reply_markup: invoiceKeyboard.reply_markup });
    if (sent && sent.message_id) {
        userData.lastInvoiceMessageId = sent.message_id;
        saveDatabase();
    }
}

async function showGiftInvoice(chatId, userData) {
    const usdtToman = await getNobitexUSDTPrice();
    const starziUsdPrice = userData.selectedGiftStars * STAR_USD;
    const baseGiftToman = starziUsdPrice * usdtToman;
    const starziTomanPerUnit = Math.round(baseGiftToman * 1.10); // ۱۰ درصد افزایش قیمت
    const totalPrice = Math.round(starziTomanPerUnit * userData.giftCount);
    
    let discountVal = 0;
    if (userData.appliedDiscountPercent > 0) {
        const codeObj = db.discountCodes[userData.appliedDiscountCode];
        if (!codeObj || codeObj.restriction === 'gift_stars' || codeObj.restriction === null) {
            discountVal = Math.round(totalPrice * (userData.appliedDiscountPercent / 100));
        }
    }
    const currentAmount = Math.max(0, totalPrice - discountVal);
    userData.lastAmount = currentAmount;
    saveDatabase();

    const invoiceMsg = 
        `<b>فاکتور خرید گیفت</b>\n\n` +
        `مقدار خرید: ${escapeHTML(userData.selectedGiftName)} (${userData.selectedGiftStars} استارز)\n` +
        `تعداد: ${userData.giftCount}\n` +
        `یوزر دریافت‌کننده: @${escapeHTML(userData.recipientUsername)}\n\n` +
        `گیفت هاید: ${userData.isHided ? 'بله' : 'خیر'}\n` +
        `کامنت: ${escapeHTML(userData.commentText)}\n\n` +
        `مبلغ نهایی: <b>${currentAmount.toLocaleString()} تومان</b>\n\n` +
        `در صورتی که جزئیات بالا مورد تأیید شماست ، روی دکمه تایید کلیک کنید.`;

    const invoiceKeyboard = {
        reply_markup: {
            keyboard: [
                [{ text: '✅ تایید' }, { text: 'لغو خرید ❌' }],
                [{ text: '💳 اعمال کد تخفیف' }],
                [{ text: '💬 تنظیم کامنت' }, { text: userData.isHided ? '🔓 لغو هاید' : '🔒 هاید گیفت' }],
                [{ text: 'برگشت ↩️' }]
            ],
            resize_keyboard: true
        }
    };

    await safeDeleteMessage(chatId, userData.lastInvoiceMessageId);
    const sent = await safeSendMessage(chatId, invoiceMsg, invoiceKeyboard);
    if (sent && sent.message_id) {
        userData.lastInvoiceMessageId = sent.message_id;
        saveDatabase();
    }
}

async function showGramInvoice(chatId, userData) {
    const totalPrice = Math.round(userData.gramAmount * userData.gramPricePerUnit);
    userData.lastAmount = totalPrice;
    saveDatabase();

    const invoiceMsg = 
        `<b>[ فاکتور خرید ارز گرام ( GRAM ) ]</b>\n\n` +
        `مقدار خرید: ${userData.gramAmount} گرام\n` +
        `آدرس ولت: <code>${escapeHTML(userData.gramWalletAddress)}</code>\n` +
        `کامنت (مم): ${escapeHTML(userData.gramMemo)}\n\n` +
        `مبلغ نهایی: <b>${totalPrice.toLocaleString()} تومان</b>\n\n` +
        `در صورتی که جزئیات بالا مورد تأیید شماست ، روی دکمه تایید کلیک کنید.`;

    const invoiceKeyboard = {
        reply_markup: {
            keyboard: [
                [{ text: '✅ تایید گرام' }, { text: 'لغو خرید ❌' }],
                [{ text: '💳 اعمال کد تخفیف' }],
                [{ text: 'برگشت ↩️' }]
            ],
            resize_keyboard: true
        }
    };

    await safeDeleteMessage(chatId, userData.lastInvoiceMessageId);
    const sent = await safeSendMessage(chatId, invoiceMsg, invoiceKeyboard);
    if (sent && sent.message_id) {
        userData.lastInvoiceMessageId = sent.message_id;
        saveDatabase();
    }
}

// ============================================================================
// CORE MESSAGE EVENT DISPATCHER 
// ============================================================================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const contact = msg.contact;
    const photo = msg.photo;
    
    if (msg.message_id) {
        await setReaction(chatId, msg.message_id);
    }

    const adminData = getUserDataById(chatId);
    const isAdmin = (chatId.toString() === ADMIN_NUMERIC_ID.toString() || (db.secondaryAdmin && chatId.toString() === db.secondaryAdmin.toString()));
    const userData = getUserData(msg);

    if (userData.isBanned) {
        await safeSendMessage(chatId, 'حساب کاربری شما توسط ادمین مسدود شده است. لطفاً با پشتیبانی در ارتباط باشید.');
        return;
    }

    const mainKeyboard = getMainKeyboard(isAdmin);
    const backKeyboard = getBackKeyboard();
    const accountKeyboard = getAccountKeyboard();

    if (text === 'لغو خرید ❌' || text === '❌ لغو خرید') {
        userData.currentShopState = null;
        userData.lastInvoiceMessageId = null;
        saveDatabase();
        await safeSendMessage(chatId, 'خرید شما لغو شد.', mainKeyboard);
        return;
    }

    const backCommands = [
        '🔙 بازگشت', 'برگشت ↩️', '🔙 برگشت', '🏠 منوی اصلی', 
        'انصراف', '↶ برگشت', '🔙 بازگشت به منوی اصلی', '🔙 بازگشت به پکیج‌ها'
    ];
    
    if (text && backCommands.includes(text)) {
        userData.waitingForAmount = false;
        userData.waitingForTicket = false;
        userData.waitingForReceipt = false;
        userData.waitingForDiscountInput = false;
        userData.waitingForRecipient = false;
        userData.waitingForComment = false;
        userData.waitingForTrackingInput = false;
        
        userData.waitingForGramAmount = false;
        userData.waitingForGramWallet = false;
        userData.waitingForGramMemoChoice = false;
        userData.waitingForGramMemoInput = false;
        
        userData.waitingForStarCount = false;
        userData.waitingForStarRecipient = false;
        userData.lastInvoiceMessageId = null;
        
        if (isAdmin) { 
            adminData.adminAction = null; 
            adminData.waitingForAdminUserSearch = false; 
            adminData.waitingForAdminAmount = false; 
            adminData.waitingForRejectReason = false; 
            adminData.waitingForOrderRejectReason = false;
            adminData.waitingForReceiptRejectReason = false;
            adminData.waitingForDiscountPercent = false;
            adminData.waitingForDiscountCapacity = false;
            adminData.waitingForDiscountExpiry = false;
            adminData.waitingForDiscountRestriction = false;
        }
        
        saveDatabase();

        if (text === '🏠 منوی اصلی' || text === '🔙 بازگشت به منوی اصلی' || !userData.currentShopState || userData.currentShopState === 'main_shop') {
            userData.currentShopState = null;
            saveDatabase();
            await safeSendMessage(chatId, 'به منوی اصلی برگشتید.', mainKeyboard);
            return;
        }

        if (text === '🔙 بازگشت به پکیج‌ها' || userData.currentShopState === 'star_recipient' || userData.currentShopState === 'star_invoice' || userData.currentShopState === 'star_menu') {
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
                        [{ text: 'برگشت ↩️' }]
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

    if (isAdmin && adminData.waitingForOrderRejectReason && text) {
        const orderCode = adminData.rejectOrderCode;
        const reason = escapeHTML(text);
        adminData.waitingForOrderRejectReason = false;
        adminData.rejectOrderCode = null;
        saveDatabase();

        const order = db.orders[orderCode];
        if (order) {
            order.status = 'rejected';
            saveDatabase();
            await safeSendMessage(order.userId, `سفارش شما با کد پیگیری <code>${orderCode}</code> توسط مدیریت رد شد.\n\nدلیل: ${reason}`);
            await safeSendMessage(chatId, `دلیل رد سفارش برای کاربر ارسال شد.`);
        }
        return;
    }

    if (isAdmin && adminData.waitingForReceiptRejectReason && text) {
        const targetUserId = adminData.rejectTargetId;
        const reason = escapeHTML(text);
        adminData.waitingForReceiptRejectReason = false;
        adminData.rejectTargetId = null;
        saveDatabase();

        await safeSendMessage(targetUserId, `رسید پرداخت شما توسط مدیریت رد شد.\n\nدلیل: ${reason}`);
        await safeSendMessage(chatId, `دلیل رد رسید برای کاربر ارسال شد.`);
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
            adminData.waitingForDiscountRestriction = false;
            if (text === '⭐ محدودیت برای استارز') adminData.tempDiscount.restriction = 'stars';
            else if (text === '💠 محدودیت برای گرام') adminData.tempDiscount.restriction = 'gram';
            else if (text === '🎁 محدودیت برای گیفت‌ها') adminData.tempDiscount.restriction = 'gift_stars';
            else adminData.tempDiscount.restriction = null;

            const code = 'PLUS-' + Math.floor(1000 + Math.random() * 9000);
            db.discountCodes[code] = {
                percent: adminData.tempDiscount.percent,
                capacity: adminData.tempDiscount.capacity,
                usedCount: 0,
                expiryHour: adminData.tempDiscount.expiryHour,
                restriction: adminData.tempDiscount.restriction
            };
            saveDatabase();

            const adminPanelMarkup = {
                reply_markup: {
                    keyboard: [
                        [{ text: '➕ افزایش موجودی کاربر' }, { text: '➖ کاهش موجودی کاربر' }],
                        [{ text: '🏆 تغییر سطح کاربر' }, { text: '💳 تایید احراز هویت کاربر' }],
                        [{ text: '🚫 بن کردن کاربر' }, { text: '✅ آنبن کردن کاربر' }],
                        [{ text: '🏷️ ساخت کد تخفیف' }, { text: '👑 تنظیم مالک دوم' }],
                        [{ text: '🔙 بازگشت به منوی اصلی' }]
                    ], 
                    resize_keyboard: true
                }
            };

            await safeSendMessage(chatId, 
                `<b>کد تخفیف ساخته شد</b>\n\n` +
                `کد: <code>${code}</code>\n` +
                `درصد: ${adminData.tempDiscount.percent}%\n` +
                `محدودیت: ${adminData.tempDiscount.restriction || 'بدون محدودیت'}`, 
                adminPanelMarkup
            );
            return;
        }
    }

    if (isAdmin && adminData.adminReplyingTo) {
        const targetUserToReply = adminData.adminReplyingTo;
        adminData.adminReplyingTo = null;
        if (text !== '🔙 بازگشت به منوی اصلی' && text !== '🔧 پنل مدیریت') {
            await safeSendMessage(targetUserToReply, `پاسخ پشتیبانی از طرف مدیریت:\n\n${escapeHTML(text)}`);
            await safeSendMessage(chatId, `پاسخ شما با موفقیت ارسال شد.`);
            return;
        }
    }

    if (isAdmin && adminData.adminAction && (text !== '🔧 پنل مدیریت' && text !== '/admin')) {
        if (adminData.waitingForAdminUserSearch && text) {
            const targetId = text.trim();
            adminData.waitingForAdminUserSearch = false;
            adminData.targetUserId = targetId;
            saveDatabase();
            const targetUser = getUserDataById(targetId);

            if (adminData.adminAction === '🚫 بن کردن کاربر') {
                targetUser.isBanned = true;
                saveDatabase();
                await safeSendMessage(chatId, `کاربر <code>${targetId}</code> بن شد.`);
                adminData.adminAction = null;
                adminData.targetUserId = null;
                return;
            } else if (adminData.adminAction === '✅ آنبن کردن کاربر') {
                targetUser.isBanned = false;
                saveDatabase();
                await safeSendMessage(chatId, `کاربر <code>${targetId}</code> آنبن شد.`);
                adminData.adminAction = null;
                adminData.targetUserId = null;
                return;
            } else if (adminData.adminAction === '💳 تایید احراز هویت کاربر') {
                targetUser.cardVerified = true;
                targetUser.level = 'سطح 2';
                saveDatabase();
                await safeSendMessage(chatId, `احراز هویت <code>${targetId}</code> تایید شد.`);
                adminData.adminAction = null;
                adminData.targetUserId = null;
                return;
            } else if (adminData.adminAction === '👑 تنظیم مالک دوم') {
                db.secondaryAdmin = targetId;
                saveDatabase();
                await safeSendMessage(chatId, `کاربر <code>${targetId}</code> به عنوان مالک دوم با موفقیت ثبت شد.`);
                adminData.adminAction = null;
                adminData.targetUserId = null;
                return;
            }

            adminData.waitingForAdminAmount = true;
            saveDatabase();
            if (adminData.adminAction === '➕ افزایش موجودی کاربر') await safeSendMessage(chatId, `مبلغ افزایشی (تومان):`);
            else if (adminData.adminAction === '➖ کاهش موجودی کاربر') await safeSendMessage(chatId, `مبلغ کاهشی (تومان):`);
            else if (adminData.adminAction === '🏆 تغییر سطح کاربر') await safeSendMessage(chatId, `نام سطح جدید:`);
            return;
        }

        if (adminData.waitingForAdminAmount && adminData.targetUserId && text) {
            const targetId = adminData.targetUserId;
            const targetUser = getUserDataById(targetId);
            const action = adminData.adminAction;

            if (action === '➕ افزایش موجودی کاربر') {
                const amount = parseInt(text);
                if (!isNaN(amount)) {
                    targetUser.wallet += amount;
                    saveDatabase();
                    await safeSendMessage(chatId, `${amount.toLocaleString()} تومان افزوده شد.`);
                    await safeSendMessage(targetId, `مبلغ ${amount.toLocaleString()} تومان واریز شد.`);
                }
            } else if (action === '➖ کاهش موجودی کاربر') {
                const amount = parseInt(text);
                if (!isNaN(amount)) {
                    targetUser.wallet = Math.max(0, targetUser.wallet - amount);
                    saveDatabase();
                    await safeSendMessage(chatId, `${amount.toLocaleString()} تومان کسر شد.`);
                }
            } else if (action === '🏆 تغییر سطح کاربر') {
                targetUser.level = escapeHTML(text.trim());
                saveDatabase();
                await safeSendMessage(chatId, `سطح به "${targetUser.level}" تغییر یافت.`);
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
            `🔗 انتخاب اکانت دریافت‌کننده\n\n` +
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
            const balanceGram = (userData.wallet / userData.gramPricePerUnit).toFixed(2);
            await safeSendMessage(chatId, `موجودی شما: ${userData.wallet.toLocaleString()} تومان\nمعادل ${balanceGram} گرام.\nلطفاً تعداد گرام را وارد کنید:`, backKeyboard);
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
        // تشخیص دقیق ولت معتبر گرام/تون (شروع با UQ یا EQ یا 0:)
        const isValidTonWallet = /^(UQ|EQ)[a-zA-Z0-9\-_]{46}$/.test(walletInput) || /^0:[a-fA-F0-9]{64}$/.test(walletInput) || (walletInput.length >= 40 && (walletInput.startsWith('UQ') || walletInput.startsWith('EQ') || walletInput.startsWith('0:')));

        if (!isValidTonWallet) {
            await safeSendMessage(chatId, '❌ آدرس ولت وارد شده معتبر نیست. لطفاً فقط آدرس ولت معتبر شبکه گرام (TON) که با UQ یا EQ شروع می‌شود را ارسال کنید:', backKeyboard);
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

        if (!order) {
            await safeSendMessage(chatId, 'سفارشی با این کد پیگیری یافت نشد.', backKeyboard);
            return;
        }

        let statusStr = 'در حال بررسی توسط مدیریت';
        if (order.status === 'completed') statusStr = 'انجام شده و تکمیل شده';
        if (order.status === 'rejected') statusStr = 'رد شده توسط مدیریت';

        const trackResultMsg = `<b>[ نتیجه پیگیری سفارش ]</b>\n\nکد: <code>${escapeHTML(trackingCode)}</code>\nمحصول: ${escapeHTML(order.giftName)}\nمبلغ: ${order.amount.toLocaleString()} تومان\nوضعیت: ${statusStr}`;
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

    if (userData.waitingForDiscountInput && text) {
        userData.waitingForDiscountInput = false;
        saveDatabase();
        const codeInput = text.trim();
        const discountObj = db.discountCodes[codeInput];

        if (!discountObj) {
            await safeSendMessage(chatId, 'کد تخفیف وارد شده نامعتبر است.', backKeyboard);
            return;
        }

        userData.appliedDiscountCode = codeInput;
        userData.appliedDiscountPercent = discountObj.percent;
        saveDatabase();

        await safeSendMessage(chatId, `کد تخفیف ${discountObj.percent}% اعمال شد!`, backKeyboard);
        
        if (userData.currentShopState === 'gift_invoice') await showGiftInvoice(chatId, userData);
        else if (userData.currentShopState === 'star_invoice') await showStarInvoice(chatId, userData);
        else if (userData.currentShopState === 'gram_invoice') await showGramInvoice(chatId, userData);
        return;
    }

    if (text === 'محاسبه با موجودی من 🔄' && userData.currentShopState === 'star_menu') {
        const maxStars = Math.floor(userData.wallet / (userData.starPricePerUnit || await fetchStarsPrice()));
        await safeSendMessage(chatId, `موجودی شما: ${userData.wallet.toLocaleString()} تومان\nحداکثر ${maxStars} استارز می‌توانید بخرید.`, backKeyboard);
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

    if (text === 'تأیید ✅' && userData.currentShopState === 'star_invoice') {
        if (userData.wallet < userData.lastAmount) {
            const shortage = userData.lastAmount - userData.wallet;
            const shortageKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `➕ افزایش موجودی (${shortage.toLocaleString()} تومان)`, callback_data: `add_balance_${shortage}` }]
                    ]
                }
            };
            await safeSendMessage(chatId, `❌ موجودی حساب شما کافی نیست!\n\n💳 مبلغ کسری: ${shortage.toLocaleString()} تومان\nبرای ثبت نهایی سفارش لطفا حساب خود را شارژ کنید.`, shortageKeyboard);
            return;
        }

        userData.wallet -= userData.lastAmount;
        const trackingCode = 'STR-' + Math.floor(10000 + Math.random() * 90000);
        const now = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });

        db.orders[trackingCode] = {
            userId: chatId,
            firstName: userData.firstName,
            giftName: `استارز تلگرام (${userData.starCount} عدد)`,
            count: userData.starCount,
            recipient: userData.starRecipient,
            isHided: false,
            comment: 'ندارد',
            amount: userData.lastAmount,
            time: now,
            status: 'pending'
        };
        userData.lastInvoiceMessageId = null;
        saveDatabase();

        const userConfirmMsg = `سفارش ثبت شد و مبلغ از حساب شما کسر گردید.\n\nکد پیگیری: <code>${trackingCode}</code>\nمقدار: ${userData.starCount} استارز\nمبلغ: ${userData.lastAmount.toLocaleString()} تومان`;
        await safeSendMessage(chatId, userConfirmMsg, mainKeyboard);

        const adminOrderMsg = 
            `<b>[ سفارش جدید استارز ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}\n` +
            `🆔 آیدی عددی: <code>${chatId}</code>\n` +
            `🏷️ کد پیگیری: <code>${trackingCode}</code>\n` +
            `💫 تعداد استارز: ${userData.starCount}\n` +
            `📥 دریافت‌کننده: @${escapeHTML(userData.starRecipient)}\n` +
            `💰 مبلغ کل: ${userData.lastAmount.toLocaleString()} تومان\n` +
            `⏰ زمان ثبت: ${now}`;

        const adminOrderMarkup = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ انجام شد', callback_data: `order_done_${trackingCode}` }, { text: '❌ رد شد', callback_data: `order_reject_${trackingCode}` }]
                ]
            }
        };

        await notifyAdmins(adminOrderMsg, adminOrderMarkup);
        userData.currentShopState = null;
        saveDatabase();
        return;
    }

    if (text === '✅ تایید' && userData.currentShopState === 'gift_invoice') {
        if (userData.wallet < userData.lastAmount) {
            const shortage = userData.lastAmount - userData.wallet;
            const shortageKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `➕ افزایش موجودی (${shortage.toLocaleString()} تومان)`, callback_data: `add_balance_${shortage}` }]
                    ]
                }
            };
            await safeSendMessage(chatId, `❌ موجودی حساب شما کافی نیست!\n\n💳 مبلغ کسری: ${shortage.toLocaleString()} تومان\nبرای ثبت نهایی سفارش لطفا حساب خود را شارژ کنید.`, shortageKeyboard);
            return;
        }

        userData.wallet -= userData.lastAmount;
        const trackingCode = 'STZ-' + Math.floor(10000 + Math.random() * 90000);
        const now = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });

        db.orders[trackingCode] = {
            userId: chatId,
            firstName: userData.firstName,
            giftName: userData.selectedGiftName,
            count: userData.giftCount,
            recipient: userData.recipientUsername,
            isHided: userData.isHided,
            comment: userData.commentText,
            amount: userData.lastAmount,
            time: now,
            status: 'pending'
        };
        userData.lastInvoiceMessageId = null;
        saveDatabase();

        const userConfirmMsg = `سفارش گیفت ثبت شد و مبلغ کسر گردید.\n\nکد پیگیری: <code>${trackingCode}</code>\nمبلغ: ${userData.lastAmount.toLocaleString()} تومان`;
        await safeSendMessage(chatId, userConfirmMsg, mainKeyboard);

        const adminOrderMsg = 
            `<b>[ سفارش جدید گیفت استارزی ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}\n` +
            `🆔 آیدی عددی: <code>${chatId}</code>\n` +
            `🏷️ کد پیگیری: <code>${trackingCode}</code>\n` +
            `🎁 نام گیفت: ${escapeHTML(userData.selectedGiftName)} (${userData.selectedGiftStars} استارز)\n` +
            `🔢 تعداد: ${userData.giftCount}\n` +
            `📥 دریافت‌کننده: @${escapeHTML(userData.recipientUsername)}\n` +
            `🔒 هاید: ${userData.isHided ? 'بله' : 'خیر'}\n` +
            `💬 کامنت: ${escapeHTML(userData.commentText)}\n` +
            `💰 مبلغ کل: ${userData.lastAmount.toLocaleString()} تومان\n` +
            `⏰ زمان ثبت: ${now}`;

        const adminOrderMarkup = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ انجام شد', callback_data: `order_done_${trackingCode}` }, { text: '❌ رد شد', callback_data: `order_reject_${trackingCode}` }]
                ]
            }
        };

        await notifyAdmins(adminOrderMsg, adminOrderMarkup);
        userData.currentShopState = null;
        saveDatabase();
        return;
    }

    if (text === '✅ تایید گرام' && userData.currentShopState === 'gram_invoice') {
        if (userData.wallet < userData.lastAmount) {
            const shortage = userData.lastAmount - userData.wallet;
            const shortageKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `➕ افزایش موجودی (${shortage.toLocaleString()} تومان)`, callback_data: `add_balance_${shortage}` }]
                    ]
                }
            };
            await safeSendMessage(chatId, `❌ موجودی حساب شما کافی نیست!\n\n💳 مبلغ کسری: ${shortage.toLocaleString()} تومان\nبرای ثبت نهایی سفارش لطفا حساب خود را شارژ کنید.`, shortageKeyboard);
            return;
        }

        userData.wallet -= userData.lastAmount;
        const trackingCode = 'GRAM-' + Math.floor(10000 + Math.random() * 90000);
        const now = new Date().toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' });

        db.orders[trackingCode] = {
            userId: chatId,
            firstName: userData.firstName,
            giftName: `ارز گرام (${userData.gramAmount} GRAM)`,
            count: userData.gramAmount,
            recipient: userData.gramWalletAddress,
            isHided: false,
            comment: userData.gramMemo,
            amount: userData.lastAmount,
            time: now,
            status: 'pending'
        };
        userData.lastInvoiceMessageId = null;
        saveDatabase();

        const userConfirmMsg = `سفارش گرام ثبت شد و مبلغ کسر گردید.\n\nکد پیگیری: <code>${trackingCode}</code>`;
        await safeSendMessage(chatId, userConfirmMsg, mainKeyboard);

        const adminOrderMsg = 
            `<b>[ سفارش جدید ارز گرام ]</b>\n\n` +
            `👤 نام کاربر: ${escapeHTML(userData.firstName)}\n` +
            `🆔 آیدی عددی: <code>${chatId}</code>\n` +
            `🏷️ کد پیگیری: <code>${trackingCode}</code>\n` +
            `💠 مقدار گرام: ${userData.gramAmount}\n` +
            `📫 آدرس ولت: <code>${escapeHTML(userData.gramWalletAddress)}</code>\n` +
            `💬 ممو / کامنت: ${escapeHTML(userData.gramMemo)}\n` +
            `💰 مبلغ کل: ${userData.lastAmount.toLocaleString()} تومان\n` +
            `⏰ زمان ثبت: ${now}`;

        const adminOrderMarkup = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ انجام شد', callback_data: `order_done_${trackingCode}` }, { text: '❌ رد شد', callback_data: `order_reject_${trackingCode}` }]
                ]
            }
        };

        await notifyAdmins(adminOrderMsg, adminOrderMarkup);
        userData.currentShopState = null;
        saveDatabase();
        return;
    }

    if (photo && userData.waitingForReceipt) {
        const photoId = photo[photo.length - 1].file_id;
        userData.waitingForReceipt = false;
        saveDatabase();
        
        const amount = userData.lastAmount;
        const adminCaption = `<b>[ رسید پرداخت جدید ]</b>\n\nکاربر: ${escapeHTML(userData.firstName)}\nآیدی: <code>${chatId}</code>\nمبلغ: ${amount.toLocaleString()} تومان`;
        const adminMarkup = {
            inline_keyboard: [
                [{ text: '✅ تایید', callback_data: `approve_receipt_${chatId}_${amount}` }, { text: '❌ رد', callback_data: `reject_receipt_${chatId}` }]
            ]
        };

        await notifyAdminsPhoto(photoId, { caption: adminCaption, parse_mode: 'HTML', reply_markup: adminMarkup });

        const userMarkup = {
            inline_keyboard: [[{ text: '💬 پیگیری رسید', callback_data: 'track_receipt_main' }]]
        };
        
        await safeSendMessage(chatId, `✅ رسید شما دریافت شد و در صف بررسی است.`, { reply_markup: userMarkup });
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
        
        const adminTicketMsg = `تیکت جدید:\nنام: ${escapeHTML(userData.firstName)}\nمتن:\n${escapeHTML(text)}`;
        const replyMarkup = { 
            reply_markup: { 
                inline_keyboard: [[{ text: '💬 پاسخ به کاربر', callback_data: `reply_${chatId}` }]] 
            } 
        };
        await notifyAdmins(adminTicketMsg, replyMarkup);
        return;
    }

    if (text && text.startsWith('/start')) {
        userData.currentShopState = null;
        userData.lastInvoiceMessageId = null;
        saveDatabase();
        const welcomeText = `به ربات استارز پلاس خوش آمدید ! 🌟\nمجموعه‌ای کامل برای خدمات تلگرامی شما.`;
        await safeSendPhoto(chatId, '1000002624.jpg', { caption: welcomeText, reply_markup: mainKeyboard.reply_markup });
        return;
    } 

    if (text === '🔧 پنل مدیریت' && isAdmin) {
        const adminPanelMarkup = {
            reply_markup: {
                keyboard: [
                    [{ text: '➕ افزایش موجودی کاربر' }, { text: '➖ کاهش موجودی کاربر' }],
                    [{ text: '🏆 تغییر سطح کاربر' }, { text: '💳 تایید احراز هویت کاربر' }],
                    [{ text: '🚫 بن کردن کاربر' }, { text: '✅ آنبن کردن کاربر' }],
                    [{ text: '🏷️ ساخت کد تخفیف' }, { text: '👑 تنظیم مالک دوم' }],
                    reply_markup: {
    inline_keyboard: [
        [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'main_menu' }]
    ]
}

                ], resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, 'پنل مدیریت:', adminPanelMarkup);
    }
    else if (isAdmin && ['➕ افزایش موجودی کاربر', '➖ کاهش موجودی کاربر', '🏆 تغییر سطح کاربر', '💳 تایید احراز هویت کاربر', '🚫 بن کردن کاربر', '✅ آنبن کردن کاربر', '👑 تنظیم مالک دوم'].includes(text)) {
        adminData.adminAction = text;
        adminData.waitingForAdminUserSearch = true;
        saveDatabase();
        await safeSendMessage(chatId, `آیدی عددی کاربر مورد نظر را وارد کنید:`);
    }
    else if (isAdmin && text === '🏷️ ساخت کد تخفیف') {
        adminData.waitingForDiscountPercent = true;
        saveDatabase();
        await safeSendMessage(chatId, 'درصد تخفیف (عدد بین 1 تا 100):');
    }
    else if (text === '🛒 خرید محصول') {
        userData.currentShopState = 'main_shop';
        saveDatabase();
        await safeSendMessage(chatId, 'وقته محصول رو انتخاب کنی !\n\n🚀 سفارشات با بالاترین سرعت انجام میشن !', getShopKeyboard());
    }
    else if (text === '⭐️ استارز' || text === '⭐ استارز تلگرام (Telegram Stars)') {
        userData.currentShopState = 'star_menu';
        userData.waitingForStarCount = true;
        const starsPrice = await fetchStarsPrice();
        userData.starPricePerUnit = starsPrice;
        saveDatabase();

        const starMsg = 
            `💥 وقت درخشیدن با استارز تلگرامه !\n\n` +
            `🎯 کاربردهای استارز :\n` +
            `✨ فعال‌سازی ری‌اکشن‌ها\n` +
            `🎯 خرید یا تمدید اکانت پرمیوم\n\n` +
            `🪐 لطفاً تعداد استارز مورد نظر خود را ارسال کنید:`;

        const starMenuKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: 'محاسبه با موجودی من 🔄' }],
                    [{ text: 'برگشت ↩️' ]]
                ],
                resize_keyboard: true
            }
        };
        await safeSendPhoto(chatId, '1000002624.jpg', { caption: starMsg, reply_markup: starMenuKeyboard.reply_markup });
    }
    else if (text === '💠 خرید ارز گرام ( GRAM )') {
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
        const giftCategoryKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '🧸 گیفت های عادی' }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, 'دسته‌بندی گیفت مورد نظر را انتخاب کنید:', giftCategoryKeyboard);
    }
    else if (text === '🧸 گیفت های عادی') {
        userData.currentShopState = 'gift_list';
        saveDatabase();
        const giftListKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '💖 گیفت قلب (15)' }, { text: '🧸 گیفت تدی (15)' }],
                    [{ text: '🎁 گیفت کادو (25)' }, { text: '🌹 گیفت گل رز (25)' }],
                    [{ text: '🎂 گیفت کیک (50)' }, { text: '🌷 گیفت گل (50)' }],
                    [{ text: '🍾 گیفت بطری (50)' }, { text: '🚀 گیفت سفینه (50)' }],
                    [{ text: '🏆 گیفت جام (100)' }, { text: '💍 گیفت حلقه (100)' }],
                    [{ text: 'برگشت ↩️' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, 'گیفت مورد نظر خود را انتخاب کنید:', giftListKeyboard);
    }
    else if (text && text.includes('گیفت')) {
        userData.selectedGiftName = text;
        if (text.includes('قلب') || text.includes('تدی')) userData.selectedGiftStars = 15;
        else if (text.includes('کادو') || text.includes('رز')) userData.selectedGiftStars = 25;
        else if (text.includes('کیک') || text.includes('گل') || text.includes('بطری') || text.includes('سفینه')) userData.selectedGiftStars = 50;
        else userData.selectedGiftStars = 100;

        userData.giftCount = 1;
        userData.currentShopState = 'gift_count';
        saveDatabase();

        const countKeyboard = {
            reply_markup: {
                keyboard: [
                    [{ text: '🔻 کم کردن' }, { text: '📊 تعداد' }, { text: '🟢 اضافه کردن' }],
                    [{ text: '➖' }, { text: `${userData.giftCount}` }, { text: '➕' }],
                    [{ text: 'برگشت ↩️' }, { text: '✅ ادامه' }]
                ],
                resize_keyboard: true
            }
        };
        await safeSendMessage(chatId, `تعداد انتخاب شده: ${userData.giftCount}`, countKeyboard);
    }
    else if (text === '🟢 اضافه کردن' || text === '➕') {
        if (userData.currentShopState === 'gift_count') {
            userData.giftCount += 1;
            saveDatabase();
            const countKeyboard = {
                reply_markup: {
                    keyboard: [
                        [{ text: '🔻 کم کردن' }, { text: '📊 تعداد' }, { text: '🟢 اضافه کردن' }],
                        [{ text: '➖' }, { text: `${userData.giftCount}` }, { text: '➕' }],
                        [{ text: 'برگشت ↩️' }, { text: '✅ ادامه' }]
                    ],
                    resize_keyboard: true
                }
            };
            await safeSendMessage(chatId, `تعداد انتخاب شده: ${userData.giftCount}`, countKeyboard);
        }
    }
    else if (text === '🔻 کم کردن' || text === '➖') {
        if (userData.currentShopState === 'gift_count' && userData.giftCount > 1) {
            userData.giftCount -= 1;
            saveDatabase();
            const countKeyboard = {
                reply_markup: {
                    keyboard: [
                        [{ text: '🔻 کم کردن' }, { text: '📊 تعداد' }, { text: '🟢 اضافه کردن' }],
                        [{ text: '➖' }, { text: `${userData.giftCount}` }, { text: '➕' }],
                        [{ text: 'برگشت ↩️' }, { text: '✅ ادامه' }]
                    ],
                    resize_keyboard: true
                }
            };
            await safeSendMessage(chatId, `تعداد انتخاب شده: ${userData.giftCount}`, countKeyboard);
        }
    }
    else if (text === '✅ ادامه') {
        if (userData.currentShopState === 'gift_count') {
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
            
            const recipientMsg = `انتخاب اکانت دریافت‌کننده گیفت\n\nبرای خودتان روی «برای خودم» کلیک کنید یا یوزرنیم مقصد را بفرستید.`;
            await safeSendMessage(chatId, recipientMsg, recipientKeyboard);
        }
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
    else if (text === '🔒 هاید گیفت' || text === '🔓 لغو هاید') {
        userData.isHided = !userData.isHided;
        saveDatabase();
        if (userData.currentShopState === 'gift_invoice') await showGiftInvoice(chatId, userData);
    }
    else if (text === '❤️ چطوری میتوانم به شما اعتماد کنم') {
        const trustMsg = `استارز پلاس با رضایت هزاران مشتری فعال در خدمت شماست.\n\nکانال اعتماد:\n@snt_shopp`;
        await safeSendMessage(chatId, trustMsg, backKeyboard);
    }
    else if (text === '📦 پیگیری سفارش') {
        userData.waitingForTrackingInput = true;
        saveDatabase();
        await safeSendMessage(chatId, `کد پیگیری سفارش خود را ارسال کنید:`, backKeyboard);
    }
    else if (text === '💳 حساب کاربری') {
        const userInfo = `<b>حساب کاربری شما</b>\n\nنام: ${escapeHTML(userData.firstName)}\nآیدی: <code>${chatId}</code>\nموجودی اصلی: ${userData.wallet.toLocaleString()} تومان`;
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
        await safeSendMessage(chatId, `مبلغی که می‌خواهید حساب را شارژ کنید وارد نمایید (تومان - فقط عدد):`, backKeyboard);
    }
    else if (userData.waitingForAmount && /^\d+$/.test(text)) {
        const enteredAmount = parseInt(text);
        userData.waitingForAmount = false;
        userData.lastAmount = enteredAmount;
        userData.waitingForReceipt = true;
        saveDatabase();
        
        const cardPaymentMsg = `مبلغ: ${userData.lastAmount.toLocaleString()} تومان\n\nبه شماره کارت زیر واریز کنید:\n<code>5555555555555555</code>\nبه نام: تست\n\nسپس عکس رسید را ارسال کنید.`;
        const paymentKeyboard = {
            reply_markup: {
                inline_keyboard: [[{ text: '🏷️ اعمال کد تخفیف', callback_data: 'apply_discount_prompt' }]],
                keyboard: [[{ text: 'برگشت ↩️' }]], 
                resize_keyboard: true 
            }
        };
        await safeSendMessage(chatId, cardPaymentMsg, paymentKeyboard);
    }
    else if (text === '📞 پشتیبانی') {
        const supportKeyboard = { 
            reply_markup: { 
                keyboard: [
                    [{ text: '👤 پشتیبانی مستقیم' }, { text: '🎫 ارسال تیکت (غیرمستقیم)' }], 
                    [{ text: '🔙 بازگشت به منوی اصلی' }]
                ], 
                resize_keyboard: true 
            } 
        };
        await safeSendMessage(chatId, `بخش پشتیبانی:`, supportKeyboard);
    }
    else if (text === '👤 پشتیبانی مستقیم') await safeSendMessage(chatId, `ارتباط با ادمین:\n${ADMIN_ID_USERNAME}`, backKeyboard);
    else if (text === '🎫 ارسال تیکت (غیرمستقیم)') {
        userData.waitingForTicket = true;
        saveDatabase();
        await safeSendMessage(chatId, `پیام خود را ارسال کنید:`, backKeyboard);
    }
    else if (text === '📦 سفارش های اخیر من' || text === 'سفارش های اخیر من 📥') {
        let userOrders = Object.entries(db.orders).filter(([code, order]) => order.userId === chatId);
        if (userOrders.length === 0) {
            await safeSendMessage(chatId, 'شما سفارشی ثبت نکرده‌اید.', backKeyboard);
        } else {
            let msgText = `<b>[ سفارش‌های اخیر شما ]</b>\n\n`;
            userOrders.slice(-5).forEach(([code, order]) => {
                msgText += `📦 کد: <code>${escapeHTML(code)}</code>\nمحصول: ${escapeHTML(order.giftName)}\nمبلغ: ${order.amount.toLocaleString()} تومان\n\n`;
            });
            await safeSendMessage(chatId, msgText, backKeyboard);
        }
    }
    else if (text === '📦 سفارش های معلق من') {
        let userOrders = Object.entries(db.orders).filter(([code, order]) => order.userId === chatId && order.status === 'pending');
        if (userOrders.length === 0) {
            await safeSendMessage(chatId, 'سفارش معلقی ندارید.', backKeyboard);
        } else {
            let msgText = `<b>[ سفارش‌های معلق شما ]</b>\n\n`;
            userOrders.forEach(([code, order]) => {
                msgText += `📦 کد: <code>${escapeHTML(code)}</code>\nمحصول: ${escapeHTML(order.giftName)}\n\n`;
            });
            await safeSendMessage(chatId, msgText, backKeyboard);
        }
    }
});

// ============================================================================
// INLINE CALLBACK QUERY HANDLER
// ============================================================================

bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userData = getUserDataById(chatId);

    if (action.startsWith('add_balance_')) {
        const shortage = parseInt(action.replace('add_balance_', ''));
        userData.waitingForAmount = false;
        userData.lastAmount = shortage;
        userData.waitingForReceipt = true;
        saveDatabase();
        
        const cardPaymentMsg = `مبلغ: ${shortage.toLocaleString()} تومان\n\nبه شماره کارت زیر واریز کنید:\n<code>5555555555555555</code>\nبه نام: تست\n\nسپس عکس رسید را ارسال کنید.`;
        const paymentKeyboard = {
            reply_markup: {
                inline_keyboard: [[{ text: '🏷️ اعمال کد تخفیف', callback_data: 'apply_discount_prompt' }]],
                keyboard: [[{ text: 'برگشت ↩️' }]], 
                resize_keyboard: true 
            }
        };
        await safeSendMessage(chatId, cardPaymentMsg, paymentKeyboard);
        try { await bot.answerCallbackQuery(callbackQuery.id); } catch(e){}
        return;
    }

    if (action === 'track_receipt_main') {
        const supportMarkup = {
            inline_keyboard: [
                [{ text: '👤 پشتیبانی مستقیم', callback_data: 'support_direct' }, { text: '🎫 ارسال تیکت', callback_data: 'support_ticket' }]
            ]
        };
        await safeSendMessage(chatId, 'یکی از گزینه‌های زیر را انتخاب کنید:', { reply_markup: supportMarkup });
        try { await bot.answerCallbackQuery(callbackQuery.id); } catch(e){}
        return;
    }

    if (action.startsWith('order_done_')) {
        const trackingCode = action.replace('order_done_', '');
        const order = db.orders[trackingCode];
        if (order) {
            order.status = 'completed';
            saveDatabase();
            await safeSendMessage(order.userId, `سفارش شما با کد <code>${trackingCode}</code> تکمیل شد.`);
            try {
                await bot.editMessageText(`<b>[ سفارش تایید شد ]</b>\n\nکد: <code>${trackingCode}</code>`, {
                    chat_id: msg.chat.id,
                    message_id: msg.message_id,
                    parse_mode: 'HTML'
                });
            } catch(e){}
        }
        try { await bot.answerCallbackQuery(callbackQuery.id); } catch(e){}
        return;
    }

    if (action.startsWith('order_reject_')) {
        const trackingCode = action.replace('order_reject_', '');
        const adminData = getUserDataById(ADMIN_NUMERIC_ID);
        adminData.waitingForOrderRejectReason = true;
        adminData.rejectOrderCode = trackingCode;
        saveDatabase();
        await safeSendMessage(chatId, 'دلیل رد سفارش را بنویسید:');
        try { await bot.answerCallbackQuery(callbackQuery.id); } catch(e){}
        return;
    }

    if (action.startsWith('approve_receipt_')) {
        const parts = action.split('_');
        const targetId = parts[2];
        const amount = parseInt(parts[3]);
        
        const targetUser = getUserDataById(targetId);
        targetUser.wallet += amount;
        saveDatabase();

        await safeSendMessage(targetId, `رسید شما تایید شد.\nمبلغ ${amount.toLocaleString()} تومان به موجودی شما افزوده شد.`);
        try {
            await bot.editMessageText(`<b>[ رسید تایید شد ]</b>\n\nآیدی: <code>${targetId}</code>\nمبلغ واریزی: ${amount.toLocaleString()} تومان`, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'HTML'
            });
        } catch(e){}
        try { await bot.answerCallbackQuery(callbackQuery.id); } catch(e){}
        return;
    }

    if (action.startsWith('reject_receipt_')) {
        const parts = action.split('_');
        const targetId = parts[2];
        
        const adminData = getUserDataById(ADMIN_NUMERIC_ID);
        adminData.waitingForReceiptRejectReason = true;
        adminData.rejectTargetId = targetId;
        saveDatabase();

        await safeSendMessage(chatId, 'لطفاً دلیل رد رسید را ارسال کنید:');
        try {
            await bot.editMessageText(`<b>[ در انتظار دلیل رد ]</b>\n\nآیدی: <code>${targetId}</code>`, {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                parse_mode: 'HTML'
            });
        } catch(e){}
        try { await bot.answerCallbackQuery(callbackQuery.id); } catch(e){}
        return;
    }
});
