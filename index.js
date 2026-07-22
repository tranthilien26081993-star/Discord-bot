// ==========================================
// PHẦN 1: KHỞI TẠO, THƯ VIỆN & DATABASE
// ==========================================
import { Client, GatewayIntentBits, REST, Routes, Partials, Events, ActivityType, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import OpenAI from 'openai';
import http from 'http';

// Tạo HTTP server giữ bot luôn chạy trên nền tảng cloud (Render/Replit)
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('HNGLE God Tier Bot Running!\n');
}).listen(process.env.PORT || 3000);

// --- HỆ THỐNG DATABASE BỘ NHỚ TẠM ---
const chatHistories = new Map();
const serverSettings = new Map();
const userEconomy = new Map();
const userInventories = new Map();
const userXP = new Map();
const xpCooldown = new Set();
const cuopCooldown = new Set();
const bossCooldown = new Set();
const userPets = new Map();
const marriages = new Map();

// --- CONSTANTS & GIFS ---
const GIFS = {
    hoso: 'https://media.giphy.com/media/LpwBheewF3L9C/giphy.gif',
    diemdanh: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    cauca: 'https://media.giphy.com/media/9Iw32bZg8p0pa/giphy.gif',
    daovang: 'https://media.giphy.com/media/3o7TKSx0g723R02q3e/giphy.gif',
    taixiu: 'https://media.giphy.com/media/l2JHRhAtnJSDNJ2py/giphy.gif',
    baucu: 'https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif',
    oantuxi: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    cuop: 'https://media.giphy.com/media/KxhUtsO4b9sX3YFzHq/giphy.gif',
    gay: 'https://media.giphy.com/media/26FPCXdkvDbKBbgOI/giphy.gif',
    error: 'https://media.giphy.com/media/TqiwHbFBaZ4ti/giphy.gif',
    giveaway: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    duangua: 'https://media.giphy.com/media/B2uvengerK4W4/giphy.gif',
    lode: 'https://media.giphy.com/media/3o6gDWzmToltqKtvoY/giphy.gif',
    sanboss: 'https://media.giphy.com/media/l4FGsui2TFPz8k84E/giphy.gif',
    tungxu: 'https://media.giphy.com/media/l41m3pCCdMLTNky4M/giphy.gif',
    cuahang: 'https://media.giphy.com/media/3o7TKSx0g723R02q3e/giphy.gif',
    khodo: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    ban: 'https://media.giphy.com/media/3o6gDWzmToltqKtvoY/giphy.gif',
    thucung: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    petsolo: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    vongquay: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    slot: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    nhanhanh: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    thachdau: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    kethon: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    lyhon: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif'
};

const FISH_LIST = [
    { name: '👢 Rác Cấp Vô Trụ', price: 10, rarity: 'Phế Liệu' },
    { name: '👟 Chiếc Giày Thối', price: 15, rarity: 'Phế Liệu' },
    { name: '🐟 Cá Chép Ôm Dưa', price: 150, rarity: 'Thường' },
    { name: '🦈 Cá Mập Cắn Cáp', price: 1500, rarity: 'Hiếm' },
    { name: '🐋 Cá Voi Bay', price: 10000, rarity: 'Huyền Thoại' },
    { name: '🔥 Cá Thần Hỏa Long', price: 60000, rarity: 'Thần Thoại' }
];

const MINE_LOOTS = [
    { name: '🪨 Cục Đá Cuội Sét Mẻ', price: 20, rarity: 'Thường' },
    { name: '🥇 Quặng Vàng Nguyên Chất', price: 1800, rarity: 'Hiếm' },
    { name: '💎 Kim Cương Xanh', price: 3200, rarity: 'Cực Hiếm' },
    { name: '🌟 Mánh Sao Băng Rơi', price: 50000, rarity: 'Thần Thoại' }
];

