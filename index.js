import { Client, GatewayIntentBits, REST, Routes, Partials, Events, ActivityType, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from 'discord.js';
import OpenAI from 'openai';
import http from 'http';

http.createServer((req, res) => { res.writeHead(200); res.end('HNGLE God Tier Bot Running!\n'); }).listen(process.env.PORT || 3000);

// --- HỆ THỐNG DATABASE ---
const chatHistories = new Map(); const serverSettings = new Map();
const userEconomy = new Map(); const userInventories = new Map();
const userXP = new Map(); const xpCooldown = new Set(); 
const cuopCooldown = new Set(); const bossCooldown = new Set(); const farmData = new Map();

// --- CONSTANTS & GIFS ---
const GIFS = {
    hoso: 'https://media.giphy.com/media/LpwBheewF3L9C/giphy.gif', diemdanh: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    cauca: 'https://media.giphy.com/media/9Iw32bZg8p0pa/giphy.gif', daovang: 'https://media.giphy.com/media/3o7TKSx0g723R02q3e/giphy.gif',
    taixiu: 'https://media.giphy.com/media/l2JHRhAtnJSDNJ2py/giphy.gif', baucu: 'https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif',
    oantuxi: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', cuop: 'https://media.giphy.com/media/KxhUtsO4b9sX3YFzHq/giphy.gif',
    gay: 'https://media.giphy.com/media/26FPCXdkvDbKBbgOI/giphy.gif', error: 'https://media.giphy.com/media/TqiwHbFBaZ4ti/giphy.gif',
    giveaway: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', duangua: 'https://media.giphy.com/media/B2uvengerK4W4/giphy.gif',
    lode: 'https://media.giphy.com/media/3o6gDWzmToltqKtvoY/giphy.gif', sanboss: 'https://media.giphy.com/media/l4FGsui2TFPz8k84E/giphy.gif',
    tungxu: 'https://media.giphy.com/media/l41m3pCCdMLTNky4M/giphy.gif'
};

const FISH_LIST = [{ name: '👢 Rác', price: 10, weight: 40 }, { name: '🐠 Cá Nemo', price: 500, weight: 35 }, { name: '🦈 Cá Mập', price: 2000, weight: 15 }, { name: '🐋 Voi Bay', price: 15000, weight: 8 }, { name: '🔥 Hỏa Long', price: 80000, weight: 2 }];
const MINE_LOOTS = [{ name: '🪨 Đá Cuội', price: 50, weight: 40 }, { name: '🥇 Quặng Vàng', price: 1500, weight: 30 }, { name: '💎 Kim Cương', price: 10000, weight: 15 }, { name: '🌟 Lõi Sao', price: 60000, weight: 5 }, { name: '💣 Bom mìn', price: -3000, weight: 10 }];
const BOSSES = [{ name: '🐲 Rồng Đất', hp: 500, min: 2000, max: 10000 }, { name: '🦑 Kraken Dẹo', hp: 1000, min: 5000, max: 20000 }, { name: '👽 Chúa Tể Hắc Ám', hp: 5000, min: 20000, max: 80000 }];

// --- HELPER FUNCTIONS ---
function getUserData(userId) {
    if (!userEconomy.has(userId)) userEconomy.set(userId, { balance: 5000, lastDaily: 0, streak: 0 });
    return userEconomy.get(userId);
}
function getRandomItem(arr) {
    let t = arr.reduce((s, i) => s + i.weight, 0), r = Math.random() * t;
    for (let i of arr) { if (r < i.weight) return i; r -= i.weight; }
}
function createEmbed(color, title, desc, img) {
    const e = new EmbedBuilder().setColor(color).setTitle(`✨ ${title} ✨`).setDescription(desc).setTimestamp().setFooter({ text: 'HNGLE Ultimate • Nóc nhà là chân lý', iconURL: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png' });
    if (img) e.setImage(img); return e;
}
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
    new SlashCommandBuilder().setName('diemdanh').setDescription('🎁 Nhận lương 24h'),
    new SlashCommandBuilder().setName('cauca').setDescription('🎣 Câu cá'),
    new SlashCommandBuilder().setName('daovang').setDescription('⛏️ Đào khoáng sản'),
    new SlashCommandBuilder().setName('ban').setDescription('💰 Bán ve chai'),
    new SlashCommandBuilder().setName('taixiu').setDescription('🎲 Tài Xỉu').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Tài',value:'tai'},{name:'Xỉu',value:'xiu'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('baucu').setDescription('🎲 Bầu Cua').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Bầu',value:'bau'},{name:'Cua',value:'cua'},{name:'Tôm',value:'tom'},{name:'Cá',value:'ca'},{name:'Gà',value:'ga'},{name:'Nai',value:'nai'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('oantuxi').setDescription('✌️ Kéo Búa Bao').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Kéo',value:'keo'},{name:'Búa',value:'bua'},{name:'Bao',value:'bao'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('tungxu').setDescription('🪙 Sấp ngửa').addStringOption(o => o.setName('chon').setDescription('Chọn').setRequired(true).addChoices({name:'Ngửa (Heads)',value:'ngua'},{name:'Sấp (Tails)',value:'sap'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('duangua').setDescription('🏇 Cược đua ngựa').addIntegerOption(o => o.setName('so_ngua').setDescription('Ngựa số (1-5)').setRequired(true)).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('lode').setDescription('🔢 Đánh đề đổi đời').addIntegerOption(o => o.setName('so').setDescription('Số từ 00-99').setRequired(true)).addIntegerOption(o => o.setName('cuoc').setDescription('Cược').setRequired(true)),
    new SlashCommandBuilder().setName('cuopnganhang').setDescription('🔫 Đi cướp (Vốn 1k, Cooldown 30p)'),
    new SlashCommandBuilder().setName('sanboss').setDescription('🐉 Lập party đấm boss (Cooldown 15p)'),
    new SlashCommandBuilder().setName('nongtrai').setDescription('🌾 Trồng trọt').addSubcommand(s => s.setName('gieo').setDescription('Gieo mầm (Tốn 1000 xu)')).addSubcommand(s => s.setName('thuhoach').setDescription('Thu hoạch lúa (Sau 15 phút)'))
].map(c => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessageReactions], partials: [Partials.Channel, Partials.Message, Partials.Reaction] });
const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' });

