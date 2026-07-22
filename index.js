import {
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
    EmbedBuilder, Partials, Events, ActivityType
} from 'discord.js';
import OpenAI from 'openai';
import http from 'http';

const logger = { warn: (msg) => console.warn(`[WARN] ${msg}`) };

// KHO GIF ANIMATION ĐẦY ĐỦ CHO TẤT CẢ TÍNH NĂNG
const GIFS = {
    hoso: 'https://media.giphy.com/media/l41YkxvU8c7J7Bba0/giphy.gif',
    diemdanh: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif',
    cauca: 'https://media.giphy.com/media/3o7TKSx0g723R02q3e/giphy.gif',
    shop: 'https://media.giphy.com/media/3o84U1p7W5QxGjR2B2/giphy.gif',
    farm: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    quiz: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
    quiz_win: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif',
    quiz_lose: 'https://media.giphy.com/media/cr9vIO7CbP5xC/giphy.gif',
    taixiu: 'https://media.giphy.com/media/l2JHRhAtnJSDNJ2py/giphy.gif',
    avatar: 'https://media.giphy.com/media/3o7aD2saalEvTEYxK8/giphy.gif',
    love: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
    magicball: 'https://media.giphy.com/media/3o6Zt8b3UcRAN2b3NK/giphy.gif',
    khia: 'https://media.giphy.com/media/l0HlvtIPzyhlXyXw4/giphy.gif',
    khen: 'https://media.giphy.com/media/R6gvnAxj2ISzJdbA63/giphy.gif',
    rps: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    gayrate: 'https://media.giphy.com/media/3o72FfM5HJydzafgUE/giphy.gif',
    error: 'https://media.giphy.com/media/TqiwHbFBaZ4ti/giphy.gif'
};

const userEconomy = new Map();
const chatHistories = new Map();

// KHO CÁ KHỔNG LỒ (Đủ loại từ rác đến Thủy Thần)
const FISH_LIST = [
    { name: '👢 Rác Cấp Vũ Trụ', price: 10, rarity: 'Trash' }, 
    { name: '🐡 Cá Nóc Ngáo Ngơ', price: 80, rarity: 'Common' },
    { name: '🐟 Cá Chép Om Dưa', price: 150, rarity: 'Common' }, 
    { name: '🐠 Cá Nemo Đi Lạc', price: 400, rarity: 'Uncommon' },
    { name: '🦀 Cua Hoàng Đế Đỏ', price: 900, rarity: 'Uncommon' },
    { name: '🦈 Cá Mập Cắn Cáp', price: 1500, rarity: 'Rare' }, 
    { name: '🐙 Mực Đại Dương Khổng Lồ', price: 2500, rarity: 'Rare' },
    { name: '🐢 Cụ Rùa Hoàn Kiếm', price: 3500, rarity: 'Epic' }, 
    { name: '🐬 Cá Heo Thần Tốc', price: 6000, rarity: 'Epic' },
    { name: '🐋 Cá Voi Bay', price: 10000, rarity: 'Legendary' }, 
    { name: '🐉 Thủy Thần Leviathan', price: 50000, rarity: 'Mythic' }
];

// CẦN CÂU TRONG SHOP
const ROD_SHOP = {
    tre: { name: 'Cần Trúc Cùi Bắp', price: 0, level: 1 },
    carbon: { name: 'Cần Carbon Siêu Cứng', price: 5000, level: 2 },
    titan: { name: 'Cần Titan Thần Thánh', price: 20000, level: 3 }
};

// HỆ THỐNG HẠT GIỐNG NÔNG TRẠI
const SEEDS = {
    lua: { name: '🌾 Lúa Nước', cost: 50, profit: 150, time: 2 * 60000 },
    ngo: { name: '🌽 Ngô Đồng', cost: 120, profit: 350, time: 5 * 60000 },
    duahau: { name: '🍉 Dưa Hấu Thần Tốc', cost: 300, profit: 1000, time: 10 * 60000 },
    nhansam: { name: '🌿 Nhân Sâm Ngàn Năm', cost: 1000, profit: 5000, time: 20 * 60000 }
};

