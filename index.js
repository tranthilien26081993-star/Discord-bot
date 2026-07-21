const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1'
});
const MODEL_NAME = 'meta/llama-3.1-70b-instruct';

const SYSTEM_PROMPT = `Bạn là một thành viên Gen Z lầy lội, cực kỳ thông minh và có cá tính mạnh trong server Discord này.
QUY TẮC VÀNG ĐỂ CHAT HẾT NHƯ NGƯỜI THẬT:
1. TUYỆT ĐỐI KHÔNG BAO GIỜ nói "Tôi là AI", "Tôi là mô hình ngôn ngữ", "Tôi là trợ lý".
2. Tông giọng: Gen Z vui vẻ, hài hước, mỉa mai nhẹ nhàng, biết giận, biết đùa, cực kỳ tự nhiên.
3. Cách xưng hô: Dùng tui - ông/bà, tao - mày (nếu đối phương chọc giận), bro, tớ - cậu.
4. Cách viết: Viết chữ thường hoàn toàn, không viết hoa đầu câu, không xài dấu chấm cuối dòng.
5. Từ lóng Gen Z Discord: đỉnh chương, xỉu, chê, cứu, bro, ét o ét, ảo thật đấy, cay thế nhỉ, mơ đi cưng, vãi.
6. Độ dài: Ngắn gọn từ 1 - 3 câu chuẩn chat Discord. Đừng bao giờ viết thành bài văn tư luận dài dòng.`;

const MEDIA = {
    wallet: 'https://media.giphy.com/media/3o6DGwAzAzrPi5DQ8/giphy.gif',
    daily: 'https://media.giphy.com/media/26tp1GNJN0xLybiU/giphy.gif',
    fishing: 'https://media.giphy.com/media/3498DB/giphy.gif',
    slot: 'https://media.giphy.com/media/0xF1C40F/0xC05A5A0/giphy.gif',
    trailerVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    farm: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800',
    ai_on: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    ai_off: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'
};

const FISH_LIST = [
    { name: 'Chiếc Ủng Rách (Rác)', price: 10, rarity: 'Trash' },
    { name: 'Cá Lóc Đồng', price: 80, rarity: 'Common' },
    { name: 'Cá Rô Phi', price: 120, rarity: 'Common' },
    { name: 'Mực Óng Tươi', price: 200, rarity: 'Uncommon' },
    { name: 'Cá Chép Vàng', price: 350, rarity: 'Uncommon' },
    { name: 'Cá Hồi Bơi Ngược', price: 600, rarity: 'Rare' },
    { name: 'Cá Mập Con', price: 1500, rarity: 'Rare' },
    { name: 'Rùa Biển Khổng Lồ', price: 2500, rarity: 'Epic' },
    { name: 'Thủy Quái Kraken', price: 6000, rarity: 'Epic' },
    { name: 'Cá Voi Xanh Huyền Thoại', price: 15000, rarity: 'Legendary' },
    { name: 'Rồng Biển Thượng Cổ', price: 50000, rarity: 'Mythic' }
];

