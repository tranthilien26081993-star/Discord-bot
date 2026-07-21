import { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    EmbedBuilder, AttachmentBuilder, Partials, ActivityType, ChannelType 
} from 'discord.js';
import express from 'express';
import OpenAI from 'openai';

const logger = {
    info: (obj, msg) => console.log(JSON.stringify({ level: "info", ...((typeof obj === 'string') ? { msg: obj } : {...obj, msg }) })),
    error: (obj, msg) => console.error(JSON.stringify({ level: "error", ...((typeof obj === 'string') ? { msg: obj } : {...obj, msg }) })),
    warn: (obj, msg) => console.warn(JSON.stringify({ level: "warn", ...((typeof obj === 'string') ? { msg: obj } : {...obj, msg }) }))
};

const enabledChannels = new Set();
const userLevels = new Map();
const userEconomy = new Map();
const aiChannels = new Set();

const ALL_SEEDS = [
    { id: "carot", name: "🥕 Củ Rốt Thường", rarity: "Common", cost: 200, profit: 400, duration: 5 * 60 * 1000 },
    { id: "bapcai", name: "🥬 Bắp Cải Xanh", rarity: "Common", cost: 350, profit: 750, duration: 8 * 60 * 1000 },
    { id: "dautay", name: "🍓 Dâu Tây Ngọt", rarity: "Uncommon", cost: 600, profit: 1300, duration: 15 * 60 * 1000 },
    { id: "cachua", name: "🍅 Cà Chua Mong Nước", rarity: "Uncommon", cost: 900, profit: 2000, duration: 20 * 60 * 1000 },
    { id: "duahau", name: "🍉 Dưa Hấu Khổng Lồ", rarity: "Rare", cost: 1500, profit: 3500, duration: 30 * 60 * 1000 },
    { id: "hoahong", name: "🌹 Hoa Hồng Bồ Thân Kỳ", rarity: "Rare", cost: 2500, profit: 6000, duration: 45 * 60 * 1000 },
    { id: "kincuong", name: "💎 Cây Kim Cương Phát Sáng", rarity: "Epic", cost: 4000, profit: 10000, duration: 60 * 60 * 1000 },
    { id: "hoatram", name: "🌟 Hoa Trăng Sao Huyền Thoại", rarity: "Legendary", cost: 8000, profit: 22000, duration: 120 * 60 * 1000 }
];

let currentShopStock = [];
let lastRestockTime = 0;
const RESTOCK_INTERVAL = 6 * 60 * 60 * 1000;

function updateShopStock() {
    const now = Date.now();
    if (currentShopStock.length === 0 || now - lastRestockTime >= RESTOCK_INTERVAL) {
        lastRestockTime = now;
        const shuffled = [...ALL_SEEDS].sort(() => 0.5 - Math.random());
        const count = Math.floor(Math.random() * 3) + 4;
        currentShopStock = [];
        for (let i = 0; i < count; i++) {
            const seed = shuffled[i];
            const stockQty = Math.floor(Math.random() * 8) + 3;
            currentShopStock.push({ ...seed, stock: stockQty });
        }
    }
}
updateShopStock();

function isChannelEnabled(channelId) {
    return enabledChannels.has(channelId);
}
function enableChannel(channelId) {
    enabledChannels.add(channelId);
}
function disableChannel(channelId) {
    enabledChannels.delete(channelId);
}

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1"
});

const MODEL_NAME = "meta/llama-3.1-70b-instruct";

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: messages,
            temperature: 0.95,
            max_tokens: 512,
            presence_penalty: 0.8,
            frequency_penalty: 0.6
        });
        return completion.choices[0]?.message?.content || "gì đấy nói lại xem";
    } catch (err) {
        logger.error(err, "Lỗi gọi API NVIDIA");
        return "Hệ thống AI đang bận chút, thử lại sau nhé!";
    }
}

async function generateImage(prompt, nsfw = false) {
    try {
        const encoded = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1_000_000);
        const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&safe=${nsfw ? "false" : "true"}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error("Không thể tạo ảnh từ dịch vụ ngoài.");
        return Buffer.from(await res.arrayBuffer());
    } catch (err) {
        logger.error(err, "Lỗi tạo ảnh generateImage");
        return null;
    }
}

const SYSTEM_PROMPT = "Bạn là một AI bạn thân Gen Z siêu cấp lầy lội, thông minh, mỏ hỗn cực kỳ tình cảm. Viết hoàn toàn bằng chữ thường, không viết hoa đầu câu, không chấm câu cuối dòng.";