// 100 NHÂN VẬT ANIME CHO QUIZ
const ANIME_LIST = [
    { name: 'Luffy', hint: 'Thuyền trưởng Mũ Rơm' }, { name: 'Zoro', hint: 'Thánh mù đường xài 3 kiếm' },
    { name: 'Sanji', hint: 'Đầu bếp chân đen mê gái' }, { name: 'Nami', hint: 'Hoa tiêu cuồng tiền và cam' },
    { name: 'Robin', hint: 'Nhà khảo cổ học mọc nhiều tay' }, { name: 'Chopper', hint: 'Bác sĩ tuần lộc đáng yêu' },
    { name: 'Usopp', hint: 'Thánh nói dóc kiêm xạ thủ' }, { name: 'Ace', hint: 'Anh trai Luffy xài Hỏa Quyền' },
    { name: 'Sabo', hint: 'Tổng tham mưu trưởng Quân Cách Mạng' }, { name: 'Shanks', hint: 'Hải tặc Tóc Đỏ trao mũ rơm' },
    { name: 'Naruto', hint: 'Hồ ly 9 đuôi mê Ramen, ước mơ Hokage' }, { name: 'Sasuke', hint: 'Uchiha muốn trả thù anh trai' },
    { name: 'Kakashi', hint: 'Ninja sao chép hay đọc truyện 18+' }, { name: 'Itachi', hint: 'Thiên tài diệt tộc Uchiha' },
    { name: 'Jiraiya', hint: 'Tiên nhân háo sắc' }, { name: 'Hinata', hint: 'Công chúa Bạch Nhãn nhút nhát' },
    { name: 'Gaara', hint: 'Kazekage làng Cát mang hồ lô' }, { name: 'Minato', hint: 'Tia chớp vàng làng Lá' },
    { name: 'Madara', hint: 'Huyền thoại Uchiha múa Susanoo' }, { name: 'Obito', hint: 'Ninja đeo mặt nạ Tobi' },
    { name: 'Gojo Satoru', hint: 'Thầy giáo bịt mắt vô hạn nguyền chú' }, { name: 'Yuji Itadori', hint: 'Thanh niên nuốt ngón tay Sukuna' },
    { name: 'Megumi', hint: 'Chú thuật sư triệu hồi bằng bóng' }, { name: 'Nobara', hint: 'Gái cá tính xài búa và đinh' },
    { name: 'Sukuna', hint: 'Vua Nguyền Hồn 20 ngón' }, { name: 'Nanami', hint: 'Chú thuật sư dân văn phòng (7:3)' },
    { name: 'Toji', hint: 'Sát thủ không có chú lực, xài súng gươm' }, { name: 'Yuta', hint: 'Chú thuật sư đặc cấp có Rika' },
    { name: 'Maki', hint: 'Chị đại tộc Zenin xài chú cụ' }, { name: 'Geto', hint: 'Kẻ thu thập nguyền hồn, bạn cũ Gojo' },
    { name: 'Tanjiro', hint: 'Cậu bé đeo hoa tai xài Hơi thở Mặt Trời' }, { name: 'Nezuko', hint: 'Em gái ngậm ống tre' },
    { name: 'Zenitsu', hint: 'Ngủ thì múa Hơi thở sấm sét cực mượt' }, { name: 'Inosuke', hint: 'Thanh niên đội đầu heo múa gươm mẻ' },
    { name: 'Rengoku', hint: 'Viêm trụ lúc nào cũng nói "UMAI"' }, { name: 'Giyu', hint: 'Thủy trụ hay bị đồn là không ai thích' },
    { name: 'Shinobu', hint: 'Trùng trụ nhỏ con xài độc diệt quỷ' }, { name: 'Tengen', hint: 'Âm trụ hào nhoáng có 3 cô vợ' },
    { name: 'Akaza', hint: 'Thượng huyền tam xài võ thuật' }, { name: 'Muzan', hint: 'Chúa tể quỷ giống Michael Jackson' },
    { name: 'Eren', hint: 'Biến thành Titan Tiến công san phẳng thế giới' }, { name: 'Mikasa', hint: 'Gái tộc Ackerman cuồng quàng khăn đỏ' },
    { name: 'Armin', hint: 'Não to Trinh sát đoàn, Titan khổng lồ sau này' }, { name: 'Levi', hint: 'Lùn nhưng là chiến thần mạnh nhất nhân loại' },
    { name: 'Erwin', hint: 'Đoàn trưởng hô Shinzo wo Sasageyo' }, { name: 'Reiner', hint: 'Titan Thiết Giáp đa nhân cách' },
    { name: 'Zeke', hint: 'Titan Quái thú hay ném đá, anh cùng cha khác mẹ của Eren' }, { name: 'Sasha', hint: 'Cô gái khoai tây mê thịt' },
    { name: 'Hange', hint: 'Đội trưởng cuồng nghiên cứu Titan' }, { name: 'Historia', hint: 'Nữ hoàng thực sự Paradis' },
    { name: 'Goku', hint: 'Khỉ con Saiyan tóc đổi màu liên tục' }, { name: 'Vegeta', hint: 'Hoàng tử Saiyan kiêu ngạo' },
    { name: 'Gohan', hint: 'Con trai trưởng của Goku' }, { name: 'Trunks', hint: 'Người đi từ tương lai về báo tin' },
    { name: 'Piccolo', hint: 'Người Namek làm bảo mẫu' }, { name: 'Beerus', hint: 'Thần hủy diệt hình con mèo mê đồ ăn' },
    { name: 'Saitama', hint: 'Thánh trọc đấm phát chết luôn' }, { name: 'Genos', hint: 'Người máy Cyborg học trò trọc' },
    { name: 'Tatsumaki', hint: 'Bà lùn Lốc xoáy siêu năng lực' }, { name: 'Garou', hint: 'Thợ săn anh hùng' },
    { name: 'Gon', hint: 'Cậu bé câu cá đi tìm cha làm Hunter' }, { name: 'Killua', hint: 'Sát thủ tóc trắng phóng điện' },
    { name: 'Kurapika', hint: 'Mắt đỏ xài xích trả thù băng Nhện' }, { name: 'Hisoka', hint: 'Thằng hề cuồng đánh nhau' },
    { name: 'Chrollo', hint: 'Bang chủ băng Nhện' }, { name: 'Ichigo', hint: 'Tử thần tóc cam cầm Trảm Hồn Đao to đùng' },
    { name: 'Rukia', hint: 'Tử thần nữ trao sức mạnh cho Ichigo' }, { name: 'Aizen', hint: 'Trùm phản diện vuốt tóc tháo kính' },
    { name: 'Byakuya', hint: 'Tộc trưởng xài đao hoa anh đào' }, { name: 'Kisuke', hint: 'Ông chủ xài mũ sọc xanh trắng' },
    { name: 'Anya', hint: 'Bé hột mít đọc suy nghĩ nói "Waku Waku"' }, { name: 'Loid', hint: 'Điệp viên Twilight' },
    { name: 'Yor', hint: 'Công chúa gai sát thủ làm vợ hờ' }, { name: 'Denji', hint: 'Thợ săn quỷ biến thành Quỷ Cưa' },
    { name: 'Power', hint: 'Huyết quỷ chảnh chọe, bạn thân Denji' }, { name: 'Makima', hint: 'Ác quỷ chi phối mặc vest xinh đẹp' },
    { name: 'Aki', hint: 'Thợ săn xài quỷ cáo, buộc tóc túm' }, { name: 'Reze', hint: 'Quỷ bom tóc tím' },
    { name: 'Pochita', hint: 'Quỷ cưa nhỏ xíu cắn chìa khóa' }, { name: 'Kobeni', hint: 'Gái khóc nhè hay nhảy nhót' },
    { name: 'Light', hint: 'Học sinh nhặt được sổ tử thần' }, { name: 'L', hint: 'Thám tử ngồi xổm mê kẹo ngọt' },
    { name: 'Ryuk', hint: 'Thần chết thích ăn táo' }, { name: 'Edward', hint: 'Giả kim thuật sư lùn tóc vàng xài tay sắt' },
    { name: 'Alphonse', hint: 'Em trai linh hồn nhập vô bộ giáp' }, { name: 'Roy Mustang', hint: 'Đại tá xài giả kim thuật lửa' },
    { name: 'Lelouch', hint: 'Hoàng tử có con mắt Geass' }, { name: 'C.C.', hint: 'Cô gái bất tử mê Pizza' },
    { name: 'Kirito', hint: 'Hắc kiếm sĩ chơi game sinh tử' }, { name: 'Asuna', hint: 'Phó bang chớp nhoáng (SAO)' },
    { name: 'Subaru', hint: 'Thanh niên chết đi sống lại bao lần' }, { name: 'Emilia', hint: 'Bán yêu tinh tóc bạc' },
    { name: 'Rem', hint: 'Hầu gái tóc xanh quỷ mang chùy gai' }, { name: 'Kazuma', hint: 'Nam chính bẩn bựa xài chiêu Steal' },
    { name: 'Aqua', hint: 'Nữ thần nước vô dụng' }, { name: 'Megumin', hint: 'Pháp sư loli cuồng nổ lôi' },
    { name: 'Rimuru', hint: 'Chuyển sinh thành Slime bá đạo' }, { name: 'Mob', hint: 'Cậu bé đầu nấm siêu năng lực 100%' },
    { name: 'Kaneki', hint: 'Ngạ quỷ tóc trắng bẻ ngón tay rắc rắc' }, { name: 'Doraemon', hint: 'Mèo máy sợ chuột mê bánh rán' }
];

