import { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    EmbedBuilder, AttachmentBuilder, Partials, ActivityType, ChannelType, Events 
} from 'discord.js';
import express from 'express';
import OpenAI from 'openai';

const logger = {
    info: (obj, msg) => console.log(JSON.stringify({ level: "info", ...((typeof obj === 'string') ? { msg: obj } : {...obj, msg }) })),
    error: (obj, msg) => console.error(JSON.stringify({ level: "error", ...((typeof obj === 'string') ? { msg: obj } : {...obj, msg }) })),
    warn: (obj, msg) => console.warn(JSON.stringify({ level: "warn", ...((typeof obj === 'string') ? { msg: obj } : {...obj, msg }) }))
};

const aiChannels = new Set();
function enableChannel(channelId) { aiChannels.add(channelId); }
function disableChannel(channelId) { aiChannels.delete(channelId); }
function isChannelEnabled(channelId) { return aiChannels.has(channelId); }

const userLevels = new Map();
const userEconomy = new Map();

const ALL_SEEDS = [
    { id: "carot", name: "🥕 Củ Rốt Thường", rarity: "Common", cost: 200, profit: 400, duration: 5 * 60 * 1000 },
    { id: "bapcai", name: "🥬 Bắp Cải Xanh", rarity: "Common", cost: 350, profit: 750, duration: 8 * 60 * 1000 },
    { id: "dautay", name: "🍓 Dâu Tây Ngọt", rarity: "Uncommon", cost: 600, profit: 1300, duration: 15 * 60 * 1000 },
    { id: "cachua", name: "🍅 Cà Chua Mong Nước", rarity: "Uncommon", cost: 900, profit: 2000, duration: 20 * 60 * 1000 },
    { id: "duahau", name: "🍉 Dưa Hấu Khổng Lồ", rarity: "Rare", cost: 1500, profit: 3500, duration: 30 * 60 * 1000 },
    { id: "hoahong", name: "🌹 Hoa Hồng Kỳ Vọng", rarity: "Rare", cost: 2500, profit: 6000, duration: 45 * 60 * 1000 },
    { id: "kincuong", name: "💎 Cây Kim Cương", rarity: "Epic", cost: 4000, profit: 10000, duration: 60 * 60 * 1000 },
    { id: "hoatram", name: "🌟 Hoa Trăng Sao", rarity: "Legendary", cost: 8000, profit: 22000, duration: 120 * 60 * 1000 }
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
            currentShopStock.push({ ...shuffled[i], stock: Math.floor(Math.random() * 8) + 3 });
        }
    }
}
updateShopStock();

const FISH_LIST = [
    { name: "🐟 Cá Rô Phi", price: 120, rarity: "Common" },
    { name: "🐠 Cá Chép Vàng", price: 300, rarity: "Uncommon" },
    { name: "🐡 Cá Nóc Phình", price: 650, rarity: "Rare" },
    { name: "🦈 Cá Mập Con", price: 1800, rarity: "Epic" },
    { name: "🐳 Cá Voi Xanh Huyền Thoại", price: 6000, rarity: "Legendary" }
];

const ROD_PRICES = {
    carbon: 2000,
    titan: 10000
};

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1"
});

const MODEL_NAME = "meta/llama-3.1-70b-instruct";
const SYSTEM_PROMPT = "Bạn là một AI bạn thân Gen Z siêu cấp lầy lội, thông minh, mỏ hỗn cực kỳ tình cảm. Viết hoàn toàn bằng chữ thường, không viết hoa đầu câu, không chấm câu cuối dòng.";

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

