import {
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
    EmbedBuilder, AttachmentBuilder, Partials, ActivityType,
    ChannelType, Events
} from 'discord.js';
import express from 'express';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));

const logger = {
    warn: (obj, msg) => console.warn(JSON.stringify({ level: 'warn', ...((typeof obj === 'string') ? { msg: obj } : { ...obj, msg }) }))
};

const aiChannels = new Set();
const userEconomy = new Map();

function enableChannel(channelId) { aiChannels.add(channelId); }
function disableChannel(channelId) { aiChannels.delete(channelId); }
function isChannelEnabled(channelId) { return aiChannels.has(channelId); }

const ALL_SEEDS = [
    { id: 'carot', name: '🥕 Củ Rốt Thường', rarity: 'Common', cost: 200, profit: 400, duration: 5 * 60 * 1000 },
    { id: 'bapcas', name: '🌽 Bắp Cải Xanh', rarity: 'Common', cost: 350, profit: 750, duration: 8 * 60 * 1000 },
    { id: 'dautay', name: '🍓 Dâu Tây Ngọt', rarity: 'Uncommon', cost: 600, profit: 1300, duration: 15 * 60 * 1000 },
    { id: 'cachua', name: '🍅 Cà Chua Mong Nước', rarity: 'Rare', cost: 900, profit: 2000, duration: 20 * 60 * 1000 },
    { id: 'duahau', name: '🍉 Dưa Hấu Khổng Lồ', rarity: 'Rare', cost: 1500, profit: 3500, duration: 30 * 60 * 1000 },
    { id: 'hoahong', name: '🌹 Hoa Hồng Bí Thẩn', rarity: 'Rare', cost: 2500, profit: 6000, duration: 45 * 60 * 1000 },
    { id: 'kincuong', name: '💎 Cây Kim Cương Phát Sáng', rarity: 'Epic', cost: 4000, profit: 10000, duration: 60 * 60 * 1000 },
    { id: 'hoatran', name: '✨ Hoa Trắng Sao Huyền Thoại', rarity: 'Legendary', cost: 8000, profit: 22000, duration: 120 * 60 * 1000 }
];

let currentShopStock = [];

function updateShopStock() {
    const count = Math.floor(Math.random() * 3) + 4;
    currentShopStock = [];
    for (let i = 0; i < count; i++) {
        const seed = ALL_SEEDS[Math.floor(Math.random() * ALL_SEEDS.length)];
        const stockQty = Math.floor(Math.random() * 8) + 3;
        currentShopStock.push({ ...seed, stock: stockQty });
    }
}
updateShopStock();
setInterval(updateShopStock, 60 * 60 * 1000);

const FISH_LIST = [
    { name: '🐟 Cá Rô Phi', price: 120, rarity: 'Common' },
    { name: '🐠 Cá Chép Vàng', price: 300, rarity: 'Uncommon' },
    { name: '🐡 Cá Nóc Phình', price: 650, rarity: 'Rare' },
    { name: '🦈 Cá Mập Con', price: 1800, rarity: 'Epic' },
    { name: '🐋 Cá Voi Xanh Huyền Thoại', price: 6000, rarity: 'Legendary' }
];

const ROD_PRICES = {
    carbon: 2000,
    titan: 10000
};

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1'
});

const MODEL_NAME = 'meta/llama-3.1-70b-instruct';
const SYSTEM_PROMPT = 'Bạn là một AI Gen Z siêu cấp lầy lội, thông minh, mỏ hỗn cực tình cảm. Viết hoàn toàn bằng chữ thường, không viết hoa đầu câu, không chấm câu cuối dòng.';

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            temperature: 0.8,
            max_tokens: 512
        });
        return completion.choices[0]?.message?.content || 'hông biết nói gì luôn á ngơ ngác chít đúm :v';
    } catch (e) {
        logger.warn(e, 'Nvidia AI error');
        return 'mạng lag quá bợn êi, từ từ hẵng réo :v';
    }
}

