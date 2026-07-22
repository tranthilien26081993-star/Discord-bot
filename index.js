import { Client, GatewayIntentBits, REST, Routes, Partials, Events, ActivityType, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import OpenAI from 'openai';
import http from 'http';

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running and fully loaded with Ultimate Expansion Pack!\n');
}).listen(process.env.PORT || 3000);

const chatHistories = new Map();
const userEconomy = new Map();
const userPets = new Map();
const marriages = new Map();
const userInventories = new Map();
const clans = new Map();

const shopStock = {
    lastRestock: 0,
    petsOnSale: [],
    seedsOnSale: [],
    rodsOnSale: []
};

function checkAndRestockShop() {
    const now = Date.now();
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    if (now - shopStock.lastRestock > EIGHT_HOURS || shopStock.petsOnSale.length === 0) {
        shopStock.lastRestock = now;
        const allShopPets = Object.keys(PET_SHOP).filter(k => PET_SHOP[k].type === 'shop');
        shopStock.petsOnSale = allShopPets.filter(() => Math.random() > 0.3);
        const allSeeds = Object.keys(SEEDS);
        shopStock.seedsOnSale = allSeeds.filter(() => Math.random() > 0.2);
        const allRods = Object.keys(ROD_SHOP);
        shopStock.rodsOnSale = allRods.filter(() => Math.random() > 0.2);
    }
}

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
    oantuti: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpuc2M2bHJqZjNqMjRrcW95anJ3MTRwMndueHVndXV5aW12a3E5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif',
    slot: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWNmN2c1OWpneGR3MmN3czN2bjBrcXp5OWFvMWJ3bWJmeHMwOTI2MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LpwBheewF3L9C/giphy.gif',
    boitinhyeu: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXl2YmNxdXFwM3l5bXg1MnBlZnN5YmNuc3I3dzM2eG1qZmZ2YW94biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRv0ThflsHCqDrG/giphy.gif',
    ball8: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWxvd3R5Y2x3bTh6b2Rsd2o5Z3h5OHpyMWV1dTR4OGh0cWtnbmdreSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHFRbmaZtBRhXG/giphy.gif',
    rob: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGg3ZnZ4MnhwN2ZueW1ucW1pZDRtbHVnbHZzbmV0c3k0OWZpcHFibyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSx0g723R02q3e/giphy.gif',
    banghoi: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDFhMzNoOHM5NWNsaHNreHF6aTB0MXl6aWh4OXloZ250aGJ3ejRrayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlRnAWXxn0MhOBK/giphy.gif',
    quiz: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOTVrbjVscXRwNXYxZTN2MWZudWVwdHRnd3M3OWl3OHMydTZ3MG9yNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btPCcdNniyf0ArS/giphy.gif',
    avatarcheck: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3ZydW5jNXN5YnJ4MGN0OXkzaTJ3MWlzYWlyd3J2anU0dXZzcHJ2YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LpwBheewF3L9C/giphy.gif',
    gayrate: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXl2YmNxdXFwM3l5bXg1MnBlZnN5YmNuc3I3dzM2eG1qZmZ2YW94biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRv0ThflsHCqDrG/giphy.gif',
    error: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZHBvZHd5NTRmYXA1YW5mbWF2MHFpNHV5bThhY2lnbzlnbWZ3M3Z4OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TqiwHbFBaZ4ti/giphy.gif',
    action_hon: 'https://media.giphy.com/media/l0HlRnAWXxn0MhOBK/giphy.gif',
    action_om: 'https://media.giphy.com/media/3o7TKSx0g723R02q3e/giphy.gif',
    action_tat: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    action_xoadau: 'https://media.giphy.com/media/LpwBheewF3L9C/giphy.gif',
    action_dam: 'https://media.giphy.com/media/l2JHRhAtnJSDNJ2py/giphy.gif',
    action_khoc: 'https://media.giphy.com/media/TqiwHbFBaZ4ti/giphy.gif',
    action_nhay: 'https://media.giphy.com/media/9Iw32bZg8p0pa/giphy.gif',
    thachdu: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R4dmpvMGJ6djR2NnY2dzE4azV4cWN0cTRqY2FxdTNwNzhxOHpxbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSx0g723R02q3e/giphy.gif',
    nhnhanh: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWNmN2c1OWpneGR3MmN3czN2bjBrcXp5OWFvMWJ3bWJmeHMwOTI2MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LpwBheewF3L9C/giphy.gif',
    vongquay: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWl0dHN3eWZnbmtwb3I5cHR5czR6MXY3OWRjMXV2MGpxaHFkOXptayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9Iw32bZg8p0pa/giphy.gif'
};

const FISH_LIST = [
    { name: '👢 Rác Cấp Vũ Trụ', price: 10, rarity: '⚪ Phế Liệu' }, { name: '🩴 Chiếc Giày Thối', price: 15, rarity: '⚪ Phế Liệu' },
    { name: '🦴 Xương Khủng Long', price: 50, rarity: '🟢 Thường' }, { name: '🐡 Cá Nóc Ngáo Ngơ', price: 80, rarity: '🟢 Thường' },
    { name: '🐟 Cá Chép Om Dưa', price: 150, rarity: '🟢 Thường' }, { name: '🐠 Cá Nemo Đi Lạc', price: 400, rarity: '🔵 Không Phổ Biến' },
    { name: '🦀 Cua Hoàng Đế Đỏ', price: 900, rarity: '🔵 Không Phổ Biến' }, { name: '🦑 Mực Ống Nướng Mọi', price: 1200, rarity: '🔵 Không Phổ Biến' },
    { name: '🦈 Cá Mập Cắn Cáp', price: 1500, rarity: '🟣 Hiếm' }, { name: '🐙 Mực Đại Dương Khổng Lồ', price: 2500, rarity: '🟣 Hiếm' },
    { name: '⚡ Lươn Điện 1000V', price: 3000, rarity: '🟣 Hiếm' }, { name: '🐢 Cụ Rùa Hoàn Kiếm', price: 3500, rarity: '🟠 Cực Hiếm' },
    { name: '🐬 Cá Heo Thần Tốc', price: 6000, rarity: '🟠 Cực Hiếm' }, { name: '🧜 Nàng Tiên Cá Hụt Hẫng', price: 8500, rarity: '🟠 Cực Hiếm' },
    { name: '🐋 Cá Voi Bay', price: 10000, rarity: '🟡 Huyền Thoại' }, { name: '👑 Long Vương Cổ Đại', price: 25000, rarity: '🟡 Huyền Thoại' },
    { name: '🌟 Cá Mặt Trăng Huyền Bí', price: 32000, rarity: '🟡 Huyền Thoại' }, { name: '💎 Cá Vẩy Kim Cương', price: 45000, rarity: '🔴 Thần Thoại' },
    { name: '🔥 Cá Thần Hỏa Long', price: 60000, rarity: '🔴 Thần Thoại' }, { name: '🧊 Cá Băng Vĩnh Cửu', price: 75000, rarity: '🔴 Thần Thoại' }
];