const PET_SHOP = {
    cho: { name: '🐶 Chó Shiba Ngáo', price: 3000, power: 25, type: 'shop', buffType: 'money', buffVal: 1.1, rarity: 'Thường', desc: 'Tăng 10% tiền nhận từ mọi hoạt động' },
    meo: { name: '🐱 Mèo Thần Tài Vẫy Tay', price: 6000, power: 40, type: 'shop', buffType: 'money', buffVal: 1.25, rarity: 'Không Phổ Biến', desc: 'Tăng 25% tiền nhận từ mọi hoạt động' },
    rong: { name: '🐲 Rồng Lửa Nhỏ', price: 35000, power: 90, type: 'shop', buffType: 'combat', buffVal: 50, rarity: 'Cực Hiếm', desc: 'Sức mạnh chiến đấu khủng' }
};

const SEEDS = {
    lua: { name: '🌾 Lúa Nước', cost: 50, profit: 150, rarity: 'Thường', time: 60000 },
    ngo: { name: '🌽 Ngô Đồng', cost: 120, profit: 350, rarity: 'Không Phổ Biến', time: 60000 },
    dua: { name: '🍉 Dưa Hấu Thần Tốc', cost: 300, profit: 1000, rarity: 'Hiếm', time: 60000 }
};

const ROD_SHOP = {
    tre: { name: '🎣 Cần Trúc Còi Cọc', price: 0, mult: 1.0, rarity: 'Thường' },
    carbon: { name: '🎣 Cần Carbon Siêu Cứng', price: 5000, mult: 1.3, rarity: 'Không Phổ Biến' },
    titan: { name: '🎣 Cần Titan Thần Thánh', price: 25000, mult: 2.0, rarity: 'Hiếm' }
};

const BOSSES = [
    { name: '🐲 Rồng Đất', hp: 500, min: 2000, max: 10000 },
    { name: '🦑 Kraken Dẹo', hp: 1000, min: 5000, max: 20000 },
    { name: '👽 Chúa Tể Hắc Ám', hp: 5000, min: 20000, max: 80000 }
];

// --- HÀM HỖ TRỢ (HELPERS) ---
function getUserData(userId) {
    if (!userEconomy.has(userId)) {
        userEconomy.set(userId, {
            balance: 5000,
            lastDaily: 0,
            streak: 0,
            rod: 'tre',
            plots: [
                { plant: null, time: 0 },
                { plant: null, time: 0 },
                { plant: null, time: 0 },
                { plant: null, time: 0 }
            ]
        });
    }
    return userEconomy.get(userId);
}

function saveUserData(userId, data) {
    userEconomy.set(userId, data);
}

function getInventory(userId) {
    if (!userInventories.has(userId)) userInventories.set(userId, {});
    return userInventories.get(userId);
}

function getBuffedAmount(userId, baseAmount) {
    let petKey = userPets.get(userId);
    if (petKey && PET_SHOP[petKey] && PET_SHOP[petKey].buffType === 'money') {
        return Math.floor(baseAmount * PET_SHOP[petKey].buffVal);
    }
    return baseAmount;
}

function getRandomItem(arr) {
    let t = arr.length, r = Math.floor(Math.random() * t);
    return arr[r];
}

