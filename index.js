
import {
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
    EmbedBuilder, AttachmentBuilder, Partials, ActivityType,
    ChannelType, Events
} from 'discord.js';
import express from 'express';
import OpenAI from 'openai';

// Express keep-alive server
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));

const logger = {
    warn: (obj, msg) => console.warn(JSON.stringify({ level: 'warn', ...((typeof obj === 'string') ? { msg: obj } : { ...obj, msg }) }))
};

const aiChannels = new Set();
const userLevels = new Map();
const userEconomy = new Map();

function enableChannel(channelId) { aiChannels.add(channelId); }
function disableChannel(channelId) { aiChannels.delete(channelId); }
function isChannelEnabled(channelId) { return aiChannels.has(channelId); }

const ALL_SEEDS = [
    { id: 'carot', name: 'đŸ¥• Cá»§ RĂ³t ThÆ°á»ng', rarity: 'Common', cost: 200, profit: 400, duration: 5 * 60 * 1000 },
    { id: 'bapcas', name: 'đŸŒ½ Báº¯p Cáº£i Xanh', rarity: 'Common', cost: 350, profit: 750, duration: 8 * 60 * 1000 },
    { id: 'dautay', name: 'đŸ“ DĂ¢u TĂ¢y Ngá»t', rarity: 'Uncommon', cost: 600, profit: 1300, duration: 15 * 60 * 1000 },
    { id: 'cachua', name: 'đŸ… CĂ  Chua Mong NÆ°á»›c', rarity: 'Rare', cost: 900, profit: 2000, duration: 20 * 60 * 1000 },
    { id: 'duahau', name: 'đŸ‰ DÆ°a Háº¥u Khá»•ng Lá»“', rarity: 'Rare', cost: 1500, profit: 3500, duration: 30 * 60 * 1000 },
    { id: 'hoahong', name: 'đŸŒ¹ Hoa Há»“ng BĂ­ Tháº©n', rarity: 'Rare', cost: 2500, profit: 6000, duration: 45 * 60 * 1000 },
    { id: 'kincuong', name: 'đŸ’ CĂ¢y Kim CÆ°Æ¡ng PhĂ¡t SĂ¡ng', rarity: 'Epic', cost: 4000, profit: 10000, duration: 60 * 60 * 1000 },
    { id: 'hoatran', name: 'âœ¨ Hoa Tráº¯ng Sao Huyá»n Thoáº¡i', rarity: 'Legendary', cost: 8000, profit: 22000, duration: 120 * 60 * 1000 }
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
    { name: 'đŸŸ CĂ¡ RĂ´ Phi', price: 120, rarity: 'Common' },
    { name: 'đŸ  CĂ¡ ChĂ©p VĂ ng', price: 300, rarity: 'Uncommon' },
    { name: 'đŸ¡ CĂ¡ NĂ³c PhĂ¬nh', price: 650, rarity: 'Rare' },
    { name: 'đŸ¦ˆ CĂ¡ Máº­p Con', price: 1800, rarity: 'Epic' },
    { name: 'đŸ‹ CĂ¡ Voi Xanh Huyá»n Thoáº¡i', price: 6000, rarity: 'Legendary' }
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
const SYSTEM_PROMPT = 'Báº¡n lĂ  má»™t AI báº£n thĂ¢n Gen Z siĂªu cáº¥p láº§y lá»™i, thĂ´ng minh, má» há»—n ká»³ tĂ¬nh cáº£m. Viáº¿t hoĂ n toĂ n báº±ng chá»¯ thÆ°á»ng, khĂ´ng viáº¿t hoa Ä‘áº§u cĂ¢u, khĂ´ng cháº¥m cĂ¢u cuá»‘i dĂ²ng.';

async function callNvidiaAI(messages) {
    try {
        const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
            temperature: 0.8,
            max_tokens: 512
        });
        return completion.choices[0]?.message?.content || 'hĂ´ng biáº¿t nĂ³i gĂ¬ luĂ´n Ă¡ ngÆ¡ ngĂ¡c chĂ­t Ä‘Ăºm :v';
    } catch (e) {
        logger.warn(e, 'Nvidia AI error');
        return 'máº¡ng lag quĂ¡ bá»£n Ăªi, tá»« tá»« háºµng rĂ©o :v';
    }
}

async function generateImage(prompt, nsfw = false) {
    try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
            method: 'POST',
        });
        return null;
    } catch (e) {
        return null;
    }
}