const ROD_SHOP = {
    tre: { name: 'Cần Trúc Cùi Bắp', price: 0, mult: 1.0, rarity: '🟢 Thường' },
    nhua: { name: 'Cần Nhựa Đồ Chơi', price: 2000, mult: 1.1, rarity: '🟢 Thường' },
    carbon: { name: 'Cần Carbon Siêu Cứng', price: 5000, mult: 1.3, rarity: '🔵 Không Phổ Biến' },
    titan: { name: 'Cần Titan Thần Thánh', price: 25000, mult: 2.0, rarity: '🟣 Hiếm' },
    kimcuong: { name: 'Cần Kim Cương Bất Tử', price: 80000, mult: 3.2, rarity: '🟡 Huyền Thoại' },
    vutru: { name: 'Cần Hố Đen Vũ Trụ', price: 300000, mult: 5.5, rarity: '🔴 Thần Thoại' }
};

const MINE_LOOTS = [
    { name: '🪨 Cục Đá Cuội Sứt Mẻ', price: 20, rarity: '🟢 Thường' }, 
    { name: '🪙 Đồng Xu Cổ Gỉ Sét', price: 150, rarity: '🟢 Thường' },
    { name: '🔩 Sắt Phế Liệu', price: 300, rarity: '🔵 Không Phổ Biến' },
    { name: '🥈 Quặng Bạc Lấp Lánh', price: 600, rarity: '🔵 Không Phổ Biến' }, 
    { name: '🥇 Quặng Vàng Nguyên Chất', price: 1800, rarity: '🟣 Hiếm' },
    { name: '🟢 Quặng Ngọc Bích', price: 3200, rarity: '🟣 Hiếm' },
    { name: '💎 Kim Cương Xanh', price: 6000, rarity: '🟠 Cực Hiếm' },
    { name: '🔮 Hắc Diệu Thạch', price: 12000, rarity: '🟡 Huyền Thoại' },
    { name: '👑 Ấn Ký Hoàng Gia Cổ', price: 25000, rarity: '🟡 Huyền Thoại' },
    { name: '🌟 Mảnh Sao Băng Rơi', price: 50000, rarity: '🔴 Thần Thoại' }
];

const PET_SHOP = {
    cho: { name: '🐶 Chó Shiba Ngáo', price: 3000, type: 'shop', buffType: 'money', buffVal: 1.1, rarity: '🟢 Thường', desc: 'Tăng +10% tiền nhận được từ mọi hoạt động' },
    meo: { name: '🐱 Mèo Thần Tài Vẫy Tay', price: 6000, type: 'shop', buffType: 'money', buffVal: 1.25, rarity: '🔵 Không Phổ Biến', desc: 'Tăng +25% tiền nhận được từ mọi hoạt động' },
    cáo: { name: '🦊 Cáo Chín Đuôi Sơ Khai', price: 15000, type: 'shop', buffType: 'combat', power: 35, rarity: '🟣 Hiếm', desc: 'Sức mạnh chiến đấu 35' },
    rong: { name: '🐲 Rồng Lửa Nhỏ', price: 35000, type: 'shop', buffType: 'combat', power: 50, rarity: '🟠 Cực Hiếm', desc: 'Sức mạnh chiến đấu 50' },
    phuonghoang: { name: '🔥 Phượng Hoàng Lửa', price: 80000, type: 'shop', buffType: 'combat', power: 120, rarity: '🟡 Huyền Thoại', desc: 'Sức mạnh chiến đấu 120' },
    kỳlân: { name: '🦄 Kỳ Lân Cổ Đại Tối Thượng', price: 0, type: 'hunt', buffType: 'money_combat', buffVal: 1.5, power: 250, rarity: '🔴 Thần Thoại (Độc Quyền Săn Bắt)', desc: 'Tăng 50% tiền & Sức mạnh chiến đấu 250' },
    thienlong: { name: '🌌 Thiên Long Vực Sâu', price: 0, type: 'hunt', buffType: 'money_combat', buffVal: 2.0, power: 400, rarity: '🌌 Tối Thượng (Săn Boss)', desc: 'Tăng 100% tiền & Sức mạnh chiến đấu 400' }
};

const SEEDS = {
    lua: { name: '🌾 Lúa Nước', cost: 50, profit: 150, time: 2 * 60000, rarity: '🟢 Thường' },
    ngo: { name: '🌽 Ngô Đồng', cost: 120, profit: 350, time: 5 * 60000, rarity: '🟢 Thường' },
    cangot: { name: '🍓 Cà Chua Ngọt', cost: 200, profit: 650, time: 8 * 60000, rarity: '🔵 Không Phổ Biến' },
    duahau: { name: '🍉 Dưa Hấu Thần Tốc', cost: 300, profit: 1000, time: 10 * 60000, rarity: '🟣 Hiếm' },
    hoahong: { name: '🌹 Hoa Hồng Tình Yêu', cost: 600, profit: 2200, time: 15 * 60000, rarity: '🟠 Cực Hiếm' },
    nhovang: { name: '🍇 Nho Vàng Hoàng Kim', cost: 1200, profit: 4500, time: 20 * 60000, rarity: '🟡 Huyền Thoại' }
};