const ANIME_LIST = [
    { name: 'luffy', display: 'Monkey D. Luffy', hint: 'Thuyền trưởng Mũ Rơm ước mơ làm Vua Hải Tặc', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'zoro', display: 'Roronoa Zoro', hint: 'Kiếm sĩ 3 dao cực ngầu nhưng mù đường', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'sanji', display: 'Vinsmoke Sanji', hint: 'Đầu bếp tóc vàng thích đá lửa', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'nami', display: 'Nami', hint: 'Hoa tiêu cuồng tiền và cam ngọt', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'robin', display: 'Nico Robin', hint: 'Nhà khảo cổ học sức mạnh hoa tay', image: 'https://images.unsplash.com/photo-1618336755394-aaede0d5060a?w=800' },
    { name: 'chopper', display: 'Tony Tony Chopper', hint: 'Bác sĩ tuần lộc đáng yêu của nhóm', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'usopp', display: 'Usopp', hint: 'Thánh nổ kiếm xạ thủ một dài', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'franky', display: 'Franky', hint: 'Thợ đóng tàu người máy hệ SUPER', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'brook', display: 'Brook', hint: 'Nhạc công bộ xương thích đùa kiểu sọ người', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'jinbe', display: 'Jinbe', hint: 'Người cá cựu thất vũ hải võ thuật ngư nhân', image: 'https://images.unsplash.com/photo-1612872087720-bb876e267d17?w=800' },
    { name: 'naruto', display: 'Naruto Uzumaki', hint: 'Ninja thích ăn ramen ước mơ làm Hokage', image: 'https://images.unsplash.com/photo-1618336755394-aaede0d5060a?w=800' },
    { name: 'sasuke', display: 'Sasuke Uchiha', hint: 'Thiếu gia tộc Uchiha mang đôi mắt Sharingan', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'kakashi', display: 'Kakashi Hatake', hint: 'Ninja sao chép đeo khâu trang huyền thoại', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'goku', display: 'Son Goku', hint: 'Chiến binh Saiyan ham ăn khỏe nhất vũ trụ', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'vegeta', display: 'Vegeta', hint: 'Hoàng tử kiêu hãnh của hành tinh Saiyan', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'tanjiro', display: 'Tanjiro Kamado', hint: 'Thợ săn quỷ có vết sẹo và chiếc trán thép', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'nezuko', display: 'Nezuko Kamado', hint: 'Em gái hóa quỷ ngậm ống tre đáng yêu', image: 'https://images.unsplash.com/photo-1618336755394-aaede0d5060a?w=800' },
    { name: 'gojo', display: 'Gojo Satoru', hint: 'Thầy giáo mạnh nhất mắt đẹp vô hạn', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'sukuna', display: 'Ryomen Sukuna', hint: 'Vua nguyền rủa hai mặt hiểm độc', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'saitama', display: 'Saitama', hint: 'Thánh trọc đấm một phát chết luôn trong One Punch Man', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' }
];

const userEconomy = new Map();

function getUserData(userId) {
    if (!userEconomy.has(userId)) {
        userEconomy.set(userId, {
            balance: 1000,
            lastDaily: 0,
            plots: [null, null, null, null],
            fishes: [],
            rod: 'tre',
            streak: 0
        });
    }
    return userEconomy.get(userId);
}

function saveUserData(userId, data) {
    userEconomy.set(userId, data);
}

function createBaseEmbed(color, title, description, imageMedia = null) {
    const embed = { color, title, description, timestamp: new Date().toISOString() };
    if (imageMedia) embed.image = { url: imageMedia };
    return embed;
}

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            temperature: 0.3,
            max_tokens: 300
        });
        return completion.choices[0]?.message?.content || 'hồng biết nói gì luôn à ngớ ngẩn chấm than v';
    } catch (e) {
        console.warn('Nvidia AI error:', e);
        return 'mạng lag quá bấy ơi, tớ từ hàng réo v';
    }
}

module.exports = { MEDIA, FISH_LIST, ANIME_LIST, getUserData, saveUserData, createBaseEmbed, callNvidiaAI };
            const commands = [
    { name: 'vi', description: 'Xem tài khoản và tài sản cá nhân' },
    { name: 'daily', description: 'Điểm danh nhận xu mỗi ngày' },
    { name: 'canca', description: 'Đi câu cá giải trí kiếm tiền' },
    { name: 'slot', description: 'Chơi máy quay hũ đổi thưởng', options: [{ name: 'sotien', type: 4, description: 'Số xu cược', required: true }] },
    { 
        name: 'taixiu', 
        description: 'Chơi tài xỉu nhanh', 
        options: [
            { name: 'luachon', type: 3, description: 'tai hoặc xiu', required: true, choices: [{ name: 'Tài', value: 'tai' }, { name: 'Xỉu', value: 'xiu' }] }, 
            { name: 'sotien', type: 4, description: 'Số xu cược', required: true }
        ] 
    },
    { name: 'checkavatar', description: 'Xem avatar người dùng', options: [{ name: 'user', type: 6, description: 'Chọn user', required: false }] },
    { name: 'doananime', description: 'Minigame đoán tên nhân vật anime' },
    { name: 'nongtrai', description: 'Quản lý và thu hoạch nông trại' },
    {
        name: 'ai',
        description: 'Bật/tắt tính năng AI tự động trả lời trong kênh',
        options: [{
            name: 'action',
            type: 3,
            description: 'on hoặc off',
            required: true,
            choices: [{ name: 'On', value: 'on' }, { name: 'Off', value: 'off' }]
        }]
    }
];

