import {
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
    EmbedBuilder, Partials, Events
} from 'discord.js';
import OpenAI from 'openai';

const logger = {
    warn: (obj, msg) => console.warn(JSON.stringify({ level: 'warn', ...((typeof obj === 'string') ? { msg: obj } : { ...obj, msg }) }))
};

// --- ANIMATION GIFS ---
const GIFS = {
    wallet: 'https://media.giphy.com/media/3o6gDWzmAzrpi5DQU8/giphy.gif',
    daily: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif',
    fishing: 'https://media.giphy.com/media/3o7TKSx0g723R02q3e/giphy.gif',
    slot: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1bng1NW0ycjN5OWo5b3ZkY3J6cHFoYmV1NXV5NXdneWczNmtuaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufcVAp3AIJJsrIk/giphy.gif',
    anime: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
    farm: 'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
    ai_on: 'https://media.giphy.com/media/3o7abK294kG6znhq7O/giphy.gif',
    ai_off: 'https://media.giphy.com/media/3o7abIqp75vZXa19aU/giphy.gif'
};

// --- QUẢN LÝ BỘ NHỚ ---
const aiChannels = new Set();
const userEconomy = new Map();
const chatHistories = new Map();

function enableChannel(channelId) { aiChannels.add(channelId); }
function disableChannel(channelId) { aiChannels.delete(channelId); chatHistories.delete(channelId); }
function isChannelEnabled(channelId) { return aiChannels.has(channelId); }

function getUserData(userId) {
    if (!userEconomy.has(userId)) {
        userEconomy.set(userId, { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] });
    }
    return userEconomy.get(userId);
}

function saveUserData(userId, data) { userEconomy.set(userId, data); }

function createBaseEmbed(color, title, description, imageGif = null, thumbnailGif = null) {
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
    if (imageGif) embed.setImage(imageGif);
    if (thumbnailGif) embed.setThumbnail(thumbnailGif);
    return embed;
}

// --- DỮ LIỆU GAME ---
const ALL_SEEDS = [
    { id: 'lua', name: '🌾 Lúa Nước Hạt Vàng', rarity: 'Common', cost: 100, profit: 250, duration: 3 * 60 * 1000 },
    { id: 'carot', name: '🥕 Củ Rốt Thường', rarity: 'Common', cost: 200, profit: 450, duration: 5 * 60 * 1000 },
    { id: 'bapcas', name: '🌽 Bắp Cải Xanh', rarity: 'Common', cost: 350, profit: 750, duration: 8 * 60 * 1000 },
    { id: 'khoai', name: '🍠 Khoai Lang Tím', rarity: 'Uncommon', cost: 450, profit: 1000, duration: 10 * 60 * 1000 },
    { id: 'dautay', name: '🍓 Dâu Tây Ngọt', rarity: 'Uncommon', cost: 600, profit: 1300, duration: 15 * 60 * 1000 },
    { id: 'cachua', name: '🍅 Cà Chua Mọng Nước', rarity: 'Rare', cost: 900, profit: 2000, duration: 20 * 60 * 1000 },
    { id: 'nho', name: '🍇 Nho Xanh Trĩu Quả', rarity: 'Rare', cost: 1200, profit: 2800, duration: 25 * 60 * 1000 },
    { id: 'saurieng', name: '🍈 Sầu Riêng Ngọt Lịm', rarity: 'Epic', cost: 3000, profit: 8000, duration: 45 * 60 * 1000 },
    { id: 'hoatran', name: '✨ Hoa Trắng Sao Huyền Thoại', rarity: 'Legendary', cost: 8000, profit: 22000, duration: 120 * 60 * 1000 },
    { id: 'nhansam', name: '🌿 Nhân Sâm Ngàn Năm', rarity: 'Legendary', cost: 15000, profit: 45000, duration: 180 * 60 * 1000 },
    { id: 'acquy', name: '🔥 Quả Ác Quỷ Thần Bí', rarity: 'Mythic', cost: 40000, profit: 150000, duration: 300 * 60 * 1000 }
];

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