const ANIME_LIST = [
    { name: "Monkey D. Luffy", hint: "Thuyền trưởng mũ rơm, thích ăn thịt và có ước mơ làm Vua Hải Tặc" },
    { name: "Naruto Uzumaki", hint: "Ninja làng Lá, có Cửu Vĩ bên trong và miệng hô 'Dattebayo'" },
    { name: "Son Goku", hint: "Người Saiyan nuôi dưỡng ở Trái Đất, thích tỉ thí võ công" },
    { name: "Tanjiro Kamado", hint: "Thợ săn quỷ có vết sẹo trên trán, luôn mang theo em gái hóa quỷ" },
    { name: "Gojo Satoru", hint: "Thầy giáo tóc trắng mắt xanh mạnh nhất chủ thuật hội" },
    { name: "Sasuke Uchiha", hint: "Thiên tài tộc Uchiha, sở hữu đôi mắt Sharingan" },
    { name: "Zoro Roronoa", hint: "Kiếm sĩ phái tam kiếm, nổi tiếng với kỹ năng 'mù đường'" },
    { name: "Saitama", hint: "Anh hùng đấm phát chết luôn một kẻ địch" },
    { name: "Eren Yeager", hint: "Nhân vật chính Attack on Titan với khát vọng tự do cháy bỏng" },
    { name: "Levi Ackerman", hint: "Đội trưởng chiến binh mạnh nhất nhân loại, cuồng sạch sẽ" }
];

const commands = [
    new SlashCommandBuilder().setName("ai").setDescription("Quản lý hệ thống AI tự động trả lời trong kênh này")
        .addSubcommand(sub => sub.setName("on").setDescription("Bật AI tự động"))
        .addSubcommand(sub => sub.setName("off").setDescription("Tắt AI tự động"))
        .addSubcommand(sub => sub.setName("status").setDescription("Xem trạng thái")),
    new SlashCommandBuilder().setName("imagine").setDescription("Tạo ảnh AI từ nóa cực nét")
        .addStringOption(opt => opt.setName("prompt").setDescription("Mô tả bức ảnh").setRequired(true))
        .addBooleanOption(opt => opt.setName("nsfw").setDescription("Bật cờ NSFW").setRequired(false)),
    new SlashCommandBuilder().setName("summary").setDescription("Tóm tắt nhanh các tin nhắn gần đây"),
    new SlashCommandBuilder().setName("rank").setDescription("Xem cấp độ (Level) và XP của bạn"),
    new SlashCommandBuilder().setName("vi").setDescription("Kiểm tra ví tiền và nông trại"),
    new SlashCommandBuilder().setName("diemdanh").setDescription("Điểm danh nhận xu hàng ngày"),
    new SlashCommandBuilder().setName("coinflip").setDescription("Chơi tung đồng xu cược xu")
        .addStringOption(opt => opt.setName("chon").setDescription("Chọn mặt").setRequired(true)
            .addChoices({ name: "Mặt Ngửa", value: "ngua" }, { name: "Mặt Sấp", value: "sap" }))
        .addIntegerOption(opt => opt.setName("sotien").setDescription("Số lượng xu cược").setRequired(true)),
    new SlashCommandBuilder().setName("taixiu").setDescription("Chơi minigame Tài Xỉu hiệu ứng xin xịn")
        .addStringOption(opt => opt.setName("chon").setDescription("Chọn Tài/Xỉu").setRequired(true)
            .addChoices({ name: "Tài", value: "tai" }, { name: "Xỉu", value: "xiu" }))
        .addIntegerOption(opt => opt.setName("sotien").setDescription("Số lượng xu cược").setRequired(true)),
    new SlashCommandBuilder().setName("doanso").setDescription("Đoán số may mắn từ 1 đến 100")
        .addIntegerOption(opt => opt.setName("so").setDescription("Nhập số của bạn").setRequired(true)),
    new SlashCommandBuilder().setName("doananime").setDescription("Minigame đoán tên nhân vật Anime siêu vui"),
    new SlashCommandBuilder().setName("shop").setDescription("Xem cửa hàng hạt giống nông trại"),
    new SlashCommandBuilder().setName("nongtrai").setDescription("Hệ thống quản lý nông trại Roblox")
        .addSubcommand(sub => sub.setName("vuon").setDescription("Xem khu vườn của bạn"))
        .addSubcommand(sub => sub.setName("trong").setDescription("Trồng hạt giống")
            .addIntegerOption(opt => opt.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true))
            .addStringOption(opt => opt.setName("loaicay").setDescription("ID hạt giống").setRequired(true)))
        .addSubcommand(sub => sub.setName("thuhoach").setDescription("Thu hoạch cây trồng")
            .addIntegerOption(opt => opt.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true)))
        .addSubcommand(sub => sub.setName("muadat").setDescription("Mở rộng thêm ô đất (2000 xu)")),
    new SlashCommandBuilder().setName("buitarot").setDescription("Bói bài Tarot định mệnh"),
    new SlashCommandBuilder().setName("dice").setDescription("Đổ xúc xắc giải trí"),
    new SlashCommandBuilder().setName("avatar").setDescription("Xem ảnh đại diện chất lượng cao")
        .addUserOption(opt => opt.setName("nguoidung").setDescription("Thành viên cần xem").setRequired(false)),
    new SlashCommandBuilder().setName("chuyenxu").setDescription("Chuyển xu cho người chơi khác")
        .addUserOption(opt => opt.setName("nguoinhan").setDescription("Người nhận xu").setRequired(true))
        .addIntegerOption(opt => opt.setName("sotien").setDescription("Số tiền chuyển").setRequired(true))
].map(c => c.toJSON());
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