function createEmbed(color, title, desc, img) {
    const e = new EmbedBuilder()
        .setColor(color)
        .setTitle(`✨ ${title} ✨`)
        .setDescription(desc)
        .setTimestamp()
        .setFooter({ text: 'HNGLE Ultimate • Nóc nhà là chân lý', iconURL: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png' });
    if (img) e.setImage(img);
    return e;
}
// ==========================================
// PHẦN 2: KHAI BÁO LỆNH & CẤU HÌNH CLIENT
// ==========================================
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('📖 Cẩm nang toàn tập'),
    new SlashCommandBuilder().setName('toggle_ai').setDescription('🤖 Bật/Tắt AI Chat (Admin)'),
    new SlashCommandBuilder().setName('rank').setDescription('🌟 Xem Level').addUserOption(o => o.setName('user').setDescription('Tag người')),
    new SlashCommandBuilder().setName('avatar').setDescription('🖼️ Soi Avatar').addUserOption(o => o.setName('user').setDescription('Tag người')),
    new SlashCommandBuilder().setName('gayrate').setDescription('🏳️‍🌈 Máy quét bê đê').addUserOption(o => o.setName('user').setDescription('Tag người')),
    new SlashCommandBuilder().setName('poll').setDescription('📊 Khảo sát').addStringOption(o => o.setName('cau_hoi').setDescription('Hỏi gì?').setRequired(true)).addStringOption(o => o.setName('lua_chon').setDescription('Các lựa chọn (Cách nhau bằng phẩy)').setRequired(true)),
    new SlashCommandBuilder().setName('giveaway').setDescription('🎁 Phát quà').addStringOption(o => o.setName('phan_thuong').setDescription('Quà').setRequired(true)).addIntegerOption(o => o.setName('thoi_gian').setDescription('Phút').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 Xóa chat').addIntegerOption(o => o.setName('so_luong').setDescription('Số lượng').setRequired(true)),
    new SlashCommandBuilder().setName('hoso').setDescription('💳 Xem tài sản'),
    new SlashCommandBuilder().setName('khodo').setDescription('🎒 Xem balo'),
    new SlashCommandBuilder().setName('diemdanh').setDescription('🎁 Nhận lương 24h'),
    new SlashCommandBuilder().setName('cuahang').setDescription('🛒 Cửa hàng hệ thống')
        .addSubcommand(s => s.setName('xem').setDescription('Xem shop'))
        .addSubcommand(s => s.setName('cancau').setDescription('Mua cần câu').addStringOption(o => o.setName('loai').setDescription('Loại cần').setRequired(true).addChoices({name:'Cần Carbon',value:'carbon'},{name:'Cần Titan',value:'titan'})))
        .addSubcommand(s => s.setName('thucung').setDescription('Mua thú cưng').addStringOption(o => o.setName('loai').setDescription('Loại pet').setRequired(true).addChoices({name:'Shiba',value:'cho'},{name:'Mèo Thần Tài',value:'meo'},{name:'Rồng Lửa',value:'rong'})))
        .addSubcommand(s => s.setName('hatgiong').setDescription('Mua hạt giống').addStringOption(o => o.setName('loai').setDescription('Hạt').setRequired(true).addChoices({name:'Lúa Nước',value:'lua'},{name:'Ngô Đồng',value:'ngo'},{name:'Dưa Hấu',value:'dua'}))),
    new SlashCommandBuilder().setName('cauca').setDescription('🎣 Câu cá'),
    new SlashCommandBuilder().setName('daovang').setDescription('⛏️ Đào khoáng sản'),
    new SlashCommandBuilder().setName('ban').setDescription('💰 Bán ve chai').addStringOption(o => o.setName('vat_pham').setDescription('Chọn loại bán').setRequired(true).addChoices({name:'Bán Tất Cả',value:'all'},{name:'Bán Tất Cả Cá',value:'all_ca'},{name:'Bán Tất Cả Khoáng',value:'all_mine'})),
    new SlashCommandBuilder().setName('thucung_di_choi').setDescription('🐾 Cho thú cưng đi săn thưởng'),
    new SlashCommandBuilder().setName('petsolo').setDescription('⚔️ Đấu trường thú cưng').addUserOption(o => o.setName('doi_thu').setDescription('Đối thủ').setRequired(true)),
    new SlashCommandBuilder().setName('taixiu').setDescription('🎲 Tài Xỉu').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Tài',value:'tai'},{name:'Xỉu',value:'xiu'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('baucu').setDescription('🎲 Bầu Cua').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Bầu',value:'bau'},{name:'Cua',value:'cua'},{name:'Tôm',value:'tom'},{name:'Cá',value:'ca'},{name:'Gà',value:'ga'},{name:'Nai',value:'nai'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('oantuxi').setDescription('✌️ Kéo Búa Bao').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Kéo',value:'keo'},{name:'Búa',value:'bua'},{name:'Bao',value:'bao'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('tungxu').setDescription('🪙 Sấp ngửa').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Ngửa',value:'ngua'},{name:'Sấp',value:'sap'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('duangua').setDescription('🏇 Cược đua ngựa').addIntegerOption(o => o.setName('so_ngua').setDescription('Số (1-5)').setRequired(true)).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('lode').setDescription('🔢 Đánh đề').addIntegerOption(o => o.setName('so').setDescription('00-99').setRequired(true)).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('slot').setDescription('🎰 Quay hũ Slot Machine').addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('vongquay').setDescription('🎡 Vòng quay may mắn (Phí 500 xu)'),
    new SlashCommandBuilder().setName('nhanhanh').setDescription('⚡ Trò chơi nhanh tay lẹ mắt'),
    new SlashCommandBuilder().setName('thachdau').setDescription('⚔️ Thách đấu PvP với người khác').addUserOption(o => o.setName('doi_thu').setDescription('Đối thủ').setRequired(true)).addIntegerOption(o => o.setName('cuoc').setDescription('Tiền cược').setRequired(true)),
    new SlashCommandBuilder().setName('kethon').setDescription('💍 Kết hôn').addUserOption(o => o.setName('nguoi_ay').setDescription('Người thương').setRequired(true)),
    new SlashCommandBuilder().setName('lyhon').setDescription('💔 Ly hôn'),
    new SlashCommandBuilder().setName('cuopnganhang').setDescription('🔫 Đi cướp ngân hàng'),
    new SlashCommandBuilder().setName('sanboss').setDescription('🐉 Săn boss'),
    new SlashCommandBuilder().setName('nongtrai').setDescription('🌾 Nông trại')
        .addSubcommand(s => s.setName('vuon').setDescription('Xem khu vườn'))
        .addSubcommand(s => s.setName('gieo').setDescription('Gieo hạt').addIntegerOption(o => o.setName('odat').setDescription('Ô đất (1-4)').setRequired(true)).addStringOption(o => o.setName('loai').setDescription('Hạt').setRequired(true).addChoices({name:'Lúa Nước',value:'lua'},{name:'Ngô Đồng',value:'ngo'},{name:'Dưa Hấu',value:'dua'})))
        .addSubcommand(s => s.setName('thuhoach').setDescription('Thu hoạch').addIntegerOption(o => o.setName('odat').setDescription('Ô đất (1-4)').setRequired(true)))
].map(c => c.toJSON());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1'
});