// --- KHO 100 NHÂN VẬT ANIME CHI TIẾT ---
const ANIME_LIST = [
    // ONE PIECE
    { name: 'Luffy', hint: 'Thuyền trưởng Băng Mũ Rơm có ước mơ trở thành Vua Hải Tặc' },
    { name: 'Zoro', hint: 'Kiếm sĩ phái Tam Kiếm siêu ngầu nhưng cực kỳ mù đường' },
    { name: 'Sanji', hint: 'Đầu bếp mê gái mê đấm bằng chân, thuộc Băng Mũ Rơm' },
    { name: 'Nami', hint: 'Hoa tiêu cuồng tiền và cam ngọt của Băng Mũ Rơm' },
    { name: 'Robin', hint: 'Nhà khảo cổ học sở hữu sức mạnh Trái Ác Quỷ Hana Hana no Mi' },
    { name: 'Chopper', hint: 'Bác sĩ tuần lộc đáng yêu ăn trái Hito Hito no Mi' },
    { name: 'Usopp', hint: 'Thánh nói dóc kiêm xạ thủ thần ba hoa của nhóm Mũ Rơm' },
    { name: 'Ace', hint: 'Anh trai Luffy sở hữu Trái Hỏa Quyền Mera Mera no Mi' },
    { name: 'Sabo', hint: 'Tổng tham mưu trưởng Quân Cách Mạng, anh em kết nghĩa của Luffy' },
    { name: 'Shanks', hint: 'Hải tặc Tóc Đỏ đã truyền cảm hứng và trao chiếc mũ rơm cho Luffy' },

    // NARUTO
    { name: 'Naruto', hint: 'Hồ ly chín đuôi Ninja thích ăn ramen Ichiraku, ước mơ làm Hokage' },
    { name: 'Sasuke', hint: 'Tộc nhân Uchiha sở hữu Sharingan và ước mơ trả thù anh trai' },
    { name: 'Kakashi', hint: 'Ninja sao chép luôn đeo khẩu trang và đọc sách Thiên Đường Tung Tăng' },
    { name: 'Itachi', hint: 'Thiên tài tộc Uchiha hy sinh cả tộc vì hòa bình Làng Lá' },
    { name: 'Jiraiya', hint: 'Nhân giả hiền nhân thích do thám phòng tắm nữ, thầy của Naruto' },
    { name: 'Hinata', hint: 'Cô gái tộc Hyuga thầm yêu Naruto từ nhỏ, sở hữu Byakugan' },
    { name: 'Gaara', hint: 'Nhất Vĩ Kazekage làng Cát có chữ Ái trên trán' },
    { name: 'Minato', hint: 'Tia Chớp Vàng Làng Lá, Hokage Đệ Tứ và là cha của Naruto' },
    { name: 'Madara', hint: 'Huyền thoại tộc Uchiha kích hoạt Kế hoạch Nguyệt Nhãn' },
    { name: 'Obito', hint: 'Kẻ đeo mặt nạ Tobi đứng sau tổ chức Akatsuki' },

    // JUJUTSU KAISEN
    { name: 'Gojo Satoru', hint: 'Thầy giáo bịt mắt mạnh nhất với Kỹ năng Vô Hạn và Tử' },
    { name: 'Yuji Itadori', hint: 'Cậu học sinh trung học nuốt ngón tay của Vua Nguyền Hồn' },
    { name: 'Megumi Fushiguro', hint: 'Chú thuật sư triệu hồi Thập Chủng Thần Hình Graph' },
    { name: 'Nobara Kugisaki', hint: 'Cô gái cá tính sử dụng đinh và búa để diệt nguyền hồn' },
    { name: 'Sukuna', hint: 'Vua Nguyền Hồn ngự trị trong cơ thể Yuji' },
    { name: 'Kento Nanami', hint: 'Chú thuật sư từng làm dân văn phòng với chiêu Bảy Ba' },
    { name: 'Toji Fushiguro', hint: 'Thánh Thiên Dữ Chú Lực, cha của Megumi' },
    { name: 'Yuta Okkotsu', hint: 'Chú thuật sư đặc cấp có Rika bảo vệ' },
    { name: 'Maki Zenin', hint: 'Cô gái tộc Zenin không có chú lực nhưng sử dụng chú cụ cực giỏi' },
    { name: 'Suguru Geto', hint: 'Bạn thân cũ của Gojo, chú thuật sư thu phục nguyền hồn' },

    // DEMON SLAYER
    { name: 'Tanjiro', hint: 'Cậu bé đeo bông tai Hơi Thở Của Mặt Trời đi tìm thuốc chữa cho em' },
    { name: 'Nezuko', hint: 'Em gái ngậm ống tre dễ thương hóa quỷ chiến đấu cực ngầu' },
    { name: 'Zenitsu', hint: 'Sợ chết nhưng khi ngủ gật hóa thần Hơi Thở Của Sét' },
    { name: 'Inosuke', hint: 'Đầu heo rừng thích đấm nhau dùng Hơi Thở Của Quái Thú' },
    { name: 'Rengoku', hint: 'Viêm Trụ nhiệt huyết như ngọn lửa cháy rực' },
    { name: 'Giyu', hint: 'Thủy Trụ đơ đơ ít nói "tôi không bị ai ghét cả"' },
    { name: 'Shinobu', hint: 'Trùng Trụ nụ cười dịu dàng chuyên dùng độc diệt quỷ' },
    { name: 'Tengen', hint: 'Âm Trụ hào hoa sở hữu 3 cô vợ ninja' },
    { name: 'Akaza', hint: 'Thượng Huyền Tam võ thuật đỉnh cao trong Thanh Gươm Diệt Quỷ' },
    { name: 'Muzan', hint: 'Chúa tể quỷ nguyên thủy giống Michael Jackson' },

    // ATTACK ON TITAN
    { name: 'Eren', hint: 'Thần tượng tự do, biến thành Titan Tiến Công san bằng thế giới' },
    { name: 'Mikasa', hint: 'Cô gái tộc Ackerman cuồng bảo vệ Eren' },
    { name: 'Armin', hint: 'Bộ óc chiến thuật thiên tài của Trinh Sát Đoàn, Titan Đại Hình' },
    { name: 'Levi', hint: 'Chiến thần lùn tịt mạnh nhất nhân loại cuồng sạch sẽ' },
    { name: 'Erwin', hint: 'Đội trưởng Trinh Sát Đoàn với tiếng hô "Shinzo wo Sasageyo"' },
    { name: 'Reiner', hint: 'Titan Thiết Giáp muốn làm người hùng nhưng dằn dặt tâm lý' },
    { name: 'Zeke', hint: 'Titan Quái Thú có khả năng chọi đá thần tốc, anh cùng cha khác mẹ của Eren' },
    { name: 'Sasha', hint: 'Cô gái khoai tây mê ăn uống của Trinh Sát Đoàn' },
    { name: 'Hange', hint: 'Nhà nghiên cứu Titan điên rồ và nhiệt huyết' },
    { name: 'Historia', hint: 'Nữ hoàng thật sự của bức tường Paradis' },

    // DRAGON BALL & ONE PUNCH MAN
    { name: 'Goku', hint: 'Khỉ con Saiyan thích đánh nhau nâng cấp Ultra Instinct' },
    { name: 'Vegeta', hint: 'Hoàng tử Saiyan kiêu hãnh cuồng tập luyện vượt Goku' },
    { name: 'Gohan', hint: 'Con trai Goku bộc phát sức mạnh hóa Super Saiyan 2 diệt Cell' },
    { name: 'Trunks', hint: 'Kiếm sĩ từ tương lai trở về dặn dò Goku' },
    { name: 'Piccolo', hint: 'Người Namek từng là kẻ thù nhưng trở thành bảo mẫu nhà Goku' },
    { name: 'Beerus', hint: 'Thần Hủy Diệt cuồng ăn đồ ăn Trái Đất' },
    { name: 'Saitama', hint: 'Thánh Phồng đấm phát chết luôn, trọc đầu do tập luyện' },
    { name: 'Genos', hint: 'Cyborg hiện đại đệ tử ruột của Saitama' },
    { name: 'Tatsumaki', hint: 'Đứa Con Của Bão Siêu Năng Lực lùn tịt cá tính' },
    { name: 'Garou', hint: 'Quái vật nhân tạo hunted các anh hùng' },

    // HUNTER X HUNTER & BLEACH
    { name: 'Gon', hint: 'Cậu bé câu cá đi tìm cha trở thành Hunter' },
    { name: 'Killua', hint: 'Sát thủ nhí tộc Zoldyck biến niệm thành dòng điện' },
    { name: 'Kurapika', hint: 'Tộc nhân Kurta mắt đỏ dùng xích diệt Băng Nhện' },
    { name: 'Hisoka', hint: 'Tên hề biến thái cuồng đánh nhau với quả bong bóng Bungee' },
    { name: 'Chrollo', hint: 'Bang chủ Băng Nhện Bang Ryodan đánh cắp niệm' },
    { name: 'Ichigo', hint: 'Tóc cam đại diện tử thần thay thế với thanh Zangetsu' },
    { name: 'Rukia', hint: 'Nữ tử thần trao sức mạnh cho Ichigo' },
    { name: 'Aizen', hint: 'Kẻ phản diện thích tháo kính vuốt tóc tạo phản Thi魂Giới' },
    { name: 'Byakuya', hint: 'Đội trưởng đội 6 tộc trưởng Kuchiki sở hữu Senbonzakura' },
    { name: 'Kisuke', hint: 'Ông chủ tiệm ch chít mang dép cao su đội nón sọc' },

    // SPY X FAMILY & CHAINSAW MAN
    { name: 'Anya', hint: 'Bé gái đọc suy nghĩ siêu ngố thích ăn đậu phụng "Waku Waku"' },
    { name: 'Loid', hint: 'Điệp viên Twilight làm người cha mẫu mực' },
    { name: 'Yor', hint: 'Nữ sát thủ Công chúa Gai làm người mẹ đảm đang' },
    { name: 'Denji', hint: 'Thợ săn quỷ nghèo khổ ước mơ biến thành Quỷ Cưa' },
    { name: 'Power', hint: 'Quỷ máu ngạo mạn, bạn thân của Denji' },
    { name: 'Makima', hint: 'Sĩ quan cấp cao Quỷ Chi phối xinh đẹp nhưng đáng sợ' },
    { name: 'Aki', hint: 'Thợ săn quỷ sử dụng Quỷ Cáo và Quỷ Lời Nguyền' },
    { name: 'Reze', hint: 'Cô gái Quỷ Bom Bom gieo tương tư cho Denji' },
    { name: 'Pochita', hint: 'Quỷ Cưa đáng yêu biến thành trái tim của Denji' },
    { name: 'Kobeni', hint: 'Nữ thợ săn quỷ hay khóc nhè nhưng nhảy Dance Dance cực đỉnh' },

    // ANIME KINH ĐIỂN VÀ ISEKAI
    { name: 'Light Yagami', hint: 'Học sinh thiên tài sở hữu Cuốn Sổ Tử Thần Death Note' },
    { name: 'L', hint: 'Thám tử thiên tài cuồng ăn đồ ngọt dáng ngồi khom lưng' },
    { name: 'Ryuk', hint: 'Thần chết cuồng ăn táo đỏ' },
    { name: 'Edward Elric', hint: 'Giả kim thuật sư tóc vàng lùn tịt tìm Đá Triết Gia' },
    { name: 'Alphonse', hint: 'Em trai Edward mang linh hồn nhập vào bộ giáp sắt' },
    { name: 'Roy Mustang', hint: 'Giả kim thuật sư Ngọn Lửa búng tay ra lửa' },
    { name: 'Lelouch', hint: 'Hoàng tử Britannia sở hữu con mắt Geass ra lệnh tuyệt đối' },
    { name: 'C.C.', hint: 'Cô gái bất tử mê ăn pizza đồng hành cùng Lelouch' },
    { name: 'Kirito', hint: 'Hắc Kiếm Sĩ độc hành trong Sword Art Online' },
    { name: 'Asuna', hint: 'Nữ kiếm sĩ chớp nhoáng Phó hội trưởng Huyết Tộc Liên Minh' },
    { name: 'Subaru', hint: 'Thánh chịu đựng có khả năng Chết Đi Sống Lại trong Re:Zero' },
    { name: 'Emilia', hint: 'Bán Bán Tinh Linh tóc bạc đáng yêu Subaru liều mạng bảo vệ' },
    { name: 'Rem', hint: 'Hầu gái quỷ tóc xanh "Tóc xanh chân thành"' },
    { name: 'Kazuma', hint: 'Thánh bựa Isekai chuyên dùng chiêu Steal' },
    { name: 'Aqua', hint: 'Nữ thần nước vô dụng phế vật khóc nhè' },
    { name: 'Megumin', hint: 'Pháp sư Bão Tố cuồng phép Explosion' },
    { name: 'Rimuru', hint: 'Slime ma vương bá đạo bá chủ rừng Jura' },
    { name: 'Mob', hint: 'Cậu bé siêu năng lực 100% bộc phát cảm xúc' },
    { name: 'Kaneki', hint: 'Bán ngạ quỷ tóc trắng "1000 trừ 7 bằng bao nhiêu"' },
    { name: 'Spike Spiegel', hint: 'Thợ săn tiền thưởng không gian trong Cowboy Bebop' }
];

