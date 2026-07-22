import { Client, GatewayIntentBits, REST, Routes, Partials, Events, ActivityType, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import OpenAI from 'openai';
import http from 'http';

const logger = { warn: (msg) => console.warn(`[WARN] ${msg}`) };
const chatHistories = new Map();
const userEconomy = new Map();
const userPets = new Map();
const marriages = new Map();
const userInventories = new Map();
const clans = new Map();

// --- 🖼️ KHO GIF & ẢNH ĐỒNG BỘ CHO TẤT CẢ CÁC LỆNH ---
const GIFS = {
    hoso: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZydW5jNXN5YnJ4MGN0OXkzaTJ3MWlzYWlyd3J2anU0dXZzcHJ2YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LpwBheewF3L9C/giphy.gif',
    khodo: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpuc2M2bHJqZjNqMjRrcW95anJ3MTRwMndueHVndXV5aW12a3E5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif',
    diemdanh: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWxvd3R5Y2x3bTh6b2Rsd2o5Z3h5OHpyMWV1dTR4OGh0cWtnbmdreSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHFRbmaZtBRhXG/giphy.gif',
    cuahang: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVqNHIza3U2OGFyeWkwdndtb3E3NWV3bnA5YmZreG55anR6YXB1NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/MDJ9IbxxvDUQM/giphy.gif',
    ban: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpuc2M2bHJqZjNqMjRrcW95anJ3MTRwMndueHVndXV5aW12a3E5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif',
    cauca: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWl0dHN3eWZnbmtwb3I5cHR5czR6MXY3OWRjMXV2MGpxaHFkOXptayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9Iw32bZg8p0pa/giphy.gif',
    daovang: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGx5ZTR4Y3JqMmR2bzBndjNmb3ptdnRzOHJ5b3J6NWhsMWN3ZXl3dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSx0g723R02q3e/giphy.gif',
    thucung: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTN5dXZ5M3d2N3g2eTBpNmY5cHRmNWxzZnZ3ZndmMXd6Nmp3bjh3ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohhwytHcusSCSSOUg/giphy.gif',
    petsolo: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R4dmpvMGJ6djR2NnY2dzE4azV4cWN0cTRqY2FxdTNwNzhxOHpxbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSx0g723R02q3e/giphy.gif',
    nongtrai: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTJmMTllZ2FpdTVrdmZubXRsdTdrODhzYW1pd29vczhyejFjY3F4ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHFRbmaZtBRhXG/giphy.gif',
    kethon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXl2YmNxdXFwM3l5bXg1MnBlZnN5YmNuc3I3dzM2eG1qZmZ2YW94biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRv0ThflsHCqDrG/giphy.gif',
    lyhon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHBvZHd5NTRmYXA1YW5mbWF2MHFpNHV5bThhY2lnbzlnbWZ3M3Z4OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TqiwHbFBaZ4ti/giphy.gif',
    taixiu: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZW1qejJvNHR5MmlmYmp0czh3a3k0cDN5YmNudDRwOHJ0b3R0eHphMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l2JHRhAtnJSDNJ2py/giphy.gif',
    rob: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGg3ZnZ4MnhwN2ZueW1ucW1pZDRtbHVnbHZzbmV0c3k0OWZpcHFibyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSx0g723R02q3e/giphy.gif',
    banghoi: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDFhMzNoOHM5NWNsaHNreHF6aTB0MXl6aWh4OXloZ250aGJ3ejRrayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlRnAWXxn0MhOBK/giphy.gif',
    quiz: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTVrbjVscXRwNXYxZTN2MWZudWVwdHRnd3M3OWl3OHMydTZ3MG9yNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btPCcdNniyf0ArS/giphy.gif',
    avatarcheck: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3ZydW5jNXN5YnJ4MGN0OXkzaTJ3MWlzYWlyd3J2anU0dXZzcHJ2YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LpwBheewF3L9C/giphy.gif',
    gayrate: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXl2YmNxdXFwM3l5bXg1MnBlZnN5YmNuc3I3dzM2eG1qZmZ2YW94biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRv0ThflsHCqDrG/giphy.gif',
    error: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHBvZHd5NTRmYXA1YW5mbWF2MHFpNHV5bThhY2lnbzlnbWZ3M3Z4OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TqiwHbFBaZ4ti/giphy.gif'
};

// --- 🐟 30 LOÀI CÁ ---
const FISH_LIST = [
    { name: '👢 Rác Cấp Vũ Trụ', price: 10 }, { name: '🩴 Chiếc Giày Thối', price: 15 },
    { name: '🦴 Xương Khủng Long', price: 50 }, { name: '🐡 Cá Nóc Ngáo Ngơ', price: 80 },
    { name: '🐟 Cá Chép Om Dưa', price: 150 }, { name: '🐠 Cá Nemo Đi Lạc', price: 400 },
    { name: '🦀 Cua Hoàng Đế Đỏ', price: 900 }, { name: '🦑 Mực Ống Nướng Mọi', price: 1200 },
    { name: '🦈 Cá Mập Cắn Cáp', price: 1500 }, { name: '🐙 Mực Đại Dương Khổng Lồ', price: 2500 },
    { name: '⚡ Lươn Điện 1000V', price: 3000 }, { name: '🐢 Cụ Rùa Hoàn Kiếm', price: 3500 },
    { name: '🐬 Cá Heo Thần Tốc', price: 6000 }, { name: '🧜 Nàng Tiên Cá Hụt Hẫng', price: 8500 },
    { name: '🐋 Cá Voi Bay', price: 10000 }, { name: '👑 Long Vương Cổ Đại', price: 25000 },
    { name: '🌟 Cá Mặt Trăng Huyền Bí', price: 32000 }, { name: '💎 Cá Vẩy Kim Cương', price: 45000 },
    { name: '🔥 Cá Thần Hỏa Long', price: 60000 }, { name: '🧊 Cá Băng Vĩnh Cửu', price: 75000 },
    { name: '🌀 Cá Thủy Quái Vực Sâu', price: 90000 }, { name: '⚡ Cá Điện Quang Vũ Trụ', price: 110000 },
    { name: '🔮 Cá Ma Thuật Hắc Ám', price: 130000 }, { name: '🛡️ Cá Giáp Thép Cổ Đại', price: 150000 },
    { name: '🗡️ Cá Kiếm Sĩ Đơn Sơ', price: 180000 }, { name: '🌸 Cá Đào Hoa Tiên Cảnh', price: 210000 },
    { name: '🦋 Cá Hồ Điệp Thần Thánh', price: 250000 }, { name: '🍀 Cá 4 Lá May Mắn', price: 300000 },
    { name: '🛸 Cá Đĩa Người Ngoài Hành Tinh', price: 400000 }, { name: '🌌 Long Thần Thủy Tề Tối Thượng', price: 600000 }
];

// --- 🎣 CẦN CÂU ---
const ROD_SHOP = {
    tre: { name: 'Cần Trúc Cùi Bắp', price: 0, mult: 1.0 },
    nhua: { name: 'Cần Nhựa Đồ Chơi', price: 2000, mult: 1.1 },
    carbon: { name: 'Cần Carbon Siêu Cứng', price: 5000, mult: 1.3 },
    sieu3: { name: 'Cần Sợi Thủy Tinh 3 Khúc', price: 12000, mult: 1.6 },
    titan: { name: 'Cần Titan Thần Thánh', price: 25000, mult: 2.0 },
    maquai: { name: 'Cần Ma Quái Ám Ảnh', price: 45000, mult: 2.5 },
    kimcuong: { name: 'Cần Kim Cương Bất Tử', price: 80000, mult: 3.2 },
    rongbay: { name: 'Cần Long Vảy Rồng', price: 150000, mult: 4.0 },
    vutru: { name: 'Cần Hố Đen Vũ Trụ', price: 300000, mult: 5.5 },
    toithuong: { name: 'Cần Thần Đạo Tối Thượng', price: 600000, mult: 8.0 }
};

const MINE_LOOTS = [
    { name: '🪨 Cục Đá Cuội Sứt Mẻ', price: 20 }, { name: '🪵 Khúc Gỗ Mục', price: 40 },
    { name: '🪙 Đồng Xu Cổ Gỉ Sét', price: 150 }, { name: '🥈 Quặng Bạc Lấp Lánh', price: 600 },
    { name: '🥇 Quặng Vàng Nguyên Chất', price: 1800 }, { name: '💎 Kim Cương Xanh Siêu Quý Hiếm', price: 6000 },
    { name: '🔥 Lõi Lửa Ma Quái', price: 15000 }
];

// --- 🐾 THÚ CƯNG ---
const PET_SHOP = {
    cho: { name: '🐶 Chó Shiba Ngáo', price: 3000, type: 'shop', buffType: 'money', buffVal: 1.1, desc: 'Tăng +10% tiền nhận được' },
    meo: { name: '🐱 Mèo Thần Tài Vẫy Tay', price: 6000, type: 'shop', buffType: 'money', buffVal: 1.25, desc: 'Tăng +25% tiền nhận được' },
    cao: { name: '🦊 Cáo 9 Đuôi Mini', price: 15000, type: 'shop', buffType: 'money', buffVal: 1.4, desc: 'Tăng +40% tiền nhận được' },
    rong: { name: '🐲 Rồng Lửa Nhỏ', price: 35000, type: 'shop', buffType: 'combat', power: 50, desc: 'Sức mạnh chiến đấu 50' },
    phuonghoang: { name: '🔥 Phượng Hoàng Lửa Tái Sinh', price: 80000, type: 'shop', buffType: 'combat', power: 120, desc: 'Sức mạnh chiến đấu 120' },
    kỳlân: { name: '🦄 Kỳ Lân Cầu Vồng Thần Thánh', price: 0, type: 'hunt', buffType: 'combat', power: 250, desc: 'Thần thú đi săn tối cao' },
    robot: { name: '🤖 Robot Chiến Đấu Sát Thương Cao', price: 0, type: 'hunt', buffType: 'combat', power: 400, desc: 'Người máy càn quét' },
    thanhlong: { name: '🐉 Thanh Long Hạo Thiên Cổ Đại', price: 0, type: 'hunt', buffType: 'combat', power: 750, desc: 'Chúa tể tối thượng' }
};

// --- 🌱 HẠT GIỐNG NÔNG TRẠI ---
const SEEDS = {
    lua: { name: '🌾 Lúa Nước', cost: 50, profit: 150, time: 2 * 60000 },
    ngo: { name: '🌽 Ngô Đồng', cost: 120, profit: 350, time: 5 * 60000 },
    cangot: { name: '🍓 Cà Chua Ngọt Lịm', cost: 200, profit: 650, time: 8 * 60000 },
    duahau: { name: '🍉 Dưa Hấu Thần Tốc', cost: 300, profit: 1000, time: 10 * 60000 },
    khoai: { name: '🥔 Khoai Lang Mật', cost: 450, profit: 1600, time: 12 * 60000 },
    huongduong: { name: '🌻 Hướng Dương Mặt Trời', cost: 700, profit: 2800, time: 15 * 60000 },
    nhansam: { name: '🌿 Nhân Sâm Ngàn Năm', cost: 1200, profit: 5500, time: 20 * 60000 },
    hoahong: { name: '🌹 Hoa Hồng Tình Yêu', cost: 2000, profit: 9500, time: 25 * 60000 },
    thachthao: { name: '🌸 Thạch Thảo Tím Vĩnh Cửu', cost: 3500, profit: 18000, time: 35 * 60000 },
    hoasen: { name: '🪷 Sen Ngọc Thiên Cung', cost: 5000, profit: 27000, time: 45 * 60000 },
    caytien: { name: '💰 Cây Rung Ra Tiền Vàng', cost: 8000, profit: 45000, time: 60 * 60000 },
    caythan: { name: '🌳 Cây Thần Đậu Jack', cost: 15000, profit: 95000, time: 90 * 60000 }
};

// --- 📚 100 NHÂN VẬT ANIME KÈM ĐOÁN BỘ ANIME (20 BỘ GỐC CHUẨN) ---
const ANIME_LIST = [
    { name: 'Luffy', anime: 'One Piece', hint: 'Thuyền trưởng Mũ Rơm, thích ăn thịt' },
    { name: 'Zoro', anime: 'One Piece', hint: 'Thánh mù đường Tam Kiếm Sĩ' },
    { name: 'Sanji', anime: 'One Piece', hint: 'Đầu bếp chân đen simp lỏ' },
    { name: 'Nami', anime: 'One Piece', hint: 'Miêu tặc hoa tiêu cuồng tiền' },
    { name: 'Chopper', anime: 'One Piece', hint: 'Bác sĩ tuần lộc đáng yêu' },
    { name: 'Shanks', anime: 'One Piece', hint: 'Tứ hoàng tóc đỏ bá khí' },
    { name: 'Ace', anime: 'One Piece', hint: 'Hỏa quyền anh trai Luffy' },
    { name: 'Law', anime: 'One Piece', hint: 'Bác sĩ tử thần Trafalgar' },
    { name: 'Robin', anime: 'One Piece', hint: 'Nhà khảo cổ học hoa tiêu' },
    { name: 'Usopp', anime: 'One Piece', hint: 'Thánh nổ xạ thủ chiến thần' },
    { name: 'Naruto', anime: 'Naruto', hint: 'Ninja làng Lá chứa Cửu Vĩ' },
    { name: 'Sasuke', anime: 'Naruto', hint: 'Thiên tài Uchiha báo thù' },
    { name: 'Kakashi', anime: 'Naruto', hint: 'Ninja sao chép thầy giáo quốc dân' },
    { name: 'Itachi', anime: 'Naruto', hint: 'Thiên tài sát tộc Uchiha' },
    { name: 'Madara', anime: 'Naruto', hint: 'Huyền thoại tộc Uchiha bá chủ' },
    { name: 'Sakura', anime: 'Naruto', hint: 'Nữ ninja y thuật đấm vỡ đất' },
    { name: 'Hinata', anime: 'Naruto', hint: 'Công chúa Byakugan thẹn thùng' },
    { name: 'Gaara', anime: 'Naruto', hint: 'Kazekage điều khiển cát' },
    { name: 'Goku', anime: 'Dragon Ball', hint: 'Khỉ con Saiyan hệ biến hình tóc vàng' },
    { name: 'Vegeta', anime: 'Dragon Ball', hint: 'Hoàng tử kiêu hãnh Saiyan' },
    { name: 'Gohan', anime: 'Dragon Ball', hint: 'Con trai Goku tiềm năng cực khủng' },
    { name: 'Freeza', anime: 'Dragon Ball', hint: 'Đại đế vũ trụ tàn ác' },
    { name: 'Gojo Satoru', anime: 'Jujutsu Kaisen', hint: 'Thầy giáo vô hạn mạnh nhất' },
    { name: 'Itadori Yuji', anime: 'Jujutsu Kaisen', hint: 'Nuốt ngón tay Sukuna chạy nhanh' },
    { name: 'Sukuna', anime: 'Jujutsu Kaisen', hint: 'Vua nguyền rủa hai mặt' },
    { name: 'Megumi', anime: 'Jujutsu Kaisen', hint: 'Triệu hồi thức thần bầy chó' },
    { name: 'Nobara', anime: 'Jujutsu Kaisen', hint: 'Đóng đinh châm cứu nguyền rủa' },
    { name: 'Tanjiro', anime: 'Kimetsu no Yaiba', hint: 'Cậu bé hoa tai hỏa thần diệt quỷ' },
    { name: 'Nezuko', anime: 'Kimetsu no Yaiba', hint: 'Em gái ngậm ống tre hóa quỷ' },
    { name: 'Zenitsu', anime: 'Kimetsu no Yaiba', hint: 'Thánh khóc nhè ngủ gục bật sét' },
    { name: 'Inosuke', anime: 'Kimetsu no Yaiba', hint: 'Đội mũ lợn rừng hệ càn quét' },
    { name: 'Tengen Uzui', anime: 'Kimetsu no Yaiba', hint: 'Âm trụ hào nhoáng nhiều vợ' },
    { name: 'Eren', anime: 'Attack on Titan', hint: 'Titan tiến công đòi tự do' },
    { name: 'Mikasa', anime: 'Attack on Titan', hint: 'Nữ thần khăn choàng bảo vệ Eren' },
    { name: 'Levi Ackerman', anime: 'Attack on Titan', hint: 'Đội trưởng lùn mạnh nhất nhân loại' },
    { name: 'Armin', anime: 'Attack on Titan', hint: 'Bộ óc chiến lược Titan Đại Hình' },
    { name: 'Ichigo', anime: 'Bleach', hint: 'Tóc cam thần chết tập sự đại gia' },
    { name: 'Rukia', anime: 'Bleach', hint: 'Nữ thần chết băng giá' },
    { name: 'Aizen', anime: 'Bleach', hint: 'Kẻ phản bội đeo kính thao túng' },
    { name: 'Gon Freecss', anime: 'Hunter x Hunter', hint: 'Cậu bé tóc dựng câu cá tìm bố' },
    { name: 'Killua Zoldyck', anime: 'Hunter x Hunter', hint: 'Sát thủ tóc bạc điện giật' },
    { name: 'Hisoka', anime: 'Hunter x Hunter', hint: 'Thánh biến thái hệ cao su kẹo gum' },
    { name: 'Saitama', anime: 'One-Punch Man', hint: 'Thánh trọc đấm 1 phát chết luôn' },
    { name: 'Genos', anime: 'One-Punch Man', hint: 'Cyborg hệ đốt nhà học việc' },
    { name: 'Light Yagami', anime: 'Death Note', hint: 'Chủ nhân Death Note Kira thiên tài' },
    { name: 'L Lawliet', anime: 'Death Note', hint: 'Thám tử ngồi xổm thích ăn ngọt' },
    { name: 'Denji', anime: 'Chainsaw Man', hint: 'Quỷ cưa simp lỏ chính hiệu' },
    { name: 'Makima', anime: 'Chainsaw Man', hint: 'Nữ thần quyền lực kiểm soát' },
    { name: 'Power', anime: 'Chainsaw Man', hint: 'Quỷ máu tinh nghịch kiêu ngạo' },
    { name: 'Anya', anime: 'Spy x Family', hint: 'Bé hột mít đọc suy nghĩ Waku Waku' },
    { name: 'Loid Forger', anime: 'Spy x Family', hint: 'Điệp viên Twilight siêu đẳng' },
    { name: 'Yor Forger', anime: 'Spy x Family', hint: 'Công chúa gai sát thủ sát gái' },
    { name: 'Rimuru Tempest', anime: 'Tensei Shitara Slime Datta Ken', hint: 'Slime chuyển sinh bá đạo vô cực' },
    { name: 'Milim Nava', anime: 'Tensei Shitara Slime Datta Ken', hint: 'Ma vương loli cuồng phá hoại' },
    { name: 'Sung Jinwoo', anime: 'Solo Leveling', hint: 'Thợ săn yếu nhất thăng cấp bóng tối' },
    { name: 'Deku', anime: 'Boku no Hero Academia', hint: 'Cậu bé vô năng nhận One For All' },
    { name: 'Bakugo', anime: 'Boku no Hero Academia', hint: 'Kacchan nổ tung cá tính mạnh' },
    { name: 'Todoroki', anime: 'Boku no Hero Academia', hint: 'Băng hỏa song tu hot boy' },
    { name: 'Takemichi', anime: 'Tokyo Revengers', hint: 'Thanh niên khóc nhè xuyên không cứu bạn' },
    { name: 'Mikey', anime: 'Tokyo Revengers', hint: 'Tổng trưởng vô địch cú đá thần sầu' },
    { name: 'Isagi Yoichi', anime: 'Blue Lock', hint: 'Tiền đạo chủ lực giác quan không gian' },
    { name: 'Bachira', anime: 'Blue Lock', hint: 'Quái vật rê bóng nghệ sĩ' },
    { name: 'Senku Ishigami', anime: 'Dr. Stone', hint: 'Thiên tài khoa học 10 tỷ phần trăm' },
    { name: 'Edward Elric', anime: 'Fullmetal Alchemist', hint: 'Nhật kim thuật sư lùn cay cú' },
    { name: 'Kirito', anime: 'Sword Art Online', hint: 'Hắc kiếm sĩ game thủ đời đầu' },
    { name: 'Asuna', anime: 'Sword Art Online', hint: 'Tia chớp phu nhân hầm ngục' },
    { name: 'Kaneki Ken', anime: 'Tokyo Ghoul', hint: 'Bán quỷ tóc trắng bẻ ngón tay' },
    { name: 'Natsu Dragneel', anime: 'Fairy Tail', hint: 'Hỏa long đạo sĩ say xe' },
    { name: 'Erza Scarlet', anime: 'Fairy Tail', hint: 'Nữ hoàng giáp sắt thay đồ nhanh' },
    { name: 'Chika Fujiwara', anime: 'Kaguya-sama: Love is War', hint: 'Thư ký hội học sinh thích thả thính' },
    { name: 'Kaguya Shinomiya', anime: 'Kaguya-sama: Love is War', hint: 'Tiểu thư băng giá thông minh' },
    { name: 'Sanosuke', anime: 'Rurouni Kenshin', hint: 'Kiếm sĩ lãng khách X trên má' },
    { name: 'Inuyasha', anime: 'Inuyasha', hint: 'Khuyển yêu tai chó dùng thiết toái nha' },
    { name: 'Sesshomaru', anime: 'Inuyasha', hint: 'Đại yêu tinh soái ca lạnh lùng' },
    { name: 'Kikyo', anime: 'Inuyasha', hint: 'Nữ pháp sư cung tên linh hồn' },
    { name: 'Yusuke', anime: 'Yu Yu Hakusho', hint: 'Thám tử linh giới bắn linh hoàn' },
    { name: 'Hiei', anime: 'Yu Yu Hakusho', hint: 'Kiếm sĩ hắc long ba mắt' },
    { name: 'Kuroko', anime: 'Kuroko no Basket', hint: 'Cầu thủ bóng rổ tàng hình bóng ma' },
    { name: 'Kagami', anime: 'Kuroko no Basket', hint: 'Hổ lửa nhảy cao bốc cháy' },
    { name: 'Shinichi Kudo', anime: 'Detective Conan', hint: 'Thám tử trung học bị teo nhỏ' },
    { name: 'Conan Edogawa', anime: 'Detective Conan', hint: 'Thám tử nhí đồng hồ gây mê' },
    { name: 'Kaito Kid', anime: 'Magic Kaito', hint: 'Siêu trộm áo choàng trắng trăng tròn' },
    { name: 'Heiji Hattori', anime: 'Detective Conan', hint: 'Thám tử miền Tây da ngăm' },
    { name: 'Shinra Kusakabe', anime: 'Fire Force', hint: 'Lính cứu hỏa cười quỷ dị' },
    { name: 'Subaru Natsuki', anime: 'Re:Zero', hint: 'Chàng trai chết đi sống lại cứu Emilia' },
    { name: 'Emilia', anime: 'Re:Zero', hint: 'Tiên nữ tóc bạc hệ băng' },
    { name: 'Rem', anime: 'Re:Zero', hint: 'Nữ hầu gái tóc xanh hệ quỷ' },
    { name: 'Ainz Ooal Gown', anime: 'Overlord', hint: 'Bộ xương khô chúa tể lăng mộ' },
    { name: 'Kazuma Sato', anime: 'KonoSuba', hint: 'Thánh nam thần vô dụng ăn hại' },
    { name: 'Aqua', anime: 'KonoSuba', hint: 'Nữ thần nước vô dụng mít ướt' },
    { name: 'Megumin', anime: 'KonoSuba', hint: 'Pháp sư cuồng phép nổ bộc phá' },
    { name: 'Tatsumaki', anime: 'One-Punch Man', hint: 'Siêu năng lực gia loli bão táp' },
    { name: 'Bang', anime: 'One-Punch Man', hint: 'Võ sư khúc côn quyền dòng chảy' },
    { name: 'Meliodas', anime: 'Nanatsu no Taizai', hint: 'Đội trưởng Thất Đại Tội phẫn nộ' },
    { name: 'Ban', anime: 'Nanatsu no Taizai', hint: 'Thánh bất tử cướp đoạt' },
    { name: 'Yuno', anime: 'Black Clover', hint: 'Thiên tài pháp sư bốn lá gió' },
    { name: 'Asta', anime: 'Black Clover', hint: 'Cậu bé không phép thuật kiếm kháng ma' },
    { name: 'Noelle', anime: 'Black Clover', hint: 'Công chúa hoàng gia hệ thủy thẹn thùng' },
    { name: 'Yato', anime: 'Noragami', hint: 'Thần nghèo 5 yên vô gia cư' },
    { name: 'Hiyori', anime: 'Noragami', hint: 'Thiếu nữ đuôi linh hồn' },
    { name: 'Yukine', anime: 'Noragami', hint: 'Thần khí kiếm bạc' },
    { name: 'Shigeo Kageyama', anime: 'Mob Psycho 100', hint: 'Cậu bé Mob 100 phần trăm cảm xúc' },
    { name: 'Reigen Arataka', anime: 'Mob Psycho 100', hint: 'Sư phụ ngoại cảm lừa đảo chuyên nghiệp' },
    { name: 'Kusuo Saiki', anime: 'Saiki Kusuo no Psi-nan', hint: 'Siêu năng lực gia tóc hồng thích ăn thạch' },
    { name: 'Hyakkimaru', anime: 'Dororo', hint: 'Thiếu niên cụt tay chân đi tìm thân thể' },
    { name: 'Dororo', anime: 'Dororo', hint: 'Cô bé ăn xin lém lỉnh' },
    { name: 'Emma', anime: 'The Promised Neverland', hint: 'Cô bé tóc cam thông minh trốn trại' },
    { name: 'Norman', anime: 'The Promised Neverland', hint: 'Thiên tài chiến lược tóc trắng' },
    { name: 'Ray', anime: 'The Promised Neverland', hint: 'Mọt sách đọc mọi loại tài liệu' },
    { name: 'Violet Evergarden', anime: 'Violet Evergarden', hint: 'Búp bê ký ức tự động tìm hiểu yêu thương' },
    { name: 'Rin Okumura', anime: 'Ao no Exorcist', hint: 'Con trai Satan kiếm lửa xanh' },
    { name: 'Yuu Otosaka', anime: 'Charlotte', hint: 'Cướp đoạt năng lực người khác' },
    { name: 'Tomori Nao', anime: 'Charlotte', hint: 'Hội trưởng tàng hình ăn bánh bao' },
    { name: 'Taki Tachibana', anime: 'Kimi no Na wa', hint: 'Nam sinh Tokyo đổi thân xác' },
    { name: 'Mitsuha Miyamizu', anime: 'Kimi no Na wa', hint: 'Nữ sinh vùng quê buộc dây đỏ' }
];
function getUserData(userId) {
    if (!userEconomy.has(userId)) {
        userEconomy.set(userId, { 
            balance: 5000, lastDaily: 0, streak: 0, 
            plots: [{ plant: null, time: 0 }, { plant: null, time: 0 }, { plant: null, time: 0 }], 
            rod: 'tre', clanId: null 
        });
    }
    return userEconomy.get(userId);
}

function saveUserData(userId, data) { userEconomy.set(userId, data); }

function getInventory(userId) {
    if (!userInventories.has(userId)) userInventories.set(userId, {});
    return userInventories.get(userId);
}

function getBuffedAmount(userId, baseAmount) {
    const petKey = userPets.get(userId);
    if (!petKey) return baseAmount;
    const pet = PET_SHOP[petKey];
    if (pet && pet.buffType === 'money') {
        return Math.floor(baseAmount * pet.buffVal);
    }
    return baseAmount;
}

function createEmbed(color, title, desc, img, thumb) {
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc).setTimestamp().setFooter({ text: '🌟 Siêu Bot Discord Ultimate v10 🌟' });
    if (img) embed.setImage(img); if (thumb) embed.setThumbnail(thumb); return embed;
}