function getUserData(userId) {
    if (!userEconomy.has(userId)) {
        userEconomy.set(userId, { 
            balance: 5000, lastDaily: 0, streak: 0, 
            plots: [{ plant: null, time: 0 }, { plant: null, time: 0 }, { plant: null, time: 0 }], 
            rod: 'tre' 
        });
    }
    return userEconomy.get(userId);
}
function saveUserData(userId, data) { userEconomy.set(userId, data); }

function createEmbed(color, title, desc, img, thumb) {
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc).setTimestamp().setFooter({ text: 'Siêu Bot Khổng Lồ 🌟' });
    if (img) embed.setImage(img); if (thumb) embed.setThumbnail(thumb); return embed;
}

const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' });
const SYSTEM_PROMPT = `Bạn là một Gen Z lầy lội, cực kỳ thông minh trong server Discord này. Văn phong: chữ thường, không dấu chấm cuối câu, xéo xắt nhưng vui vẻ, ngắn gọn (1-3 câu).`;

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({ model: 'meta/llama-3.1-70b-instruct', messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], temperature: 0.95, max_tokens: 250 });
        return completion.choices[0]?.message?.content || 'lag quá bồ êi :v';
    } catch (e) { return 'cáp quang đứt rồi bồ ơi :('; }
}
const commands = [
    new SlashCommandBuilder().setName('hoso').setDescription('Xem ví tiền, cần câu, nông trại'),
    new SlashCommandBuilder().setName('diemdanh').setDescription('Nhận lương hằng ngày'),
    
    // HỆ THỐNG SHOP & CÂU CÁ MỚI
    new SlashCommandBuilder().setName('cuahang').setDescription('Cửa hàng mua bán cần câu xịn')
        .addSubcommand(s => s.setName('cancau').setDescription('Mua cần câu nâng cấp tỷ lệ bắt cá khủng')
            .addStringOption(o => o.setName('loai').setDescription('Chọn loại cần').setRequired(true)
                .addChoices({name: 'Cần Carbon (5,000 xu)', value: 'carbon'}, {name: 'Cần Titan (20,000 xu)', value: 'titan'}))),
    new SlashCommandBuilder().setName('cauca').setDescription('Xách cần ra khơi câu cá đổi đời'),

    // HỆ THỐNG NÔNG TRẠI MỚI
    new SlashCommandBuilder().setName('nongtrai').setDescription('Chơi hệ nông dân trồng trọt')
        .addSubcommand(s => s.setName('vuon').setDescription('Xem tình trạng khu vườn của bạn'))
        .addSubcommand(s => s.setName('gieohat').setDescription('Trồng cây vào ô đất')
            .addIntegerOption(o => o.setName('odat').setDescription('Chọn ô đất (1, 2 hoặc 3)').setRequired(true))
            .addStringOption(o => o.setName('loai').setDescription('Chọn loại hạt giống').setRequired(true)
                .addChoices({name: 'Lúa (50 xu - 2 phút)', value: 'lua'}, {name: 'Ngô (120 xu - 5 phút)', value: 'ngo'}, {name: 'Dưa hấu (300 xu - 10 phút)', value: 'duahau'}, {name: 'Nhân sâm (1000 xu - 20 phút)', value: 'nhansam'})))
        .addSubcommand(s => s.setName('thuhoach').setDescription('Thu hoạch nông sản khi đã chín')
            .addIntegerOption(o => o.setName('odat').setDescription('Chọn ô đất cần thu hoạch (1, 2 hoặc 3)').setRequired(true))),

    // CÁC GAME VÀ TÍNH NĂNG KHÁC
    new SlashCommandBuilder().setName('taixiu').setDescription('Bộ môn Tài Xỉu 3 hạt xí ngầu').addStringOption(o => o.setName('chon').setDescription('Tài hay Xỉu').setRequired(true).addChoices({name: 'Tài', value: 'tai'}, {name: 'Xỉu', value: 'xiu'})).addIntegerOption(o => o.setName('cuoc').setDescription('Số tiền cược').setRequired(true)),
    new SlashCommandBuilder().setName('oantuti').setDescription('Kéo Búa Bao với Bot').addStringOption(o => o.setName('chon').setDescription('Bạn ra gì?').setRequired(true).addChoices({name: 'Kéo', value: 'keo'}, {name: 'Búa', value: 'bua'}, {name: 'Bao', value: 'bao'})).addIntegerOption(o => o.setName('cuoc').setDescription('Cược tiền').setRequired(true)),
    new SlashCommandBuilder().setName('quiz_anime').setDescription('Đoán 100 nhân vật Anime'),
    new SlashCommandBuilder().setName('avatarcheck').setDescription('Soi Avatar HD').addUserOption(o => o.setName('user').setDescription('Tag người muốn soi')),
    new SlashCommandBuilder().setName('boitinhyeu').setDescription('Bói tình duyên').addUserOption(o => o.setName('nguoi1').setDescription('Người 1').setRequired(true)).addUserOption(o => o.setName('nguoi2').setDescription('Người 2').setRequired(true)),
    new SlashCommandBuilder().setName('xemboi').setDescription('Hỏi thần linh 1 câu Yes/No').addStringOption(o => o.setName('cau_hoi').setDescription('Nhập câu hỏi').setRequired(true)),
    new SlashCommandBuilder().setName('gayrate').setDescription('Máy đo độ bóng / Gay').addUserOption(o => o.setName('user').setDescription('Tag đứa bạn')).setRequired ? new SlashCommandBuilder().setName('gayrate').setDescription('Máy đo độ bóng / Gay').addUserOption(o => o.setName('user').setDescription('Tag đứa bạn')) : null,
    new SlashCommandBuilder().setName('khia').setDescription('Chửi xéo một đứa').addUserOption(o => o.setName('muc_tieu').setDescription('Tag nó').setRequired(true)),
    new SlashCommandBuilder().setName('khen').setDescription('Khen một đứa').addUserOption(o => o.setName('muc_tieu').setDescription('Tag nó').setRequired(true))
].filter(Boolean).map(c => c.toJSON());

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], 
    partials: [Partials.Channel, Partials.Message] 
});