const ANIME_LIST = [
    { name: 'Monkey D. Luffy', hint: 'Thuyá»n trÆ°á»Ÿng mÅ© rÆ¡m, thĂ­ch Äƒn thá»‹t vĂ  cĂ³ Æ°á»›c mÆ¡ lĂ m Vua Háº£i TĂ¡c' },
    { name: 'Naruto Uzumaki', hint: 'Ninja lĂ ng LĂ¡, cĂ³ Cá»­u VÄ© bĂªn trong vĂ  miá»‡ng hĂ´ "Battebayo"' },
    { name: 'Sasuke Uchiha', hint: 'ThiĂªn tĂ i tá»™c Uchiha, sá»Ÿ há»¯u Ä‘Ă´i máº¯t Sharingan' },
    { name: 'Zoro Roronoa', hint: 'Kiáº¿m sÄ© phĂ¡i tam kiáº¿m, ná»•i tiáº¿ng vá»›i ká»¹ nÄƒng "mĂ¹ Ä‘Æ°á»ng"' },
    { name: 'Saitama', hint: 'Anh hĂ¹ng Ä‘áº§u trá»c Ä‘áº¥m phĂ¡t cháº¿t luĂ´n má»™t káº» Ä‘á»‹ch' },
    { name: 'Eren Yeager', hint: 'NhĂ¢n váº­t chĂ­nh Attack on Titan vá»›i khĂ¡t vá»ng tá»± do chĂ¡y bá»ng' },
    { name: 'Levi Ackerman', hint: 'Äá»™i trÆ°á»Ÿng chiáº¿n binh máº¡nh nháº¥t nhĂ¢n loáº¡i, cuá»“ng sáº¡ch sáº½' },
    { name: 'Light Yagami', hint: 'Há»c sinh thiĂªn tĂ i nháº·t Ä‘Æ°á»£c cuá»‘n sá»• tá»­ tháº§n Death Note' },
    { name: 'Anya Forger', hint: 'CĂ´ bĂ© Ä‘á»c Ä‘Æ°á»£c suy nghÄ©, thĂ­ch Äƒn dÆ°a phĂ³ng vĂ  biá»ƒu cáº£m "Heh"' },
    { name: 'Loid Forger', hint: 'Äiá»‡p viĂªn Ä‘á»‰nh cao cĂ³ máº­t danh "Twilight"' },
    { name: 'Yor Forger', hint: 'SĂ¡t thá»§ khĂ©t tiáº¿ng vá»›i máº­t danh "ThÆ°á»ng CĂ´ng ChĂºa"' },
    { name: 'Denji', hint: 'Thá»£ sÄƒn quá»· nghĂ¨o khá»•, cĂ³ Æ°á»›c mÆ¡ cá»±c ká»³ máº·n mĂ²i' },
    { name: 'Power', hint: 'Quá»· mĂ¡u ngáº¡o man, báº¡n thĂ¢n cá»§a Denji' },
    { name: 'Makima', hint: 'SÄ© quan cáº¥p cao Ä‘iá»u khiá»ƒn Chiáº¿n Há»¯u Ă¡c quá»· quyá»n lá»±c' },
    { name: 'Katsuki Bakugo', hint: 'Thiáº¿u gia ná»• tung cĂ¡ tĂ­nh máº¡nh, báº¡n thá»i thÆ¡ áº¥u cá»§a Deku' },
    { name: 'Midoriya Izuku', hint: 'Cáº­u bĂ© vĂ´ nÄƒng nháº­n láº¡i sá»©c máº¡nh One For All tá»« All Might' },
    { name: 'Jotaro Kujo', hint: 'ChĂ ng trai ngáº§u lĂ²i vá»›i Stand Star Platinum vĂ  cĂ¢u cá»­a miá»‡ng "Yare yare daze"' },
    { name: 'Nezuko Kamado', hint: 'CĂ´ em gĂ¡i hĂ³a quá»· ngáº­m á»‘ng tre Ä‘Ă¡ng yĂªu' },
    { name: 'Rem', hint: 'CĂ´ háº§u gĂ¡i tĂ³c xanh trung thĂ nh trong Re:Zero' },
    { name: 'Kaneki Ken', hint: 'ChĂ ng trai bĂ¡n hoa sinh viĂªn hĂ³a thĂ nh bĂ¡n quá»· máº¯t má»™t' },
    { name: 'Killua Zoldyck', hint: 'SĂ¡t thá»§ thiĂªn tĂ i tĂ³c báº¡c xuáº¥t thĂ¢n tá»« gia Ä‘Ă¬nh Zoldyck' }
];