const commands = [
    new SlashCommandBuilder().setName('hoso').setDescription('Xem ví tiền, cần câu, nông trại, thú cưng và bang hội'),
    new SlashCommandBuilder().setName('khodo').setDescription('Kiểm tra kho chứa vật phẩm cá nhân của bạn'),
    new SlashCommandBuilder().setName('diemdanh').setDescription('Nhận lương hằng ngày tăng chuỗi streak'),
    new SlashCommandBuilder().setName('cuahang').setDescription('Cửa hàng tổng hợp mua sắm mọi vật phẩm')
        .addSubcommand(s => s.setName('cancau').setDescription('Mua và nâng cấp cần câu')
            .addStringOption(o => o.setName('loai').setDescription('Chọn cần').setRequired(true)
                .addChoices(
                    {name: 'Nhựa Đồ Chơi (2k xu)', value: 'nhua'},
                    {name: 'Carbon (5k xu)', value: 'carbon'},
                    {name: 'Thủy Tinh 3 Khúc (12k xu)', value: 'sieu3'},
                    {name: 'Titan (25k xu)', value: 'titan'},
                    {name: 'Ma Quái (45k xu)', value: 'maquai'},
                    {name: 'Kim Cương (80k xu)', value: 'kimcuong'},
                    {name: 'Vảy Rồng (150k xu)', value: 'rongbay'},
                    {name: 'Hố Đen Vũ Trụ (300k xu)', value: 'vutru'},
                    {name: 'Thần Đạo Tối Thượng (600k xu)', value: 'toithuong'}
                )))
        .addSubcommand(s => s.setName('thucung').setDescription('Mua thú cưng đồng hành trong shop')
            .addStringOption(o => o.setName('loai').setDescription('Chọn pet').setRequired(true)
                .addChoices(
                    {name: 'Chó Shiba (3k xu - Tăng 10% xu)', value: 'cho'},
                    {name: 'Mèo Thần Tài (6k xu - Tăng 25% xu)', value: 'meo'},
                    {name: 'Cáo 9 Đuôi (15k xu - Tăng 40% xu)', value: 'cao'},
                    {name: 'Rồng Lửa Nhỏ (35k xu - Sức mạnh 50)', value: 'rong'},
                    {name: 'Phượng Hoàng Lửa (80k xu - Sức mạnh 120)', value: 'phuonghoang'}
                )))
        .addSubcommand(s => s.setName('hatgiong').setDescription('Mua hạt giống nông trại')
            .addStringOption(o => o.setName('loai').setDescription('Chọn hạt giống').setRequired(true)
                .addChoices(
                    {name: 'Lúa Nước (50 xu)', value: 'lua'},
                    {name: 'Ngô Đồng (120 xu)', value: 'ngo'},
                    {name: 'Cà Chua Ngọt (200 xu)', value: 'cangot'},
                    {name: 'Dưa Hấu Thần Tốc (300 xu)', value: 'duahau'},
                    {name: 'Khoai Lang Mật (450 xu)', value: 'khoai'},
                    {name: 'Hướng Dương (700 xu)', value: 'huongduong'},
                    {name: 'Nhân Sâm (1.2k xu)', value: 'nhansam'},
                    {name: 'Hoa Hồng (2k xu)', value: 'hoahong'},
                    {name: 'Thạch Thảo (3.5k xu)', value: 'thachthao'},
                    {name: 'Hoa Sen (5k xu)', value: 'hoasen'},
                    {name: 'Cây Tiền (8k xu)', value: 'caytien'},
                    {name: 'Cây Thần (15k xu)', value: 'caythan'}
                ))),
    new SlashCommandBuilder().setName('ban').setDescription('Bán các loại cá hoặc khoáng sản kiếm được trong kho')
        .addStringOption(o => o.setName('vat_pham').setDescription('Tên vật phẩm cần bán (hoặc gõ "all_ca" để bán tất cả cá)').setRequired(true)),
    new SlashCommandBuilder().setName('cauca').setDescription('Xách cần ra khơi câu cá đổi đời với 30 loài cá khủng'),
    new SlashCommandBuilder().setName('daovang').setDescription('Vào hang động sâu thẳm khai thác khoáng sản & săn thú hiếm'),
    new SlashCommandBuilder().setName('thucung_di_choi').setDescription('Sai thú cưng đi săn thưởng và săn pet hiếm cho chủ nhân'),
    new SlashCommandBuilder().setName('petsolo').setDescription('Mang thú cưng đi Solo Quyết Đấu với người chơi khác hoặc máy trùm')
        .addUserOption(o => o.setName('doi_thu').setDescription('Tag người muốn solo (Bỏ trống để solo Boss máy)').setRequired(false)),
    new SlashCommandBuilder().setName('nongtrai').setDescription('Hệ thống nông nghiệp trồng trọt 12 loại cây')
        .addSubcommand(s => s.setName('vuon').setDescription('Kiểm tra khu vườn'))
        .addSubcommand(s => s.setName('gieohat').setDescription('Trồng cây đã mua trong kho')
            .addIntegerOption(o => o.setName('odat').setDescription('Ô đất (1-3)').setRequired(true))
            .addStringOption(o => o.setName('loai').setDescription('Loại hạt đã có trong kho').setRequired(true)
                .addChoices(
                    {name: 'Lúa Nước', value: 'lua'}, {name: 'Ngô Đồng', value: 'ngo'}, 
                    {name: 'Cà Chua Ngọt', value: 'cangot'}, {name: 'Dưa Hấu', value: 'duahau'}, 
                    {name: 'Khoai Lang', value: 'khoai'}, {name: 'Hướng Dương', value: 'huongduong'},
                    {name: 'Nhân Sâm', value: 'nhansam'}, {name: 'Hoa Hồng', value: 'hoahong'},
                    {name: 'Thạch Thảo', value: 'thachthao'}, {name: 'Hoa Sen', value: 'hoasen'},
                    {name: 'Cây Tiền', value: 'caytien'}, {name: 'Cây Thần', value: 'caythan'}
                )))
        .addSubcommand(s => s.setName('thuhoach').setDescription('Thu hoạch nông sản')
            .addIntegerOption(o => o.setName('odat').setDescription('Ô đất cần thu (1-3)').setRequired(true))),
    new SlashCommandBuilder().setName('kethon').setDescription('Tỏ tình / Kết hôn với một thành viên khác trong server').addUserOption(o => o.setName('nguoi_ay').setDescription('Tag nửa kia').setRequired(true)),
    new SlashCommandBuilder().setName('lyhon').setDescription('Ly hôn / Chia tay người ấy'),
    new SlashCommandBuilder().setName('taixiu').setDescription('Chơi Tài Xỉu đổi đời').addStringOption(o => o.setName('chon').setDescription('Tài hay Xỉu').setRequired(true).addChoices({name: 'Tài', value: 'tai'}, {name: 'Xỉu', value: 'xiu'})).addIntegerOption(o => o.setName('cuoc').setDescription('Số tiền cược').setRequired(true)),
    new SlashCommandBuilder().setName('rob').setDescription('Đột nhập cướp tiền của một thành viên khác').addUserOption(o => o.setName('muc_tieu').setDescription('Chọn nạn nhân').setRequired(true)),
    new SlashCommandBuilder().setName('banghoi').setDescription('Hệ thống bang hội anh em')
        .addSubcommand(s => s.setName('tao').setDescription('Lập bang hội mới (10,000 xu)').addStringOption(o => o.setName('ten').setDescription('Tên bang').setRequired(true)))
        .addSubcommand(s => s.setName('thongtin').setDescription('Xem chi tiết bang hội của bạn')),
    new SlashCommandBuilder().setName('quiz_anime').setDescription('Đố vui 100 nhân vật Anime đỉnh cao & Đoán bộ Anime tương ứng nhận thưởng lớn!'),
    new SlashCommandBuilder().setName('avatarcheck').setDescription('Soi avatar người khác').addUserOption(o => o.setName('user').setDescription('Tag user').setRequired(false)),
    new SlashCommandBuilder().setName('gayrate').setDescription('Máy đo độ bóng').addUserOption(o => o.setName('user').setDescription('Tag user').setRequired(false))
].map(c => c.toJSON());

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], 
    partials: [Partials.Channel, Partials.Message] 
});