const ANIME_LIST = [
    { name: 'Monkey D. Luffy', hint: 'Thuyền trưởng mũ rơm, thích ăn thịt và có ước mơ làm Vua Hải Tác' },
    { name: 'Naruto Uzumaki', hint: 'Ninja làng Lá, có Cửu Vĩ bên trong và miệng hô "Battebayo"' },
    { name: 'Sasuke Uchiha', hint: 'Thiên tài tộc Uchiha, sở hữu đôi mắt Sharingan' },
    { name: 'Zoro Roronoa', hint: 'Kiếm sĩ phái tam kiếm, nổi tiếng với kỹ năng "mù đường"' },
    { name: 'Saitama', hint: 'Anh hùng đầu trọc đấm phát chết luôn một kẻ địch' },
    { name: 'Eren Yeager', hint: 'Nhân vật chính Attack on Titan với khát vọng tự do cháy bỏng' },
    { name: 'Levi Ackerman', hint: 'Đội trưởng chiến binh mạnh nhất nhân loại, cuồng sạch sẽ' },
    { name: 'Light Yagami', hint: 'Học sinh thiên tài nhặt được cuốn sổ tử thần Death Note' },
    { name: 'Anya Forger', hint: 'Cô bé đọc được suy nghĩ, thích ăn dưa phóng và biểu cảm "Heh"' },
    { name: 'Loid Forger', hint: 'Điệp viên đỉnh cao có mật danh "Twilight"' },
    { name: 'Yor Forger', hint: 'Sát thủ khét tiếng với mật danh "Thường Công Chúa"' },
    { name: 'Denji', hint: 'Thợ săn quỷ nghèo khổ, có ước mơ cực kỳ mặn mòi' },
    { name: 'Power', hint: 'Quỷ máu ngạo mạn, bạn thân của Denji' },
    { name: 'Makima', hint: 'Sĩ quan cấp cao điều khiển Chiến Hữu ác quỷ quyền lực' },
    { name: 'Katsuki Bakugo', hint: 'Thiếu gia nổ tung cá tính mạnh, bạn thời thơ ấu của Deku' },
    { name: 'Midoriya Izuku', hint: 'Cậu bé vô năng nhận lại sức mạnh One For All từ All Might' },
    { name: 'Jotaro Kujo', hint: 'Chàng trai ngầu lòi với Stand Star Platinum và câu cửa miệng "Yare yare daze"' },
    { name: 'Nezuko Kamado', hint: 'Cô em gái hóa quỷ ngậm ống tre đáng yêu' },
    { name: 'Rem', hint: 'Cô hầu gái tóc xanh trung thành trong Re:Zero' },
    { name: 'Kaneki Ken', hint: 'Chàng trai bán hoa sinh viên hóa thành bán quỷ mắt một' },
    { name: 'Killua Zoldyck', hint: 'Sát thủ thiên tài tóc bạc xuất thân từ gia đình Zoldyck' }
];
const commands = [
    new SlashCommandBuilder().setName('ai').setDescription('Bật/tắt chế độ AI tự động').addSubcommand(sub => sub.setName('on').setDescription('Bật AI')).addSubcommand(sub => sub.setName('off').setDescription('Tắt AI')).addSubcommand(sub => sub.setName('status').setDescription('Kiểm tra trạng thái AI')),
    new SlashCommandBuilder().setName('vi').setDescription('Kiểm tra tiền, cần câu và nông trại'),
    new SlashCommandBuilder().setName('diandanh').setDescription('Điểm danh nhận xu hàng ngày'),
    new SlashCommandBuilder().setName('chuyenxu').setDescription('Chuyển xu cho người chơi khác').addUserOption(opt => opt.setName('nguoinhan').setDescription('Người nhận').setRequired(true)).addIntegerOption(opt => opt.setName('sotien').setDescription('Số tiền chuyển').setRequired(true)),
    new SlashCommandBuilder().setName('coinflip').setDescription('Chơi tung đồng xu cược xu').addStringOption(opt => opt.setName('chon').setDescription('Chọn mặt').setRequired(true).addChoices({ name: 'Mặt Ngửa', value: 'ngua' }, { name: 'Mặt Sấp', value: 'sap' })),
    new SlashCommandBuilder().setName('doanso').setDescription('Đoán số may mắn từ 1 đến 100').addIntegerOption(opt => opt.setName('so').setDescription('Nhập số của bạn').setRequired(true)),
    new SlashCommandBuilder().setName('doananime').setDescription('Minigame đoán tên nhân vật Anime siêu vui'),
    new SlashCommandBuilder().setName('dice').setDescription('Đổ xí ngầu giải trí'),
    new SlashCommandBuilder().setName('slot').setDescription('Quay hũ Slot Machine săn Jackpot đổi đời').addIntegerOption(opt => opt.setName('sotien').setDescription('Số xu cược quay').setRequired(true)),
    new SlashCommandBuilder().setName('baucua').setDescription('Trò chơi dân gian Bầu Cưa Tôm Cá truyền thống').addStringOption(opt => opt.setName('chon').setDescription('Chọn linh vật cược').setRequired(true).addChoices({ name: 'Bầu', value: 'bau' }, { name: 'Cua', value: 'cua' }, { name: 'Tôm', value: 'tom' }, { name: 'Cá', value: 'ca' }, { name: 'Gà', value: 'ga' }, { name: 'Nai', value: 'nai' })).addIntegerOption(opt => opt.setName('sotien').setDescription('Số xu cược').setRequired(true)),
    new SlashCommandBuilder().setName('shop').setDescription('Xem cửa hàng hạt giống nông trại'),
    new SlashCommandBuilder().setName('nongtrai').setDescription('Hệ thống quản lý nông trại Roblox').addSubcommand(sub => sub.setName('vuon').setDescription('Xem khu vườn của bạn')).addSubcommand(sub => sub.setName('trong').setDescription('Trồng hạt giống').addIntegerOption(opt => opt.setName('oodat').setDescription('Số thứ tự ô đất').setRequired(true)).addStringOption(opt => opt.setName('loaicay').setDescription('Tên hạt giống').setRequired(true))).addSubcommand(sub => sub.setName('thuhoach').setDescription('Thu hoạch cây trồng').addIntegerOption(opt => opt.setName('oodat').setDescription('Số thứ tự ô đất').setRequired(true))).addSubcommand(sub => sub.setName('muadat').setDescription('Mở rộng thêm ô đất (2000 xu)')),
    new SlashCommandBuilder().setName('cauca').setDescription('Đi câu cá giải trí kiếm thu nhập'),
    new SlashCommandBuilder().setName('muacancau').setDescription('Nâng cấp cần câu tốt hơn').addStringOption(opt => opt.setName('loai').setDescription('Loại cần câu').setRequired(true).addChoices({ name: 'Cần Carbon', value: 'carbon' }, { name: 'Cần Titan', value: 'titan' })),
    new SlashCommandBuilder().setName('bxh').setDescription('Xem bảng xếp hạng đại gia giàu nhất server')
].map(c => c.toJSON());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] };

    try {
        if (interaction.commandName === 'ai') {
            const sub = interaction.options.getSubcommand();
            const channelId = interaction.channelId;
            if (sub === 'on') {
                enableChannel(channelId);
                const embed = new EmbedBuilder().setColor(0x00FF00).setDescription('🟢 Đã bật chế độ AI tự động trong kênh này!');
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'off') {
                disableChannel(channelId);
                const embed = new EmbedBuilder().setColor(0xFF0000).setDescription('🔴 Đã tắt chế độ AI tự động trong kênh này!');
                await interaction.reply({ embeds: [embed] });
            } else {
                const status = isChannelEnabled(channelId) ? 'BẬT 🟢' : 'TẮT 🔴';
                const embed = new EmbedBuilder().setColor(0x00AEB6).setDescription(`🌐 Trạng thái AI tại kênh này đang: **${status}**`);
                await interaction.reply({ embeds: [embed] });
            }
        } else if (interaction.commandName === 'vi') {
            const embed = new EmbedBuilder()
                .setTitle(`🌾 VÍ TIỀN & NÔNG TRẠI CỦA ${interaction.user.username.toUpperCase()}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: '💰 Số dư', value: `${ecoData.balance.toLocaleString()} xu`, inline: true },
                    { name: '🔥 Điểm danh liên tiếp', value: `${ecoData.streak} ngày`, inline: true },
                    { name: '🎣 Cần câu hiện tại', value: `${ecoData.rod.toUpperCase()}`, inline: true },
                    { name: '🐟 Số cá đã câu', value: `${ecoData.fishes.length} con`, inline: true },
                    { name: '🌱 Tổng số ô đất', value: `${ecoData.plots.length}`, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'diandanh') {
            const now = Date.now();
            const diff = now - ecoData.lastDaily;
            const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
            if (diff < 24 * 60 * 60 * 1000) {
                const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('❌ ĐÃ ĐIỂM DANH RỒI').setDescription(`Bạn đã nhận quà hôm nay rồi. Vui lòng quay lại sau khoảng **${hoursLeft} giờ** nữa nhé!`);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            ecoData.balance += 500;
            ecoData.lastDaily = now;
            ecoData.streak += 1;
            userEconomy.set(userId, ecoData);
            const embed = new EmbedBuilder().setColor(0x00FF00).setTitle('🎁 ĐIỂM DANH THÀNH CÔNG').setDescription(`Nhận ngay **500 xu** vào tài khoản! Chuỗi điểm danh: **${ecoData.streak} ngày**.`);
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'coinflip') {
            const choice = interaction.options.getString('chon');
            const result = Math.random() < 0.5 ? 'ngua' : 'sap';
            const win = choice === result;
            ecoData.balance += win ? 200 : -200;
            userEconomy.set(userId, ecoData);
            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle('🪙 MINIGAME TUNG ĐỒNG XU')
                .addFields(
                    { name: '🎯 Bạn chọn', value: choice.toUpperCase(), inline: true },
                    { name: '🎲 Kết quả', value: result.toUpperCase(), inline: true },
                    { name: '💰 Kết quả tài chính', value: win ? '🎉 Thắng lớn **+200 xu**' : '😢 Thua cược **-200 xu**' }
                );
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'doanso') {
            const guess = interaction.options.getInteger('so');
            const secret = Math.floor(Math.random() * 100) + 1;
            const win = guess === secret;
            if (win) ecoData.balance += 5000;
            userEconomy.set(userId, ecoData);
            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle('🔢 MINIGAME ĐOÁN SỐ MAY MẮN')
                .addFields(
                    { name: '🎯 Số bạn chọn', value: `${guess}`, inline: true },
                    { name: '🤫 Con số bí ẩn', value: `${secret}`, inline: true },
                    { name: '🏆 Kết quả', value: win ? '🎉 Chính xác tuyệt đối! Nhận ngay +5.000 xu!' : '😢 Sai rồi! Chúc bạn may mắn lần sau.' }
                );
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'doananime') {
            await interaction.deferReply();
            const sel = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
            const startEmbed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle('🏆 ĐOÁN TÊN NHÂN VẬT ANIME')
                .setDescription(`💡 Gợi ý: **${sel.hint}**\n\nNhanh tay chat tên nhân vật vào kênh trong **30 giây** để nhận thưởng **1,000 xu**!`)
                .setFooter({ text: 'Hệ thống đang chờ câu trả lời từ các thành viên...' });
            
            await interaction.editReply({ embeds: [startEmbed] });

            try {
                const collected = await interaction.channel.awaitMessages({
                    filter: m => m.content.toLowerCase().includes(sel.name.toLowerCase()) && !m.author.bot,
                    max: 1,
                    time: 30000,
                    errors: ['time']
                });

                const winnerMsg = collected.first();
                const winnerId = winnerMsg.author.id;
                let wEco = userEconomy.get(winnerId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] };
                wEco.balance += 1000;
                userEconomy.set(winnerId, wEco);

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('🎉 ĐOÁN ĐÚNG NHÂN VẬT ANIME!')
                    .setDescription(`✅ Chính xác! Nhân vật đó là **${sel.name}**.\n\n🏆 Xin chúc mừng <@${winnerId}> đã giành chiến thắng và nhận **1,000 xu**!`);
                
                await interaction.channel.send({ embeds: [winEmbed] });
            } catch (e) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x95A5A6)
                    .setTitle('⏰ HẾT GIỜ!')
                    .setDescription(`Không ai đoán đúng đáp án là **${sel.name}** cả.`);
                await interaction.channel.send({ embeds: [timeoutEmbed] });
            }
        } else if (interaction.commandName === 'dice') {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const sum = d1 + d2;
            const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('🎲 KẾT QUẢ XÍ NGẦU').setDescription(`Xí ngầu ra: **[${d1}]** và **[${d2}]**\nTổng điểm: **${sum}**`);
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'slot') {
            const amount = interaction.options.getInteger('sotien');
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Số tiền cược không hợp lệ hoặc vượt quá số dư!')], ephemeral: true });
                return;
            }
            const symbols = ['🍒', '🍋', '🔔', '⭐', '💎'];
            const s1 = symbols[Math.floor(Math.random() * symbols.length)];
            const s2 = symbols[Math.floor(Math.random() * symbols.length)];
            const s3 = symbols[Math.floor(Math.random() * symbols.length)];
            let mult = 0;
            if (s1 === s2 && s2 === s3) {
                mult = s1 === '💎' ? 10 : (s1 === '⭐' ? 7 : 5);
            } else if (s1 === s2 || s2 === s3 || s1 === s3) {
                mult = 1.5;
            }
            const winAmount = Math.floor(amount * mult);
            const win = mult > 0;
            ecoData.balance += win ? winAmount - amount : -amount;
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle('🎰 QUAY HŨ SLOT MACHINE')
                .setDescription(`Slot: **[ ${s1} | ${s2} | ${s3} ]**\n\n${win ? `🎉 Trúng lớn hệ số x${mult}! Nhận **+${winAmount.toLocaleString()} xu**` : '😢 Chúc bạn may mắn lần sau, mất trắng cược!'}`);
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'baucua') {
            const choice = interaction.options.getString('chon');
            const amount = interaction.options.getInteger('sotien');
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Không đủ số dư để đặt cược bầu cua!')], ephemeral: true });
                return;
            }
            const icons = { bau: '🌿', cua: '🦀', tom: '🦐', ca: '🐟', ga: '🐓', nai: '🦌' };
            const keys = Object.keys(icons);
            const r1 = keys[Math.floor(Math.random() * keys.length)];
            const r2 = keys[Math.floor(Math.random() * keys.length)];
            const r3 = keys[Math.floor(Math.random() * keys.length)];
            const matches = [r1, r2, r3].filter(k => k === choice).length;
            const reward = matches * amount;
            const win = matches > 0;
            ecoData.balance += win ? reward : -amount;
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle('🎲 KẾT QUẢ BẦU CƯA TÔM CÁ')
                .setDescription(`Kết quả: **[${icons[r1]}] [${icons[r2]}] [${icons[r3]}]**\n\n${win ? `🎉 Trúng ${matches} con! Thưởng **+${reward.toLocaleString()} xu**` : '😢 Không trúng con nào, mất tiền cược!'}`);
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'shop') {
            const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle('🛒 CỬA HÀNG HẠT GIỐNG NÔNG TRẠI');
            currentShopStock.forEach(item => {
                embed.addFields({
                    name: `${item.name} (\`${item.id}\`)`,
                    value: `⭐ Độ hiếm: ${item.rarity} | Giá mua: **${item.cost.toLocaleString()} xu** | Lãi: **${item.profit.toLocaleString()} xu** (${item.duration / 60000} phút) | Kho còn lại: **${item.stock} hạt**`,
                    inline: false
                });
            });
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'nongtrai') {
            const sub = interaction.options.getSubcommand();
            if (sub === 'vuon') {
                const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle(`🌱 KHU VƯỜN NÔNG TRẠI CỦA ${interaction.user.username}`);
                ecoData.plots.forEach((p, idx) => {
                    if (!p) {
                        embed.addFields({ name: `Ô đất #${idx + 1}`, value: '🟫 Đất trống (Sẵn sàng trồng trọt)', inline: false });
                    } else {
                        const mins = Math.ceil((p.harvestTime - Date.now()) / 60000);
                        const desc = mins <= 0 ? '✨ Cây đã lớn, có thể thu hoạch ngay!' : `🌿 Đang lớn (~${mins} phút nữa)`;
                        embed.addFields({ name: `Ô đất #${idx + 1} - ${p.name}`, value: desc, inline: false });
                    }
                });
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'muadat') {
                if (ecoData.balance < 2000 || ecoData.plots.length >= 6) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Không đủ 2000 xu hoặc nông trại đã đạt tối đa 6 ô đất!')], ephemeral: true });
                    return;
                }
                ecoData.balance -= 2000;
                ecoData.plots.push(null);
                userEconomy.set(userId, ecoData);
                const embed = new EmbedBuilder().setColor(0x00FF00).setTitle('✨ MỞ RỘNG THÀNH CÔNG').setDescription(`Nông trại của bạn giờ đã sở hữu **${ecoData.plots.length} ô đất**.`);
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'trong') {
                const pidx = interaction.options.getInteger('oodat') - 1;
                const sid = interaction.options.getString('loaicay').toLowerCase();
                if (pidx < 0 || pidx >= ecoData.plots.length || ecoData.plots[pidx] !== null) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Ô đất không hợp lệ hoặc đang có cây trồng khác!')], ephemeral: true });
                    return;
                }
                const item = currentShopStock.find(s => s.id === sid);
                if (!item || item.stock <= 0 || ecoData.balance < item.cost) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Hạt giống không có trong shop, đã hết hàng hoặc bạn không đủ xu!')], ephemeral: true });
                    return;
                }
                item.stock--;
                ecoData.balance -= item.cost;
                ecoData.plots[pidx] = { name: item.name, reward: item.profit, harvestTime: Date.now() + item.duration };
                userEconomy.set(userId, ecoData);
                const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle('🌱 GIEO TRỒNG THÀNH CÔNG').setDescription(`Đã gieo trồng **${item.name}** vào ô đất #${pidx + 1}! Đợi **${item.duration / 60000} phút** để thu hoạch.`);
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'thuhoach') {
                const pidx = interaction.options.getInteger('oodat') - 1;
                if (pidx < 0 || pidx >= ecoData.plots.length || !ecoData.plots[pidx] || Date.now() < ecoData.plots[pidx].harvestTime) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Ô đất đang trống hoặc cây trồng chưa lớn để thu hoạch!')], ephemeral: true });
                    return;
                }
                const p = ecoData.plots[pidx];
                ecoData.balance += p.reward;
                ecoData.plots[pidx] = null;
                userEconomy.set(userId, ecoData);
                const embed = new EmbedBuilder().setColor(0x00FF00).setTitle('🌾 THU HOẠCH THÀNH CÔNG').setDescription(`Thu hoạch thành công **${p.name}** tại ô đất #${pidx + 1}! Bỏ túi **+${p.reward.toLocaleString()} xu**.`);
                await interaction.reply({ embeds: [embed] });
            }
        } else if (interaction.commandName === 'cauca') {
            let chance = Math.random();
            let caughtFish;
            if (ecoData.rod === 'titan') {
                if (chance < 0.3) caughtFish = FISH_LIST[4];
                else if (chance < 0.6) caughtFish = FISH_LIST[3];
                else caughtFish = FISH_LIST[2];
            } else if (ecoData.rod === 'carbon') {
                if (chance < 0.2) caughtFish = FISH_LIST[3];
                else if (chance < 0.6) caughtFish = FISH_LIST[2];
                else caughtFish = FISH_LIST[1];
            } else {
                if (chance < 0.5) caughtFish = FISH_LIST[0];
                else if (chance < 0.8) caughtFish = FISH_LIST[1];
                else caughtFish = FISH_LIST[2];
            }
            ecoData.fishes.push(caughtFish);
            ecoData.balance += caughtFish.price;
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (isChannelEnabled(message.channelId)) {
        await message.channel.sendTyping();
        const history = [{ role: 'user', content: message.content }];
        const reply = await callNvidiaAI(history);
        await message.reply(reply);
    }
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (e) {
        console.error(e);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
                   userEconomy.set(userId,      