const commands = [
    new SlashCommandBuilder().setName('ai').setDescription('Báº­t/táº¯t cháº¿ Ä‘á»™ AI tá»± Ä‘á»™ng').addSubcommand(sub => sub.setName('on').setDescription('Báº­t AI')).addSubcommand(sub => sub.setName('off').setDescription('Táº¯t AI')).addSubcommand(sub => sub.setName('status').setDescription('Kiá»ƒm tra tráº¡ng thĂ¡i AI')),
    new SlashCommandBuilder().setName('vi').setDescription('Kiá»ƒm tra tiá»n, cáº§n cĂ¢u vĂ  nĂ´ng tráº¡i'),
    new SlashCommandBuilder().setName('diandanh').setDescription('Äiá»ƒm danh nháº­n xu hĂ ng ngĂ y'),
    new SlashCommandBuilder().setName('chuyenxu').setDescription('Chuyá»ƒn xu cho ngÆ°á»i chÆ¡i khĂ¡c').addUserOption(opt => opt.setName('nguoinhan').setDescription('NgÆ°á»i nháº­n').setRequired(true)).addIntegerOption(opt => opt.setName('sotien').setDescription('Sá»‘ tiá»n chuyá»ƒn').setRequired(true)),
    new SlashCommandBuilder().setName('coinflip').setDescription('ChÆ¡i tung Ä‘á»“ng xu cÆ°á»£c xu').addStringOption(opt => opt.setName('chon').setDescription('Chá»n máº·t').setRequired(true).addChoices({ name: 'Máº·t Ngá»­a (Ngá»­a)', value: 'ngua' }, { name: 'Máº·t Sáº¥p', value: 'sap' })),
    new SlashCommandBuilder().setName('doanso').setDescription('ÄoĂ¡n sá»‘ may máº¯n tá»« 1 Ä‘áº¿n 100').addIntegerOption(opt => opt.setName('so').setDescription('Nháº­p sá»‘ cá»§a báº¡n').setRequired(true)),
    new SlashCommandBuilder().setName('doananime').setDescription('Minigame Ä‘oĂ¡n tĂªn nhĂ¢n váº­t Anime siĂªu vui'),
    new SlashCommandBuilder().setName('dice').setDescription('Äá»• xĂ­ ngáº§u giáº£i trĂ­'),
    new SlashCommandBuilder().setName('slot').setDescription('Quay hÅ© Slot Machine sÄƒn Jackpot Ä‘á»•i Ä‘á»i').addIntegerOption(opt => opt.setName('sotien').setDescription('Sá»‘ xu cÆ°á»£c quay').setRequired(true)),
    new SlashCommandBuilder().setName('baucua').setDescription('TrĂ² chÆ¡i dĂ¢n gian Báº§u CÆ°a TĂ´m CĂ¡ truyá»n thá»‘ng').addStringOption(opt => opt.setName('chon').setDescription('Chá»n linh váº­t cÆ°á»£c').setRequired(true).addChoices({ name: 'đŸŒ¿ Báº§u', value: 'bau' }, { name: 'đŸ¦€ Cua', value: 'cua' }, { name: 'đŸ¦ TĂ´m', value: 'tom' }, { name: 'đŸŸ CĂ¡', value: 'ca' }, { name: 'đŸ“ GĂ ', value: 'ga' }, { name: 'đŸ¦Œ Nai', value: 'nai' })).addIntegerOption(opt => opt.setName('sotien').setDescription('Sá»‘ xu cÆ°á»£c').setRequired(true)),
    new SlashCommandBuilder().setName('shop').setDescription('Xem cá»­a hĂ ng háº¡t giá»‘ng nĂ´ng tráº¡i'),
    new SlashCommandBuilder().setName('nongtrai').setDescription('Há»‡ thá»‘ng quáº£n lĂ½ nĂ´ng tráº¡i Roblox').addSubcommand(sub => sub.setName('vuon').setDescription('Xem khu vÆ°á»n cá»§a báº¡n')).addSubcommand(sub => sub.setName('trong').setDescription('Trá»“ng háº¡t giá»‘ng').addIntegerOption(opt => opt.setName('oodat').setDescription('Sá»‘ thá»© tá»± Ă´ Ä‘áº¥t').setRequired(true)).addStringOption(opt => opt.setName('loaicay').setDescription('TĂªn háº¡t giá»‘ng').setRequired(true))).addSubcommand(sub => sub.setName('thuhoach').setDescription('Thu hoáº¡ch cĂ¢y trá»“ng').addIntegerOption(opt => opt.setName('oodat').setDescription('Sá»‘ thá»© tá»± Ă´ Ä‘áº¥t').setRequired(true))).addSubcommand(sub => sub.setName('muadat').setDescription('Má»Ÿ rá»™ng thĂªm Ă´ Ä‘áº¥t (2000 xu)'))
].map(c => c.toJSON());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
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
                const embed = new EmbedBuilder().setColor(0x00FF00).setDescription('đŸŸ¢ ÄĂ£ báº­t cháº¿ Ä‘á»™ AI tá»± Ä‘á»™ng trong kĂªnh nĂ y!');
                await interaction.reply({ embeds: [embed] });
            } else if (sub === 'off') {
                disableChannel(channelId);
                const embed = new EmbedBuilder().setColor(0xFF0000).setDescription('đŸ”´ ÄĂ£ táº¯t cháº¿ Ä‘á»™ AI tá»± Ä‘á»™ng trong kĂªnh nĂ y!');
                await interaction.reply({ embeds: [embed] });
            } else {
                const status = isChannelEnabled(channelId) ? 'Báº¬T đŸŸ¢' : 'Táº®T đŸ”´';
                const embed = new EmbedBuilder().setColor(0x00AEB6).setDescription(`đŸŒ Tráº¡ng thĂ¡i AI táº¡i kĂªnh nĂ y Ä‘ang: **${status}**`);
                await interaction.reply({ embeds: [embed] });
            }
        } else if (interaction.commandName === 'vi') {
            const embed = new EmbedBuilder()
                .setTitle(`đŸŒ¾ VĂ TIá»€N & NĂ”NG TRáº I Cá»¦A ${interaction.user.username.toUpperCase()}`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'đŸ’° Sá»‘ dÆ°', value: `${ecoData.balance.toLocaleString()} xu`, inline: true },
                    { name: 'đŸ”¥ Äiá»ƒm danh liĂªn tiáº¿p', value: `${ecoData.streak} ngĂ y`, inline: true },
                    { name: 'đŸŒ± Tá»•ng sá»‘ Ă´ Ä‘áº¥t', value: `${ecoData.plots.length}`, inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'diandanh') {
            const now = Date.now();
            const diff = now - ecoData.lastDaily;
            const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
            if (diff < 24 * 60 * 60 * 1000) {
                const embed = new EmbedBuilder().setColor(0xE74C3C).setTitle('âŒ ÄĂƒ ÄIá»‚M DANH Rá»’I').setDescription(`Báº¡n Ä‘Ă£ nháº­n quĂ  hĂ´m nay rá»“i. Vui lĂ²ng quay láº¡i sau khoáº£ng **${hoursLeft} giá»** ná»¯a nhĂ©!`);
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            ecoData.balance += 500;
            ecoData.lastDaily = now;
            ecoData.streak += 1;
            userEconomy.set(userId, ecoData);
            const embed = new EmbedBuilder().setColor(0x00FF00).setTitle('đŸ ÄIá»‚M DANH THĂ€NH CĂ”NG').setDescription(`Nháº­n ngay **500 xu** vĂ o tĂ i khoáº£n! Chuá»—i Ä‘iá»ƒm danh: **${ecoData.streak} ngĂ y**.`);
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'coinflip') {
            const choice = interaction.options.getString('chon');
            const result = Math.random() < 0.5 ? 'ngua' : 'sap';
            const win = choice === result;
            ecoData.balance += win ? 200 : -200;
            userEconomy.set(userId, ecoData);
            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle('đŸª™ MINIGAME TUNG Äá»’NG XU')
                .addFields(
                    { name: 'đŸ¯ Báº¡n chá»n', value: choice.toUpperCase(), inline: true },
                    { name: 'đŸ² Káº¿t quáº£', value: result.toUpperCase(), inline: true },
                    { name: 'đŸ’° Káº¿t quáº£ tĂ i chĂ­nh', value: win ? 'đŸ‰ Tháº¯ng lá»›n **+200 xu**' : 'đŸ˜¢ Thua cÆ°á»£c **-200 xu**' }
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
                .setTitle('đŸ”¢ MINIGAME ÄOĂN Sá» MAY Máº®N')
                .addFields(
                    { name: 'đŸ¯ Sá»‘ báº¡n chá»n', value: `${guess}`, inline: true },
                    { name: 'đŸ¤« Con sá»‘ bĂ­ áº©n', value: `${secret}`, inline: true },
                    { name: 'đŸ† Káº¿t quáº£', value: win ? 'đŸ‰ ChĂ­nh xĂ¡c tuyá»‡t Ä‘á»‘i! Nháº­n ngay +5.000 xu!' : 'đŸ˜¢ Sai rá»“i! ChĂºc báº¡n may máº¯n láº§n sau.' }
                );
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'doananime') {
            await interaction.deferReply();
            const sel = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
            const startEmbed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle('đŸ† ÄOĂN TĂN NHĂ‚N Váº¬T ANIME')
                .setDescription(`đŸ’¡ Gá»£i Ă½: **${sel.hint}**

Nhanh tay chat tĂªn nhĂ¢n váº­t vĂ o kĂªnh trong **30 giĂ¢y** Ä‘á»ƒ nháº­n thÆ°á»Ÿng **1,000 xu**!`)
                .setFooter({ text: 'Há»‡ thá»‘ng Ä‘ang chá» cĂ¢u tráº£ lá»i tá»« cĂ¡c thĂ nh viĂªn...' });
            
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
                    .setTitle('đŸ‰ ÄOĂN ÄĂNG NHĂ‚N Váº¬T ANIME!')
                    .setDescription(`âœ… ChĂ­nh xĂ¡c! NhĂ¢n váº­t Ä‘Ă³ lĂ  **${sel.name}**.

đŸ† Xin chĂºc má»«ng <@${winnerId}> Ä‘Ă£ giĂ nh chiáº¿n tháº¯ng vĂ  nháº­n **1,000 xu**!`);
                
                await interaction.channel.send({ embeds: [winEmbed] });
            } catch (e) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x95A5A6)
                    .setTitle('â° Háº¾T GIá»œ!')
                    .setDescription(`KhĂ´ng ai Ä‘oĂ¡n Ä‘Ăºng Ä‘Ă¡p Ă¡n lĂ  **${sel.name}** cáº£.`);
                await interaction.channel.send({ embeds: [timeoutEmbed] });
            }
        } else if (interaction.commandName === 'dice') {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const sum = d1 + d2;
            const embed = new EmbedBuilder().setColor(0x3498DB).setTitle('đŸ² Káº¾T QUáº¢ XĂ NGáº¦U').setDescription(`XĂ­ ngáº§u ra: **[${d1}]** vĂ  **[${d2}]**
Tá»•ng Ä‘iá»ƒm: **${sum}**`);
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'slot') {
            const amount = interaction.options.getInteger('sotien');
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('âŒ Sá»‘ tiá»n cÆ°á»£c khĂ´ng há»£p lá»‡ hoáº·c vÆ°á»£t quĂ¡ sá»‘ dÆ°!')], ephemeral: true });
                return;
            }
            const symbols = ['đŸ’', 'đŸ‹', 'đŸ””', 'â­', 'đŸ’'];
            const s1 = symbols[Math.floor(Math.random() * symbols.length)];
            const s2 = symbols[Math.floor(Math.random() * symbols.length)];
            const s3 = symbols[Math.floor(Math.random() * symbols.length)];
            let mult = 0;
            if (s1 === s2 && s2 === s3) {
                mult = s1 === 'đŸ’' ? 10 : (s1 === 'â­' ? 7 : 5);
            } else if (s1 === s2 || s2 === s3 || s1 === s3) {
                mult = 1.5;
            }
            const winAmount = Math.floor(amount * mult);
            const win = mult > 0;
            ecoData.balance += win ? winAmount - amount : -amount;
            userEconomy.set(userId, ecoData);

            const embed = new EmbedBuilder()
                .setColor(win ? 0x2ECC71 : 0xE74C3C)
                .setTitle('đŸ° QUAY HÅ¨ SLOT MACHINE')
                .setDescription(`Slot: **[ ${s1} | ${s2} | ${s3} ]**

${win ? `đŸ‰ TrĂºng lá»›n há»‡ sá»‘ x${mult}! Nháº­n **+${winAmount.toLocaleString()} xu**` : 'đŸ˜¢ ChĂºc báº¡n may máº¯n láº§n sau, máº¥t tráº¯ng cÆ°á»£c!'}`);
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.commandName === 'baucua') {
            const choice = interaction.options.getString('chon');
            const amount = interaction.options.getInteger('sotien');
            if (amount <= 0 || ecoData.balance < amount) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('âŒ KhĂ´ng Ä‘á»§ sá»‘ dÆ° Ä‘á»ƒ Ä‘áº·t cÆ°á»£c báº§u cua!')], ephemeral: true });
                return;
     