const openai = new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' });
const SYSTEM_PROMPT = `Bạn là một Gen Z lầy lội, cực kỳ thông minh trong server Discord này. Văn phong: chữ thường, không dấu chấm cuối câu, xéo xắt nhưng vui vẻ, ngắn gọn (1-3 câu).`;

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({ model: 'meta/llama-3.1-70b-instruct', messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages], temperature: 0.95, max_tokens: 250 });
        return completion.choices[0]?.message?.content || 'lag quá bồ êi :v';
    } catch (e) { return 'cáp quang đứt rồi bồ ơi :('; }
}

client.once('ready', async () => {
    console.log(`🚀 [SIÊU BOT V10 ULTIMATE] ${client.user.tag} ĐÃ KHỞI ĐỘNG THÀNH CÔNG!`);
    client.user.setPresence({ activities: [{ name: 'Hệ thống 100 Anime & Săn Pet Độc Quyền (/hoso)', type: ActivityType.Playing }], status: 'online' });
    try { 
        await new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN).put(Routes.applicationCommands(client.user.id), { body: commands }); 
        console.log('✅ Đã nạp thành công toàn bộ lệnh Slash Commands!'); 
    } catch (e) { console.error('❌ Lỗi nạp lệnh:', e); }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.channel.isDMBased() || message.mentions.has(client.user)) {
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
                    if (timeLeft <= 0) return `Ô ${idx + 1}: ✨ **${SEEDS[p.plant].name} (Đã chín!)**`;
                    return `Ô ${idx + 1}: 🌱 Đang trồng (Còn ${Math.ceil(timeLeft / 60000)}p)`;
                }).join('\n');

                const userPetKey = userPets.get(userId);
                const petObj = userPetKey ? PET_SHOP[userPetKey] : null;
                const petInfo = petObj ? `${petObj.name} (${petObj.type === 'hunt' ? '🌟 Săn được' : '🛒 Mua shop'})\n*(Buff: ${petObj.desc})*` : '❌ Chưa nuôi con gì (Mua tại `/cuahang thucung`)';
                const partnerId = marriages.get(userId);
                const partnerInfo = partnerId ? `<@${partnerId}> 💍` : 'Độc thân vui tính 🥀';
                const clanName = eco.clanId && clans.has(eco.clanId) ? clans.get(eco.clanId).name : 'Chưa gia nhập bang';

                await interaction.reply({ 
                    embeds: [createEmbed(0x5865F2, `💳 HỒ SƠ: ${interaction.user.username.toUpperCase()}`, `✨ Thông tin tài sản, sự nghiệp và gia đình của bạn:`, GIFS.hoso, interaction.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '💰 Số Dư', value: `**${eco.balance.toLocaleString()} xu**`, inline: true },
                            { name: '🎣 Cần Câu', value: `**${ROD_SHOP[eco.rod]?.name || 'Cần Trúc'}**`, inline: true },
                            { name: '🔥 Chuỗi Điểm Danh', value: `**${eco.streak} ngày**`, inline: true },
                            { name: '🐾 Thú Cưng', value: petInfo, inline: false },
                            { name: '💞 Hôn Nhân', value: partnerInfo, inline: true },
                            { name: '🛡️ Bang Hội', value: clanName, inline: true },
                            { name: '🌾 Khu Vườn', value: farmDesc, inline: false }
                        )] 
                }); 
                break;

            case 'khodo':
                const inv = getInventory(userId);
                const invEntries = Object.entries(inv);
                const invText = invEntries.length === 0 ? '🎒 Kho đồ đang trống trơn, đi câu cá, đào mỏ ngay đi bồ!' : invEntries.map(([k, v]) => `• **${k}**: x${v}`).join('\n');
                await interaction.reply({ embeds: [createEmbed(0x9B59B6, `🎒 KHO ĐỒ: ${interaction.user.username.toUpperCase()}`, invText, GIFS.khodo)] });
                break;

            case 'diemdanh':
                const passed = Date.now() - eco.lastDaily;
                if (passed < 86400000) return interaction.reply({ embeds: [createEmbed(0xED4245, '⏳ TỪ TỪ ĐÃ', `Đợi **${Math.ceil((86400000 - passed) / 3600000)} giờ** nữa hẵng nhận lương tiếp nhé.`, null, GIFS.error)], ephemeral: true });
                let baseBonus = 500 + (eco.streak * 50); 
                let finalBonus = getBuffedAmount(userId, baseBonus);
                eco.balance += finalBonus; eco.lastDaily = Date.now(); eco.streak += 1; saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x57F287, '🎁 NHẬN LƯƠNG THÀNH CÔNG', `Ting ting **+${finalBonus.toLocaleString()} xu** vào ví (đã cộng buff pet)! 🔥 Chuỗi: **${eco.streak} ngày**!`, GIFS.diemdanh)] }); 
                break;

            case 'cuahang':
                const subShop = interaction.options.getSubcommand();
                if (subShop === 'cancau') {
                    const rodChoice = interaction.options.getString('loai');
                    const targetRod = ROD_SHOP[rodChoice];
                    if (eco.balance < targetRod.price) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ VIÊM MÀNG TÚI', 'Không đủ tiền mua cần câu này!', null, GIFS.error)], ephemeral: true });
                    eco.balance -= targetRod.price; eco.rod = rodChoice; saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🛒 MUA THÀNH CÔNG', `Đã sở hữu **${targetRod.name}**!`, GIFS.cuahang)] });
                } else if (subShop === 'thucung') {
                    const petChoice = interaction.options.getString('loai');
                    const targetPet = PET_SHOP[petChoice];
                    if (userPets.has(userId)) return interaction.reply({ content: 'Bồ đã có thú cưng rồi, không nuôi ôm đồm được nữa!', ephemeral: true });
                    if (eco.balance < targetPet.price) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ VIÊM MÀNG TÚI', 'Không đủ tiền mua pet này!', null, GIFS.error)], ephemeral: true });
                    eco.balance -= targetPet.price; userPets.set(userId, petChoice); saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🐾 MUA THÚ CƯNG', `Đã mua thành công **${targetPet.name}**!`, GIFS.thucung)] });
                } else if (subShop === 'hatgiong') {
                    const seedChoice = interaction.options.getString('loai');
                    const targetSeed = SEEDS[seedChoice];
                    if (eco.balance < targetSeed.cost) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ VIÊM MÀNG TÚI', 'Không đủ tiền mua hạt giống!', null, GIFS.error)], ephemeral: true });
                    eco.balance -= targetSeed.cost;
                    let invShop = getInventory(userId);
                    invShop[targetSeed.name] = (invShop[targetSeed.name] || 0) + 1;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌱 MUA HẠT GIỐNG', `Đã mua **${targetSeed.name}** cất vào kho! Dùng lệnh \`/nongtrai gieohat\`.`, GIFS.cuahang)] });
                }
                break;

            case 'ban':
                const itemQuery = interaction.options.getString('vat_pham').toLowerCase();
                let invSell = getInventory(userId);
                
                if (itemQuery === 'all_ca') {
                    let totalFishSoldMoney = 0;
                    let soldCount = 0;
                    for (const fish of FISH_LIST) {
                        if (invSell[fish.name]) {
                            let count = invSell[fish.name];
                            totalFishSoldMoney += fish.price * count;
                            soldCount += count;
                            delete invSell[fish.name];
                        }
                    }
                    if (soldCount === 0) return interaction.reply({ content: 'Trong kho không có con cá nào để bán!', ephemeral: true });
                    eco.balance += totalFishSoldMoney;
                    saveUserData(userId, eco);
                    return interaction.reply({ embeds: [createEmbed(0x2ECC71, '💰 BÁN CÁ', `Đã bán ${soldCount} con cá thu về **+${totalFishSoldMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                }

                let foundKey = Object.keys(invSell).find(k => k.toLowerCase().includes(itemQuery));
                if (!foundKey || invSell[foundKey] <= 0) return interaction.reply({ content: 'Không tìm thấy vật phẩm này trong kho!', ephemeral: true });

                let sellPrice = 50; 
                const matchedFish = FISH_LIST.find(f => f.name === foundKey);
                const matchedMine = MINE_LOOTS.find(m => m.name === foundKey);
                if (matchedFish) sellPrice = matchedFish.price;
                else if (matchedMine) sellPrice = matchedMine.price;

                let totalSoldMoney = sellPrice * invSell[foundKey];
                let countToSell = invSell[foundKey];
                delete invSell[foundKey];
                eco.balance += totalSoldMoney;
                saveUserData(userId, eco);

                await interaction.reply({ embeds: [createEmbed(0x2ECC71, '💰 BÁN VẬT PHẨM', `Đã bán x${countToSell} **${foundKey}** thu về **+${totalSoldMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                break;

            case 'cauca':
                let caughtFish = FISH_LIST[Math.floor(Math.random() * FISH_LIST.length)];
                const currentRod = ROD_SHOP[eco.rod] || ROD_SHOP['tre'];
                let invFish = getInventory(userId);
                invFish[caughtFish.name] = (invFish[caughtFish.name] || 0) + 1;
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x3498DB, '🎣 KẾT QUẢ ĐI CÂU', `Bồ câu được: **${caughtFish.name}** bằng **${currentRod.name}**!`, GIFS.cauca)] });
                break;

            case 'daovang':
                let minedItem = MINE_LOOTS[Math.floor(Math.random() * MINE_LOOTS.length)];
                let minedPrice = getBuffedAmount(userId, minedItem.price);
                eco.balance += minedPrice; 
                let invMine = getInventory(userId);
                invMine[minedItem.name] = (invMine[minedItem.name] || 0) + 1;

                let luckyHuntMsg = '';
                if (Math.random() < 0.03 && !userPets.has(userId)) {
                    const huntPets = ['kỳlân', 'robot', 'thanhlong'];
                    const randomHuntPetKey = huntPets[Math.floor(Math.random() * huntPets.length)];
                    userPets.set(userId, randomHuntPetKey);
                    luckyHuntMsg = `\n🌟 **MAY MẮN!** Đào mỏ bắt được thần thú **${PET_SHOP[randomHuntPetKey].name}**!`;
                }

                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0xE67E22, '⛏️ ĐÀO VÀNG', `Đào được **${minedItem.name}** bán được **+${minedPrice.toLocaleString()} xu**!${luckyHuntMsg}`, GIFS.daovang)] });
                break;

            case 'thucung_di_choi':
                const myPet = userPets.get(userId);
                if (!myPet) return interaction.reply({ content: 'Bồ chưa có thú cưng nào!', ephemeral: true });
                let baseReward = Math.floor(Math.random() * 2000) + 500;
                let petReward = getBuffedAmount(userId, baseReward);
                eco.balance += petReward; 
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0xF1C40F, '🐾 THÚ CƯNG ĐI SĂN', `Thú cưng đi dạo về và tha về **+${petReward.toLocaleString()} xu**!`, GIFS.thucung)] });
                break;

            case 'petsolo':
                const petKeyUser = userPets.get(userId);
                if (!petKeyUser) return interaction.reply({ content: 'Bồ chưa có thú cưng để solo!', ephemeral: true });
                const petUserObj = PET_SHOP[petKeyUser];
                const userPower = petUserObj.power || 30;
                const opponentUser = interaction.options.getUser('doi_thu');
                let oppName = '';
                let oppPower = 0;
                let prizePool = 5000;

                if (opponentUser) {
                    if (opponentUser.bot || opponentUser.id === userId) return interaction.reply({ content: 'Không thể solo với bot hoặc chính mình!', ephemeral: true });
                    const oppPetKey = userPets.get(opponentUser.id);
                    if (!oppPetKey) return interaction.reply({ content: 'Đối thủ không có pet!', ephemeral: true });
                    oppName = `<@${opponentUser.id}>`;
                    oppPower = PET_SHOP[oppPetKey].power || 30;
                } else {
                    oppName = '🤖 Boss Máy';
                    oppPower = Math.floor(Math.random() * 350) + 50;
                }

                if ((userPower + Math.random() * 100) >= (oppPower + Math.random() * 100)) {
                    let winReward = getBuffedAmount(userId, prizePool);
                    eco.balance += winReward;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x57F287, '⚔️ PET SOLO: THẮNG', `Thắng trận trước ${oppName}, nhận **+${winReward.toLocaleString()} xu**!`, GIFS.petsolo)] });
                } else {
                    eco.balance = Math.max(0, eco.balance - 2000);
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0xED4245, '⚔️ PET SOLO: THUA', `Thú cưng thua trận và mất 2,000 xu tiền thuốc!`, GIFS.petsolo)] });
                }
                break;

            case 'nongtrai':
                const subFarm = interaction.options.getSubcommand();
                if (subFarm === 'vuon') {
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌾 NÔNG TRẠI', 'Khu vườn đang phát triển tốt!', GIFS.nongtrai)] });
                } else if (subFarm === 'gieohat') {
                    const plotIdx = interaction.options.getInteger('odat') - 1;
                    const seedType = interaction.options.getString('loai');
                    if (eco.plots[plotIdx].plant !== null) return interaction.reply({ content: 'Ô đất này đã có cây!', ephemeral: true });
                    const seedInfo = SEEDS[seedType];
                    let invSeed = getInventory(userId);
                    if (!invSeed[seedInfo.name] || invSeed[seedInfo.name] <= 0) return interaction.reply({ content: `Không có **${seedInfo.name}** trong kho!`, ephemeral: true });
                    invSeed[seedInfo.name] -= 1;
                    eco.plots[plotIdx] = { plant: seedType, time: Date.now() + seedInfo.time };
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌱 GIEO HẠT', `Đã trồng **${seedInfo.name}** vào ô ${plotIdx + 1}!`, GIFS.nongtrai)] });
                } else if (subFarm === 'thuhoach') {
                    const plotIdx = interaction.options.getInteger('odat') - 1;
                    const plot = eco.plots[plotIdx];
                    if (!plot.plant) return interaction.reply({ content: 'Ô đất trống!', ephemeral: true });
                    if (Date.now() < plot.time) return interaction.reply({ content: 'Cây chưa chín!', ephemeral: true });
                    let finalRewardFarm = getBuffedAmount(userId, SEEDS[plot.plant].profit);
                    eco.balance += finalRewardFarm;
                    eco.plots[plotIdx] = { plant: null, time: 0 };
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x57F287, '✨ THU HOẠCH', `Thu hoạch được **+${finalRewardFarm.toLocaleString()} xu**!`, GIFS.nongtrai)] });
                }
                break;

            case 'kethon':
                const targetUser = interaction.options.getUser('nguoi_ay');
                if (targetUser.bot || targetUser.id === userId) return interaction.reply({ content: 'Không cưới bot hoặc chính mình!', ephemeral: true });
                if (marriages.has(userId) || marriages.has(targetUser.id)) return interaction.reply({ content: 'Đã có gia đình rồi!', ephemeral: true });
                marriages.set(userId, targetUser.id); marriages.set(targetUser.id, userId);
                await interaction.reply({ embeds: [createEmbed(0xFF69B4, '💍 KẾT HÔN', `Chúc mừng ${interaction.user} và ${targetUser} đã về chung một nhà!`, GIFS.kethon)] });
                break;

            case 'lyhon':
                if (!marriages.has(userId)) return interaction.reply({ content: 'Đang độc thân mà!', ephemeral: true });
                const partner = marriages.get(userId);
                marriages.delete(userId); marriages.delete(partner);
                await interaction.reply({ embeds: [createEmbed(0xED4245, '💔 LY HÔN', `Đường ai nấy đi!`, GIFS.lyhon)] });
                break;

            case 'taixiu':
                const txBet = interaction.options.getInteger('cuoc'); 
                const txChoice = interaction.options.getString('chon'); 
                if (!checkBet(txBet)) return;
                const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1, d3 = Math.floor(Math.random() * 6) + 1;
                const sum = d1 + d2 + d3;
                let txResult = (sum >= 11 && sum <= 17) ? 'tai' : 'xiu';
                if (txChoice === txResult) eco.balance += getBuffedAmount(userId, txBet);
                else eco.balance -= txBet;
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🎲 TÀI XỈU', `[${d1}-${d2}-${d3}] (${sum}) - **${txResult.toUpperCase()}**`, GIFS.taixiu)] });
                break;

            case 'rob':
                const victim = interaction.options.getUser('muc_tieu');
                if (victim.bot || victim.id === userId) return interaction.reply({ content: 'Không cướp bot hoặc chính mình!', ephemeral: true });
                let vEco = getUserData(victim.id);
                if (vEco.balance < 500) return interaction.reply({ content: 'Nạn nhân quá nghèo!', ephemeral: true });
                if (Math.random() < 0.4) {
                    let stolen = getBuffedAmount(userId, Math.floor(vEco.balance * 0.2));
                    vEco.balance -= stolen; eco.balance += stolen;
                    saveUserData(userId, eco); saveUserData(victim.id, vEco);
                    await interaction.reply({ embeds: [createEmbed(0x57F287, '🦹 CƯỚP THÀNH CÔNG', `Cướp được **+${stolen.toLocaleString()} xu**!`, GIFS.rob)] });
                } else {
                    eco.balance = Math.max(0, eco.balance - 1000);
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0xED4245, '🚨 BỊ TÚM CỔ', `Bị bắt và phạt 1,000 xu!`, GIFS.error)] });
                }
                break;

            case 'banghoi':
                const subClan = interaction.options.getSubcommand();
                if (subClan === 'tao') {
                    if (eco.clanId) return interaction.reply({ content: 'Đã ở trong bang rồi!', ephemeral: true });
                    const clanNameInput = interaction.options.getString('ten');
                    if (eco.balance < 10000) return interaction.reply({ content: 'Cần 10,000 xu để tạo bang!', ephemeral: true });
                    eco.balance -= 10000;
                    const clanId = 'clan_' + Date.now();
                    clans.set(clanId, { name: clanNameInput, leader: userId, members: [userId] });
                    eco.clanId = clanId;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0xF1C40F, '🛡️ LẬP BANG', `Bang **${clanNameInput}** thành lập thành công!`, GIFS.banghoi)] });
                } else if (subClan === 'thongtin') {
                    if (!eco.clanId || !clans.has(eco.clanId)) return interaction.reply({ content: 'Chưa vào bang nào!', ephemeral: true });
                    const cInfo = clans.get(eco.clanId);
                    await interaction.reply({ embeds: [createEmbed(0xF1C40F, `🛡️ BANG: ${cInfo.name}`, `Trưởng bang: <@${cInfo.leader}>\nThành viên: ${cInfo.members.length}`, GIFS.banghoi)] });
                }
                break;

            case 'quiz_anime':
                const quizItem = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
                const allAnimes = [...new Set(ANIME_LIST.map(a => a.anime))];
                let wrongAnimes = allAnimes.filter(a => a !== quizItem.anime).sort(() => 0.5 - Math.random()).slice(0, 3);
                let options = [...wrongAnimes,                    