client.once('ready', async () => {
    console.log(`🚀 [SIÊU BOT V3] ${client.user.tag} ĐÃ KÍCH HOẠT THÀNH CÔNG!`);
    client.user.setPresence({ activities: [{ name: 'Quản lý Nông Trại & Câu Cá (/hoso)', type: ActivityType.Playing }], status: 'online' });
    try { 
        await new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands }); 
        console.log('✅ Đã nạp thành công toàn bộ lệnh nâng cao!'); 
    } catch (e) { console.error('❌ Lỗi nạp lệnh:', e); }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    const isDM = message.channel.isDMBased();
    const isMentioned = message.mentions.has(client.user);

    if (isDM || isMentioned) {
        await message.channel.sendTyping();
        const userMsg = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
        const contentToSend = userMsg === '' ? 'ê, kêu tao chi đó?' : userMsg;

        if (!chatHistories.has(message.channelId)) chatHistories.set(message.channelId, []);
        const history = chatHistories.get(message.channelId);
        history.push({ role: 'user', content: `[${message.author.username}]: ${contentToSend}` });
        if (history.length > 10) history.shift();
        
        const reply = await callNvidiaAI(history);
        history.push({ role: 'assistant', content: reply });
        await message.reply(reply);
    }
});
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    let eco = getUserData(userId);

    const checkBet = (bet) => { 
        if (bet <= 0 || eco.balance < bet) { 
            interaction.reply({ embeds: [createEmbed(0xED4245, '❌ HẾT TIỀN', 'Tiền trong ví không đủ hoặc cược láo rồi bồ ơi!', null, GIFS.error)], ephemeral: true }); 
            return false; 
        } 
        return true; 
    };

    try {
        switch (interaction.commandName) {
            case 'hoso':
                let farmDesc = eco.plots.map((p, idx) => {
                    if (!p.plant) return `Ô ${idx + 1}: 🟫 Đất trống`;
                    const timeLeft = p.time - Date.now();
                    if (timeLeft <= 0) return `Ô ${idx + 1}: ✨ **${SEEDS[p.plant].name} (Đã chín! Thu hoạch ngay)**`;
                    return `Ô ${idx + 1}: 🌱 Đang trồng ${SEEDS[p.plant].name} (Còn ${Math.ceil(timeLeft / 60000)} phút)`;
                }).join('\n');

                await interaction.reply({ 
                    embeds: [createEmbed(0x2B2D31, `💳 HỒ SƠ: ${interaction.user.username.toUpperCase()}`, `Tài sản và nông trại của bồ đây:`, GIFS.hoso, interaction.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '💰 Số Dư', value: `**${eco.balance.toLocaleString()} xu**`, inline: true },
                            { name: '🎣 Cần Câu Đang Dùng', value: `**${ROD_SHOP[eco.rod]?.name || 'Cần Trúc'}**`, inline: true },
                            { name: '🔥 Chuỗi Điểm Danh', value: `**${eco.streak} ngày**`, inline: true },
                            { name: '🌾 Khu Vườn Nông Trại', value: farmDesc, inline: false }
                        )] 
                }); 
                break;

            case 'diemdanh':
                const passed = Date.now() - eco.lastDaily;
                if (passed < 86400000) return interaction.reply({ embeds: [createEmbed(0xED4245, '⏳ TỪ TỪ ĐÃ', `Đợi **${Math.ceil((86400000 - passed) / 3600000)} giờ** nữa hẵng nhận lương tiếp nhé.`, null, GIFS.error)], ephemeral: true });
                const bonus = 500 + (eco.streak * 50); eco.balance += bonus; eco.lastDaily = Date.now(); eco.streak += 1; saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x57F287, '🎁 NHẬN LƯƠNG THÀNH CÔNG', `Ting ting **+${bonus.toLocaleString()} xu** vào ví!\n🔥 Chuỗi chuyên cần: **${eco.streak} ngày**!`, GIFS.diemdanh)] }); 
                break;

            // --- HỆ THỐNG SHOP ---
            case 'cuahang':
                const subShop = interaction.options.getSubcommand();
                if (subShop === 'cancau') {
                    const rodChoice = interaction.options.getString('loai');
                    const targetRod = ROD_SHOP[rodChoice];
                    if (eco.rod === rodChoice || (eco.rod === 'titan' && rodChoice === 'carbon')) {
                        return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ MUA HỤT', 'Bồ đã có cần này hoặc cần xịn hơn rồi, mua nữa làm gì!', null, GIFS.error)], ephemeral: true });
                    }
                    if (eco.balance < targetRod.price) {
                        return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ VIÊM MÀNG TÚI', `Cần **${targetRod.name}** giá tới **${targetRod.price.toLocaleString()} xu** lận, kiếm thêm tiền đi nha!`, null, GIFS.error)], ephemeral: true });
                    }
                    eco.balance -= targetRod.price; eco.rod = rodChoice; saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🛒 MUA CẦN CÂU THÀNH CÔNG', `Chúc mừng bồ đã tậu được **${targetRod.name}** cực xịn!\nGiờ ra khơi tỉ lệ giật được cá khủng cao hơn hẳn.`, GIFS.shop)] });
                }
                break;

            // --- HỆ THỐNG CÂU CÁ ---
            case 'cauca':
                // Tỷ lệ bắt cá dựa theo cấp độ cần câu
                const tierChances = {
                    titan:  [{c: 0.02, f: 0}, {c: 0.08, f: 1}, {c: 0.18, f: 2}, {c: 0.35, f: 3}, {c: 0.55, f: 4}, {c: 0.75, f: 5}, {c: 0.90, f: 6}, {c: 0.97, f: 7}, {c: 0.99, f: 8}, {c: 0.998, f: 9}, {c: 1.0, f: 10}],
                    carbon: [{c: 0.05, f: 0}, {c: 0.15, f: 1}, {c: 0.30, f: 2}, {c: 0.50, f: 3}, {c: 0.70, f: 4}, {c: 0.85, f: 5}, {c: 0.94, f: 6}, {c: 0.98, f: 7}, {c: 1.0, f: 8}],
                    tre:    [{c: 0.10, f: 0}, {c: 0.30, f: 1}, {c: 0.55, f: 2}, {c: 0.75, f: 3}, {c: 0.90, f: 4}, {c: 0.97, f: 5}, {c: 1.0, f: 6}]
                };

                let roll = Math.random();
                let caughtFish = FISH_LIST[0];
                let currentTable = tierChances[eco.rod] || tierChances.tre;
                for (let item of currentTable) {
                    if (roll <= item.c) { caughtFish = FISH_LIST[item.f]; break; }
                }

                eco.balance += caughtFish.price; saveUserData(userId, eco);
                let embedColor = caughtFish.rarity === 'Mythic' ? 0xFFD700 : (caughtFish.rarity === 'Legendary' ? 0x9B59B6 : (caughtFish.rarity === 'Trash' ? 0x95A5A6 : 0x3498DB));
                await interaction.reply({ embeds: [createEmbed(embedColor, '🎣 KẾT QUẢ ĐI CÂU', `Dùng **${ROD_SHOP[eco.rod].name}**, bồ câu được:\n✨ **${caughtFish.name}** (${caughtFish.rarity})\n💰 Thương nhân mua lại với giá: **+${caughtFish.price.toLocaleString()} xu**`, GIFS.cauca)] });
                break;

            // --- HỆ THỐNG NÔNG TRẠI ---
            case 'nongtrai':
                const subFarm = interaction.options.getSubcommand();
                if (subFarm === 'vuon') {
                    let textVuon = eco.plots.map((p, idx) => {
                        if (!p.plant) return `**Ô đất số ${idx + 1}:** Đang bỏ hoang (Trống)`;
                        let timeL = p.time - Date.now();
                        if (timeL <= 0) return `**Ô đất số ${idx + 1}:** 🌾 Đã trồng **${SEEDS[p.plant].name}** - **ĐÃ CHÍN, HÃY THU HOẠCH!**`;
                        return `**Ô đất số ${idx + 1}:** 🌱 Đang trồng **${SEEDS[p.plant].name}** - Còn khoảng **${Math.ceil(timeL / 60000)} phút** nữa chín.`;
                    }).join('\n\n');
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌾 NÔNG TRẠI GIA ĐÌNH', textVuon, GIFS.farm)] });
                } 
                else if (subFarm === 'gieohat') {
                    const plotIndex = interaction.options.getInteger('odat') - 1;
                    const seedType = interaction.options.getString('loai');
                    if (plotIndex < 0 || plotIndex > 2) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ LỖI', 'Vườn chỉ có 3 ô (Từ 1 đến 3) thôi bồ ơi!', null, GIFS.error)], ephemeral: true });
                    
                    let plot = eco.plots[plotIndex];
                    if (plot.plant) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ Ô ĐẤT ĐÃ CÓ CÂY', 'Ô đất này đang có cây trồng rồi, hãy thu hoạch trước nhé!', null, GIFS.error)], ephemeral: true });
                    
                    let seedInfo = SEEDS[seedType];
                    if (eco.balance < seedInfo.cost) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ KHÔNG ĐỦ TIỀN', `Hạt giống này tốn **${seedInfo.cost} xu**, ví bồ không đủ tiền mua!`, null, GIFS.error)], ephemeral: true });

                    eco.balance -= seedInfo.cost;
                    plot.plant = seedType;
                    plot.time = Date.now() + seedInfo.time;
                    saveUserData(userId, eco);

                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌱 GIEO HẠT THÀNH CÔNG', `Đã gieo **${seedInfo.name}** vào ô đất số **${plotIndex + 1}**.\nHãy quay lại sau **${seedInfo.time / 60000} phút** để thu hoạch nhé!`, GIFS.farm)] });
                }
                else if (subFarm === 'thuhoach') {
                    const plotIndex = interaction.options.getInteger('odat') - 1;
                    if (plotIndex < 0 || plotIndex > 2) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ LỖI', 'Vườn chỉ có 3 ô (Từ 1 đến 3) thôi!', null, GIFS.error)], ephemeral: true });

                    let plot = eco.plots[plotIndex];
                    if (!plot.plant) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ Ô ĐẤT TRỐNG', 'Ô đất này có trồng cây gì đâu mà thu hoạch hả bồ?', null, GIFS.error)], ephemeral: true });

                    let timeLeft = plot.time - Date.now();
                    if (timeLeft > 0) return interaction.reply({ embeds: [createEmbed(0xED4245, '⏳ CHƯA CHÍN', `Cây chưa lớn kịp đâu, đợi thêm **${Math.ceil(timeLeft / 60000)} phút** nữa nha!`, null, GIFS.error)], ephemeral: true });

                    let reward = SEEDS[plot.plant].profit;
                    let plantName = SEEDS[plot.plant].name;
                    plot.plant = null; plot.time = 0;
                    eco.balance += reward;
                    saveUserData(userId, eco);

                    await interaction.reply({ embeds: [createEmbed(0x57F287, '✨ THU HOẠCH THÀNH CÔNG', `Bồ đã thu hoạch xong **${plantName}** và bán lấy **+${reward.toLocaleString()} xu** vào ví!`, GIFS.farm)] });
                }
                break;

            // --- CÁC MINI GAME & VUI VẺ KHÁC ---
            case 'taixiu':
                const txBet = interaction.options.getInteger('cuoc'); const txChoice = interaction.options.getString('chon'); if (!checkBet(txBet)) return;
                const d1 = Math.floor(Math.random() * 6) + 1; const d2 = Math.floor(Math.random() * 6) + 1; const d3 = Math.floor(Math.random() * 6) + 1; const sum = d1 + d2 + d3;
                let txResult = (sum >= 11 && sum <= 17) ? 'tai' : 'xiu';
                
                if (d1 === d2 && d2 === d3) {
                    eco.balance -= txBet; saveUserData(userId, eco);
                    return interaction.reply({ embeds: [createEmbed(0x000000, '🌪️ BÃO RA! NHÀ CÁI HÚP', `Xí ngầu: **[ ${d1} - ${d2} - ${d3} ]** (Tổng ${sum})\nToang! Bão về quét sạch **${txBet.toLocaleString()} xu**!`, GIFS.taixiu)] });
                }
                if (txChoice === txResult) { 
                    eco.balance += txBet; saveUserData(userId, eco); 
                    interaction.reply({ embeds: [createEmbed(0x2ECC71, '🎲 TÀI XỈU: HÚP LỚN', `Xí ngầu: **[ ${d1} - ${d2} - ${d3} ]** (Cửa **${txResult.toUpperCase()}**)\nĂn trọn **+${txBet.toLocaleString()} xu**!`, GIFS.taixiu)] }); 
                } else { 
                    eco.balance -= txBet; saveUserData(userId, eco); 
                    interaction.reply({ embeds: [createEmbed(0xE74C3C, '🎲 TÀI XỈU: CÚT', `Xí ngầu: **[ ${d1} - ${d2} - ${d3} ]** (Cửa **${txResult.toUpperCase()}**)\nMất toi **-${txBet.toLocaleString()} xu**!`, GIFS.taixiu)] }); 
                }
                break;
            
            case 'oantuti':
                const rpsBet = interaction.options.getInteger('cuoc'); const rpsChoice = interaction.options.getString('chon'); if (!checkBet(rpsBet)) return;
                const botRps = ['keo', 'bua', 'bao'][Math.floor(Math.random() * 3)];
                const rpsEmoji = { keo: '✌️ Kéo', bua: '✊ Búa', bao: '🖐️ Bao' };
                let rpsMsg = `Bạn ra **${rpsEmoji[rpsChoice]}** VS Bot ra **${rpsEmoji[botRps]}**\n\n`;
                
                if (rpsChoice === botRps) rpsMsg += `🤝 **HÒA!** Không mất tiền.`;
                else if ((rpsChoice === 'keo' && botRps === 'bao') || (rpsChoice === 'bua' && botRps === 'keo') || (rpsChoice === 'bao' && botRps === 'bua')) {
                    eco.balance += rpsBet; rpsMsg += `🎉 **BẠN THẮNG!** Nhận **+${rpsBet.toLocaleString()} xu**.`;
                } else { 
                    eco.balance -= rpsBet; rpsMsg += `💀 **BẠN THUA!** Mất **-${rpsBet.toLocaleString()} xu**.`; 
                }
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x3498DB, '✂️ QUYẾT CHIẾN', rpsMsg, GIFS.rps)] }); 
                break;

            case 'quiz_anime': {
                const char = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
                await interaction.reply({ embeds: [createEmbed(0x9B59B6, '🧠 WIBU CHÚA TÌM NGƯỜI TÀI', `**Gợi ý:** ${char.hint}\n\n⏱️ *Gõ tên nhân vật vào kênh này, bạn có 15 giây!*`, GIFS.quiz)] });
                try {
                    const collected = await interaction.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 15000, errors: ['time'] });
                    const ans = collected.first().content.trim().toLowerCase();
                    if (ans.includes(char.name.toLowerCase())) {
                        eco.balance += 500; saveUserData(userId, eco);
                        await interaction.followUp({ embeds: [createEmbed(0x2ECC71, '🎉 CHÍNH XÁC', `Đáp án là **${char.name}**! Thưởng **+500 xu**`, GIFS.quiz_win)] });
                    } else {
                        await interaction.followUp({ embeds: [createEmbed(0xE74C3C, '❌ SAI RỒI', `Đáp án đúng phải là **${char.name}** cơ!`, GIFS.quiz_lose)] });
                    }
                } catch (e) {
                    await interaction.followUp({ embeds: [createEmbed(0x95A5A6, '⏰ HẾT GIỜ', `Hết giờ! Đáp án là **${char.name}** nhé.`, GIFS.quiz_lose)] });
                }
                break;
            }

            case 'avatarcheck':
                const tUser = interaction.options.getUser('user') || interaction.user;
                await interaction.reply({ embeds: [createEmbed(0x9B59B6, `📸 SOI AVATAR: ${tUser.username}`, `Nét căng không tì vết!`, tUser.displayAvatarURL({ dynamic: true, size: 1024 }), GIFS.avatar)] }); 
                break;
            
            case 'boitinhyeu':
                const u1 = interaction.options.getUser('nguoi1'); const u2 = interaction.options.getUser('nguoi2');
                const loveP = Math.floor(Math.random() * 101);
                const loveS = loveP > 80 ? "💕 Tới luôn bác tài ơi!" : (loveP > 40 ? "🤔 Tạm ổn, thả thính tiếp đi." : "💀 Nghiệp duyên, bỏ đi!");
                await interaction.reply({ embeds: [createEmbed(0xFD79A8, '💖 BÁT TỰ TÌNH DUYÊN', `**${u1.username}** x **${u2.username}**\n\n🔥 Độ hợp nhau: **${loveP}%**\n💌 ${loveS}`, GIFS.love)] }); 
                break;
            
            case 'xemboi':
                const ans = ["Chắc chắn cmnr!", "Không bồ ơi, mơ đi.", "Hên xui, chịu.", "Theo tổ tiên mách bảo là CÓ.", "100% là sự thật!", "Câu hỏi xàm quá chê nha."][Math.floor(Math.random() * 6)];
                await interaction.reply({ embeds: [createEmbed(0x8E44AD, '🔮 THẦY BÓI LÊN TIẾNG', `🗣️ **Hỏi:** "${interaction.options.getString('cau_hoi')}"\n\n👁️ **Phán:** ${ans}`, GIFS.magicball)] }); 
                break;
            
            case 'gayrate':
                const targetGay = interaction.options.getUser('user') || interaction.user;
                const gayP = Math.floor(Math.random() * 101);
                let gayS = gayP > 80 ? "🌈 Cờ vẫy tung bay, chuẩn bóng chúa!" : (gayP > 40 ? "✨ Nửa nạc nửa mỡ." : "🗿 Chuẩn men đích thực.");
                await interaction.reply({ embeds: [createEmbed(0xFF69B4, `🏳️‍🌈 MÁY ĐO HỆ ĐIỀU HÀNH`, `Độ bóng của **${targetGay.username}** là: **${gayP}%**\n\n${gayS}`, GIFS.gayrate, targetGay.displayAvatarURL({ dynamic: true }))] });
                break;

            case 'khia':
                await interaction.reply({ content: `${interaction.options.getUser('muc_tieu')} 📢 ["Nhìn mặt bồ này tui tưởng đang xem phim ma á.", "Cái nết ngộ lạ ghê."][Math.floor(Math.random()*2)]`, embeds: [createEmbed(0xE74C3C, '🔥 KHỊA ĐỂU', `Có người muốn chửi bạn kìa!`, GIFS.khia)] }); 
                break;
            
            case 'khen':
                await interaction.reply({ content: `${interaction.options.getUser('muc_tieu')} 🌸 ["Xinh xỉu up xỉu down luôn á!", "Đỉnh của chóp, 10 điểm!"][Math.floor(Math.random()*2)]`, embeds: [createEmbed(0xFF9FF3, '🥰 THẢ THÍNH', `Quá là uy tín!`, GIFS.khen)] }); 
                break;
        }
    } catch (e) {
        logger.warn(e); 
        if (!interaction.replied) interaction.reply({ embeds: [createEmbed(0xED4245, '❌ LỖI', 'Bot ngáo đá rồi, thử lại coi!', null, GIFS.error)], ephemeral: true });
    }
});

// Giữ Bot online trên các nền tảng Hosting
http.createServer((q, r) => { r.writeHead(200); r.end('BOT DANG CHAY MUOT MA!'); }).listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_BOT_TOKEN);