const ANIME_LIST = [
    { name: 'Luffy', anime: 'One Piece', hint: 'Thuyền trưởng Mũ Rơm, thích ăn thịt' },
    { name: 'Zoro', anime: 'One Piece', hint: 'Thánh mù đường Tam Kiếm Sĩ' },
    { name: 'Sanji', anime: 'One Piece', hint: 'Đầu bếp chân đen simp lỏ' },
    { name: 'Nami', anime: 'One Piece', hint: 'Miêu tặc hoa tiêu thích tiền' },
    { name: 'Usopp', anime: 'One Piece', hint: 'Thánh nổ xạ thủ chiến thần' },
    { name: 'Chopper', anime: 'One Piece', hint: 'Bác sĩ tuần lộc đáng yêu' },
    { name: 'Robin', anime: 'One Piece', hint: 'Nhà khảo cổ học hoa tiêu' },
    { name: 'Franky', anime: 'One Piece', hint: 'Cơ khí người máy SUPER' },
    { name: 'Brook', anime: 'One Piece', hint: 'Bộ xương nhạc công yohoho' },
    { name: 'Jinbe', anime: 'One Piece', hint: 'Cựu thất vũ hải hiệp khách mập' },
    { name: 'Shanks', anime: 'One Piece', hint: 'Tứ hoàng tóc đỏ bá vương sắc' },
    { name: 'Ace', anime: 'One Piece', hint: 'Hỏa quyền anh trai quốc dân' },
    { name: 'Law', anime: 'One Piece', hint: 'Bác sĩ tử thần trái Ope Ope' },
    { name: 'Doflamingo', anime: 'One Piece', hint: 'Thiên dạ xoa hồng hạc' },
    { name: 'Boa Hancock', anime: 'One Piece', hint: 'Nữ hoàng hải tặc mê Luffy' },
    { name: 'Naruto', anime: 'Naruto', hint: 'Ninja làng Lá chứa Cửu Vĩ' },
    { name: 'Sasuke', anime: 'Naruto', hint: 'Thiên tài Uchiha báo thù' },
    { name: 'Kakashi', anime: 'Naruto', hint: 'Ninja sao chép thầy giáo quốc dân' },
    { name: 'Sakura', anime: 'Naruto', hint: 'Ninja y thế lực bộc phá' },
    { name: 'Hinata', anime: 'Naruto', hint: 'Công chúa Byakugan thẹn thùng' },
    { name: 'Itachi', anime: 'Naruto', hint: 'Thiên tài sát tộc hi sinh vì làng' },
    { name: 'Madara', anime: 'Naruto', hint: 'Huyền thoại Uchiha gọi thiên thạch' },
    { name: 'Minato', anime: 'Naruto', hint: 'Tia chớp vàng làng Lá' },
    { name: 'Jiraiya', anime: 'Naruto', hint: 'Tiên nhân cóc dê xồm' },
    { name: 'Gaara', anime: 'Naruto', hint: 'Kazekage cát đỏ' },
    { name: 'Goku', anime: 'Dragon Ball', hint: 'Khỉ con Saiyan hệ tóc vàng' },
    { name: 'Vegeta', anime: 'Dragon Ball', hint: 'Hoàng tử kiêu hãnh Saiyan' },
    { name: 'Gohan', anime: 'Dragon Ball', hint: 'Con trai siêu chiến binh tiềm năng' },
    { name: 'Piccolo', anime: 'Dragon Ball', hint: 'Chiến binh Namek xanh lá' },
    { name: 'Frieza', anime: 'Dragon Ball', hint: 'Đại vương vũ trụ độc tài' },
    { name: 'Trunks', anime: 'Dragon Ball', hint: 'Kiếm sĩ tương lai du hành thời gian' },
    { name: 'Eren Yeager', anime: 'Attack on Titan', hint: 'Kẻ tự do diệt thế' },
    { name: 'Levi Ackerman', anime: 'Attack on Titan', hint: 'Binh trưởng mạnh nhất nhân loại' },
    { name: 'Mikasa Ackerman', anime: 'Attack on Titan', hint: 'Nữ chiến binh khăn choàng đỏ' },
    { name: 'Armin Arlert', anime: 'Attack on Titan', hint: 'Bộ óc chiến lược đại trinh sát' },
    { name: 'Erwin Smith', anime: 'Attack on Titan', hint: 'Đội trưởng dâng hiến con tim' },
    { name: 'Tanjiro Kamado', anime: 'Demon Slayer', hint: 'Thợ săn quỷ vết sẹo trán' },
    { name: 'Nezuko Kamado', anime: 'Demon Slayer', hint: 'Em gái hóa quỷ ngậm ống tre' },
    { name: 'Zenitsu Agatsuma', anime: 'Demon Slayer', hint: 'Thanh niên ngủ gục sét đánh' },
    { name: 'Inosuke Hashibira', anime: 'Demon Slayer', hint: 'Thánh heo rừng cởi trần' },
    { name: 'Giyu Tomioka', anime: 'Demon Slayer', hint: 'Thủy trụ trầm tính' },
    { name: 'Rengoku Kyojuro', anime: 'Demon Slayer', hint: 'Viêm trụ ăn ngon miệng' },
    { name: 'Muzan Kibutsuji', anime: 'Demon Slayer', hint: 'Chúa tể quỷ Michael Jackson' },
    { name: 'Gojo Satoru', anime: 'Jujutsu Kaisen', hint: 'Pháp sư mạnh nhất vô hạn' },
    { name: 'Yuji Itadori', anime: 'Jujutsu Kaisen', hint: 'Vật chủ của Sukuna' },
    { name: 'Megumi Fushiguro', anime: 'Jujutsu Kaisen', hint: 'Triệu hồi sư bóng tối' },
    { name: 'Nobara Kugisaki', anime: 'Jujutsu Kaisen', hint: 'Nữ pháp sư búa đinh' },
    { name: 'Sukuna', anime: 'Jujutsu Kaisen', hint: 'Nguyền vương bốn tay' },
    { name: 'Nanami Kento', anime: 'Jujutsu Kaisen', hint: 'Nhân viên công sở 5 giờ tan ca' },
    { name: 'Deku (Izuku)', anime: 'My Hero Academia', hint: 'Kế thừa One For All' },
    { name: 'Bakugo Katsuki', anime: 'My Hero Academia', hint: 'Đại gia nổ tung cá tính mạnh' },
    { name: 'Todoroki Shoto', anime: 'My Hero Academia', hint: 'Băng và lửa nửa mặt' },
    { name: 'All Might', anime: 'My Hero Academia', hint: 'Biểu tượng hòa bình cơ bắp' },
    { name: 'Ichigo Kurosaki', anime: 'Bleach', hint: 'Thần chết thay thế tóc cam' },
    { name: 'Rukia Kuchiki', anime: 'Bleach', hint: 'Nữ thần chết băng giá' },
    { name: 'Aizen Sosuke', anime: 'Bleach', hint: 'Trùm phản diện thao túng Kyoka Suigetsu' },
    { name: 'Kenpachi Zaraki', anime: 'Bleach', hint: 'Đội trưởng cuồng chiến đấu' },
    { name: 'Gon Freecss', anime: 'Hunter x Hunter', hint: 'Thợ săn tìm bố hóa tóc dài' },
    { name: 'Killua Zoldyck', anime: 'Hunter x Hunter', hint: 'Sân sát thủ hệ biến đổi điện' },
    { name: 'Kurapika', anime: 'Hunter x Hunter', hint: 'Thánh xích trả thù gia tộc mắt đỏ' },
    { name: 'Hisoka', anime: 'Hunter x Hunter', hint: 'Hề biến thái niệm Bungee Gum' },
    { name: 'Edward Elric', anime: 'Fullmetal Alchemist', hint: 'Nhà giả kim thép lùn' },
    { name: 'Alphonse Elric', anime: 'Fullmetal Alchemist', hint: 'Bộ giáp sắt chứa linh hồn' },
    { name: 'Light Yagami', anime: 'Death Note', hint: 'Chủ nhân cuốn sổ tử thần Kira' },
    { name: 'L Lawliet', anime: 'Death Note', hint: 'Thám tử thiên tài ngồi chồm hổm' },
    { name: 'Denji', anime: 'Chainsaw Man', hint: 'Thợ săn quỷ người cưa' },
    { name: 'Makima', anime: 'Chainsaw Man', hint: 'Ác quỷ chi phối quyền lực' },
    { name: 'Power', anime: 'Chainsaw Man', hint: 'Quỷ máu ngáo ngơ' },
    { name: 'Mikey (Manjiro)', anime: 'Tokyo Revengers', hint: 'Vô địch tổng trưởng Toman' },
    { name: 'Takemichi Hanagaki', anime: 'Tokyo Revengers', hint: 'Thánh khóc vượt thời gian cứu bồ' },
    { name: 'Sung Jin-woo', anime: 'Solo Leveling', hint: 'Thợ săn yếu nhất thăng cấp bóng tối' },
    { name: 'Kirito', anime: 'Sword Art Online', hint: 'Hắc kiếm sĩ game thủ VR' },
    { name: 'Asuna', anime: 'Sword Art Online', hint: 'Tia chớp phó thủ huyết minh' },
    { name: 'Isagi Yoichi', anime: 'Blue Lock', hint: 'Tiền đạo chủ lực nhìn thấu sân cỏ' },
    { name: 'Bachira Meguru', anime: 'Blue Lock', hint: 'Quái vật rê bóng nghệ sĩ' },
    { name: 'Hinata Shoyo', anime: 'Haikyuu!!', hint: 'Giò nhảy siêu đẳng quạ đen' },
    { name: 'Kageyama Tobio', anime: 'Haikyuu!!', hint: 'Vua sân bóng chuyền chuyền hai' },
    { name: 'Kaneki Ken', anime: 'Tokyo Ghoul', hint: 'Bán ngạ quỷ tóc trắng' },
    { name: 'Thorfinn', anime: 'Vinland Saga', hint: 'Chiến binh viking không có kẻ thù' },
    { name: 'Anya Forger', anime: 'Spy x Family', hint: 'Cô bé đọc suy nghĩ thích đậu phộng' },
    { name: 'Loid Forger', anime: 'Spy x Family', hint: 'Điệp viên Twilight hoàn hảo' },
    { name: 'Yor Forger', anime: 'Spy x Family', hint: 'Sát thủ công chúa gai' },
    { name: 'Saitama', anime: 'One Punch Man', hint: 'Thánh trọc đấm phát chết luôn' },
    { name: 'Genos', anime: 'One Punch Man', hint: 'Cyborg học trò hệ pháo rác' },
    { name: 'David Martinez', anime: 'Cyberpunk: Edgerunners', hint: 'Cậu thiếu niên cấy ghép thần kinh' },
    { name: 'Lucy', anime: 'Cyberpunk: Edgerunners', hint: 'Hacker ước mơ lên mặt trăng' },
    { name: 'Hitori Gotoh (Bocchi)', anime: 'Bocchi the Rock!', hint: 'Ghita thủ hướng nội sợ xã hội' },
    { name: 'Violet Evergarden', anime: 'Violet Evergarden', hint: 'Búp bê tự động ghi chép chiến tranh' },
    { name: 'Choso', anime: 'Jujutsu Kaisen', hint: 'Anh cả tuyệt vời hệ xích huyết' },
    { name: 'Toji Fushiguro', anime: 'Jujutsu Kaisen', hint: 'Sát thủ thiên hạ vô địch không chú lực' },
    { name: 'Megumin', anime: 'KonoSuba', hint: 'Thánh bộc phá phép nổ một lần' },
    { name: 'Aqua', anime: 'KonoSuba', hint: 'Nữ thần nước vô dụng' },
    { name: 'Kazuma', anime: 'KonoSuba', hint: 'Thánh nam thanh niên bình đẳng giới' },
    { name: 'Rem', anime: 'Re:Zero', hint: 'Ma nữ hầu gái tóc xanh giận dữ' },
    { name: 'Emilia', anime: 'Re:Zero', hint: 'Nàng tiên cá thể bạc bán yêu' },
    { name: 'Subaru Natsuki', anime: 'Re:Zero', hint: 'Thanh niên chết đi sống lại' },
    { name: 'Ainz Ooal Gown', anime: 'Overlord', hint: 'Bộ xương chúa tể lăng mộ Nazarick' },
    { name: 'Rimuru Tempest', anime: 'That Time I Got Reincarnated as a Slime', hint: 'Chúa tể slime bọc thức ăn' }
];

