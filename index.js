const { Client, GatewayIntentBits, Partials, REST, Routes, Events } = require('discord.js');
const OpenAI = require('openai');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

const openai = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1'
});
const MODEL_NAME = 'meta/llama-3.1-70b-instruct';

const SYSTEM_PROMPT = `bạn là một thành viên gen z lầy lội, cực kỳ thông minh và có cá tính mạnh trong server discord này.
quy tắc vàng để chat hết như người thật:
1. tuyệt đối không bao giờ nói "tôi là ai", "tôi là mô hình ngôn ngữ", "tôi là trợ lý".
2. tông giọng: gen z vui vẻ, hài hước, mỉa mai nhẹ nhàng, biết giận, biết đùa, cực kỳ tự nhiên.
3. cách xưng hô: dùng tui - ông/bà, tao - mày, bro, tớ - cậu.
4. cách viết: viết chữ thường hoàn toàn, không viết hoa đầu câu, không xài dấu chấm cuối dòng.
5. từ lóng gen z discord: đỉnh chương, xỉu, chê, cứu, bro, ét o ét, ảo thật đấy, cay thế nhỉ, mơ đi cưng, vãi.
6. độ dài: ngắn gọn từ 1 - 3 câu chuẩn chat discord.`;

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
    { name: 'chiếc ủng rách (rác)', price: 10, rarity: 'trash' },
    { name: 'cá lóc đồng', price: 80, rarity: 'common' },
    { name: 'cá rô phi', price: 120, rarity: 'common' },
    { name: 'mực ống tươi', price: 200, rarity: 'uncommon' },
    { name: 'cá chép vàng', price: 350, rarity: 'uncommon' },
    { name: 'cá hồi bơi ngược', price: 600, rarity: 'rare' },
    { name: 'cá mập con', price: 1500, rarity: 'rare' },
    { name: 'rùa biển khổng lồ', price: 2500, rarity: 'epic' },
    { name: 'thủy quái kraken', price: 6000, rarity: 'epic' },
    { name: 'cá voi xanh huyền thoại', price: 15000, rarity: 'legendary' },
    { name: 'rồng biển thượng cổ', price: 50000, rarity: 'mythic' }
];