const ANIME_LIST = [
    { name: "Monkey D. Luffy", hint: "Thuyền trưởng mũ rơm, thích ăn thịt và có ước mơ làm Vua Hải Tặc" },
    { name: "Naruto Uzumaki", hint: "Ninja làng Lá, có Cửu Vĩ bên trong và miệng hô 'Dattebayo'" },
    { name: "Son Goku", hint: "Người Saiyan nuôi dưỡng ở Trái Đất, thích tỉ thí võ công" },
    { name: "Tanjiro Kamado", hint: "Thợ săn quỷ có vết sẹo trên trán, luôn mang theo em gái hóa quỷ" },
    { name: "Gojo Satoru", hint: "Thầy giáo tóc trắng mắt xanh mạnh nhất chủ thuật hội" },
    { name: "Sasuke Uchiha", hint: "Thiên tài tộc Uchiha, sở hữu đôi mắt Sharingan" },
    { name: "Zoro Roronoa", hint: "Kiếm sĩ phái tam kiếm, nổi tiếng với kỹ năng 'mù đường'" },
    { name: "Saitama", hint: "Anh hùng đầu trọc đấm phát chết luôn một kẻ địch" },
    { name: "Eren Yeager", hint: "Nhân vật chính Attack on Titan với khát vọng tự do cháy bỏng" },
    { name: "Levi Ackerman", hint: "Đội trưởng chiến binh mạnh nhất nhân loại, cuồng sạch sẽ" },
    { name: "Light Yagami", hint: "Học sinh thiên tài nhặt được cuốn sổ tử thần Death Note" },
    { name: "Anya Forger", hint: "Cô bé đọc được suy nghĩ, thích ăn đậu phộng và biểu cảm 'Heh'" },
    { name: "Loid Forger", hint: "Điệp viên đỉnh cao có mật danh 'Twilight'" },
    { name: "Yor Forger", hint: "Sát thủ khét tiếng với mật danh 'Thương Công Chúa'" },
    { name: "Denji", hint: "Thợ săn quỷ cửa nghèo khổ, có ước mơ cực kỳ mặn mòi" },
    { name: "Power", hint: "Quỷ máu ngạo mạn, bạn thân của Denji" },
    { name: "Makima", hint: "Sĩ quan cấp cao điều khiển Chiến Hữu ác quỷ quyền lực" },
    { name: "Katsuki Bakugo", hint: "Thiếu gia nổ tung cá tính mạnh, bạn thời thơ ấu của Deku" },
    { name: "Midoriya Izuku", hint: "Cậu bé vô năng nhận lại sức mạnh One For All từ All Might" },
    { name: "Jotaro Kujo", hint: "Chàng trai ngầu lòi với Stand Star Platinum và câu cửa miệng 'Yare yare daze'" },
    { name: "Nezuko Kamado", hint: "Cô em gái hóa quỷ ngậm ống tre đáng yêu" },
    { name: "Rem", hint: "Cô hầu gái tóc xanh trung thành trong Re:Zero" },
    { name: "Kaneki Ken", hint: "Chàng trai bán hoa sinh viên hóa thành bán quý một mắt" },
    { name: "Killua Zoldyck", hint: "Sát thủ thiên tài tóc bạc xuất thân từ gia đình khét tiếng Zoldyck" },
    { name: "Gon Freecss", hint: "Cậu bé tìm cha, sở hữu khả năng niệm hệ Tăng cường" },
    { name: "Edward Elric", hint: "Thiên tài thuật giả kim lùn nhưng cực kỳ nóng tính" },
    { name: "L Lawliet", hint: "Thám tử thiên tài nghiện đồ ngọt chuyên săn Kira" },
    { name: "Sano Manjiro", hint: "Tổng trưởng vô địch của băng Tokyo Manji (Mikey Vô Địch)" },
    { name: "Shinobu Kocho", hint: "Trùng trụ sử dụng độc dược hạ gục quỷ" },
    { name: "Rengoku Kyojuro", hint: "Viêm trụ hào sảng với câu nói 'Hãy thắp sáng ngọn lửa trong tim'" },
    { name: "Megumi Fushiguro", hint: "Pháp sư triệu hồi thức thần bóng tối trong Jujutsu Kaisen" },
    { name: "Yuji Itadori", hint: "Vật chứa của Nguyện Vương Sukuna, vận động viên điền kinh cao thủ" },
    { name: "Sukuna", hint: "Nguyện vương tàn ác ngàn năm" },
    { name: "Hinata Shouyou", hint: "Cánh chim bay cao, 'Giống lùn bay nhảy' của câu lạc bộ bóng chuyền Karasuno" },
    { name: "Kageyama Tobio", hint: "Chuyền hai thiên tài được mệnh danh là 'Vua sân đấu'" },
    { name: "Sung Jin-woo", hint: "Thợ săn yếu nhất biến thành Chúa tể bóng tối quyền năng" },
    { name: "Thorfinn", hint: "Chiến binh Viking tìm thấy con đường hòa bình thực sự" },
    { name: "Violet Evergarden", hint: "Búp bê ký ức tự động tìm hiểu ý nghĩa từ 'Tôi yêu em'" },
    { name: "Lelouch vi Britannia", hint: "Hoàng tử lưu vong sở hữu sức mạnh Geass thống trị người khác" },
    { name: "Aqua", hint: "Nữ thần nước vô dụng nhưng hài hước trong KonoSuba" },
    { name: "Megumin", hint: "Pháp sư cuồng ma phép nổ tung một phát rồi ngất" },
    { name: "Rimuru Tempest", hint: "Slime siêu cấp bá đạo chuyên sinh quản lý cả quốc gia ma vật" },
    { name: "Inosuke Hashibira", hint: "Thợ săn quỷ đội đầu lợn rừng, hệ chiến xông pha" },
    { name: "Zenitsu Agatsuma", hint: "Thợ săn quỷ chuyên hệ ngủ gật mới bộc lộ sức mạnh sấm sét" },
    { name: "Shanks", hint: "Tứ hoàng quyền uy cầm kiếm Gryphon, truyền cảm hứng cho Luffy" },
    { name: "Trafalgar Law", hint: "Bác sĩ tử thần sở hữu trái ác quỷ Ope Ope no Mi" },
    { name: "Portgas D. Ace", hint: "Anh trai quốc dân sử dụng sức mạnh lửa Mera Mera no Mi" },
    { name: "Boa Hancock", hint: "Nữ hoàng hải tặc tuyệt sắc quyến rũ mê mẩn Luffy" },
    { name: "Chisaki Kai", hint: "Kẻ phản diện đại tu sửa trong My Hero Academia" },
    { name: "Emilia", hint: "Thiếu nữ bán yêu bạc tóc trong Re:Zero" }
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
    new SlashCommandBuilder().setName("avatar").setDescription("Xem ảnh đại diện chất lượng cao")
        .addUserOption(opt => opt.setName("nguoidung").setDescription("Thành viên cần xem").setRequired(false)),
    new SlashCommandBuilder().setName("rank").setDescription("Xem cấp độ (Level) và XP của bạn"),
    new SlashCommandBuilder().setName("vi").setDescription("Kiểm tra ví tiền, cần câu và nông trại"),
    new SlashCommandBuilder().setName("diemdanh").setDescription("Điểm danh nhận xu hàng ngày"),
    new SlashCommandBuilder().setName("chuyenxu").setDescription("Chuyển xu cho người chơi khác")
        .addUserOption(opt => opt.setName("nguoinhan").setDescription("Người nhận xu").setRequired(true))
        .addIntegerOption(opt => opt.setName("sotien").setDescription("Số tiền chuyển").setRequired(true)),
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
    new SlashCommandBuilder().setName("dice").setDescription("Đổ xúc xắc giải trí"),
    new SlashCommandBuilder().setName("buitarot").setDescription("Bói bài Tarot định mệnh"),
    new SlashCommandBuilder().setName("slot").setDescription("Quay hũ Slot Machine săn Jackpot đổi đời")
        .addIntegerOption(opt => opt.setName("sotien").setDescription("Số xu cược quay hũ").setRequired(true)),
    new SlashCommandBuilder().setName("baucua").setDescription("Trò chơi dân gian Bầu Cua Tôm Cá truyền thống")
        .addStringOption(opt => opt.setName("chon").setDescription("Chọn linh vật cược").setRequired(true)
            .addChoices(
                { name: "🌿 Bầu", value: "bau" },
                { name: "🦀 Cua", value: "cua" },
                { name: "🦐 Tôm", value: "tom" },
                { name: "🐟 Cá", value: "ca" },
                { name: "🐓 Gà", value: "ga" },
                { name: "🦌 Nai", value: "nai" }
            ))
        .addIntegerOption(opt => opt.setName("sotien").setDescription("Số xu cược").setRequired(true)),
    new SlashCommandBuilder().setName("shop").setDescription("Xem cửa hàng hạt giống nông trại"),
    new SlashCommandBuilder().setName("nongtrai").setDescription("Hệ thống quản lý nông trại Roblox")
        .addSubcommand(sub => sub.setName("vuon").setDescription("Xem khu vườn của bạn"))
        .addSubcommand(sub => sub.setName("trong").setDescription("Trồng hạt giống")
            .addIntegerOption(opt => sub.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true))
            .addStringOption(opt => sub.setName("loaicay").setDescription("Tên hạt giống").setRequired(true)))
        .addSubcommand(sub => sub.setName("thuhoach").setDescription("Thu hoạch cây trồng")
            .addIntegerOption(opt => sub.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true)))
        .addSubcommand(sub => sub.setName("muadat").setDescription("Mở rộng thêm ô đất (2000 xu)")),
    new SlashCommandBuilder().setName("shopcauca").setDescription("Xem danh mục cửa hàng nâng cấp cần câu"),
    new SlashCommandBuilder().setName("muacan").setDescription("Nâng cấp các loại cần câu chuyên nghiệp")
        .addStringOption(opt => opt.setName("loaican").setDescription("Chọn loại cần nâng cấp").setRequired(true)
            .addChoices(
                { name: "Cần Carbon dẻo dai (2,000 xu)", value: "carbon" },
                { name: "Cần Titan Thần Thánh (10,000 xu)", value: "titan" }
            )),
    new SlashCommandBuilder().setName("cauca").setDescription("Đi câu cá giải trí tại hồ nước thần kỳ"),
    new SlashCommandBuilder().setName("banca").setDescription("Bán toàn bộ khoang chứa cá lấy tiền mặt")
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
            const channelId = interaction.channelId;
            if (sub === "on") {
                enableChannel(channelId);
                const embed = new EmbedBuilder().setColor(0x00FF00).setDescription("🟢 Đã bật chế độ AI tự động trò chuyện trong kênh này (Cần tag bot để trò chuyện!).");
                await interaction.reply({ embeds: [embed] });
            } else if (sub === "off") {
                disableChannel(channelId);
                const embed = new EmbedBuilder().setColor(0xFF0000).setDescription("🔴 Đã tắt chế độ AI tự động trong kênh này!");
                await interaction.reply({ embeds: [embed] });
            } else {
                const status = isChannelEnabled(channelId) ? "BẬT 🟢" : "TẮT 🔴";
                const embed = new EmbedBuilder().setColor(0x00DAE8).setDescription(`💬 Trạng thái AI tại kênh này đang: **${status}**`);
                await interaction.reply({ embeds: [embed] });
            }
        }
        else if (interaction.commandName === "vi") {
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`💰 VÍ TIỀN & NÔNG TRẠI CỦA ${interaction.user.username.toUpperCase()}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: "🪙 Số dư", value: `**${ecoData.balance.toLocaleString()} xu**`, inline: true },
                    { name: "🔥 Điểm danh liên tiếp", value: `**${ecoData.streak} ngày**`, inline: true },
                    { name: "🌱 Tổng số ô đất", value: `**${ecoData.plots.length}**`, inline: true }
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
                    .setDescription(`Bạn đã nhận quà hôm nay rồi. Vui lòng quay lại sau **${hoursLeft} giờ** nữa nhé!`);
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
            const result = Math.random() < 0.5 ? "ngua" : "sap";
            const win = (choice === result);
            ecoData.balance += (win ? amount : -amount);
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle("🪙 MINIGAME TUNG ĐỒNG XU")
                .addFields(
                    { name: "🎯 Bạn chọn", value: `${choice.toUpperCase()}`, inline: true },
                    { name: "🎲 Kết quả", value: `${result.toUpperCase()}`, inline: true },
                    { name: "📊 Kết quả tài chính", value: win ? `🎉 Thắng lớn **+${amount.toLocaleString()} xu**` : `📉 Thua cược **-${amount.toLocaleString()} xu**`, inline: false }
                );
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "taixiu") {
            const choice = interaction.options.getString("chon", true);
            const amount = interaction.options.getInteger("sotien", true);
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Không đủ tiền để tham gia cược!")], ephemeral: true });
                return;
            }
            const loadingEmbed = new EmbedBuilder().setColor(0xF1C40F).setTitle("🎲 HỆ THỐNG TÀI XỈU ĐANG LẮC").setDescription("🎲 Đang lắc xúc xắc... 🎲 [?] [?] [?]");
            await interaction.reply({ embeds: [loadingEmbed] });
            await new Promise(r => setTimeout(r, 800));

            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const d3 = Math.floor(Math.random() * 6) + 1;
            const total = d1 + d2 + d3;
            const ketqua = total >= 11 ? "tai" : "xiu";
            const win = (choice === ketqua);
            ecoData.balance += (win ? amount : -amount);
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle("🎲 KẾT QUẢ TÀI XỈU HOÀNH TRÁNG")
                .addFields(
                    { name: "🎲 Xúc xắc ra", value: `**[${d1}]** | **[${d2}]** | **[${d3}]** -> Tổng: **${total} điểm (${ketqua.toUpperCase()})**`, inline: false },
                    { name: "🏆 Thưởng / Phạt", value: win ? `🎉 Chúc mừng bạn thắng **+${amount.toLocaleString()} xu**!` : `😢 Rất tiếc, bạn đã thua **-${amount.toLocaleString()} xu**!`, inline: false }
                );
            await interaction.editReply({ embeds: [embed] });
        }
        else if (interaction.commandName === "slot") {
            const amount = interaction.options.getInteger("sotien", true);
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Số tiền cược Slot Machine không hợp lệ!")], ephemeral: true });
                return;
            }
            const symbols = ["🍒", "🍋", "🔔", "💎", "7️⃣"];
            const s1 = symbols[Math.floor(Math.random() * symbols.length)];
            const s2 = symbols[Math.floor(Math.random() * symbols.length)];
            const s3 = symbols[Math.floor(Math.random() * symbols.length)];

            let multiplier = 0;
            if (s1 === s2 && s2 === s3) {
                multiplier = s1 === "7️⃣" ? 10 : (s1 === "💎" ? 7 : 5);
            } else if (s1 === s2 || s2 === s3 || s1 === s3) {
                multiplier = 1.5;
            }

            const winAmount = Math.floor(amount * multiplier);
            const win = multiplier > 0;
            ecoData.balance += (win ? winAmount - amount : -amount);
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle("🎰 QUAY HŨ SLOT MACHINE")
                .setDescription(`Slot: **[ ${s1} | ${s2} | ${s3} ]**\n\n${win ? `🎉 Trúng lớn hệ số x${multiplier}! Nhận **+${winAmount.toLocaleString()} xu**` : `😢 Chúc bạn may mắn lần sau, mất **-${amount.toLocaleString()} xu**`}`);
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "baucua") {
            const choice = interaction.options.getString("chon", true);
            const amount = interaction.options.getInteger("sotien", true);
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Không đủ số dư để đặt cược bầu cua!")], ephemeral: true });
                return;
            }
            const icons = { bau: "🌿", cua: "🦀", tom: "🦐", ca: "🐟", ga: "🐓", nai: "🦌" };
            const keys = Object.keys(icons);
            const roll1 = keys[Math.floor(Math.random() * keys.length)];
            const roll2 = keys[Math.floor(Math.random() * keys.length)];
            const roll3 = keys[Math.floor(Math.random() * keys.length)];

            const matches = [roll1, roll2, roll3].filter(k => k === choice).length;
            const win = matches > 0;
            const reward = win ? amount * matches : 0;
            ecoData.balance += (win ? reward : -amount);
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle("🎲 KẾT QUẢ BẦU CUA TÔM CÁ")
                .setDescription(`Linh vật quay được: **${icons[roll1]} | ${icons[roll2]} | ${icons[roll3]}**\n\nBạn chọn: **${icons[choice]}** xuất hiện **${matches} lần**.\n${win ? `🎉 Thắng lớn nhận ngay **+${reward.toLocaleString()} xu**!` : `😢 Thua cược **-${amount.toLocaleString()} xu**!`}`);
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "imagine") {
            const prompt = interaction.options.getString("prompt", true);
            const nsfw = interaction.options.getBoolean("nsfw") ?? false;
            await interaction.deferReply();
            const buf = await generateImage(prompt, nsfw);
            if (!buf) {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Không thể tạo ảnh do lỗi kết nối dịch vụ ngoài.")] });
                return;
            }
            const attachment = new AttachmentBuilder(buf, { name: "generated.png" });
            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle("🎨 KẾT QUẢ SÁNG TẠO HÌNH ẢNH AI")
                .addFields(
                    { name: "📝 Từ khóa (Prompt)", value: `\`${prompt}\``, inline: false },
                    { name: "🔒 Chế độ NSFW", value: nsfw ? "Bật" : "Tắt", inline: true }
                )
                .setImage("attachment://generated.png")
                .setTimestamp();
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
                    { name: "✨ Điểm kinh nghiệm", value: `**${lvlData.xp} / ${nextLevelXp} XP**`, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "doanso") {
            const guess = interaction.options.getInteger("so", true);
            const target = Math.floor(Math.random() * 100) + 1;
            const win = (guess === target);
            if (win) {
                ecoData.balance += 5000;
                userEconomy.set(userId, ecoData);
            }
            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle("🎯 MINIGAME ĐOÁN SỐ MAY MẮN")
                .addFields(
                    { name: "📌 Số bạn chọn", value: `**${guess}**`, inline: true },
                    { name: "🎯 Con số bí ẩn", value: `**${target}**`, inline: true },
                    { name: "🏆 Kết quả", value: win ? "🎉 **Chính xác tuyệt đối!** Nhận ngay +5.000 xu thưởng nóng!" : "😢 **Sai rồi!** Chúc bạn may mắn lần sau.", inline: false }
                );
            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === "doananime") {
            await interaction.deferReply();
            const sel = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
            
            const startEmbed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle("🎮 ĐOÁN TÊN NHÂN VẬT ANIME")
                .setDescription(`💡 Gợi ý: **${sel.hint}**\n\nNhanh tay chat tên nhân vật vào kênh trong **30 giây** để nhận thưởng **1,000 xu**!`)
                .setFooter({ text: "Hệ thống đang chờ câu trả lời từ các thành viên..." });
            
            await interaction.editReply({ embeds: [startEmbed] });

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

                let attachment = null;
                try {
                    const buf = await generateImage(`${sel.name} anime character portrait, high quality masterpiece`, false);
                    if (buf) attachment = new AttachmentBuilder(buf, { name: "character.png" });
                } catch (e) {}

                const winEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle("🏆 ĐOÁN ĐÚNG NHÂN VẬT ANIME!")
                    .setDescription(`✨ Chính xác! Nhân vật đó là **${sel.name}**.\n🏆 Xin chúc mừng <@${winnerId}> đã giành chiến thắng và nhận **1.000 xu**!`);

                if (attachment) {
                    winEmbed.setImage("attachment://character.png");
                    await interaction.channel.send({ embeds: [winEmbed], files: [attachment] });
                } else {
                    await interaction.channel.send({ embeds: [winEmbed] });
                }
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
                    value: `⭐ Độ hiếm: \`${item.rarity}\` | Giá: **${item.cost.toLocaleString()} xu** | Lãi: **${item.profit.toLocaleString()} xu** (${item.duration / 60000} phút) | Kho: **${item.stock}**`,
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
                                        
