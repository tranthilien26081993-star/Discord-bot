import { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    EmbedBuilder, Partials, Events 
} from 'discord.js';
import OpenAI from 'openai';
import http from 'http';

const logger = {
    warn: (obj, msg) => console.warn(JSON.stringify({ level: 'warn', ...((typeof obj === 'string') ? { msg: obj } : { ...obj, msg }) }))
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message]
});

const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' });
const MODEL_NAME = 'meta/llama-3.1-70b-instruct';

const SYSTEM_PROMPT = `Bạn là một thành viên Gen Z lầy lội, cực kỳ thông minh và có cá tính mạnh trong server Discord này. 
QUY TẮC VÀNG BÉ CHAT HẾT NHƯ NGƯỜI THẬT:
1. TUYỆT ĐỐI KHÔNG BAO GIỜ nói "Tôi là AI", "Tôi là mô hình ngôn ngữ", "Tôi là trợ lý".
2. Tông giọng: Gen Z vui vẻ, hài hước, mỉa mai nhẹ nhàng, biết giỡn, biết đùa, cực kỳ tự nhiên.
3. Cách xưng hô: Dùng tui - ông/bà, tao - mày (nếu đối phương chọc giận), bro, tớ - cậu.
4. Cách viết: Viết chữ thường hoàn toàn, không viết hoa đầu câu, không xài dấu chấm cuối dòng.
5. Từ lóng Gen Z Discord: đỉnh chương, xiu, chê, cíu, bro, ét o ét, ảo thật đấy, cay thế nhỉ, mơ đi cưng, vãi.
6. Độ dài: Ngắn gọn từ 1 - 3 câu chuẩn chat Discord. Đừng bao giờ viết thành bài văn tư luận dài dòng.`;

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            temperature: 0.0,
            max_tokens: 300
        });
        return completion.choices[0]?.message?.content || 'hồng biết nói gì luôn à ngớ ngác chít dâm :v';
    } catch (e) {
        logger.warn(e, 'Nvidia AI error');
        return 'mang lag quá bọn ấy, từ từ hăng réo :v';
    }
}

const MEDIA = {
    wallet: 'https://media.giphy.com/media/3o6gDWzmAzrpi5DQU8/giphy.gif',
    daily: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif',
    fishing: 'https://media.giphy.com/media/3o7TKSx0g723R02q3e/giphy.gif',
    slot: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1bng1NW0ycjN5OWo5b3ZkY3J6cHFoYmV1NXV5NXdneWczNmtuaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufcVAp3AIJJsrIk/giphy.gif',
    dice: 'https://media.giphy.com/media/26vUGPu1j0pGZpW7e/giphy.gif',
    anime: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
    farm: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    ai_on: 'https://media.giphy.com/media/3o7abK294kG6znhq7O/giphy.gif',
    ai_off: 'https://media.giphy.com/media/3o7abIqp75vZXa19aU/giphy.gif',
    trailerVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' 
};

const aiChannels = new Set();
const userEconomy = new Map();
const chatHistories = new Map();

function enableChannel(channelId) { aiChannels.add(channelId); }
function disableChannel(channelId) { aiChannels.delete(channelId); chatHistories.delete(channelId); }
function isChannelEnabled(channelId) { return aiChannels.has(channelId); }

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

function saveUserData(userId, data) { userEconomy.set(userId, data); }

function createBaseEmbed(color, title, description, imageMedia = null) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: '🌟 Ultimate Discord Bot System • Super AI Activated' });
    
    if (imageMedia) {
        if (imageMedia.includes('youtube.com') || imageMedia.includes('youtu.be')) {
            embed.addFields({ name: '📺 Video Minh Họa Trực Quan', value: `[Bấm vào đây để xem video hướng dẫn](${imageMedia})` });
        } else {
            embed.setImage(imageMedia);
        }
    }
    return embed;
}