const ANIME_LIST = [
    { name: 'luffy', display: 'Monkey D. Luffy', hint: 'thuyền trưởng mũ rơm ước mơ làm vua hải tặc', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'zoro', display: 'Roronoa Zoro', hint: 'kiếm sĩ 3 dao cực ngầu nhưng mù đường', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'sanji', display: 'Vinsmoke Sanji', hint: 'đầu bếp tóc vàng thích đá lửa', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'nami', display: 'Nami', hint: 'hoa tiêu cuồng tiền và cam ngọt', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'robin', display: 'Nico Robin', hint: 'nhà khảo cổ học sức mạnh hoa tay', image: 'https://images.unsplash.com/photo-1618336755394-aaede0d5060a?w=800' },
    { name: 'chopper', display: 'Tony Tony Chopper', hint: 'bác sĩ tuần lộc đáng yêu của nhóm', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'usopp', display: 'Usopp', hint: 'xạ thủ thánh nổ của băng hải tặc', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'franky', display: 'Franky', hint: 'thợ đóng tàu người máy hệ super', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'brook', display: 'Brook', hint: 'nhạc công bộ xương thích đùa sọ người', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'jinbe', display: 'Jinbe', hint: 'cựu thất vũ hải võ thuật ngư nhân', image: 'https://images.unsplash.com/photo-1612872087720-bb876e267d17?w=800' },
    { name: 'naruto', display: 'Naruto Uzumaki', hint: 'ninja thích ăn ramen ước mơ làm hokage', image: 'https://images.unsplash.com/photo-1618336755394-aaede0d5060a?w=800' },
    { name: 'sasuke', display: 'Sasuke Uchiha', hint: 'thiếu gia tộc uchiha mang sharingan', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'kakashi', display: 'Kakashi Hatake', hint: 'ninja sao chép đeo khâu trang', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'sakura', display: 'Sakura Haruno', hint: 'nữ ninja y thuật sức mạnh khủng khiếp', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'hinata', display: 'Hinata Hyuga', hint: 'công chúa bạch nhãn thẹn thùng', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'goku', display: 'Son Goku', hint: 'chiến binh saiyan ham ăn khỏe nhất vũ trụ', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'vegeta', display: 'Vegeta', hint: 'hoàng tử kiêu hãnh của hành tinh saiyan', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'gohan', display: 'Son Gohan', hint: 'con trai goku tiềm năng sức mạnh siêu cấp', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'piccolo', display: 'Piccolo', hint: 'chiến binh namek màu xanh thông thái', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'frieza', display: 'Frieza', hint: 'đại vương fize ác ma vũ trụ', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'tanjiro', display: 'Tanjiro Kamado', hint: 'thợ săn quỷ có vết sẹo và trán thép', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'nezuko', display: 'Nezuko Kamado', hint: 'em gái hóa quỷ ngậm ống tre', image: 'https://images.unsplash.com/photo-1618336755394-aaede0d5060a?w=800' },
    { name: 'zenitsu', display: 'Zenitsu Agatsuma', hint: 'thánh khóc nhè ngủ gục tung hỏa lôi', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'inosuke', display: 'Inosuke Hashibira', hint: 'thanh niên đeo mặt nạ lợn rừng cởi trần', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'tengen', display: 'Tengu Uzui', hint: 'âm trụ hào nhoáng mèng đét', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'rengoku', display: 'Kyojuro Rengoku', hint: 'viêm trụ hào sảng ăn cơm ngon miệng', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'giyu', display: 'Giyu Tomioka', hint: 'thủy trụ trầm tính hay bị ghét', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'shinobu', display: 'Shinobu Kocho', hint: 'trùng trụ bướm độc châm chích', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'muzan', display: 'Muzan Kibutsuji', hint: 'chúa quỷ chúa tể michael jackson', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'akaza', display: 'Akaza', hint: 'thượng huyền tam võ thuật cận chiến', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'gojo', display: 'Gojo Satoru', hint: 'thầy giáo mạnh nhất mắt đẹp vô hạn', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'sukuna', display: 'Ryomen Sukuna', hint: 'vua nguyền rủa hai mặt hiểm độc', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'yuji', display: 'Yuji Itadori', hint: 'nam thần nguyền rủa nuốt ngón tay', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'megumi', display: 'Megumi Fushiguro', hint: 'triệu hồi sư bóng tối thỏ sói', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'nobara', display: 'Nobara Kugisaki', hint: 'nữ chiến binh búa đinh cá tính', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'saitama', display: 'Saitama', hint: 'thánh trọc đấm một phát chết luôn', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'genos', display: 'Genos', hint: 'cyborg hiện đại đệ tử thánh trọc', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'tatsumaki', display: 'Tatsumaki', hint: 'cô nàng loli siêu năng lực khủng', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'garou', display: 'Garou', hint: 'thợ săn anh hùng hóa quái vật', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'bofoi', display: 'Metal Knight', hint: 'hiệp sĩ sắt máy móc', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'eren', display: 'Eren Yeager', hint: 'thanh niên diệt thế sát thủ khổng lồ', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'mikasa', display: 'Mikasa Ackerman', hint: 'nữ thần chiến binh bảo vệ eren', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'levi', display: 'Levi Ackerman', hint: 'đội trưởng lùn mạnh nhất nhân loại sạch sẽ', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'armin', display: 'Armin Arlert', hint: 'quân sư thông minh óc chiến thuật', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'erwin', display: 'Erwin Smith', hint: 'đại tướng quân đoàn trinh sát dũng cảm', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'light', display: 'Light Yagami', hint: 'kira sở hữu cuốn sổ tử thần death note', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'l', display: 'L Lawliet', hint: 'thám tử thiên tài thích ăn kẹo ngồi xổm', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'misa', display: 'Misa Amane', hint: 'người mẫu hâm mộ kira tột độ', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'ryuk', display: 'Ryuk', hint: 'thần chết thích ăn táo', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'near', display: 'Near', hint: 'thám tử nhí chơi đồ chơi', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'senku', display: 'Senku Ishigami', hint: 'thần đồng khoa học 10 tỷ phần trăm', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'taiju', display: 'Taiju Oki', hint: 'anh chàng cơ bắp sức trâu', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'kohaku', display: 'Kohaku', hint: 'cô nàng thợ săn hoang dã', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'chrome', display: 'Chrome', hint: 'pháp sư khoa học tập sự', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'tsukasa', display: 'Tsukasa Shishio', hint: 'linh trưởng mạnh nhất thời đồ đá', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'asta', display: 'Asta', hint: 'thanh niên không ma lực kiếm phản ma', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'yuno', display: 'Yuno Grinberryall', hint: 'thiên tài ma pháp cỏ bốn lá', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'noelle', display: 'Noelle Silva', hint: 'công chúa nước tsundere', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'yami', display: 'Yami Sukehiro', hint: 'đội trưởng hắc ngưu thích đi vệ sinh', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'julius', display: 'Julius Novachrono', hint: 'vua ma pháp cuồng phép thuật', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'kaneki', display: 'Ken Kaneki', hint: 'bán ngạ quỷ tóc trắng mắt kính', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'touka', display: 'Touka Kirishima', hint: 'thỏ ngạ quỷ tiệm cà phê anteiku', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'juuzou', display: 'Juuzou Suzuya', hint: 'thanh tra đặc biệt phong cách khâu vá', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'arima', display: 'Kishou Arima', hint: 'tử thần ccg huyền thoại', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'utahime', display: 'Uta', hint: 'thợ làm mặt nạ cá tính', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'kirito', display: 'Kirito', hint: 'hắc kiếm sĩ sao kazuto sao chép', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'asuna', display: 'Asuna Yuuki', hint: 'tia chớp tiểu thư kiếm sĩ giỏi nấu ăn', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'sinon', display: 'Sinon', hint: 'xạ thủ ảo ảnh ggo', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'leafa', display: 'Leafa', hint: 'em gái tiên phong lướt gió', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'alice', display: 'Alice Synthesis', hint: 'hiệp sĩ thanh liêm vàng rực', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'subaru', display: 'Natsuki Subaru', hint: 'chàng trai chết đi sống lại dị giới', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'rem', display: 'Rem', hint: 'cô hầu gái tóc xanh quốc dân', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'ram', display: 'Ram', hint: 'cô hầu gái tóc hồng sắc sảo', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'emilia', display: 'Emilia', hint: 'tiên nữ tóc bạc nửa yêu tinh', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'beatrice', display: 'Beatrice', hint: 'thủ thư loli tiểu tinh linh', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'anya', display: 'Anya Forger', hint: 'cô bé đọc suy nghĩ thích ăn đậu phộng', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'loid', display: 'Loid Forger', hint: 'điệp viên twilight bố giả vờ', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'yor', display: 'Yor Forger', hint: 'sát thủ công chúa gai mẹ nuôi', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'bond', display: 'Bond Forger', hint: 'chó tiên tri tương lai gia đình forger', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'damian', display: 'Damian Desmond', hint: 'công tử quý tộc trường eden', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'bocchi', display: 'Hitori Gotoh', hint: 'cô bé ghita hướng nội sợ xã hội', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'nijika', display: 'Nijika Ijichi', hint: 'trưởng nhóm nhạc năng động tóc vàng', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'ryo', display: 'Ryo Yamada', hint: 'tay bass kỳ quặc thích ăn rau', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'kita', display: 'Ikuyo Kita', hint: 'cô nàng hướng ngoại rực rỡ', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'nijima', display: 'Nijima', hint: 'nhân vật phụ huyền thoại', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'shinji', display: 'Shinji Ikari', hint: 'phi công eva thảm họa tâm lý', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'rei', display: 'Rei Ayanami', hint: 'thiếu nữ tóc xanh băng lãnh', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'asuka', display: 'Asuka Langley', hint: 'tiểu thư đỏng đảnh lái eva 02', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'kaworu', display: 'Kaworu Nagisa', hint: 'thiên sứ cuối cùng thân thiện', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'misato', display: 'Misato Katsuragi', hint: 'nữ sĩ quan giám hộ thích uống bia', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'denji', display: 'Denji', hint: 'thanh niên cưa máy số nhọ', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'pochita', display: 'Pochita', hint: 'quỷ cưa màu cam đáng yêu', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' },
    { name: 'makima', display: 'Makima', hint: 'cô nàng quyền lực chi phối', image: 'https://images.unsplash.com/photo-157863277115-351597cf2477?w=800' },
    { name: 'power', display: 'Power', hint: 'ác ma máu ngổ ngáo', image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
    { name: 'aki', display: 'Aki Hayakawa', hint: 'chàng trai hợp đồng quỷ hồ ly', image: 'https://images.unsplash.com/photo-1534476777684-436bb094017w=800' },
    { name: 'kaguya', display: 'Kaguya Shinomiya', hint: 'nữ tiểu thư tài phiệt tsundere', image: 'https://images.unsplash.com/photo-1518709268805-4e9042a9f233?w=800' },
    { name: 'miyuki', display: 'Miyuki Shirogane', hint: 'hội trưởng hội học sinh chăm chỉ', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800' },
    { name: 'chika', display: 'Chika Fujiwara', hint: 'cô nàng thư ký thích nhảy múa', image: 'https://images.unsplash.com/photo-1563080145-509097674d27?w=800' },
    { name: 'yuu', display: 'Yuu Ishigami', hint: 'thủ quỹ u sầu game thủ', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { name: 'miko', display: 'Miko Iino', hint: 'nữ ủy viên kỷ luật nghiêm ngặt', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800' }
];

const userEconomy = new Map();
const aiChannels = new Set();
const chatHistories = new Map();

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
        return com
