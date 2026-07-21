import { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    EmbedBuilder, Partials, Events 
} from 'discord.js';
import OpenAI from 'openai';
import http from 'http';

const logger = {
    warn: (obj, msg) => console.warn(JSON.stringify({ level: 'warn', ...((typeof obj === 'string') ? { msg: obj } : { ...obj, msg }) }))
};

// --- KHỞI TẠO CLIENT & OPENAI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message]
});

const openai = new OpenAI();

// --- KHO ANIMATION GIFS & MEDIA ---
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

// --- QUẢN LÝ BỘ NHỚ ---
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
            fishes: [] 
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

// --- DỮ LIỆU GAME (CÁ) ---
const FISH_LIST = [
    { name: '👢 Chiếc Ủng Rách (Rác)', price: 10 },
    { name: '🐡 Cá Lóc Đồng', price: 80 },
    { name: '🐟 Cá Rô Phi', price: 120 },
    { name: '🦑 Mực Ống Tươi', price: 200 },
    { name: '🐠 Cá Chép Vàng', price: 350 },
    { name: '🍣 Cá Hồi Bơi Ngược', price: 600 },
    { name: '🦈 Cá Mập Con', price: 1500 },
    { name: '🐢 Rùa Biển Khổng Lồ', price: 2500 },
    { name: '🐙 Thủy Quái Kraken', price: 6000 },
    { name: '🐋 Cá Voi Xanh Huyền Thoại', price: 15000 },
    { name: '🐉 Rồng Biển Thượng Cổ', price: 50000 }
];