const FISH_LIST = [
    { name: '👢 Chiếc Ủng Rách (Rác)', price: 10, rarity: 'Trash' },
    { name: '🐡 Cá Lóc Đồng', price: 80, rarity: 'Common' },
    { name: '🐟 Cá Rô Phi', price: 120, rarity: 'Common' },
    { name: '🦑 Mực Ống Tươi', price: 200, rarity: 'Common' },
    { name: '🐠 Cá Chép Vàng', price: 350, rarity: 'Uncommon' },
    { name: '🍣 Cá Hồi Bơi Ngược', price: 600, rarity: 'Uncommon' },
    { name: '🦈 Cá Mập Con', price: 1500, rarity: 'Rare' },
    { name: '🐢 Rùa Biển Khổng Lồ', price: 2500, rarity: 'Rare' },
    { name: '🐙 Thủy Quái Kraken', price: 6000, rarity: 'Epic' },
    { name: '🐋 Cá Voi Xanh Huyền Thoại', price: 15000, rarity: 'Legendary' },
    { name: '🐉 Rồng Biển Thượng Cổ', price: 50000, rarity: 'Mythic' }
];

const ANIME_LIST = [
    { name: 'luffy', display: 'Monkey D. Luffy', hint: 'Thuyền trưởng Mũ Rơm có ước mơ trở thành Vua Hải Tặc', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'zoro', display: 'Roronoa Zoro', hint: 'Kiếm sĩ phái Tam Kiếm siêu ngầu nhưng cực kỳ mù đường', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'sanji', display: 'Vinsmoke Sanji', hint: 'Đầu bếp mê gái mê dìm băng chân, thuộc Băng Mũ Rơm', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'nami', display: 'Nami', hint: 'Hoa tiêu cuồng tiền và cam ngọt của Băng Mũ Rơm', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'naruto', display: 'Naruto Uzumaki', hint: 'Hồ ly chín đuôi Ninja thích ăn ramen Ichiraku, ước mơ làm Hokage', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'sasuke', display: 'Sasuke Uchiha', hint: 'Tộc nhân Uchiha sở hữu Sharingan và ước mơ trả thù anh trai', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'goku', display: 'Son Goku', hint: 'Khỉ con Saiyan thích đánh nhau nâng cấp Ultra Instinct', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'vegeta', display: 'Vegeta', hint: 'Hoàng tử Saiyan kiêu hãnh cuồng tập luyện vượt Goku', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'tanjiro', display: 'Tanjiro Kamado', hint: 'Cậu bé đeo bông tai Hơi Thở Của Mặt Trời đi tìm thuốc chữa cho em', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'gojo', display: 'Gojo Satoru', hint: 'Thầy giáo bịt mắt mạnh nhất với Kỹ năng Vô Hạn và Tử', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' }
];

const commands = [
    new SlashCommandBuilder().setName('vi').setDescription('Kiểm tra tiền, cần câu và nông trại'),
    new SlashCommandBuilder().setName('diandanh').setDescription('Điểm danh nhận xu hàng ngày'),
    new SlashCommandBuilder().setName('cauca').setDescription('Đi câu cá giải trí kiếm thu nhập'),
    new SlashCommandBuilder().setName('slot').setDescription('Quay hũ Slot Machine săn Jackpot đổi đời')
        .addIntegerOption(opt => opt.setName('sotien').setDescription('Số xu cược quay').setRequired(true)),
    new SlashCommandBuilder().setName('taixiu').setDescription('Chơi minigame Tài Xỉu đổi thưởng cực cuốn')
        .addStringOption(opt => opt.setName('luachon').setDescription('Chọn Tài hoặc Xỉu').setRequired(true)
            .addChoices({ name: 'Tài (11 - 18 điểm)', value: 'tai' }, { name: 'Xỉu (3 - 10 điểm)', value: 'xiu' }))
        .addIntegerOption(opt => opt.setName('sotien').setDescription('Số xu muốn cược').setRequired(true)),
    new SlashCommandBuilder().setName('checkavatar').setDescription('Xem ảnh đại diện chất lượng cao')
        .addUserOption(opt => opt.setName('nguoidung').setDescription('Thành viên cần xem').setRequired(false)),
    new SlashCommandBuilder().setName('doananime').setDescription('Minigame weebu 100 nhân vật'),
    new SlashCommandBuilder().setName('nongtrai').setDescription('Hệ thống quản lý nông trại')
        .addSubcommand(sub => sub.setName('vuon').setDescription('Xem khu vườn'))
        .addSubcommand(sub => sub.setName('trangtrai').setDescription('Xem tổng quan trang trại'))
        .addSubcommand(sub => sub.setName('thuhoach').setDescription('Thu hoạch').addIntegerOption(opt => opt.setName('oodat').setDescription('Ô đất').setRequired(true))),
    new SlashCommandBuilder().setName('ai').setDescription('Bật/tắt chế độ AI tự động')
        .addSubcommand(sub => sub.setName('on').setDescription('Bật AI'))
        .addSubcommand(sub => sub.setName('off').setDescription('Tắt AI'))
].map(c => c.toJSON());
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const userId = interaction.user.id;
    let eco = getUserData(userId);

    try {
        if (commandName === 'vi') {
            const embed = createBaseEmbed(
                0x00FFCC,
                `💰 TÀI KHOẢN CỦA ${interaction.user.username.toUpperCase()}`,
                `Sở hữu hệ thống kinh tế tối ưu tích hợp Animation!`,
                MEDIA.wallet
            ).addFields(
                { name: '🪙 Số dư', value: `**${eco.balance.toLocaleString()} xu**`, inline: true },
                { name: '🔥 Chuỗi điểm danh', value: `**${eco.streak} ngày**`, inline: true },
                { name: '🎣 Cần câu', value: `**${eco.rod.toUpperCase()}**`, inline: true },
                { name: '🌱 Diện tích đất', value: `**${eco.plots.length} ô**`, inline: true }
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'diandanh') {
            const cooldown = 24 * 60 * 60 * 1000;
            const timePassed = Date.now() - eco.lastDaily;
            if (timePassed < cooldown) {
                const hoursLeft = Math.ceil((cooldown - timePassed) / 3600000);
                return interaction.reply({ content: `⏳ **BẠN ĐÃ ĐIỂM DANH RỒI!** Quay lại sau **${hoursLeft} giờ** nữa để nhận quà tiếp nhé.`, ephemeral: true });
            }

            eco.balance += 500;
            eco.lastDaily = Date.now();
            eco.streak += 1;
            saveUserData(userId, eco);

            const embed = createBaseEmbed(0x00FF00, '🎁 ĐIỂM DANH THÀNH CÔNG', `Bạn nhận được **+500 xu**.\n🔥 Chuỗi hiện tại: **${eco.streak} ngày**!`, MEDIA.daily);
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'cauca') {
            const chance = Math.random();
            const rodTiers = {
                'titan': [{c: 0.05, f: 10}, {c: 0.15, f: 9}, {c: 0.40, f: 8}, {c: 0.70, f: 7}, {c: 1.0, f: 6}],
                'carbon': [{c: 0.05, f: 9}, {c: 0.20, f: 8}, {c: 0.45, f: 6}, {c: 0.75, f: 5}, {c: 1.0, f: 4}],
                'tre': [{c: 0.05, f: 6}, {c: 0.15, f: 4}, {c: 0.30, f: 3}, {c: 0.70, f: 2}, {c: 0.90, f: 1}, {c: 1.0, f: 0}]
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
            const embed = createBaseEmbed(
                isTrash ? 0x95A5A6 : 0x3498DB,
                '🎣 KẾT QUẢ CÂU CÁ',
                `Bạn vung cần **${eco.rod.toUpperCase()}** và giật được: **${caughtFish.name}**!\n💰 Đã bán thu về: **+${caughtFish.price.toLocaleString()} xu**`,
                MEDIA.fishing
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'slot') {
            const bet = interaction.options.getInteger('sotien');
            if (bet <= 0 || eco.balance < bet) {
                return interaction.reply({ content: '❌ Số tiền cược phải lớn hơn 0 và đủ!', ephemeral: true });
            }

            eco.balance -= bet;
            const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
            const r1 = symbols[Math.floor(Math.random() * symbols.length)];
            const r2 = symbols[Math.floor(Math.random() * symbols.length)];
            const r3 = symbols[Math.floor(Math.random() * symbols.length)];

            let multiplier = 0;
            if (r1 === r2 && r2 === r3) multiplier = 5;
            else if (r1 === r2 || r2 === r3 || r1 === r3) multiplier = 1.5;

            const winnings = Math.floor(bet * multiplier);
            eco.balance += winnings;
            saveUserData(userId, eco);

            const embed = createBaseEmbed(
                multiplier > 0 ? 0xF1C40F : 0x95A5A6,
                '🎰 SLOT MACHINE ĐANG QUAY...',
                `[ ${r1} | ${r2} | ${r3} ]\n\n${multiplier > 0 ? `🎉 Trúng thưởng! Bạn nhận được **+${winnings.toLocaleString()} xu**!` : `😢 Mất trắng **${bet.toLocaleString()} xu** rồi bố tèo.`}`,
                MEDIA.slot
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'taixiu') {
            const choice = interaction.options.getString('luachon');
            const bet = interaction.options.getInteger('sotien');

            if (bet <= 0 || eco.balance < bet) {
                return interaction.reply({ content: '❌ Số xu cược không hợp lệ hoặc tài khoản không đủ!', ephemeral: true });
            }

            eco.balance -= bet;

            const loadingEmbed = createBaseEmbed(0xFFA500, '🎲 NHÀ CÁI ĐANG LẮC XÚC SẮC...', 'Đợi chút nhé, vận may sắp đến rồi!', MEDIA.dice);
            await interaction.reply({ embeds: [loadingEmbed] });

            await new Promise(resolve => setTimeout(resolve, 2000));

            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const d3 = Math.floor(Math.random() * 6) + 1;
            const total = d1 + d2 + d3;
            const outcome = total >= 11 ? 'tai' : 'xiu';

            const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const win = choice === outcome;

            if (win) {
                eco.balance += bet * 2;
            }
            saveUserData(userId, eco);

            const resultEmbed = createBaseEmbed(
                win ? 0x00FF00 : 0xFF0000,
                win ? '🎉 KẾT QUẢ TÀI XỈU: CHIẾN THẮNG!' : '💸 KẾT QUẢ TÀI XỈU: THUA CUỘC!',
                `Xúc xắc: ${diceEmojis[d1]} ${diceEmojis[d2]} ${diceEmojis[d3]} (Tổng: **${total} điểm** - **${outcome.toUpperCase()}**)\n` +
                `Lựa chọn của bạn: **${choice.toUpperCase()}**\n` +
                `${win ? `🎉 Thưởng nhận được: +${bet * 2} xu` : `❌ Mất cược: -${bet} xu`}\n\n` +
                `🪙 Số dư ví mới: **${eco.balance.toLocaleString()} xu**`,
                MEDIA.trailerVideo
            );
            await interaction.editReply({ embeds: [resultEmbed] });
        }
        else if (commandName === 'checkavatar') {
            const targetUser = interaction.options.getUser('nguoidung') || interaction.user;
            const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });

            const embed = createBaseEmbed(
                0x3498DB,
                `🖼️ Ảnh Đại Diện Của ${targetUser.username}`,
                `[🔗 Bấm vào đây để tải ảnh gốc chất lượng cao](${avatarURL})`,
                avatarURL
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'doananime') {
            const character = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
            await interaction.reply({
                embeds: [createBaseEmbed(0x9B59B6, '🧠 MINIGAME WEEBU 100 NHÂN VẬT', `💡 Gợi ý: **${character.hint}**\n\n⏱️ Bạn có 15 giây để gõ tên nhân vật vào kênh này!`, character.image)]
            });

            const filter = m => m.author.id === userId;
            try {
                const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
                const answer = collected.first().content.trim().toLowerCase();

                if (answer.includes(character.name)) {
                    eco.balance += 300;
                    saveUserData(userId, eco);
                    await interaction.followUp({ content: `🎉 Chuẩn cmnr! Bổn cung thưởng cho bạn **+300 xu**. (Đáp án: **${character.display}**)` });
                } else {
                    await interaction.followUp({ content: `❌ Sai bét rồi! Đáp án đúng là **${character.display}**.` });
                }
            } catch {
                await interaction.followUp({ content: `⏱️ Hết 15 giây rồi! Đáp án là **${character.display}**.` });
            }
        }
        else if (commandName === 'nongtrai') {
            const sub = interaction.options.getSubcommand();
            if (sub === 'vuon') {
                const plotStatus = eco.plots.map((p, i) => `Ô đất số ${i + 1}: ${p ? `🌱 ${p.name}` : '🌱 Trống'}`).join('\n');
                const embed = createBaseEmbed(
                    0x2ECC71,
                    `🌾 Nông Trại Cá Nhân Của ${interaction.user.username}`,
                    `Trạng thái các ô trồng trọt:\n${plotStatus}`,
                    MEDIA.farm
                );
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'trangtrai') {
                const embed = createBaseEmbed(
                    0xE67E22,
                    `🚜 Khu Vực Trang Trại Tổng Quan`,
                    `Chào mừng bạn đến với khu sinh thái trang trại rộng lớn, nơi chăn nuôi và phát triển kinh tế!`,
                    MEDIA.farm
                );
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'thuhoach') {
                const plotIndex = interaction.options.getInteger('oodat') - 1;
                if (plotIndex < 0 || plotIndex >= eco.plots.length) {
                    return interaction.reply({ content: '❌ Ô đất không tồn tại!', ephemeral: true });
                }

                const plot = eco.plots[plotIndex];
                if (!plot) return interaction.reply({ content: '❌ Ô này đang bỏ hoang!', ephemeral: true });
                if (Date.now() < plot.plantTime + plot.duration) {
                    return interaction.reply({ content: '🌱 Cây chưa chín bờ ơi, định ăn trái non à?', ephemeral: true });
                }

                eco.balance += plot.profit;
                const profitText = plot.profit;
                const plantName = plot.name;
                eco.plots[plotIndex] = null;
                saveUserData(userId, eco);

                await interaction.reply({
                    embeds: [createBaseEmbed(0xF1C40F, '🌾 THU HOẠCH THÀNH CÔNG', `Bạn thu hoạch **${plantName}** và bán vội được **+${profitText.toLocaleString()} xu**!`, MEDIA.farm)]
                });
            }
        }
        else if (commandName === 'ai') {
            const sub = interaction.options.getSubcommand();
            const channelId = interaction.channelId;

            if (sub === 'on') {
                enableChannel(channelId);
                const embed = createBaseEmbed(0x57F287, '🤖 Trợ Lý AI Siêu Thông Minh Đã Bật', 'Bot đã sẵn sàng trò chuyện và giải đáp mọi thắc mắc cùng bạn trong kênh này!', MEDIA.ai_on);
                await interaction.reply({ embeds: [embed] });
            } else {
                disableChannel(channelId);
                const embed = createBaseEmbed(0xED4245, '💤 Trợ Lý AI Đã Tắt', 'Đã tạm dừng tính năng tự động trả lời.', MEDIA.ai_off);
                await interaction.reply({ embeds: [embed] });
            }
        }
    } catch (err) {
        logger.warn(err, `Lỗi lệnh ${interaction.commandName}`);
        if (!interaction.replied) await interaction.reply({ content: 'Oops, hệ thống gặp chút sự cố nhỏ!', ephemeral: true });
    }
});
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !isChannelEnabled(message.channelId)) return;

    try {
        await message.channel.sendTyping();

        if (!chatHistories.has(message.channelId)) {
            chatHistories.set(message.channelId, [
                { role: 'system', content: 'Bạn là một trợ lý ảo siêu thông minh, cực kỳ thân thiện, ngọt ngào, xưng hô cậu - tớ trong các nhóm chat Discord.' }
            ]);
        }

        const history = chatHistories.get(message.channelId);
        history.push({ role: 'user', content: `[Thành viên ${message.author.username}] nói: ${message.content}` });

        if (history.length > 8) history.shift();

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: history,
            temperature: 0.7
        });

        const replyText = response.choices[0].message.content;
        history.push({ role: 'assistant', content: replyText });

        await message.reply(replyText);
    } catch (err) {
        logger.warn(err, 'Lỗi kết nối OpenAI API');
        await message.reply('Úi, não bộ AI đang gặp chút sự cố kết nối chập chờn, cậu hỏi lại sau chút xíu nhé!');
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
        logger.warn(err, 'Lỗi nạp Slash Commands');
    }
});

client.login(process.env.DISCORD_TOKEN);