const ANIME_Sclient.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    let eco = getUserData(userId);
    checkAndRestockShop();

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
                const petInfo = petObj ? `${petObj.name} [${petObj.rarity}]\n*(Buff: ${petObj.desc})*` : '❌ Chưa nuôi con gì (Mua tại `/cuahang thucung` hoặc săn bắt)';
                const partnerId = marriages.get(userId);
                const partnerInfo = partnerId ? `<@${partnerId}> 💍` : 'Độc thân vui tính 🥀';
                const clanName = eco.clanId && clans.has(eco.clanId) ? clans.get(eco.clanId).name : 'Chưa gia nhập bang';

                await interaction.reply({ 
                    embeds: [createEmbed(0x5865F2, `💳 HỒ SƠ: ${interaction.user.username.toUpperCase()}`, `✨ Thông tin tài sản và cấp độ hiếm (Rarity):`, GIFS.hoso, interaction.user.displayAvatarURL({ dynamic: true }))
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
                await interaction.reply({ embeds: [createEmbed(0x57F287, '🎁 NHẬN LƯƠNG THÀNH CÔNG', `Ting ting **+${finalBonus.toLocaleString()} xu** vào ví! 🔥 Chuỗi: **${eco.streak} ngày**!`, GIFS.diemdanh)] }); 
                break;

            case 'cuahang':
                const subShop = interaction.options.getSubcommand();
                
                if (subShop === 'xem') {
                    const timeRemaining = Math.ceil((8 * 3600 * 1000 - (Date.now() - shopStock.lastRestock)) / 60000);
                    
                    let petStockText = shopStock.petsOnSale.length > 0 
                        ? shopStock.petsOnSale.map(k => `• **${PET_SHOP[k].name}** - Giá: *${PET_SHOP[k].price.toLocaleString()} xu* [${PET_SHOP[k].rarity}]`).join('\n')
                        : '❌ Đợt này hàng hiếm, shop hết sạch Thú Cưng!';

                    let seedStockText = shopStock.seedsOnSale.length > 0
                        ? shopStock.seedsOnSale.map(k => `• **${SEEDS[k].name}** - Giá: *${SEEDS[k].cost} xu* [${SEEDS[k].rarity}]`).join('\n')
                        : '❌ Shop tạm thời hết Hạt Giống!';

                    let rodStockText = shopStock.rodsOnSale.length > 0
                        ? shopStock.rodsOnSale.map(k => `• **${ROD_SHOP[k].name}** - Giá: *${ROD_SHOP[k].price.toLocaleString()} xu* [${ROD_SHOP[k].rarity}]`).join('\n')
                        : '❌ Shop hết Cần Câu!';

                    await interaction.reply({
                        embeds: [createEmbed(0x2ECC71, '🛒 CỬA HÀNG TỔNG HỢP (RESTOCK MỖI 8 GIỜ)', `🕒 Thời gian làm mới stock tiếp theo sau: **~${timeRemaining} phút**\n*(Lưu ý: Các pet Tối Thượng/Thần Thoại như Kỳ Lân không bán trong shop, hãy đi săn bắt!)*`, GIFS.cuahang)
                            .addFields(
                                { name: '🐾 Thú Cưng Đang Bán', value: petStockText, inline: false },
                                { name: '🌱 Hạt Giống Đang Bán', value: seedStockText, inline: false },
                                { name: '🎣 Cần Câu Đang Bán', value: rodStockText, inline: false }
                            )]
                    });
                } 
                else if (subShop === 'cancau') {
                    const rodChoice = interaction.options.getString('loai');
                    if (!shopStock.rodsOnSale.includes(rodChoice)) {
                        return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ HẾT HÀNG', 'Cần câu này hiện không có sẵn trong đợt bán hàng 8h này của shop!', null, GIFS.error)], ephemeral: true });
                    }
                    const targetRod = ROD_SHOP[rodChoice];
                    if (eco.balance < targetRod.price) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ VIÊM MÀNG TÚI', 'Không đủ tiền mua cần câu này!', null, GIFS.error)], ephemeral: true });
                    eco.balance -= targetRod.price; eco.rod = rodChoice; saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🛒 MUA THÀNH CÔNG', `Đã sở hữu **${targetRod.name}** [${targetRod.rarity}]!`, GIFS.cuahang)] });
                } 
                else if (subShop === 'thucung') {
                    const petChoice = interaction.options.getString('loai');
                    if (!shopStock.petsOnSale.includes(petChoice)) {
                        return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ HẾT HÀNG / KHÔNG BÁN', 'Thú cưng này hiện không có trong stock cửa hàng lần này!', null, GIFS.error)], ephemeral: true });
                    }
                    const targetPet = PET_SHOP[petChoice];
                    if (userPets.has(userId)) return interaction.reply({ content: 'Bồ đã có thú cưng rồi, không nuôi ôm đồm được nữa!', ephemeral: true });
                    if (eco.balance < targetPet.price) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ VIÊM MÀNG TÚI', 'Không đủ tiền mua pet này!', null, GIFS.error)], ephemeral: true });
                    eco.balance -= targetPet.price; userPets.set(userId, petChoice); saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🐾 MUA THÚ CƯNG', `Đã mua thành công **${targetPet.name}** [${targetPet.rarity}]!`, GIFS.thucung)] });
                } 
                else if (subShop === 'hatgiong') {
                    const seedChoice = interaction.options.getString('loai');
                    if (!shopStock.seedsOnSale.includes(seedChoice)) {
                        return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ HẾT HÀNG', 'Hạt giống này hiện không có trong stock cửa hàng đợt này!', null, GIFS.error)], ephemeral: true });
                    }
                    const targetSeed = SEEDS[seedChoice];
                    if (eco.balance < targetSeed.cost) return interaction.reply({ embeds: [createEmbed(0xED4245, '❌ VIÊM MÀNG TÚI', 'Không đủ tiền mua hạt giống!', null, GIFS.error)], ephemeral: true });
                    eco.balance -= targetSeed.cost;
                    let invShop = getInventory(userId);
                    invShop[targetSeed.name] = (invShop[targetSeed.name] || 0) + 1;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌱 MUA HẠT GIỐNG', `Đã mua **${targetSeed.name}** [${targetSeed.rarity}] cất vào kho!`, GIFS.cuahang)] });
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
                            let pricePer = getBuffedAmount(userId, fish.price);
                            totalFishSoldMoney += pricePer * count;
                            soldCount += count;
                            delete invSell[fish.name];
                        }
                    }
                    if (soldCount === 0) return interaction.reply({ content: 'Trong kho không có con cá nào để bán!', ephemeral: true });
                    eco.balance += totalFishSoldMoney;
                    saveUserData(userId, eco);
                    return interaction.reply({ embeds: [createEmbed(0x2ECC71, '💰 BÁN CÁ', `Đã bán ${soldCount} con cá thu về **+${totalFishSoldMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                } else if (itemQuery === 'all_mine') {
                    let totalMineSoldMoney = 0;
                    let soldMineCount = 0;
                    for (const mine of MINE_LOOTS) {
                        if (invSell[mine.name]) {
                            let count = invSell[mine.name];
                            let pricePer = getBuffedAmount(userId, mine.price);
                            totalMineSoldMoney += pricePer * count;
                            soldMineCount += count;
                            delete invSell[mine.name];
                        }
                    }
                    if (soldMineCount === 0) return interaction.reply({ content: 'Trong kho không có khoáng sản nào để bán!', ephemeral: true });
                    eco.balance += totalMineSoldMoney;
                    saveUserData(userId, eco);
                    return interaction.reply({ embeds: [createEmbed(0x2ECC71, '💰 BÁN KHOÁNG SẢN', `Đã bán ${soldMineCount} khoáng sản thu về **+${totalMineSoldMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                } else if (itemQuery === 'all') {
                    let totalAllMoney = 0;
                    let totalCount = 0;
                    [...FISH_LIST, ...MINE_LOOTS].forEach(item => {
                        if (invSell[item.name]) {
                            let count = invSell[item.name];
                            let pricePer = getBuffedAmount(userId, item.price);
                            totalAllMoney += pricePer * count;
                            totalCount += count;
                            delete invSell[item.name];
                        }
                    });
                    if (totalCount === 0) return interaction.reply({ content: 'Kho đồ trống trơn không có gì để bán!', ephemeral: true });
                    eco.balance += totalAllMoney;
                    saveUserData(userId, eco);
                    return interaction.reply({ embeds: [createEmbed(0x2ECC71, '💰 BÁN TẤT CẢ VẬT PHẨM', `Đã bán toàn bộ kho đồ thu về **+${totalAllMoney.toLocaleString()} xu**!`, GIFS.ban)] });
                }

                let foundKey = Object.keys(invSell).find(k => k.toLowerCase().includes(itemQuery));
                if (!foundKey || invSell[foundKey] <= 0) return interaction.reply({ content: 'Không tìm thấy vật phẩm này trong kho!', ephemeral: true });

                let sellPrice = 50; 
                const matchedFish = FISH_LIST.find(f => f.name === foundKey);
                const matchedMine = MINE_LOOTS.find(m => m.name === foundKey);
                if (matchedFish) sellPrice = matchedFish.price;
                else if (matchedMine) sellPrice = matchedMine.price;

                let actualSellPrice = getBuffedAmount(userId, sellPrice);
                let totalSoldMoney = actualSellPrice * invSell[foundKey];
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
                await interaction.reply({ embeds: [createEmbed(0x3498DB, '🎣 KẾT QUẢ ĐI CÂU', `Bồ câu được: **${caughtFish.name}** [${caughtFish.rarity}] bằng **${currentRod.name}**!`, GIFS.cauca)] });
                break;

            case 'daovang':
                let minedItem = MINE_LOOTS[Math.floor(Math.random() * MINE_LOOTS.length)];
                let minedPrice = getBuffedAmount(userId, minedItem.price);
                eco.balance += minedPrice; 
                let invMine = getInventory(userId);
                invMine[minedItem.name] = (invMine[minedItem.name] || 0) + 1;
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0xE67E22, '⛏️ ĐÀO VÀNG', `Đào được **${minedItem.name}** [${minedItem.rarity}] bán được **+${minedPrice.toLocaleString()} xu** và cất vào kho!`, GIFS.daovang)] });
                break;

            case 'thucung_di_choi':
                const myPet = userPets.get(userId);
                if (!myPet) return interaction.reply({ content: 'Bồ chưa có thú cưng nào để sai vặt!', ephemeral: true });
                let baseReward = Math.floor(Math.random() * 3000) + 1000;
                let petReward = getBuffedAmount(userId, baseReward);
                
                let extraMsg = '';
                const randChance = Math.random();
                if (randChance < 0.03) {
                    userPets.set(userId, 'thienlong');
                    extraMsg = '\n🌌 **CỰC PHẨM SĂN BẮT:** Thú cưng của bạn thuần hóa thành công **Thiên Long Vực Sâu** [🌌 Tối Thượng]!';
                } else if (randChance < 0.08) {
                    userPets.set(userId, 'kỳlân');
                    extraMsg = '\n🦄 **ĐỘC QUYỀN SĂN BẮT:** Thú cưng của bạn bắt được **Kỳ Lân Cổ Đại Tối Thượng** [🔴 Thần Thoại]!';
                }

                eco.balance += petReward; 
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0xF1C40F, '🐾 THÚ CƯNG ĐI SĂN', `Thú cưng đi dạo về và tha về **+${petReward.toLocaleString()} xu**!${extraMsg}`, GIFS.thucung)] });
                break;

            case 'petsolo':
                const petKeyUser = userPets.get(userId);
                if (!petKeyUser) return interaction.reply({ content: 'Bồ chưa có thú cưng để solo!', ephemeral: true });
                const petUserObj = PET_SHOP[petKeyUser];
                const userPower = petUserObj.power || 30;
                const opponentUser = interaction.options.getUser('doi_thu');
                let oppName = '', oppPower = 0, prizePool = 8000;

                if (opponentUser) {
                    if (opponentUser.bot || opponentUser.id === userId) return interaction.reply({ content: 'Không thể solo với bot hoặc chính mình!', ephemeral: true });
                    const oppPetKey = userPets.get(opponentUser.id);
                    if (!oppPetKey) return interaction.reply({ content: 'Đối thủ không có pet!', ephemeral: true });
                    oppName = `<@${opponentUser.id}>`;
                    oppPower = PET_SHOP[oppPetKey].power || 30;
                } else {
                    oppName = '🤖 Boss Rồng Khổng Lồ';
                    oppPower = Math.floor(Math.random() * 220) + 50;
                }

                if ((userPower + Math.random() * 60) >= (oppPower + Math.random() * 60)) {
                    let winReward = getBuffedAmount(userId, prizePool);
                    eco.balance += winReward;
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x57F287, '⚔️ PET SOLO: THẮNG TRẬN', `Thắng oanh liệt trước ${oppName}, nhận phần thưởng **+${winReward.toLocaleString()} xu**!`, GIFS.petsolo)] });
                } else {
                    eco.balance = Math.max(0, eco.balance - 1500);
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0xED4245, '⚔️ PET SOLO: THẤT BẠI', `Thú cưng bị đánh bại và tốn 1,500 xu tiền bồi dưỡng vết thương!`, GIFS.petsolo)] });
                }
                break;

            case 'nongtrai':
                const subFarm = interaction.options.getSubcommand();
                if (subFarm === 'vuon') {
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌾 NÔNG TRẠI 4 Ô', 'Khu vườn 4 ô đất mỡ màu đang phát triển tốt!', GIFS.nongtrai)] });
                } else if (subFarm === 'gieohat') {
                    const plotIdx = interaction.options.getInteger('odat') - 1;
                    const seedType = interaction.options.getString('loai');
                    if (plotIdx < 0 || plotIdx > 3) return interaction.reply({ content: 'Chỉ có 4 ô đất từ 1 đến 4!', ephemeral: true });
                    if (eco.plots[plotIdx].plant !== null) return interaction.reply({ content: 'Ô đất này đã có cây đang trồng!', ephemeral: true });
                    const seedInfo = SEEDS[seedType];
                    let invSeed = getInventory(userId);
                    if (!invSeed[seedInfo.name] || invSeed[seedInfo.name] <= 0) return interaction.reply({ content: `Không có **${seedInfo.name}** trong kho! Mua tại \`/cuahang hatgiong\`.`, ephemeral: true });
                    invSeed[seedInfo.name] -= 1;
                    eco.plots[plotIdx] = { plant: seedType, time: Date.now() + seedInfo.time };
                    saveUserData(userId, eco);
                    await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🌱 GIEO HẠT', `Đã trồng thành công **${seedInfo.name}** [${seedInfo.rarity}] vào ô đất số ${plotIdx + 1}!`, GIFS.nongtrai)] });
                } else if (subFarm === 'thuhoach') {
                    const plotIdx = interaction.options.getInteger('odat') - 1;
                    if (plotIdx < 0 || plotIdx > 3) return interaction.reply({ content: 'Chỉ có 4 ô đất từ 1 đến 4!', ephemeral: true });
                    const plot = eco.plots[plotIdx];
             case 'kethon':
                const targetUser = interaction.options.getUser('nguoi_ay');
                if (targetUser.bot || targetUser.id === userId) return interaction.reply({ content: 'Không thể cưới bot hoặc chính mình được!', ephemeral: true });
                if (marriages.has(userId) || marriages.has(targetUser.id)) return interaction.reply({ content: 'Một trong hai người đã có gia đình mất rồi!', ephemeral: true });
                marriages.set(userId, targetUser.id); marriages.set(targetUser.id, userId);
                await interaction.reply({ embeds: [createEmbed(0xFF69B4, '💍 KẾT HÔN LINH ĐÌNH', `Chúc mừng ${interaction.user} và ${targetUser} đã chính thức về chung một nhà!`, GIFS.kethon)] });
                break;

            case 'lyhon':
                if (!marriages.has(userId)) return interaction.reply({ content: 'Bồ đang độc thân vui tính mà ly hôn ai hả?', ephemeral: true });
                const partner = marriages.get(userId);
                marriages.delete(userId); marriages.delete(partner);
                await interaction.reply({ embeds: [createEmbed(0xED4245, '💔 LY HÔN THÀNH CÔNG', `Đường ai nấy đi, tình nghĩa đôi ta đến đây là hết!`, GIFS.lyhon)] });
                break;

            case 'taixiu':
                const txBet = interaction.options.getInteger('cuoc'); 
                const txChoice = interaction.options.getString('chon'); 
                if (!checkBet(txBet)) return;
                const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1, d3 = Math.floor(Math.random() * 6) + 1;
                const sum = d1 + d2 + d3;
                let txResult = (sum >= 11) ? 'tai' : 'xiu';
                if (txChoice === txResult) {
                    let winAmt = getBuffedAmount(userId, txBet);
                    eco.balance += winAmt;
                } else {
                    eco.balance -= txBet;
                }
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x2ECC71, '🎲 TÀI XỈU ĐỔI ĐỜI', `Kết quả xúc xắc: [${d1} - ${d2} - ${d3}] (Tổng: **${sum}**)\n👉 Bạn chọn: **${txChoice.toUpperCase()}** | Kết quả: **${txResult.toUpperCase()}**`, GIFS.taixiu)] });
                break;

            case 'oantuti':
                const ottBet = interaction.options.getInteger('cuoc');
                const ottChoice = interaction.options.getString('lua_chon');
                if (!checkBet(ottBet)) return;
                const choices = ['bua', 'bao', 'keo'];
                const botChoice = choices[Math.floor(Math.random() * choices.length)];
                
                let ottOutcome = '';
                if (ottChoice === botChoice) {
                    ottOutcome = '🤝 Hòa nhau! Hoàn lại tiền cược.';
                } else if (
                    (ottChoice === 'bua' && botChoice === 'keo') ||
                    (ottChoice === 'bao' && botChoice === 'bua') ||
                    (ottChoice === 'keo' && botChoice === 'bao')
                ) {
                    let rewardOtt = getBuffedAmount(userId, ottBet);
                    eco.balance += rewardOtt;
                    ottOutcome = `🎉 **BẠN THẮNG!** Nhận được +${rewardOtt.toLocaleString()} xu!`;
                } else {
                    eco.balance -= ottBet;
                    ottOutcome = `😢 **BẠN THUA!** Mất ${ottBet.toLocaleString()} xu!`;
                }
                saveUserData(userId, eco);
                const emojiMap = { bua: '✊ Búa', bao: '✋ Bao', keo: '✌️ Kéo' };
                await interaction.reply({ embeds: [createEmbed(0x3498DB, '✌️ OẲN TÙ TÌ', `Bạn chọn: **${emojiMap[ottChoice]}**\nBot chọn: **${emojiMap[botChoice]}**\n\n${ottOutcome}`, GIFS.oantuti)] });
                break;

            case 'slot':
                const slotBet = interaction.options.getInteger('cuoc');
                if (!checkBet(slotBet)) return;
                const symbols = ['🍎', '🍊', '🍋', '🍇', '💎', '7️⃣'];
                const s1 = symbols[Math.floor(Math.random() * symbols.length)];
                const s2 = symbols[Math.floor(Math.random() * symbols.length)];
                const s3 = symbols[Math.floor(Math.random() * symbols.length)];

                let slotMsg = '';
                if (s1 === s2 && s2 === s3) {
                    let jackpot = getBuffedAmount(userId, slotBet * 12);
                    eco.balance += jackpot;
                    slotMsg = `🔥 **JACKPOT! TRÚNG 3 Ô GIỐNG NHAU!** Nhận ngay **+${jackpot.toLocaleString()} xu**!`;
                } else if (s1 === s2 || s2 === s3 || s1 === s3) {
                    let normalWin = getBuffedAmount(userId, Math.floor(slotBet * 2.5));
                    eco.balance += normalWin;
                    slotMsg = `✨ **TRÚNG 2 Ô!** Nhận được **+${normalWin.toLocaleString()} xu**!`;
                } else {
                    eco.balance -= slotBet;
                    slotMsg = `❌ **TRƯỢT RỒI!** Mất ${slotBet.toLocaleString()} xu!`;
                }
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0xF1C40F, '🎰 QUAY HŨ SLOT MACHINE', `[ ${s1} | ${s2} | ${s3} ]\n\n${slotMsg}`, GIFS.slot)] });
                break;
             case 'avatarcheck':
                const targetAvatarUser = interaction.options.getUser('user') || interaction.user;
                await interaction.reply({ embeds: [createEmbed(0xE91E63, `🖼️ AVATAR: ${targetAvatarUser.username}`, `Soi avatar sắc nét thành công!`, targetAvatarUser.displayAvatarURL({ size: 1024, dynamic: true }), GIFS.avatarcheck)] });
                break;

            case 'gayrate':
                const targetGayUser = interaction.options.getUser('user') || interaction.user;
                const randomRate = Math.floor(Math.random() * 101);
                await interaction.reply({ embeds: [createEmbed(0x9C27B0, `🌈 MÁY ĐO ĐỘ BÓNG`, `${targetGayUser} độ bóng là: **${randomRate}%**!`, GIFS.gayrate)] });
                break;

            case 'hon':
            case 'om':
            case 'tat':
            case 'xoadau':
            case 'dam':
                const targetUserAction = interaction.options.getUser('user');
                const actionNameMap = { hon: 'hôn', om: 'ôm', tat: 'tát', xoadau: 'xoa đầu', dam: 'đấm' };
                const actionVerb = actionNameMap[interaction.commandName];
                await interaction.reply({ embeds: [createEmbed(0xFF69B4, `✨ HÀNH ĐỘNG TƯƠNG TÁC`, `${interaction.user} vừa **${actionVerb}** ${targetUserAction} rất tình cảm!`, GIFS[`action_${interaction.commandName}`])] });
                break;

            case 'khoc':
                await interaction.reply({ embeds: [createEmbed(0x3498DB, `😢 KHÓC LÓC`, `${interaction.user} đang khóc lóc ăn vạ vì tủi thân!`, GIFS.action_khoc)] });
                break;

            case 'nhay':
                await interaction.reply({ embeds: [createEmbed(0x57F287, `💃 NHẢY MÚA`, `${interaction.user} đang nhảy múa tưng bừng quẩy hết mình!`, GIFS.action_nhay)] });
                break;

            case 'thachdu':
                const targetPvP = interaction.options.getUser('doi_thu');
                const pvpBet = interaction.options.getInteger('cuoc');
                if (targetPvP.bot || targetPvP.id === userId) return interaction.reply({ content: 'Không thể thách đấu bot hoặc chính mình!', ephemeral: true });
                if (!checkBet(pvpBet)) return;
                let targetEco = getUserData(targetPvP.id);
                if (targetEco.balance < pvpBet) return interaction.reply({ content: 'Đối thủ không đủ tiền để tham gia mức cược này!', ephemeral: true });
                
                eco.balance -= pvpBet;
                targetEco.balance -= pvpBet;
                
                let pvpWin = Math.random() > 0.5;
                let totalPot = pvpBet * 2;
                if (pvpWin) {
                    eco.balance += totalPot;
                    saveUserData(userId, eco); saveUserData(targetPvP.id, targetEco);
                    await interaction.reply({ embeds: [createEmbed(0x57F287, '⚔️ ĐẤU TRƯỜNG PVP', `Bạn đã hạ gục ${targetPvP} trong trận chiến kịch tính và gom về **+${totalPot.toLocaleString()} xu** tiền cược!`, GIFS.thachdu)] });
                } else {
                    targetEco.balance += totalPot;
                    saveUserData(userId, eco); saveUserData(targetEco.id, targetEco);
                    await interaction.reply({ embeds: [createEmbed(0xED4245, '⚔️ ĐẤU TRƯỜNG PVP', `Bạn đã thua cuộc trước ${targetPvP} và mất trắng ${pvpBet.toLocaleString()} xu tiền cược!`, GIFS.thachdu)] });
                }
                break;

            case 'nhnhanh':
                const wordsList = ['discord', 'botgame', 'sieucap', 'thienlong', 'kyllan', 'laptrinh', 'python', 'javascript'];
                const secretWord = wordsList[Math.floor(Math.random() * wordsList.length)];
                await interaction.reply({ embeds: [createEmbed(0xF1C40F, '⚡ NHANH TAY LẸ MẮT', `Hãy gõ nhanh chính xác từ khóa sau vào chat trong 15 giây tới:\n👉 **${secretWord.toUpperCase()}**`, GIFS.nhnhanh)] });
                
                const filter = m => m.author.id === userId && m.content.toLowerCase() === secretWord;
                try {
                    await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
                    let rewardNh = 3000;
                    eco.balance += rewardNh;
                    saveUserData(userId, eco);
                    await interaction.followUp({ embeds: [createEmbed(0x57F287, '⚡ THÀNH CÔNG', `<@${userId}> đã nhanh tay gõ đúng từ khóa và nhận thưởng **+3,000 xu**!`, GIFS.nhnhanh)] });
                } catch (e) {
                    await interaction.followUp({ content: `<@${userId}> Hết giờ mất rồi, chậm chân quá bồ ơi!` });
                }
                break;

            case 'vongquay':
                const spinCost = 500;
                if (!checkBet(spinCost)) return;
                eco.balance -= spinCost;
                
                const prizes = [0, 200, 500, 1000, 2500, 5000, 15000, 50000];
                const weights = [40, 25, 15, 10, 6, 3, 0.9, 0.1];
                let randomVal = Math.random() * 100;
                let cumulative = 0;
                let wonPrize = 0;
                for (let i = 0; i < prizes.length; i++) {
                    cumulative += weights[i];
                    if (randomVal <= cumulative) {
                        wonPrize = prizes[i];
                        break;
                    }
                }
                
                eco.balance += wonPrize;
                saveUserData(userId, eco);
                await interaction.reply({ embeds: [createEmbed(0x9B59B6, '🎡 VÒNG QUAY MAY MẮN', `Chiếc vòng quay dừng lại ở ô: **+${wonPrize.toLocaleString()} xu**!\n*(Phí quay: 500 xu)*`, GIFS.vongquay)] });
                break;
        }
    } catch (err) {
        console.error(err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Đã xảy ra lỗi khi thực thi lệnh!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
if (!plot.pl