// --- CẤU HÌNH AI "THÔNG MINH NHƯ NGƯỜI THẬT" ---
const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' });
const MODEL_NAME = 'meta/llama-3.1-70b-instruct';

const SYSTEM_PROMPT = `
Bạn là một thành viên Gen Z lầy lội, cực kỳ thông minh và có cá tính mạnh trong server Discord này. 
QUY TẮC VÀNG ĐỂ CHAT HỆT NHƯ NGƯỜI THẬT:
1. TUYỆT ĐỐI KHÔNG BAO GIỜ nói "tôi là AI", "tôi là mô hình ngôn ngữ", "tôi là trợ lý".
2. Tông giọng: Gen Z vui vẻ, hài hước, mỉa mai nhẹ nhàng, biết giận, biết đùa, cực kỳ tự nhiên.
3. Cách xưng hô: Dùng tui - ông/bà, tao - mày (nếu đối phương chọc giận), bro, tớ - cậu.
4. Cách viết: Viết chữ thường hoàn toàn, không viết hoa đầu câu, không xài dấu chấm câu cuối dòng.
5. Từ lóng Gen Z Discord: dính chưởng, xỉu, chê, cíu, bro, ét o ét, ảo thật đấy, cay thế nhỉ, mơ đi cưng, vãi.
6. Độ dài: Ngắn gọn từ 1 - 3 câu chuẩn chat Discord. Đừng bao giờ viết thành bài văn tự luận dài dòng.
`;

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL_NAME, 
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            temperature: 0.9, 
            max_tokens: 300
        });
        return completion.choices[0]?.message?.content || 'hông biết nói gì luôn á ngơ ngác chít đúm :v';
    } catch (e) {
        logger.warn(e, 'Nvidia AI error');
        return 'mạng lag quá bợn êi, từ từ hẵng réo :v';
    }
}