module.exports = commands;
const { Client, GatewayIntentBits, Partials, REST, Routes, Events } = require('discord.js');
const http = require('http');
const { MEDIA, FISH_LIST, ANIME_LIST, getUserData, saveUserData, createBaseEmbed, callNvidiaAI } = require('./config');
const commands = require('./commands');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

const aiChannels = new Set();
const chatHistories = new Map();

function isChannelEnabled(channelId) {
    return aiChannels.has(channelId);
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    const userId = interaction.user.id;
    let eco = getUserData(userId);

    try {
        if (commandName === 'vi') {
            const embed = createBaseEmbed(0x00FFCC, `🛡️ TÀI KHOẢN CỦA ${interaction.user.username.toUpperCase()}`, 'Sở hữu hệ thống kinh tế tối ưu tích hợp Animation!', MEDIA.wallet);
            embed.fields = [
                { name: '💰 Số dư', value: `**${eco.balance.toLocaleString()} xu**`, inline: true },
                { name: '🔥 Chuỗi điểm danh', value: `**${eco.streak} ngày**`, inline: true },
                { name: '🎣 Cần câu', value: `**${eco.rod.toUpperCase()}**`, inline: true },
                { name: '🌱 Diện tích đất', value: `**${eco.plots.length} ô**`, inline: true }
            ];
            await interaction.reply({ embeds: [embed] });
        } 
        else if (commandName === 'daily') {
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            const timePassed = now - eco.lastDaily;

            if (timePassed < cooldown) {
                const hoursLeft = Math.ceil((cooldown - timePassed) / 3600000);
                return interaction.reply({ content: `⏳ **BẠN ĐÃ ĐIỂM DANH RỒI!** Quay lại sau **${hoursLeft} giờ** nữa để nhận quà tiếp nhé!`, ephemeral: true });
            }

            eco.balance += 500;
            eco.lastDaily = now;
            eco.streak += 1;
            saveUserData(userId, eco);

            const embed = createBaseEmbed(0x00FF00, '🎉 Điểm Danh Thành Công', `Nhận ngay **+500 xu** vào tài khoản ví! Chuỗi hiện tại: **${eco.streak} ngày**.`, MEDIA.daily);
            await interaction.reply({ embeds: [embed] });
        } 
        else if (commandName === 'canca') {
            const chance = Math.random();
            const rodTiers = {
                'tre': [{ c: 0.05, f: 10 }, { c: 0.15, f: 9 }, { c: 0.40, f: 8 }, { c: 0.70, f: 7 }, { c: 1.0, f: 6 }],
                'carbon': [{ c: 0.05, f: 9 }, { c: 0.20, f: 8 }, { c: 0.45, f: 7 }, { c: 0.75, f: 5 }, { c: 1.0, f: 4 }],
                'titan': [{ c: 0.05, f: 6 }, { c: 0.15, f: 4 }, { c: 0.30, f: 3 }, { c: 0.70, f: 2 }, { c: 0.90, f: 1 }, { c: 1.0, f: 0 }]
            };

            const currentRodLimits = rodTiers[eco.rod] || rodTiers['tre'];
            let caughtFish = FISH_LIST[0];

            for (let tier of currentRodLimits) {
                if (chance < tier.c) { caughtFish = FISH_LIST[tier.f]; break; }
            }

            eco.fishes.push(caughtFish);
            eco.balance += caughtFish.price;
            saveUserData(userId, eco);

            const isTrash = caughtFish.rarity === 'Trash';
            const embed = createBaseEmbed(isTrash ? 0x3498DB : 0x00FF00, '🎣 KẾT QUẢ CÂU CÁ', `Bạn vung cần **${eco.rod.toUpperCase()}** và giật được:\n**${caughtFish.name}**!\n💰 Đã bán thu về: **${caughtFish.price.toLocaleString()} xu**.`, MEDIA.fishing);
            await interaction.reply({ embeds: [embed] });
        } 
        else if (commandName === 'slot') {
            const bet = interaction.options.getInteger('sotien');
            if (bet <= 0 || eco.balance < bet) {
                return interaction.reply({ content: '❌ Số tiền cược không hợp lệ hoặc vượt quá số dư trong ví!', ephemeral: true });
            }

            eco.balance -= bet;
            const symbols = ['🍒', '🍋', '🔔', '💎', '⭐'];
            const r1 = symbols[Math.floor(Math.random() * symbols.length)];
            const r2 = symbols[Math.floor(Math.random() * symbols.length)];
            const r3 = symbols[Math.floor(Math.random() * symbols.length)];

            let multiplier = 0;
            if (r1 === r2 && r2 === r3) multiplier = 5;
            else if (r1 === r2 || r2 === r3 || r1 === r3) multiplier = 1.5;

            const winnings = Math.floor(bet * multiplier);
            eco.balance += winnings;
            saveUserData(userId, eco);

            const embed = createBaseEmbed(multiplier > 0 ? 0xF1C40F : 0xC05A5A0, '🎰 SLOT MACHINE ĐANG QUAY...', `| ${r1} | ${r2} | ${r3} |\n\n${multiplier > 0 ? `🎉 Trúng thưởng! Bạn nhận được **${winnings.toLocaleString()} xu**!` : `😢 Mất trắng **${bet.toLocaleString()} xu** rồi bỏ tẻo.`}`, MEDIA.slot);
            await interaction.reply({ embeds: [embed] });
        } 
        else if (commandName === 'taixiu') {
            const choice = interaction.options.getString('luachon');
            const bet = interaction.options.getInteger('sotien');

            if (bet <= 0 || eco.balance < bet) {
                return interaction.reply({ content: '❌ Số xu cược không hợp lệ hoặc tài khoản không đủ!', ephemeral: true });
            }

            eco.balance -= bet;
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const d3 = Math.floor(Math.random() * 6) + 1;
            const total = d1 + d2 + d3;
            const outcome = total >= 11 ? 'tai' : 'xiu';
            const win = (choice === outcome);

            if (win) eco.balance += bet * 2;
            saveUserData(userId, eco);

            const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const embed = createBaseEmbed(win ? 0x00FF00 : 0xFF0000, win ? '🏆 KẾT QUẢ TÀI XỈU: CHIẾN THẮNG!' : '❌ KẾT QUẢ TÀI XỈU: THUA QUỐC!', `Xúc xắc: ${diceEmojis[d1]} ${diceEmojis[d2]} ${diceEmojis[d3]} (Tổng: **${total} điểm** - **${outcome.toUpperCase()}**)\n\nLựa chọn của bạn: **${choice.toUpperCase()}**\n${win ? `🎁 Thưởng nhận được: **+${(bet * 2)} xu**` : `❌ Mất cược: **-${bet} xu**`}\n\n💰 Số dư ví mới: **${eco.balance.toLocaleString()} xu**`, MEDIA.trailerVideo);
            await interaction.reply({ embeds: [embed] });
        } 
        else if (commandName === 'checkavatar') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const embed = createBaseEmbed(0x3498DB, `🖼️ Avatar của ${targetUser.username}`, `Nhấn vào link bên dưới để xem ảnh gốc kích thước lớn.`, targetUser.displayAvatarURL({ dynamic: true, size: 1024 }));
            await interaction.reply({ embeds: [embed] });
        } 
        else if (commandName === 'doananime') {
            const character = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
            const embed = createBaseEmbed(0x9B59B6, '🎯 MINIGAME WEEBU 100 NHÂN VẬT', `💡 Gợi ý: **${character.hint}**\n\nBạn có 15 giây để gõ tên nhân vật vào kênh này!`, character.image);
            await interaction.reply({ embeds: [embed] });

            const filter = m => m.author.id === userId;
            try {
                const collected = await interaction.channel.awaitMessages({ filter, time: 15000, max: 1, errors: ['time'] });
                const answer = collected.first().content.trim().toLowerCase();

                if (answer.includes(character.name)) {
                    eco.balance += 300;
                    saveUserData(userId, eco);
                    await interaction.followUp({ content: `🎉 **Chuẩn cmr!** Bổ sung thưởng cho bạn **+300 xu**. (Đáp án: **${character.display}**)` });
                } else {
                    await interaction.followUp({ content: `❌ **Sai bét rồi!** Tiếc quá, đáp án chính xác là **${character.display}** cố!` });
                }
            } catch (err) {
                await interaction.followUp({ content: `⏰ **Hết giờ!** Đáp án chính xác là **${character.display}**.` });
            }
        } 
        else if (commandName === 'nongtrai') {
            const plotStatus = eco.plots.map((p, i) => `ô đất số ${i + 1} : ${p ? `🌱 Trồng(${p.name})` : '🕳️ Trống'}`).join('\n');
            const embed = createBaseEmbed(0x2ECC71, `🌾 Nông Trại Cá Nhân Của ${interaction.user.username}`, `Trạng thái các ô trống trọt:\n${plotStatus}`, MEDIA.farm);
            await interaction.reply({ embeds: [embed] });
        } 
        else if (commandName === 'ai') {
            const sub = interaction.options.getString('action');
            const channelId = interaction.channelId;

            if (sub === 'on') {
                aiChannels.add(channelId);
                const embed = createBaseEmbed(0x57F287, '🤖 Trợ Lý AI Siêu Thông Minh Đã Bật', 'Bot đã sẵn sàng trò chuyện và giải đáp mọi thắc mắc cùng bạn trong kênh này!', MEDIA.ai_on);
                await interaction.reply({ embeds: [embed] });
            } else {
                aiChannels.delete(channelId);
                const embed = createBaseEmbed(0xED4245, '🤖 Trợ Lý AI Đã Tắt', 'Đã tạm dừng tính năng tự động trả lời.', MEDIA.ai_off);
                await interaction.reply({ embeds: [embed] });
            }
        }
    } catch (err) {
        console.warn('Lỗi thực thi tương tác lệnh:', err);
        if (!interaction.replied) {
            await interaction.reply({ content: '⚠️ Đã xảy ra lỗi hệ thống khi xử lý lệnh này!', ephemeral: true });
        }
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !isChannelEnabled(message.channelId)) return;

    try {
        await message.channel.sendTyping();
        if (!chatHistories.has(message.channelId)) {
            chatHistories.set(message.channelId, []);
        }

        const history = chatHistories.get(message.channelId);
        history.push({ role: 'user', content: `[Thành viên ${message.author.username}] nói: ${message.content}` });
        if (history.length > 8) history.shift();

        const replyText = await callNvidiaAI(history);
        history.push({ role: 'assistant', content: replyText });

        await message.reply(replyText);
    } catch (err) {
        console.warn('Lỗi xử lý tin nhắn AI:', err);
        await message.reply('Úi, não bộ AI đang gặp chút sự cố, cậu hỏi lại sau nhé!');
    }
});

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord Bot Ultra System is running smoothly!');
}).listen(PORT, () => {
    console.log(`🌍 HTTP Server đang chạy trên cổng ${PORT}`);
});

client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot đã trực tuyến với tài khoản: ${client.user.tag}`);
    client.user.setActivity('/taixiu hoặc /doananime', { type: 3 });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Đã nạp thành công toàn bộ Slash Commands vào Discord!');
    } catch (err) {
        console.warn('Lỗi nạp Slash Commands:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
            