// --- KHO ĐỦ 100 NHÂN VẬT ANIME KÈM ẢNH MINH HỌA ---
const ANIME_LIST = [
    // ONE PIECE (1-15)
    { name: 'luffy', display: 'Monkey D. Luffy', hint: 'Thuyền trưởng Mũ Rơm ước mơ làm Vua Hải Tặc', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'zoro', display: 'Roronoa Zoro', hint: 'Kiếm sĩ 3 dao cực ngầu nhưng mù đường', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'sanji', display: 'Vinsmoke Sanji', hint: 'Đầu bếp tóc vàng thích đá lửa', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'nami', display: 'Nami', hint: 'Hoa tiêu cuồng tiền và cam ngọt', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'robin', display: 'Nico Robin', hint: 'Nhà khảo cổ học sức mạnh hoa tay', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'chopper', display: 'Tony Tony Chopper', hint: 'Bác sĩ tuần lộc đáng yêu của nhóm', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'usopp', display: 'Usopp', hint: 'Thánh nổ kiêm xạ thủ mũi dài', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'franky', display: 'Franky', hint: 'Thợ đóng tàu người máy hệ SUPER', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'brook', display: 'Brook', hint: 'Nhạc công bộ xương thích đùa kiểu sọ người', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'jinbe', display: 'Jinbe', hint: 'Người cá cựu thất vũ hải võ thuật ngư nhân', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'ace', display: 'Portgas D. Ace', hint: 'Hỏa quyền anh trai kết nghĩa của Luffy', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'sabo', display: 'Sabo', hint: 'Tổng tham mưu trưởng quân cách mạng', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'shanks', display: 'Shanks Tóc Đỏ', hint: 'Tứ hoàng uy quyền bạn cũ của Buggy', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'law', display: 'Trafalgar Law', hint: 'Bác sĩ tử thần sở hữu trái Ope Ope', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'mihawk', display: 'Dracule Mihawk', hint: 'Kiếm sĩ mạnh nhất thế giới mắt diều hâu', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },

    // NARUTO (16-30)
    { name: 'naruto', display: 'Naruto Uzumaki', hint: 'Ninja thích ăn ramen ước mơ làm Hokage', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'sasuke', display: 'Sasuke Uchiha', hint: 'Thiếu gia tộc Uchiha mang đôi mắt Sharingan', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'kakashi', display: 'Kakashi Hatake', hint: 'Ninja sao chép đeo khẩu trang huyền thoại', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'itachi', display: 'Itachi Uchiha', hint: 'Thiên tài tộc Uchiha hy sinh vì làng', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'minato', display: 'Minato Namikaze', hint: 'Tia chớp vàng làng Lá hokage đệ tứ', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'hinata', display: 'Hinata Hyuga', hint: 'Công chúa bạch nhãn thầm yêu Naruto', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'madara', display: 'Madara Uchiha', hint: 'Trùm cuối huyền thoại tộc Uchiha', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'jiraiya', display: 'Jiraiya', hint: 'Tiên nhân cóc thích đọc truyện người lớn', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'gaara', display: 'Gaara', hint: 'Kazekage làng cát mang bình hồ lô đốm', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'tsunade', display: 'Tsunade Senju', hint: 'Hokage đệ ngũ bài bạc cực kỳ xui xẻo', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'pain', display: 'Pain (Nagato)', hint: 'Thủ lĩnh Akatsuki kẻ gây đau thương cho làng Lá', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'sakura', display: 'Sakura Haruno', hint: 'Nữ ninja y thuật có cú đấm ngàn cân', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'shikamaru', display: 'Shikamaru Nara', hint: 'Thiên tài lười biếng có IQ trên 200', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'obito', display: 'Obito Uchiha', hint: 'Kẻ mang mặt nạ xoắn điều khiển vĩ thú', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'orochimaru', display: 'Orochimaru', hint: 'Tam nin huyền thoại thích nghiên cứu nhẫn thuật rắn', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },

    // DRAGON BALL (31-40)
    { name: 'goku', display: 'Son Goku', hint: 'Chiến binh Saiyan ham ăn khỏe nhất vũ trụ', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'vegeta', display: 'Vegeta', hint: 'Hoàng tử kiêu hãnh của hành tinh Saiyan', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'gohan', display: 'Son Gohan', hint: 'Con trai Goku tiềm năng sức mạnh siêu cấp', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'piccolo', display: 'Piccolo', hint: 'Chiến binh Namek thầy dạy học của Gohan', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'frieza', display: 'Frieza', hint: 'Đại vương độc tài vũ trụ kẻ thù truyền kiếp', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'trunks', display: 'Trunks Tương Lai', hint: 'Kiếm sĩ Saiyan du hành thời gian', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'beerus', display: 'Thần Hủy Diệt Beerus', hint: 'Thần mèo thích ăn đồ ngon', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'whis', display: 'Whis', hint: 'Thiên sứ thầy dạy võ của thần hủy diệt', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'cell', display: 'Cell (Xên Bọ Hung)', hint: 'Sinh nhân tạo tổng hợp ADN các chiến binh', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'majinbuu', display: 'Majin Buu', hint: 'Ma bủ mập mạp thích ăn kẹo ngọt', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },

    // DEMON SLAYER (41-55)
    { name: 'tanjiro', display: 'Tanjiro Kamado', hint: 'Thợ săn quỷ có vết sẹo và chiếc trán thép', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'nezuko', display: 'Nezuko Kamado', hint: 'Em gái hóa quỷ ngậm ống tre đáng yêu', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'zenitsu', display: 'Zenitsu Agatsuma', hint: 'Thánh ngủ gật dùng chiêu thức sét đánh', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'inosuke', display: 'Inosuke Hashibira', hint: 'Thanh niên cởi trần đội đầu heo rừng', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'giyu', display: 'Giyu Tomioka', hint: 'Thủy trụ trầm tính hay tự kỷ', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'shinobu', display: 'Shinobu Kocho', hint: 'Trùng trụ chuyên dùng chất độc bướm xinh', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'rengoku', display: 'Kyojuro Rengoku', hint: 'Viêm trụ hào sảng thích ăn cơm hộp ngon', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'tengen', display: 'Tengen Uzui', hint: 'Âm trụ hào nhoáng có ba người vợ', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'muichiro', display: 'Muichiro Tokito', hint: 'Hà trụ hay quên lãng mây bay', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'mitsuri', display: 'Mitsuri Kanroji', hint: 'Luyến trụ tóc hồng sức mạnh cơ bắp khủng', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'obanai', display: 'Obanai Iguro', hint: 'Xà trụ mang con rắn trắng quanh cổ', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'sanemi', display: 'Sanemi Shinazugawa', hint: 'Phong trụ tính cách nóng nảy xăm sẹo', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'gyomei', display: 'Gyomei Himejima', hint: 'Nham trụ mù lòa cao lớn mạnh nhất các trụ', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'muzan', display: 'Muzan Kibutsuji', hint: 'Chúa tể quỷ chúa trùm sừng sỏ', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'akaza', display: 'Akaza', hint: 'Thượng huyền tam võ thuật cận chiến', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },

    // JUJUTSU KAISEN (56-65)
    { name: 'gojo', display: 'Gojo Satoru', hint: 'Thầy giáo mạnh nhất mắt đẹp vô hạ hạn', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'yuji', display: 'Yuji Itadori', hint: 'Nuốt ngón tay nguyền rủa làm vật chủ Sukuna', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'megumi', display: 'Megumi Fushiguro', hint: 'Triệu hồi thức thần bóng tối bùa phép', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'nobara', display: 'Nobara Kugisaki', hint: 'Nữ pháp sư dùng búa và đinh tạc tượng', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'sukuna', display: 'Ryomen Sukuna', hint: 'Vua nguyền rủa hai mặt hiểm độc', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'nanami', display: 'Kento Nanami', hint: 'Nhân viên công sở làm pháp sư tính tỷ lệ 7:3', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'maki', display: 'Maki Zenin', hint: 'Thiên bẩm thể chất cực mạnh dùng vũ khí', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'toge', display: 'Toge Inumaki', hint: 'Pháp sư chỉ nói chuyện bằng từ ngữ món cơm nắm', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'geto', display: 'Suguru Geto', hint: 'Kẻ thao túng nguyền hồn tóc dài búi', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'toji', display: 'Toji Fushiguro', hint: 'Sơ hở sát thủ khét tiếng không có chú lực', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },

    // ATTACK ON TITAN (66-75)
    { name: 'eren', display: 'Eren Yeager', hint: 'Kẻ khởi xướng Rung Chấn diệt thế', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'mikasa', display: 'Mikasa Ackerman', hint: 'Nữ chiến binh mạnh nhất bảo vệ Eren', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'levi', display: 'Levi Ackerman', hint: 'Binh trưởng lùn mạnh nhất nhân loại cuồng sạch sẽ', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'armin', display: 'Armin Arlert', hint: 'Bộ óc chiến lược thiên tài chủ nhân đại hình', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'erwin', display: 'Erwin Smith', hint: 'Đội trưởng đoàn trinh sát hô vang tiến lên', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'hange', display: 'Hange Zoe', hint: 'Nhà khoa học điên cuồng mê titan', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'sasha', display: 'Sasha Blouse', hint: 'Cô nàng khoai tây thích ăn thịt', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'reiner', display: 'Reiner Braun', hint: 'Titan thiết giáp chuyên gia trầm cảm', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'annie', display: 'Annie Leonhart', hint: 'Titan nữ hình võ thuật khéo léo', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'zeke', display: 'Zeke Yeager', hint: 'Titan quái thú anh trai cùng cha khác mẹ của Eren', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },

    // MY HERO ACADEMIA (76-85)
    { name: 'deku', display: 'Izuku Midoriya (Deku)', hint: 'Cậu bé vô năng nhận năng lực One For All', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'bakugo', display: 'Katsuki Bakugo', hint: 'Thanh niên nổ tung tính khí cáu kỉnh', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'todoroki', display: 'Shoto Todoroki', hint: 'Hoả băng nhị nguyên tử đẹp trai', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'allmight', display: 'All Might', hint: 'Biểu tượng hòa bình cựu số một', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'uraraka', display: 'Ochaco Uraraka', hint: 'Cô bé trọng lực không trọng lượng', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'hawks', display: 'Keigo Takami (Hawks)', hint: 'Anh hùng số 2 lông vũ tốc độ', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'dabi', display: 'Dabi', hint: 'Phản diện ngọn lửa xanh lam bí ẩn', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'shigaraki', display: 'Tomura Shigaraki', hint: 'Trùm phản diện ăn mòn mọi thứ', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'endeavor', display: 'Endeavor', hint: 'Anh hùng số 1 lửa đỏ ba đầu sáu tay', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'tsuyu', display: 'Tsuyu Asui', hint: 'Cô bé hệ ếch dễ thương', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },

    // OTHER POPULAR ANIME (86-100)
    { name: 'anya', display: 'Anya Forger', hint: 'Cô bé đọc suy nghĩ thích ăn đậu phộng trong Spy x Family', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800' },
    { name: 'loid', display: 'Loid Forger', hint: 'Điệp viên Twilight bố dượng của Anya', image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800' },
    { name: 'yor', display: 'Yor Forger', hint: 'Công chúa gai sát thủ mẹ nuôi của Anya', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800' },
    { name: 'saitama', display: 'Saitama', hint: 'Thánh trọc đấm một phát chết luôn trong One Punch Man', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'genos', display: 'Genos', hint: 'Cyborg học trò của thánh trọc', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { name: 'rimuru', display: 'Rimuru Tempest', hint: 'Slime xanh chuyển sinh bá đạo trong Tensei Slime', image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800' },
    { name: 'subaru', display: 'Subaru Natsuki', hint: 'Thanh niên chết đi sống lại trong Re:Zero', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'rem', display: 'Rem', hint: 'Cô hầu gái tóc xanh giắt quỷ túc cầu', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800' },
    { name: 'kaguya', display: 'Kaguya Shinomiya', hint: 'Tiểu thư thông minh trong Kaguya-sama Love is War', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'senku', display: 'Senku Is
        // --- XỬ LÝ TƯƠNG TÁC LỆNH ---
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const userId = interaction.user.id;
    const userData = getUserData(userId);

    try {
        if (commandName === 'vi') {
            const embed = createBaseEmbed(
                0x00FFCC,
                `💰 Ví Tiền & Tài Sản Của ${interaction.user.username}`,
                `🪙 Số dư hiện tại: **${userData.balance.toLocaleString()} xu**\n🎣 Kho cá sở hữu: **${userData.fishes.length} con**`,
                MEDIA.wallet
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'daily') {
            const now = Date.now();
            if (now - userData.lastDaily < 24 * 60 * 60 * 1000) {
                return interaction.reply({ content: '⏳ Bạn đã điểm danh hôm nay rồi, hãy quay lại vào ngày mai nhé!', ephemeral: true });
            }
            userData.lastDaily = now;
            userData.balance += 500;
            saveUserData(userId, userData);

            const embed = createBaseEmbed(0x00FF00, '🎁 Điểm Danh Thành Công', 'Nhận ngay **+500 xu** vào tài khoản ví!', MEDIA.daily);
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'cauca') {
            const fish = FISH_LIST[Math.floor(Math.random() * FISH_LIST.length)];
            userData.fishes.push(fish.name);
            userData.balance += fish.price;
            saveUserData(userId, userData);

            const embed = createBaseEmbed(
                0x3498DB,
                '🎣 Hoạt Động Câu Cá Thư Giãn',
                `Bạn đã quăng cần và câu được: **${fish.name}**!\n💰 Bán ngay thu về: **+${fish.price} xu**`,
                MEDIA.fishing
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'slot') {
            const bet = interaction.options.getInteger('sotien');
            if (bet <= 0 || userData.balance < bet) {
                return interaction.reply({ content: '❌ Số tiền cược không hợp lệ hoặc vượt quá số dư trong ví!', ephemeral: true });
            }

            userData.balance -= bet;
            const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
            const r1 = symbols[Math.floor(Math.random() * symbols.length)];
            const r2 = symbols[Math.floor(Math.random() * symbols.length)];
            const r3 = symbols[Math.floor(Math.random() * symbols.length)];

            let reward = 0;
            let msg = 'Thua mất rồi, chúc bạn may mắn lần sau!';
            let color = 0xFF0000;

            if (r1 === r2 && r2 === r3) {
                reward = bet * 5;
                msg = `🎉 JACKPOT! Trúng 3 biểu tượng giống hệt! Nhận ngay +${reward} xu!`;
                color = 0x00FF00;
            } else if (r1 === r2 || r2 === r3 || r1 === r3) {
                reward = Math.floor(bet * 1.5);
                msg = `✨ Trúng 2 biểu tượng! Nhận lại +${reward} xu!`;
                color = 0xFFA500;
            }

            userData.balance += reward;
            saveUserData(userId, userData);

            const embed = createBaseEmbed(
                color,
                '🎰 Slot Machine Quay Hũ Đổi Thưởng',
                `[ ${r1} | ${r2} | ${r3} ]\n\n${msg}\n🪙 Ví hiện tại: **${userData.balance.toLocaleString()} xu**`,
                MEDIA.slot
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'taixiu') {
            const choice = interaction.options.getString('luachon');
            const bet = interaction.options.getInteger('sotien');

            if (bet <= 0 || userData.balance < bet) {
                return interaction.reply({ content: '❌ Số xu cược không hợp lệ hoặc tài khoản không đủ!', ephemeral: true });
            }

            userData.balance -= bet;

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
                userData.balance += bet * 2;
            }
            saveUserData(userId, userData);

            const resultEmbed = createBaseEmbed(
                win ? 0x00FF00 : 0xFF0000,
                win ? '🎉 KẾT QUẢ TÀI XỈU: CHIẾN THẮNG!' : '💸 KẾT QUẢ TÀI XỈU: THUA CUỘC!',
                `Xúc xắc: ${diceEmojis[d1]} ${diceEmojis[d2]} ${diceEmojis[d3]} (Tổng: **${total} điểm** - **${outcome.toUpperCase()}**)\n` +
                `Lựa chọn của bạn: **${choice.toUpperCase()}**\n` +
                `${win ? `🎉 Thưởng nhận được: +${bet * 2} xu` : `❌ Mất cược: -${bet} xu`}\n\n` +
                `🪙 Số dư ví mới: **${userData.balance.toLocaleString()} xu**`,
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
            const quiz = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
            
            const embed = createBaseEmbed(
                0x9B59B6,
                '🧠 Minigame Đoán Tên Nhân Vật Anime (100 Nhân Vật)',
                `Gợi ý: **${quiz.hint}**\n\n⏱️ *Hãy nhập tên nhân vật vào khung chat trong vòng 15 giây tới!*`,
                quiz.image
            );

            await interaction.reply({ embeds: [embed] });

            const filter = m => m.author.id === interaction.user.id;
            try {
                const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
                const guess = collected.first().content.toLowerCase();

                if (guess.includes(quiz.name)) {
                    userData.balance += 400;
                    saveUserData(userId, userData);
                    await interaction.followUp({ content: `🎉 Xuất sắc! Bạn đã đoán đúng là **${quiz.display}** và nhận được **+400 xu**!` });
                } else {
                    await interaction.followUp({ content: `❌ Tiếc quá, đáp án chính xác phải là **${quiz.display}** cơ!` });
                }
            } catch {
                await interaction.followUp({ content: `⏱️ Hết giờ! Đáp án chính xác là **${quiz.display}**.` });
            }
        }
        else if (commandName === 'nongtrai') {
            const plotStatus = userData.plots.map((p, i) => `Ô đất ${i + 1}: ${p ? p : '🌱 Trống'}`).join('\n');
            const embed = createBaseEmbed(
                0x2ECC71,
                `🌾 Nông Trại Cá Nhân Của ${interaction.user.username}`,
                `Trạng thái các ô trồng trọt:\n${plotStatus}`,
                MEDIA.farm
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'trangtrai') {
            const embed = createBaseEmbed(
                0xE67E22,
                '🏡 Khu Vực Trang Trại Tổng Quan',
                'Chào mừng bạn đến với khu sinh thái trang trại rộng lớn, nơi chăn nuôi và phát triển kinh tế!',
                MEDIA.farm
            );
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'ai') {
            const sub = interaction.options.getSubcommand();
            const channelId = interaction.channelId;

            if (sub === 'on') {
                enableChannel(channelId);
                const embed = createBaseEmbed(0x00FF00, '✨ Trợ Lý AI Siêu Thông Minh Đã Bật', 'Bot đã sẵn sàng trò chuyện và giải đáp mọi thắc mắc cùng bạn trong kênh này!', MEDIA.ai_on);
                await interaction.reply({ embeds: [embed] });
            } else {
                disableChannel(channelId);
                const embed = createBaseEmbed(0xFF0000, '💤 Trợ Lý AI Đã Tắt', 'Đã tạm dừng tính năng tự động trả lời.', MEDIA.ai_off);
                await interaction.reply({ embeds: [embed] });
            }
        }
    } catch (err) {
        logger.warn(err, 'Lỗi thực thi tương tác lệnh');
        if (!interaction.replied) await interaction.reply({ content: 'Đã xảy ra lỗi hệ thống khi xử lý lệnh này!', ephemeral: true });
    }
});
        // --- XỬ LÝ TRÒ CHUYỆN THÔNG MINH, SERVER & ĐĂNG NHẬP ---
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
        history.push({ role: 'user', content: message.content });

        if (history.length > 12) history.splice(1, 2);

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: history,
            temperature: 0.7,
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