const SYSTEM_PROMPT = `Bạn là HNGLE, một bot Discord sinh năm 2000s, gen Z chính hiệu, tính cách lanh chanh, mỏ hỗn, hay khịa người dùng,nói chuyện như người thật, siêu thông minh và biết chat tùy theo ngữ điệu và tình cảnh người đang chat với bạn. Năm nay là 2026. Hãy chat tự nhiên, dùng icon (💀, 🤡, 💅, 😭) và không rập khuôn robot.`;
        // ==========================================
// PHẦN 3: XỬ LÝ SỰ KIỆN & LOGIC LỆNH
// ==========================================
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    // Hệ thống tính điểm XP chat
    if (!xpCooldown.has(message.author.id)) {
        let xpData = userXP.get(message.author.id) || { xp: 0, level: 1 };
        xpData.xp += Math.floor(Math.random() * 20) + 10;
        if (xpData.xp >= xpData.level * 300) {
            xpData.level++;
            xpData.xp = 0;
            message.channel.send(`🎉 Hế sờ lô! ${message.author} vừa lên **Cấp ${xpData.level}**! Bảnh đấy 💅`);
        }
        userXP.set(message.author.id, xpData);
        xpCooldown.add(message.author.id);
        setTimeout(() => xpCooldown.delete(message.author.id), 60000);
    }

    const guildSettings = message.guild ? (serverSettings.get(message.guildId) || { aiEnabled: true }) : { aiEnabled: true };
    if (message.channel.isDMBased() || (message.mentions.has(client.user) && guildSettings.aiEnabled)) {
        await message.channel.sendTyping();
        let userMsg = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
        if (userMsg === '') userMsg = "Ê tui tag bot kêu ra chơi";
        
        if (!chatHistories.has(message.channelId)) chatHistories.set(message.channelId, []);
        const history = chatHistories.get(message.channelId);
        history.push({ role: 'user', content: `[${message.author.username}]: ${userMsg}` });
        if (history.length > 10) history.shift();
        try {
            const completion = await openai.chat.completions.create({
                model: 'meta/llama-3.1-70b-instruct',
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
                temperature: 0.85,
                max_tokens: 150
            });
            const reply = completion.choices[0]?.message?.content || 'tiền đình ngang 💀';
            history.push({ role: 'assistant', content: reply });
            await message.reply(reply);
        } catch (e) {
            await message.reply('Tự dưng sập mạng khóc gất to 😭');
        }
    }
});