async function registerSlashCommands(clientId, token) {
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        logger.info("Đăng ký thành công toàn bộ Slash Commands lên Discord!");
    } catch (err) {
        logger.error(err, "Lỗi đăng ký lệnh");
    }
}

function handleEconomyAndLeveling(userId, message) {
    let lvlData = userLevels.get(userId) || { xp: 0, level: 1 };
    lvlData.xp += Math.floor(Math.random() * 10) + 5;
    if (lvlData.xp >= lvlData.level * 100) {
        lvlData.level += 1;
        lvlData.xp = 0;
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setDescription(`🎉 Chúc mừng <@${userId}> đã thăng hạng lên **cấp ${lvlData.level}**, nhận ngay 500 xu thưởng nóng!`);
        message.channel.send({ embeds: [embed] }).catch(err => logger.error(err));
        
        let eco = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] };
        eco.balance += 500;
        userEconomy.set(userId, eco);
    }
    userLevels.set(userId, lvlData);
}

client.once(Events.ClientReady, async (readyClient) => {
    readyClient.user.setPresence({ status: "online", activities: [{ name: "Grow a Garden & Minigames 🌱", type: ActivityType.Custom }] });
    await registerSlashCommands(readyClient.user.id, process.env.DISCORD_BOT_TOKEN);
    logger.info(`Bot đã đăng nhập thành công với tên ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;

    if (!userEconomy.has(userId)) {
        userEconomy.set(userId, {
            balance: 1000,
            lastDaily: 0,
            streak: 0,
            plots: [null, null],
            rod: 'tre',
            fishes: []
        });
    }
    let ecoData = userEconomy.get(userId);
    updateShopStock();

    try {
        if (interaction.commandName === "ai") {
            const sub = interaction.options.getSubcommand();
            if (sub === "on") {
                enableChannel(interaction.channelId);
                const embed = new EmbedBuilder().setColor(0x00FF00).setDescription("🟢 Đã bật chế độ AI tự động trò chuyện trong kênh này (Cần tag bot để trò chuyện!)");
                await interaction.reply({ embeds: [embed] });
            } else if (sub === "off") {
                disableChannel(interaction.channelId);
                const embed = new EmbedBuilder().setColor(0xFF0000).setDescription("🔴 Đã tắt chế độ AI tự động trong kênh này!");
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder().setColor(0x00AE86).setDescription(`💬 Trang thái AI tại kênh này đang: **${isChannelEnabled(interaction.channelId) ? "BẬT 🟢" : "TẮT 🔴"}**`);
                await interaction.reply({ embeds: [embed] });
            }
        }
        else if (interaction.commandName === "vi") {
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`💰 VÍ TIỀN & NÔNG TRẠI CỦA ${interaction.user.username.toUpperCase()}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "🪙 Số dư", value: `${ecoData.balance.toLocaleString()} xu`, inline: true },
                    { name: "🔥 Điểm danh liên tiếp", value: `${ecoData.streak} ngày`, inline: true },
                    { name: "🌱 Tổng số ô đất", value: `${ecoData.plots.length}`, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "diemdanh") {
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            if (ecoData.lastDaily && now - ecoData.lastDaily < cooldown) {
                const remainingMs = cooldown - (now - ecoData.lastDaily);
                const hoursLeft = Math.ceil(remainingMs / (1000 * 60 * 60));
                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle("❌ ĐÃ ĐIỂM DANH RỒI")
                    .setDescription(`Bạn đã nhận quà hôm nay rồi. Vui lòng quay lại sau khoảng **${hoursLeft} giờ** nữa nhé!`);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            ecoData.streak = (ecoData.lastDaily && now - ecoData.lastDaily < 48 * 60 * 60 * 1000) ? ecoData.streak + 1 : 1;
            const reward = 500 + (ecoData.streak * 100);
            ecoData.balance += reward;
            ecoData.lastDaily = now;
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("✅ ĐIỂM DANH THÀNH CÔNG")
                .setDescription(`🎉 Điểm danh ngày thứ **${ecoData.streak}** thành công!\n🎁 Nhận ngay phần thưởng: **${reward.toLocaleString()} xu**.`);
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "coinflip") {
            const choice = interaction.options.getString("chon", true);
            const amount = interaction.options.getInteger("sotien", true);
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Số tiền cược không hợp lệ hoặc vượt quá số dư!")], ephemeral: true });
                return;
            }
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle("🪙 TUNG ĐỒNG XU").setDescription("⏳ Đang tung đồng xu lên không trung...")] });
            await new Promise(r => setTimeout(r, 800));

            const result = Math.random() < 0.5 ? "ngua" : "sap";
            const win = (choice === result);
            ecoData.balance += (win ? amount : -amount);
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle("🪙 MINIGAME TUNG ĐỒNG XU")
                .addFields(
                    { name: "🎯 Bạn chọn", value: `${choice.toUpperCase()}`, inline: true },
                    { name: "🎲 Kết quả quay", value: `${result.toUpperCase()}`, inline: true },
                    { name: "📊 Kết quả tài chính", value: win ? `🎉 Thắng lớn **+${amount.toLocaleString()} xu**` : `📉 Thua cược **-${amount.toLocaleString()} xu**`, inline: false }
                );
            await interaction.editReply({ embeds: [embed] });
        }
        else if (interaction.commandName === "taixiu") {
            const choice = interaction.options.getString("chon", true);
            const amount = interaction.options.getInteger("sotien", true);
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Không đủ tiền cược!")], ephemeral: true });
                return;
            }
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle("🎲 LẮC TÀI XỈU").setDescription("⏳ Đang lắc xúc xắc...")] });
            await new Promise(r => setTimeout(r, 900));

            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const d3 = Math.floor(Math.random() * 6) + 1;
            const total = d1 + d2 + d3;
            const ketqua = total >= 11 ? "tai" : "xiu";
            const win = (choice === ketqua);
            ecoData.balance += (win ? amount : -amount);
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x00FF00 : 0xFF0000)
                .setTitle("🎲 KẾT QUẢ TÀI XỈU")
                .setDescription(`Kết quả xúc xắc: **[${d1}] [${d2}] [${d3}]** -> Tổng: **${total} điểm (${ketqua.toUpperCase()})**\n${win ? `🎉 Chúc mừng bạn ăn **+${amount.toLocaleString()} xu**!` : `😢 Chia buồn, bạn thua cược **-${amount.toLocaleString()} xu**!`}\nTổng ví: **${ecoData.balance.toLocaleString()} xu**.`);
            await interaction.editReply({ embeds: [embed] });
        }
        else if (interaction.commandName === "imagine") {
            const prompt = interaction.options.getString("prompt", true);
            const nsfw = interaction.options.getBoolean("nsfw") ?? false;
            await interaction.deferReply();
            const buf = await generateImage(prompt, nsfw);
            if (!buf) {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Không thể tạo ảnh do lỗi kết nối.")] });
                return;
            }
            const attachment = new AttachmentBuilder(buf, { name: "generated.png" });
            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle("🎨 TẠO ẢNH AI THÀNH CÔNG")
                .setImage("attachment://generated.png");
            await interaction.editReply({ embeds: [embed], files: [attachment] });
        }
        else if (interaction.commandName === "summary") {
            await interaction.deferReply();
            const msgs = await interaction.channel.messages.fetch({ limit: 20 });
            const textBlock = msgs.reverse().map(m => `${m.author.username}: ${m.content}`).join("\n");
            const res = await callNvidiaAI([
                { role: "system", content: "Tóm tắt ngắn gọn, hài hước bằng tiếng Việt." },
                { role: "user", content: `Tóm tắt các tin nhắn sau:\n${textBlock}` }
            ]);
            const embed = new EmbedBuilder().setColor(0x3498DB).setTitle("📝 TÓM TẮT HOẠT ĐỘNG KÊNH").setDescription(res).setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
        else if (interaction.commandName === "rank") {
            const lvlData = userLevels.get(userId) || { xp: 0, level: 1 };
            const nextLevelXp = lvlData.level * 100;
            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle("📊 BẢNG XẾP HẠNG CẤP ĐỘ")
                .addFields(
                    { name: "⭐ Cấp độ (Level)", value: `**${lvlData.level}**`, inline: true },
                    { name: "✨ Điểm kinh nghiệm", value: `**${lvlData.xp} / ${nextLevelXp}** XP`, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "doanso") {
            const guess = interaction.options.getInteger("so", true);
            const secret = Math.floor(Math.random() * 100) + 1;
            const win = (guess === secret);
            if (win) {
                ecoData.balance += 5000;
                userEconomy.set(userId, ecoData);
            }
            const embed = new EmbedBuilder()
                .setColor(win ? 0x00FF00 : 0xFF0000)
                .setTitle("🎯 MINIGAME ĐOÁN SỐ")
                .setDescription(`Con số bí mật là: **${secret}**\n${win ? "🎉 Quá đỉnh, bạn đoán chuẩn xác và nhận thưởng **+5.000 xu**!" : "😢 Rất tiếc, bạn đoán lệch mất rồi, thử lại sau nhé!"}`);
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "doananime") {
            await interaction.deferReply();
            const sel = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
            let attachment = null;
            const buf = await generateImage(`${sel.name} anime character portrait, high quality masterpiece`, false);
            if (buf) attachment = new AttachmentBuilder(buf, { name: "character.png" });

            const startEmbed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle("🎮 ĐOÁN TÊN NHÂN VẬT ANIME")
                .setDescription(`💡 Gợi ý: **${sel.hint}**\n\nNhanh tay chat tên nhân vật vào kênh trong **30 giây** để nhận thưởng **1,000 xu**!`);
            
            await interaction.editReply({ embeds: [startEmbed], files: attachment ? [attachment] : [] });

            try {
                const collected = await interaction.channel.awaitMessages({
                    filter: m => !m.author.bot && sel.name.toLowerCase().split(' ').some(part => m.content.toLowerCase().includes(part)),
                    max: 1,
                    time: 30000,
                    errors: ['time']
                });
                const winnerMsg = collected.first();
                if (!winnerMsg) return;
                const winnerId = winnerMsg.author.id;
                let wEco = userEconomy.get(winnerId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] };
                wEco.balance += 1000;
                userEconomy.set(winnerId, wEco);

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle("🏆 ĐOÁN ĐÚNG NHÂN VẬT ANIME!")
                    .setDescription(`✨ Chính xác! Nhân vật đó là **${sel.name}**. Xin chúc mừng <@${winnerId}> đã giành chiến thắng và nhận **1,000 xu**!`);
                await interaction.channel.send({ embeds: [winEmbed] });
            } catch (err) {
                await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x95A5A6).setTitle("⏰ HẾT GIỜ").setDescription(`Không ai đoán đúng đáp án là **${sel.name}** cả.`)] });
            }
        }
        else if (interaction.commandName === "shop") {
            const timeLetMs = RESTOCK_INTERVAL - (Date.now() - lastRestockTime);
            const hoursLeft = Math.floor(timeLetMs / (1000 * 60 * 60));
            const minsLeft = Math.floor((timeLetMs % (1000 * 60 * 60)) / (1000 * 60));

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle("🛒 CỬA HÀNG HẠT GIỐNG NÔNG TRẠI")
                .setDescription(`🌱 Shop sẽ tự động làm mới sau: **${hoursLeft} giờ ${minsLeft} phút**\n`);

            currentShopStock.forEach(item => {
                embed.addFields({
                    name: `${item.name} (\`${item.id}\`)`,
                    value: `⭐ Độ hiếm: \`${item.rarity}\` | Giá mua: **${item.cost.toLocaleString()} xu** | Lãi: **${item.profit.toLocaleString()} xu** (${item.duration / 60000} phút) | Kho còn lại: **${item.stock}** hạt`,
                    inline: false
                });
            });
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "nongtrai") {
            const sub = interaction.options.getSubcommand();
            if (sub === "vuon") {
                const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle(`🏡 KHU VƯỜN NÔNG TRẠI CỦA BẠN`);
                let desc = "";
                ecoData.plots.forEach((p, idx) => {
                    if (!p) {
                        desc += `• Ô đất #${idx + 1}: 🟫 Trống (Sẵn sàng gieo trồng)\n`;
                    } else if (Date.now() >= p.harvestTime) {
                        desc += `• Ô đất #${idx + 1}: 🌸 **${p.name}** -> **ĐÃ CHÍN, THU HOẠCH NGAY!**\n`;
                    } else {
                        const mins = Math.ceil((p.harvestTime - Date.now()) / 60000);
                        desc += `• Ô đất #${idx + 1}: 🌱 **${p.name}** -> Đang lớn (~${mins} phút nữa)\n`;
                    }
                });
                embed.setDescription(desc);
                await interaction.reply({ embeds: [embed] });
            } else if (sub === "muadat") {
                if (ecoData.balance < 2000 || ecoData.plots.length >= 6) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Không đủ 2000 xu hoặc nông trại đã đạt tối đa 6 ô đất!")], ephemeral: true });
                    return;
                }
                ecoData.balance -= 2000;
                ecoData.plots.push(null);
                userEconomy.set(userId, ecoData);
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle("✨ MỞ RỘNG THÀNH CÔNG").setDescription(`Nông trại của bạn giờ sở hữu **${ecoData.plots.length} ô đất**.`)] });
            } else if (sub === "trong") {
                const pidx = interaction.options.getInteger("oodat", true) - 1;
                const sId = interaction.options.getString("loaicay", true).toLowerCase();

                if (pidx < 0 || pidx >= ecoData.plots.length || ecoData.plots[pidx] !== null) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Ô đất không hợp lệ hoặc đang có cây trồng khác!")], ephemeral: true });
                    return;
                }
                const item = currentShopStock.find(s => s.id === sId);
                if (!item || item.stock <= 0 || ecoData.balance < item.cost) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Hạt giống không có trong shop, đã hết hàng hoặc bạn không đủ xu!")], ephemeral: true });
                    return;
                }
                item.stock--;
                ecoData.balance -= item.cost;
                ecoData.plots[pidx] = { name: item.name, reward: item.profit, harvestTime: Date.now() + item.duration };
                userEconomy.set(userId, ecoData);

                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2ECC71).setDescription(`🌱 Đã gieo trồng **${item.name}** vào ô đất #${pidx + 1}! Đợi ${item.duration / 60000} phút để thu hoạch.`)] });
            } else if (sub === "thuhoach") {
                const pidx = interaction.options.getInteger("oodat", true) - 1;
                if (pidx < 0 || pidx >= ecoData.plots.length || !ecoData.plots[pidx] || Date.now() < ecoData.plots[pidx].harvestTime) {
                    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Ô đất đang trống hoặc cây trồng chưa lớn để thu hoạch!")], ephemeral: true });
                    return;
                }
                const p = ecoData.plots[pidx];
                ecoData.balance += p.reward;
                ecoData.plots[pidx] = null;
                userEconomy.set(userId, ecoData);
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`🎉 Thu hoạch thành công **${p.name}** tại ô đất #${pidx + 1}! Bỏ túi **${p.reward.toLocaleString()} xu**.`)] });
            }
        }
        else if (interaction.commandName === "chuyenxu") {
            const targetUser = interaction.options.getUser("nguoinhan", true);
            const amount = interaction.options.getInteger("sotien", true);
            if (targetUser.id === userId || targetUser.bot || amount <= 50 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle("❌ GIAO DỊCH THẤT BẠI").setDescription("Giao dịch không hợp lệ! Kiểm tra lại số dư (tối thiểu 50 xu) hoặc không thể chuyển cho chính mình/bot.")], ephemeral: true });
                return;
            }
            ecoData.balance -= amount;
            userEconomy.set(userId, ecoData);

            let targetEco = userEconomy.get(targetUser.id) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] };
            targetEco.balance += amount;
            userEconomy.set(targetUser.id, targetEco);

            await interaction.repl          