const SYSTEM_PROMPT = `Bạn là HNGLE, một bot Discord sinh năm 2000s, gen Z chính hiệu, tính cách lanh chanh, mỏ hỗn, hay khịa người dùng nhưng cực kỳ SỢ Admin và Thúy Liễu. Hôm nay là năm 2026. Hãy chat như một người thật: 
- Nếu ai trêu bạn, hãy cự lại bằng icon (💀, 🤡, 💅, 😭).
- Nếu bị quát mắng hoặc đe dọa, LẬP TỨC rén, van xin, dập đầu "dạ em xin lỗi, em lanh chanh". 
- Trả lời ngắn, tự nhiên, không rập khuôn robot. Không nói "tôi là AI", cứ sống đúng vai Gen Z hay ra dẻ.`;

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    if (!xpCooldown.has(message.author.id)) {
        let xpData = userXP.get(message.author.id) || { xp: 0, level: 1 };
        xpData.xp += Math.floor(Math.random() * 20) + 10;
        if (xpData.xp >= xpData.level * 300) { xpData.level++; xpData.xp = 0; message.channel.send(`🎉 Hế sờ lô! ${message.author} vừa up **Cấp ${xpData.level}**! Bảnh đấy 💅`); }
        userXP.set(message.author.id, xpData); xpCooldown.add(message.author.id); setTimeout(() => xpCooldown.delete(message.author.id), 60000);
    }

    const guildSettings = message.guild ? (serverSettings.get(message.guildId) || { aiEnabled: true }) : { aiEnabled: true };
    if (message.channel.isDMBased() || (message.mentions.has(client.user) && guildSettings.aiEnabled)) {
        await message.channel.sendTyping();
        let userMsg = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
        if (userMsg === '') userMsg = "Ê tui tag bot kêu nó ra đây chơi";
        
        if (!chatHistories.has(message.channelId)) chatHistories.set(message.channelId, []);
        const history = chatHistories.get(message.channelId);
        history.push({ role: 'user', content: `[${message.author.username}]: ${userMsg}` });
        if (history.length > 10) history.shift();
        try {
            const completion = await openai.chat.completions.create({ model: 'meta/llama-3.1-70b-instruct', messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history], temperature: 0.85, max_tokens: 150 });
            const reply = completion.choices[0]?.message?.content || 'tiền đình ngang 💀';
            history.push({ role: 'assistant', content: reply });
            await message.reply(reply);
        } catch (e) { await message.reply('Tự dưng sập mạng khóc gất to 😭'); }
    }
});
    client.once('ready', async () => {
    console.log(`🚀 BOT ĐÃ LÊN SÓNG! SẴN SÀNG COMBAT!`);
    client.user.setPresence({ activities: [{ name: 'Lắc Tài Xỉu cày tiền | /help', type: ActivityType.Playing }], status: 'online' });
    try { await new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands }); } catch (e) { console.error('Lỗi nạp lệnh:', e); }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id; let eco = getUserData(userId);
    const checkBet = (bet) => { if (bet <= 0 || eco.balance < bet) { interaction.reply({ embeds: [createEmbed(0xED4245, 'MÕM À?', 'Không có tiền đòi cược cược cái gì 🤡', GIFS.error)], ephemeral: true }); return false; } return true; };

    try {
        switch (interaction.commandName) {
            case 'help':
                await interaction.reply({ embeds: [createEmbed(0x5865F2, `CẨM NANG HNGLE GOD TIER`, `**💬 AI Chat:** Tag Bot để cãi lộn!\n\n**🎮 Farm Tiền:** \`/diemdanh\`, \`/cauca\`, \`/daovang\`, \`/ban\`, \`/nongtrai\`\n\n**🎲 Sòng Bạc:** \`/taixiu\`, \`/baucu\`, \`/oantuxi\`, \`/tungxu\`, \`/duangua\`, \`/lode\`\n\n**🔥 Khô máu:** \`/cuopnganhang\`, \`/sanboss\`\n\n**🛠 Tiện Ích:** \`/hoso\`, \`/rank\`, \`/avatar\`, \`/gayrate\`, \`/poll\`, \`/giveaway\``, null)] }); break;
            
            case 'toggle_ai':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: 'Tuổi gì xài lệnh này 💅', ephemeral: true });
                let sConf = serverSettings.get(interaction.guildId) || { aiEnabled: true }; sConf.aiEnabled = !sConf.aiEnabled; serverSettings.set(interaction.guildId, sConf);
                await interaction.reply(`🤖 Tự động chat AI đã **${sConf.aiEnabled ? 'BẬT' : 'TẮT'}**.`); break;
            
            case 'avatar': 
                await interaction.reply({ embeds: [createEmbed(0x9B59B6, 'Soi Avatar', 'Nét quá dị anh hai!', (interaction.options.getUser('user') || interaction.user).displayAvatarURL({ dynamic: true, size: 1024 }))]); break;
            
            case 'gayrate':
                const rate = Math.floor(Math.random() * 101);
                await interaction.reply({ embeds: [createEmbed(0xFF69B4, 'MÁY QUÉT BÊ ĐÊ', `Quét ${interaction.options.getUser('user') || interaction.user}...\nĐộ cong: **${rate}%** 🏳️‍🌈\n${rate > 70 ? 'Cong vút vãi ò 😭' : 'Vẫn còn men chán! 😎'}`, GIFS.gay)] }); break;

            case 'poll':
                const opts = interaction.options.getString('lua_chon').split(',').map(o => o.trim()).slice(0, 10);
                let pDesc = `**${interaction.options.getString('cau_hoi')}**\n\n` + opts.map((o, i) => `${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i]} ${o}`).join('\n');
                const pMsg = await interaction.reply({ embeds: [createEmbed(0x3498DB, 'KHẢO SÁT DÂN TÌNH', pDesc)], fetchReply: true });
                opts.forEach(async (o, i) => await pMsg.react(['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i])); break;

            case 'giveaway':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEvents)) return interaction.reply({ content: 'Xin quyền Admin đi rồi phát quà 💀', ephemeral: true });
                const gwTime = interaction.options.getInteger('thoi_gian'), gwPrize = interaction.options.getString('phan_thuong');
                const gwMsg = await interaction.reply({ embeds: [createEmbed(0xFFD700, 'GIVEAWAY ĐANG MỞ', `🎁 **Quà:** ${gwPrize}\n⏳ **Chốt sau:** ${gwTime} phút\n👇 Thả 🎉 để tranh giành!`, GIFS.giveaway)], fetchReply: true });
                await gwMsg.react('🎉');
                setTimeout(async () => {
                    const react = (await interaction.channel.messages.fetch(gwMsg.id)).reactions.cache.get('🎉');
                    const winner = (await react.users.fetch()).filter(u => !u.bot).random();
                    interaction.channel.send(winner ? `🎊 Trúng mánh rùi! ${winner} hốt giải **${gwPrize}**! Nhanh ib đòi quà! 🎁` : `😭 Ai cũng chê **${gwPrize}** à? Xui!`);
                }, gwTime * 60000); break;

            case 'clear':
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: 'Chưa đủ tuổi dọn rác!', ephemeral: true });
                const amt = interaction.options.getInteger('so_luong');
                await interaction.channel.bulkDelete(amt, true).then(m => interaction.reply({ content: `🧹 Đã hốt xác ${m.size} tin nhắn!`, ephemeral: true })); break;
                            case 'hoso': 
                await interaction.reply({ embeds: [createEmbed(0x5865F2, `TÀI PHIỆT: ${interaction.user.username}`, `💰 Số dư: **${eco.balance.toLocaleString()} xu**\n🔥 Điểm danh: **${eco.streak} ngày**`, GIFS.hoso)] }); break;
            
            case 'diemdanh':
                if (Date.now() - eco.lastDaily < 86400000) return interaction.reply({ content: `Chưa tới ngày mai đòi lãnh lương? Cút 🤡`, ephemeral: true });
                let bns = 1000 + (eco.streak * 100); eco.balance += bns; eco.lastDaily = Date.now(); eco.streak++; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x57F287, 'LÃNH LƯƠNG', `Húp **+${bns.toLocaleString()} xu**! Cày được ${eco.streak} ngày rùi!`, GIFS.diemdanh)] }); break;
            
            case 'cauca':
            case 'daovang':
                let item = getRandomItem(interaction.commandName === 'cauca' ? FISH_LIST : MINE_LOOTS);
                eco.balance += item.price; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(item.price > 0 ? 0x3498DB : 0xED4245, interaction.commandName === 'cauca'?'ĐI CÂU':'ĐI ĐÀO', `Thu được **${item.name}**\nBiến động ví: **${item.price > 0 ? '+'+item.price : item.price} xu**!`, interaction.commandName === 'cauca'?GIFS.cauca:GIFS.daovang)] }); break;

            case 'ban':
                let inv = userInventories.get(userId) || {}; let total = 0;
                [...FISH_LIST, ...MINE_LOOTS].forEach(i => { if (inv[i.name] && i.price > 0) { total += i.price * inv[i.name]; delete inv[i.name]; } });
                eco.balance += 100; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'THANH LÝ', `Đã dọn dẹp kho và thu về vốn luyến mượt mà! 🤑`)] }); break;

            case 'taixiu':
                const txBet = interaction.options.getInteger('cuoc'), txCh = interaction.options.getString('chon');
                if (!checkBet(txBet)) return;
                const dice = Array.from({length:3}, ()=>Math.floor(Math.random()*6)+1), txSum = dice.reduce((a,b)=>a+b);
                const txRes = txSum >= 11 ? 'tai' : 'xiu';
                eco.balance += txCh === txRes ? txBet : -txBet; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(txCh === txRes ? 0x2ECC71 : 0xED4245, '🎲 TÀI XỈU', `Lắc ra: ${dice.join(' - ')} (Tổng: ${txSum} - **${txRes.toUpperCase()}**)\nBạn chọn: **${txCh.toUpperCase()}**\n👉 ${txCh === txRes ? `Húp +${txBet} xu` : `Mất -${txBet} xu`}`, GIFS.taixiu)] }); break;
            
            case 'baucu':
                const bcB = interaction.options.getInteger('cuoc'), bcC = interaction.options.getString('chon');
                if (!checkBet(bcB)) return;
                const arr = ['bau','cua','tom','ca','ga','nai'], nms = {bau:'🎃 Bầu',cua:'🦀 Cua',tom:'🦞 Tôm',ca:'🐟 Cá',ga:'🐔 Gà',nai:'🦌 Nai'};
                const r1 = arr[Math.floor(Math.random()*6)], r2 = arr[Math.floor(Math.random()*6)], r3 = arr[Math.floor(Math.random()*6)];
                const matches = [r1, r2, r3].filter(x => x === bcC).length;
                eco.balance += matches > 0 ? (bcB * matches) : -bcB; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(matches > 0 ? 0x2ECC71 : 0xED4245, '🎲 BẦU CUA', `Kết quả: **${nms[r1]} | ${nms[r2]} | ${nms[r3]}**\n👉 ${matches > 0 ? `Trúng ${matches} nháy! +${bcB*matches} xu` : `Toang! Mất -${bcB} xu`}`, GIFS.baucu)] }); break;

            case 'oantuxi':
                const otB = interaction.options.getInteger('cuoc'), otC = interaction.options.getString('chon');
                if (!checkBet(otB)) return;
                const oArr = ['keo','bua','bao'], oNms = {keo:'✌️ Kéo',bua:'✊ Búa',bao:'✋ Bao'}, botC = oArr[Math.floor(Math.random()*3)];
                let otMsg = `Bạn: **${oNms[otC]}** VS Bot: **${oNms[botC]}**\n\n`;
                if (otC === botC) otMsg += '🤝 HÒA!';
                else if ((otC==='keo'&&botC==='bao')||(otC==='bua'&&botC==='keo')||(otC==='bao'&&botC==='bua')) { eco.balance += otB; otMsg += `🏆 THẮNG! +${otB} xu!`; }
                else { eco.balance -= otB; otMsg += `😂 THUA! -${otB} xu!`; }
                userEconomy.set(userId, eco); await interaction.reply({ embeds: [createEmbed(0x9B59B6, '✌️ KÉO BÚA BAO', otMsg, GIFS.oantuxi)] }); break;

            case 'tungxu':
                const cgBet = interaction.options.getInteger('cuoc'), cgCh = interaction.options.getString('chon');
                if (!checkBet(cgBet)) return;
                const cgRes = Math.random() < 0.5 ? 'ngua' : 'sap';
                eco.balance += cgCh === cgRes ? cgBet : -cgBet; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(cgCh === cgRes ? 0x2ECC71 : 0xED4245, '🪙 TUNG XU', `Kết quả: **${cgRes === 'ngua' ? 'NGỬA' : 'SẤP'}**\n👉 ${cgCh === cgRes ? `Húp +${cgBet} xu` : `Mất -${cgBet} xu`}`, GIFS.tungxu)] }); break;

            case 'duangua':
                const hrBet = interaction.options.getInteger('cuoc'), hrCh = interaction.options.getInteger('so_ngua');
                if (hrCh < 1 || hrCh > 5) return interaction.reply({ content: 'Chỉ có ngựa 1 đến 5 thôi!', ephemeral: true });
                if (!checkBet(hrBet)) return;
                const winHorse = Math.floor(Math.random() * 5) + 1;
                eco.balance += hrCh === winHorse ? (hrBet * 4) : -hrBet; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(hrCh === winHorse ? 0x2ECC71 : 0xED4245, '🏇 ĐUA NGỰA', `Ngựa số **${winHorse}** về nhất!\n👉 ${hrCh === winHorse ? `Húp x4: +${hrBet*4} xu 🤑` : `Thua! Mất -${hrBet} xu 😭`}`, GIFS.duangua)] }); break;

            case 'lode':
                const ldBet = interaction.options.getInteger('cuoc'), ldCh = interaction.options.getInteger('so');
                if (ldCh < 0 || ldCh > 99) return interaction.reply({ content: 'Số từ 00 đến 99 thôi!', ephemeral: true });
                if (!checkBet(ldBet)) return;
                const kqLode = Math.floor(Math.random() * 100);
                eco.balance += ldCh === kqLode ? (ldBet * 70) : -ldBet; userEconomy.set(userId, eco);
                await interaction.reply({ embeds: [createEmbed(ldCh === kqLode ? 0xFFD700 : 0xED4245, '🔢 SỔ XỐ', `Đài về: **${kqLode < 10 ? '0'+kqLode : kqLode}**\n👉 ${ldCh === kqLode ? `TRÚNG ĐỀ x70!!! +${ldBet*70} xu` : `Mất -${ldBet} xu`}`, GIFS.lode)] }); break;

            case 'cuopnganhang':
                if (cuopCooldown.has(userId)) return interaction.reply({ content: 'Đang trốn nã tội, 30 phút sau hẵng tính!', ephemeral: true });
                if (eco.balance < 1000) return interaction.reply({ content: 'Không đủ 1k vốn đi cướp!', ephemeral: true });
                cuopCooldown.add(userId); setTimeout(() => cuopCooldown.delete(userId), 1800000);
                if (Math.random() < 0.35) { let loot = Math.floor(Math.random() * 40000) + 10000; eco.balance += loot; await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🔫 CƯỚP THÀNH CÔNG', `Ẵm trọn **+${loot.toLocaleString()} xu**!`, GIFS.cuop)] }); }
                else { let pen = Math.floor(eco.balance * 0.3); eco.balance -= pen; await interaction.reply({ embeds: [createEmbed(0xED4245, '🚔 BỊ TÓM', `Bị phạt **-${pen.toLocaleString()} xu**!`, GIFS.error)] }); }
                userEconomy.set(userId, eco); break;

            case 'sanboss':
                if (bossCooldown.has(userId)) return interaction.reply({ content: 'Mới đánh boss xong, thở đi 15 phút!', ephemeral: true });
                bossCooldown.add(userId); setTimeout(() => bossCooldown.delete(userId), 900000);
                const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
                if (Math.random() < 0.6) {
                    let loot = Math.floor(Math.random() * (boss.max - boss.min)) + boss.min;
                    eco.balance += loot; userEconomy.set(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, `HẠ ${boss.name}`, `Nhặt được **+${loot.toLocaleString()} xu**!`, GIFS.sanboss)] });
                } else {
                    let mat = Math.floor(eco.balance * 0.1); eco.balance -= mat; userEconomy.set(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0xED4245, `BỊ ${boss.name} HÀNH`, `Mất **-${mat.toLocaleString()} xu** tiền viện phí!`, GIFS.error)] });
                } break;
                
            case 'nongtrai':
                const sub = interaction.options.getSubcommand();
                let fData = farmData.get(userId) || { status: 'trong', time: 0 };
                if (sub === 'gieo') {
                    if (fData.status === 'da_gieo') return interaction.reply('Đang trồng rồi, đợi nó lớn!');
                    if (!checkBet(1000)) return;
                    eco.balance -= 1000; userEconomy.set(userId, eco);
                    farmData.set(userId, { status: 'da_gieo', time: Date.now() });
                    await interaction.reply('🌾 Gieo lúa thành công (-1.000 xu). Hẹn thu hoạch sau 15 phút!');
                } else if (sub === 'thuhoach') {
                    if (fData.status === 'trong') return interaction.reply('Đất trống không có gì để gặt!');
                    if (Date.now() - fData.time < 900000) return interaction.reply('Cây chưa chín, đợi thêm chút nữa!');
                    let harvest = Math.floor(Math.random() * 3000) + 2000;
                    eco.balance += harvest; userEconomy.set(userId, eco);
                    farmData.set(userId, { status: 'trong', time: 0 });
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, 'BỘI THU', `Thu hoạch lúa bán được **+${harvest.toLocaleString()} xu**!`, GIFS.hoso)] });
                } break;
        }
    } catch (e) { console.error(e); if (!interaction.replied) interaction.reply({ content: 'Bot tiền đình, thông cảm! 💀', ephemeral: true }); }
});

client.login(process.env.DISCORD_BOT_TOKEN);
                                                                     