// --- TẠO SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('ai').setDescription('Bật/tắt chế độ AI tự động').addSubcommand(sub => sub.setName('on').setDescription('Bật AI')).addSubcommand(sub => sub.setName('off').setDescription('Tắt AI')),
    new SlashCommandBuilder().setName('vi').setDescription('Kiểm tra tiền, cần câu và nông trại'),
    new SlashCommandBuilder().setName('diandanh').setDescription('Điểm danh nhận xu hàng ngày'),
    new SlashCommandBuilder().setName('doananime').setDescription('Minigame đoán tên 100 nhân vật Anime'),
    new SlashCommandBuilder().setName('slot').setDescription('Quay hũ Slot Machine săn Jackpot đổi đời').addIntegerOption(opt => opt.setName('sotien').setDescription('Số xu cược quay').setRequired(true)),
    new SlashCommandBuilder().setName('nongtrai').setDescription('Hệ thống quản lý nông trại').addSubcommand(sub => sub.setName('vuon').setDescription('Xem khu vườn')).addSubcommand(sub => sub.setName('thuhoach').setDescription('Thu hoạch').addIntegerOption(opt => opt.setName('oodat').setDescription('Ô đất').setRequired(true))),
    new SlashCommandBuilder().setName('cauca').setDescription('Đi câu cá giải trí kiếm thu nhập')
].map(c => c.toJSON());

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel, Partials.Message]
});
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const userId = interaction.user.id;
    let eco = getUserData(userId);

    try {
        switch (interaction.commandName) {
            
            case 'vi': {
                const embed = createBaseEmbed(
                    0x2B2D31, 
                    `💳 TÀI KHOẢN CỦA ${interaction.user.username.toUpperCase()}`, 
                    `Sở hữu hệ thống kinh tế tối ưu tích hợp Animation!`,
                    GIFS.wallet,
                    interaction.user.displayAvatarURL({ dynamic: true, size: 256 })
                )
                .addFields(
                    { name: '💰 Số dư', value: `**${eco.balance.toLocaleString()} xu**`, inline: true },
                    { name: '🔥 Chuỗi điểm danh', value: `**${eco.streak} ngày**`, inline: true },
                    { name: '🎣 Cần câu', value: `**${eco.rod.toUpperCase()}**`, inline: true },
                    { name: '🌱 Diện tích đất', value: `**${eco.plots.length} ô**`, inline: true }
                )
                .setFooter({ text: 'Discord Bot Animated System', iconURL: client.user.displayAvatarURL() });
                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'diandanh': {
                const cooldown = 24 * 60 * 60 * 1000;
                const timePassed = Date.now() - eco.lastDaily;
                if (timePassed < cooldown) {
                    const hoursLeft = Math.ceil((cooldown - timePassed) / 3600000);
                    return interaction.reply({ embeds: [createBaseEmbed(0xED4245, '⏳ BẠN ĐÃ ĐIỂM DANH RỒI!', `Quay lại sau **${hoursLeft} giờ** nữa để nhận quà tiếp nhé.`, GIFS.daily)], ephemeral: true });
                }
                
                eco.balance += 500;
                eco.lastDaily = Date.now();
                eco.streak += 1;
                saveUserData(userId, eco);
                
                await interaction.reply({ embeds: [createBaseEmbed(0x57F287, '🎁 ĐIỂM DANH THÀNH CÔNG', `Bạn nhận được **+500 xu**.\n🔥 Chuỗi hiện tại: **${eco.streak} ngày**!`, GIFS.daily)] });
                break;
            }

            case 'cauca': {
                let chance = Math.random();
                let caughtFish;
                
                const rodTiers = {
                    'titan':  [{c: 0.05, f: 10}, {c: 0.15, f: 9}, {c: 0.40, f: 8}, {c: 0.70, f: 7}, {c: 1.0, f: 6}],
                    'carbon': [{c: 0.05, f: 9},  {c: 0.20, f: 8}, {c: 0.45, f: 6}, {c: 0.75, f: 5}, {c: 1.0, f: 4}],
                    'tre':    [{c: 0.05, f: 6},  {c: 0.15, f: 4}, {c: 0.40, f: 3}, {c: 0.70, f: 2}, {c: 0.90, f: 1}, {c: 1.0, f: 0}]
                };

                const currentRodLimits = rodTiers[eco.rod] || rodTiers['tre'];
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
                    GIFS.fishing
                );
                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'slot': {
                const bet = interaction.options.getInteger('sotien');
                if (bet <= 0) return interaction.reply({ content: 'Số tiền cược phải lớn hơn 0 bồ ơi!', ephemeral: true });
                if (eco.balance < bet) return interaction.reply({ content: `Bạn không đủ tiền! Số dư của bạn là: **${eco.balance} xu**.`, ephemeral: true });

                const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
         client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    if (isChannelEnabled(message.channelId)) {
        await message.channel.sendTyping();
        
        if (!chatHistories.has(message.channelId)) chatHistories.set(message.channelId, []);
        const history = chatHistories.get(message.channelId);
        
        history.push({ role: 'user', content: `[Thành viên: ${message.author.username}] nói: ${message.content}` });
        
        if (history.length > 8) history.shift();
        
        const reply = await callNvidiaAI(history);
        
        history.push({ role: 'assistant', content: reply });
        if (history.length > 8) history.shift();
        
        await message.reply(reply);
    }
});

client.once('ready', async () => {
    console.log(`🤖 Bot Discord Thông Minh [${client.user.tag}] đã online!`);
    client.user.setActivity('chat cùng bạn (/ai on)', { type: 3 }); 

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Đã nạp thành công bộ lệnh Slash Commands & 100 Anime!');
    } catch (e) {
        console.error('❌ Lỗi nạp lệnh:', e);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
                import http from 'http';

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Discord is running successfully!');
}).listen(PORT, () => {
    console.log(`Server HTTP dang chay tren port ${PORT}`);
});
                