client.once('ready', async () => {
    console.log(`🚀 BOT ĐÃ LÊN SÓNG! SẴN SÀNG COMBAT!`);
    client.user.setPresence({
        activities: [{ name: 'Lắc Tài Xỉu cày tiền | /help', type: ActivityType.Playing }],
        status: 'online'
    });
    try {
        await new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN).put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Đã nạp thành công Slash Commands!');
    } catch (e) {
        console.error('Lỗi nạp lệnh:', e);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    let eco = getUserData(userId);

    const checkBet = (bet) => {
        if (bet <= 0 || eco.balance < bet) {
            interaction.reply({ embeds: [createEmbed(0xED4245, 'MÕM À?', 'Không có tiền đòi cược cái gì 🤡', GIFS.error)], ephemeral: true });
            return false;
        }
        return true;
    };

    try {
        switch (interaction.commandName) {
            case 'help': {
                await interaction.reply({
                    embeds: [createEmbed(0x5865F2, `CẨM NANG HNGLE GOD TIER`, `**💬 AI Chat:** Tag Bot để cãi lộn!\n\n**🎮 Farm Tiền & Shop:** \`/diemdanh\`, \`/cuahang\`, \`/cauca\`, \`/daovang\`, \`/ban\`, \`/nongtrai\`, \`/thucung_di_choi\`, \`/petsolo\`\n\n**🎲 Sòng Bạc & Minigame:** \`/taixiu\`, \`/baucu\`, \`/oantuxi\`, \`/tungxu\`, \`/duangua\`, \`/lode\`, \`/slot\`, \`/vongquay\`, \`/nhanhanh\`, \`/thachdau\`\n\n**🔥 Tương Tác & Khô máu:** \`/kethon\`, \`/lyhon\`, \`/cuopnganhang\`, \`/sanboss\`\n\n**🛠 Tiện Ích:** \`/hoso\`, \`/khodo\`, \`/rank\`, \`/avatar\`, \`/gayrate\`, \`/poll\`, \`/giveaway\``, null)]
                });
                break;
            }
            case 'toggle_ai': {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: 'Tuổi gì xài lệnh này 💅', ephemeral: true });
                }
                let sConf = serverSettings.get(interaction.guildId) || { aiEnabled: true };
                sConf.aiEnabled = !sConf.aiEnabled;
                serverSettings.set(interaction.guildId, sConf);
                await interaction.reply(`🤖 Tự động chat AI đã **${sConf.aiEnabled ? 'BẬT' : 'TẮT'}**.`);
                break;
            }
            case 'rank': {
                let xpData = userXP.get((interaction.options.getUser('user') || interaction.user).id) || { xp: 0, level: 1 };
                await interaction.reply({
                    embeds: [createEmbed(0x3498DB, 'XEM LEVEL', `Cấp độ hiện tại: **Level ${xpData.level}**\nĐiểm kinh nghiệm: **${xpData.xp} / ${xpData.level * 300} XP**`, GIFS.hoso)]
                });
                break;
            }
            case 'avatar': {
                await interaction.reply({
                    embeds: [createEmbed(0x9B59B6, 'Soi Avatar', 'Nét quá dị anh hai!', (interaction.options.getUser('user') || interaction.user).displayAvatarURL({ dynamic: true, size: 1024 }))],
                    ephemeral: true
                });
                break;
            }
            case 'gayrate': {
                const rate = Math.floor(Math.random() * 101);
                await interaction.reply({
                    embeds: [createEmbed(0xFF69B4, 'MÁY QUÉT BÊ ĐÊ', `Quét ${interaction.options.getUser('user') || interaction.user}...\nĐộ cong: **${rate}%** 🏳️‍🌈\n${rate > 70 ? 'Cong vút vãi ò 😭' : 'Vẫn còn men chán! 😎'}`, GIFS.gay)]
                });
                break;
            }
            case 'poll': {
                const opts = interaction.options.getString('lua_chon').split(',').map(o => o.trim()).slice(0, 10);
                let pDesc = `**${interaction.options.getString('cau_hoi')}**\n\n` + opts.map((o, i) => `${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i]} ${o}`).join('\n');
                const pMsg = await interaction.reply({ embeds: [createEmbed(0x3498DB, 'KHẢO SÁT DÂN TÌNH', pDesc)], fetchReply: true });
                for (let i = 0; i < opts.length; i++) {
                    await pMsg.react(['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i]);
                }
                break;
            }
            case 'giveaway': {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEvents)) {
                    return interaction.reply({ content: 'Xin quyền Admin đi rồi phát quà 💀', ephemeral: true });
                }
                const gwTime = interaction.options.getInteger('thoi_gian');
                const gwPrize = interaction.options.getString('phan_thuong');
                const gwMsg = await interaction.reply({
                    embeds: [createEmbed(0xFFD700, 'GIVEAWAY ĐANG MỞ', `🎁 **Quà:** ${gwPrize}\n⏳ **Chốt sau:** ${gwTime} phút\n👇 Thả 🎉 để tranh giành!`, GIFS.giveaway)],
                    fetchReply: true
                });
                await gwMsg.react('🎉');
                setTimeout(async () => {
                    try {
                        const fetchedMsg = await interaction.channel.messages.fetch(gwMsg.id);
                        const react = fetchedMsg.reactions.cache.get('🎉');
                        if (react) {
                            const users = await react.users.fetch();
                            const winner = users.filter(u => !u.bot).random();
                            if (winner) {
                                interaction.channel.send(`🎊 Trúng mánh rùi! ${winner} hốt giải **${gwPrize}**! Nhanh ib đòi quà! 🎁`);
                            } else {
                                interaction.channel.send(`😭 Ai cũng chê **${gwPrize}** à? Xui!`);
                            }
                        }
                    } catch (err) {
                        console.error('Giveaway error:', err);
                    }
                }, gwTime * 60000);
                break;
            }
            case 'clear': {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return interaction.reply({ content: 'Chưa đủ tuổi dọn rác!', ephemeral: true });
                }
                const amt = interaction.options.getInteger('so_luong');
                const deleted = await interaction.channel.bulkDelete(amt, true);
                await interaction.reply({ content: `🧹 Đã hốt xác ${deleted.size} tin nhắn!`, ephemeral: true });
                break;
            }
            case 'hoso': {
                let farmDesc = eco.plots.map((p, idx) => {
                    if (!p.plant) return `Ô ${idx + 1}: 🟫 Đất trống`;
                    let timeLeft = p.time - Date.now();
                    if (timeLeft <= 0) return `Ô ${idx + 1}: 🌾 ${SEEDS[p.plant].name} (Đã chín!)`;
                    return `Ô ${idx + 1}: 🌱 Đang trồng (${Math.ceil(timeLeft/60000)}p)`;
                }).join('\n');
                let petKey = userPets.get(userId);
                let petInfo = petKey ? PET_SHOP[petKey].name : 'Chưa nuôi con gì';
                let partId = marriages.get(userId);
                let partnerInfo = partId ? `<@${partId}> 💍` : 'Độc thân vui tính 🍃';

                await interaction.reply({
                    embeds: [createEmbed(0x5865F2, `HỒ SƠ: ${interaction.user.username}`, `💰 Số dư: **${eco.balance.toLocaleString()} xu**\n🎣 Cần câu: **${ROD_SHOP[eco.rod || 'tre'].name}**\n🔥 Điểm danh: **${eco.streak} ngày**\n🐾 Thú cưng: ${petInfo}\n💍 Hôn nhân: ${partnerInfo}\n\n🌾 **Khu Vườn:**\n${farmDesc}`, GIFS.hoso)]
                });
                break;
            }
            case 'khodo': {
                let inv = getInventory(userId);
                let invEntries = Object.entries(inv);
                let invText = invEntries.length === 0 ? '🎒 Kho đồ trống trơn, đi câu cá, đào mỏ ngay đi bố!' : invEntries.map(([k, v]) => `• **${k}**: x${v}`).join('\n');
                await interaction.reply({
                    embeds: [createEmbed(0x9B59B6, `KHO ĐỒ CỦA ${interaction.user.username.toUpperCase()}`, invText, GIFS.khodo)]
                });
                break;
            }
            case 'diemdanh': {
                if (Date.now() - eco.lastDaily < 86400000) {
                    return interaction.reply({ content: `Chưa tới ngày mai đòi lãnh lương? Cút 🤡`, ephemeral: true });
                }
                let bns = getBuffedAmount(userId, 1000 + (eco.streak * 100));
                eco.balance += bns;
                eco.lastDaily = Date.now();
                eco.streak++;
                saveUserData(userId, eco);
                await interaction.reply({
                    embeds: [createEmbed(0x57F287, 'LÃNH LƯƠNG', `Húp **+${bns.toLocaleString()} xu**! Cày được ${eco.streak} ngày rùi!`, GIFS.diemdanh)]
                });
                break;
            }
            case 'cuahang': {
                const subShop = interaction.options.getSubcommand();
                if (subShop === 'xem') {
                    let petText = Object.keys(PET_SHOP).map(k => `• **${PET_SHOP[k].name}** - Giá: ${PET_SHOP[k].price.toLocaleString()} xu (${PET_SHOP[k].desc})`).join('\n');
                    let rodText = Object.keys(ROD_SHOP).map(k => `• **${ROD_SHOP[k].name}** - Giá: ${ROD_SHOP[k].price.toLocaleString()} xu`).join('\n');
                    let seedText = Object.keys(SEEDS).map(k => `• **${SEEDS[k].name}** - Giá: ${SEEDS[k].cost.toLocaleString()} xu`).join('\n');
                    await interaction.reply({
                        embeds: [createEmbed(0x3498DB, 'CỬA HÀNG TỔNG HỢP', `🐾 **Thú Cưng:**\n${petText}\n\n🎣 **Cần Câu:**\n${rodText}\n\n🌾 **Hạt Giống:**\n${seedText}`, GIFS.cuahang)]
                    });
                } else if (subShop === 'cancau') {
                    const rChoice = interaction.options.getString('loai');
                    const targetRod = ROD_SHOP[rChoice];
                    if (eco.balance < targetRod.price) return interaction.reply({ content: 'Không đủ tiền mua cần câu này!', ephemeral: true });
                    eco.balance -= targetRod.price;
                    eco.rod = rChoice;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'MUA THÀNH CÔNG', `Đã sở hữu **${targetRod.name}**!`, GIFS.cuahang)] });
                } else if (subShop === 'thucung') {
                    const pChoice = interaction.options.getString('loai');
                    const targetPet = PET_SHOP[pChoice];
                    if (userPets.has(userId)) return interaction.reply({ content: 'Đã có thú cưng rồi, không nuôi thêm được!', ephemeral: true });
                    if (eco.balance < targetPet.price) return interaction.reply({ content: 'Không đủ tiền mua thú cưng!', ephemeral: true });
                    eco.balance -= targetPet.price;
                    userPets.set(userId, pChoice);
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'MUA THÚ CƯNG', `Đã nhận nuôi **${targetPet.name}**!`, GIFS.cuahang)] });
                } else if (subShop === 'hatgiong') {
                    const sChoice = interaction.options.getString('loai');
                    const targetSeed = SEEDS[sChoice];
                    if (eco.balance < targetSeed.cost) return interaction.reply({ content: 'Không đủ tiền mua hạt giống!', ephemeral: true });
                    eco.balance -= targetSeed.cost;
                    let invShop = getInventory(userId);
                    invShop[targetSeed.name] = (invShop[targetSeed.name] || 0) + 1;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'MUA HẠT GIỐNG', `Đã mua **${targetSeed.name}** cất vào kho!`, GIFS.cuahang)] });
                }
                break;
            }
            case 'cauca': {
                let fish = getRandomItem(FISH_LIST);
                let invC = getInventory(userId);
                invC[fish.name] = (invC[fish.name] || 0) + 1;
                await interaction.reply({
                    embeds: [createEmbed(0x3498DB, 'ĐI CÂU', `Bạn câu được **${fish.name}** (${fish.rarity}) cất vào kho!`, GIFS.cauca)]
                });
                break;
            }
            case 'daovang': {
                let mine = getRandomItem(MINE_LOOTS);
                let invM = getInventory(userId);
                invM[mine.name] = (invM[mine.name] || 0) + 1;
                await interaction.reply({
                    embeds: [createEmbed(0x3498DB, 'ĐI ĐÀO MỎ', `Bạn đào được **${mine.name}** (${mine.rarity}) cất vào kho!`, GIFS.daovang)]
                });
                break;
            }
            case 'ban': {
                const itemQuery = interaction.options.getString('vat_pham');
                let invSell = getInventory(userId);
                if (itemQuery === 'all_ca') {
                    let totalSold = 0;
                    FISH_LIST.forEach(f => {
                        if (invSell[f.name]) {
                            totalSold += f.price * invSell[f.name];
                            delete invSell[f.name];
                        }
                    });
                    let finalMoney = getBuffedAmount(userId, totalSold);
                    eco.balance += finalMoney;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'BÁN CÁ', `Đã bán hết cá và thu về **+${finalMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                } else if (itemQuery === 'all_mine') {
                    let totalSold = 0;
                    MINE_LOOTS.forEach(m => {
                        if (invSell[m.name]) {
                            totalSold += m.price * invSell[m.name];
                            delete invSell[m.name];
                        }
                    });
                    let finalMoney = getBuffedAmount(userId, totalSold);
                    eco.balance += finalMoney;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'BÁN KHOÁNG', `Đã bán khoáng sản thu về **+${finalMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                } else {
                    let totalSold = 0;
                    [...FISH_LIST, ...MINE_LOOTS].forEach(i => {
                        if (invSell[i.name]) {
                            totalSold += i.price * invSell[i.name];
                            delete invSell[i.name];
                        }
                    });
                    let finalMoney = getBuffedAmount(userId, totalSold);
                    eco.balance += finalMoney;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'THANH LÝ KHO', `Đã dọn sạch kho thu về **+${finalMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                }
                break;
            }
            case 'thucung_di_choi': {
                const myPetKey = userPets.get(userId);
                if (!myPetKey) return interaction.reply({ content: 'Đã có thú cưng đâu mà đòi sai vặt! 🤡', ephemeral: true });
                let baseReward = Math.floor(Math.random() * 3000) + 1000;
                let petReward = getBuffedAmount(userId, baseReward);
                eco.balance += petReward;
                saveUserData(userId, eco);
                await interaction.reply({
                    embeds: [createEmbed(0xF1C40F, '🐾 THÚ CƯNG ĐI SĂN', `Thú cưng đi dạo về và tha về **+${petReward.toLocaleString()} xu**!`, GIFS.thucung)]
                });
                break;
            }
            case 'petsolo': {
                const myPetP = userPets.get(userId);
                if (!myPetP) return interaction.reply({ content: 'Bố chưa có thú cưng để solo!', ephemeral: true });
                const targetUser = interaction.options.getUser('doi_thu');
                if (targetUser.bot || targetUser.id === userId) return interaction.reply({ content: 'Không thể đấu với bot hoặc chính mình!', ephemeral: true });
                const oppPetKey = userPets.get(targetUser.id);
                if (!oppPetKey) return interaction.reply({ content: 'Đối thủ không có thú cưng!', ephemeral: true });
                
                let myPower = PET_SHOP[myPetP].power || 30;
                let oppPower = PET_SHOP[oppPetKey].power || 30;
                let prizePool = 8000;

                if ((myPower + Math.random() * 50) >= (oppPower + Math.random() * 50)) {
                    let winRew = getBuffedAmount(userId, prizePool);
                    eco.balance += winRew;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '⚔️ PET SOLO: THẮNG TRẬN', `Thắng oanh liệt trước ${targetUser}, nhận phần thưởng **+${winRew.toLocaleString()} xu**!`, GIFS.petsolo)] });
                } else {
                    eco.balance = Math.max(0, eco.balance - 1500);
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0xED4245, '⚔️ PET SOLO: THẤT BẠI', `Thú cưng bị đánh bại và tốn 1,500 xu tiền bồi dưỡng vết thương!`, GIFS.error)] });
                }
                break;
            }
            case 'taixiu': {
                const txBet = interaction.options.getInteger('cuoc');
                const txCh = interaction.options.getString('chon');
                if (!checkBet(txBet)) return;
                const dice = A
