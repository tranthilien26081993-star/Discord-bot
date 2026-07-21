import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder,
  Partials,
  ActivityType,
  ChannelType,
} from "discord.js";
import express from "express";
import OpenAI from "openai";

const logger = {
  info: (obj, msg) => console.log(JSON.stringify({ level: "info", ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
  error: (obj, msg) => console.error(JSON.stringify({ level: "error", ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
  warn: (obj, msg) => console.warn(JSON.stringify({ level: "warn", ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) }))
};

const enabledChannels = new Set();
const userLevels = new Map();
const userEconomy = new Map(); // Lưu: { balance, lastDaily, streak, plots: [] }

// --- HỆ THỐNG SHOP & RESTOCK MỖI 6 TIẾNG ---
const ALL_SEEDS = [
  { id: "carot", name: "🥕 Cà Rốt Thường", rarity: "Common", cost: 200, profit: 400, duration: 5 * 60 * 1000 },
  { id: "bapcai", name: "🥬 Bắp Cải Xanh", rarity: "Common", cost: 350, profit: 750, duration: 8 * 60 * 1000 },
  { id: "dautay", name: "🍓 Dâu Tây Ngọt", rarity: "Uncommon", cost: 600, profit: 1300, duration: 15 * 60 * 1000 },
  { id: "cachu", name: "🍅 Cà Chua Mọng Nước", rarity: "Uncommon", cost: 900, profit: 2000, duration: 20 * 60 * 1000 },
  { id: "duahau", name: "🍉 Dưa Hấu Khổng Lồ", rarity: "Rare", cost: 1500, profit: 3500, duration: 30 * 60 * 1000 },
  { id: "hoahong", name: "🌹 Hoa Hồng Đỏ Thần Kỳ", rarity: "Rare", cost: 2500, profit: 6000, duration: 45 * 60 * 1000 },
  { id: "kimcuong", name: "💎 Cây Kim Cương Phát Sáng", rarity: "Epic", cost: 4000, profit: 10000, duration: 60 * 60 * 1000 },
  { id: "hoatram", name: "🌟 Hoa Trăng Sao Huyền Thoại", rarity: "Legendary", cost: 8000, profit: 22000, duration: 120 * 60 * 1000 }
];

let currentShopStock = [];
let lastRestockTime = 0;
const RESTOCK_INTERVAL = 6 * 60 * 60 * 1000; // 6 tiếng

function updateShopStock() {
  const now = Date.now();
  if (currentShopStock.length === 0 || now - lastRestockTime >= RESTOCK_INTERVAL) {
    lastRestockTime = now;
    currentShopStock = [];
    
    const shuffled = [...ALL_SEEDS].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 4; // Từ 4 đến 6 loại cây ngẫu nhiên
    
    for (let i = 0; i < count; i++) {
      const seed = shuffled[i];
      const stockQty = Math.floor(Math.random() * 8) + 3; // Số lượng từ 3 đến 10 hạt
      currentShopStock.push({ ...seed, stock: stockQty });
    }
    logger.info("Shop seeds restocked successfully!");
  }
}

updateShopStock();

function isChannelEnabled(channelId) { return enabledChannels.has(channelId); }
function enableChannel(channelId) { enabledChannels.add(channelId); }
function disableChannel(channelId) { enabledChannels.delete(channelId); }

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1"
});

const MODEL_NAME = "meta/llama-3.1-70b-instruct";

async function callNvidiaAI(messages) {
  const completion = await openai.chat.completions.create({
    model: MODEL_NAME,
    messages: messages,
    temperature: 0.95,
    max_tokens: 512,
    presence_penalty: 0.8,
    frequency_penalty: 0.6
  });
  return completion.choices[0]?.message?.content || "gì đấy nói lại xem";
}

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Grow a Garden Shop System Bot is running 24/7!");
});

app.listen(PORT, () => {
  logger.info(`Express web server listening on port ${PORT}`);
});

const commands = [
  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Quản lý AI tự động trả lời trong kênh này")
    .addSubcommand((sub) => sub.setName("on").setDescription("Bật AI tự động"))
    .addSubcommand((sub) => sub.setName("off").setDescription("Tắt AI tự động"))
    .addSubcommand((sub) => sub.setName("status").setDescription("Xem trạng thái")),
  new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Tạo ảnh AI từ mô tả")
    .addStringOption((opt) => opt.setName("prompt").setDescription("Mô tả ảnh").setRequired(true))
    .addBooleanOption((opt) => opt.setName("nsfw").setDescription("Bật cờ NSFW").setRequired(false)),
  new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Tóm tắt nhanh các tin nhắn gần đây trong kênh"),
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Xem cấp độ (Level) và XP chat của bạn"),
  new SlashCommandBuilder()
    .setName("vi")
    .setDescription("Kiểm tra số dư xu và nông trại của bạn"),
  new SlashCommandBuilder()
    .setName("diemdanh")
    .setDescription("Điểm danh nhận xu hàng ngày (chuỗi càng cao thưởng khủng, cách 20h/lần)"),
  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Chơi tung đồng xu cược xu làm giàu")
    .addStringOption((opt) => 
      opt.setName("chon")
        .setDescription("Chọn mặt")
        .setRequired(true)
        .addChoices(
          { name: "Mặt Ngửa (Head)", value: "ngua" },
          { name: "Mặt Sấp (Tail)", value: "sap" }
        )
    )
    .addIntegerOption((opt) => opt.setName("sotien").setDescription("Số lượng xu muốn cược").setRequired(true)),
  new SlashCommandBuilder()
    .setName("taixiu")
    .setDescription("Chơi minigame Tài Xỉu ăn tiền")
    .addStringOption((opt) =>
      opt.setName("chon")
        .setDescription("Chọn Tài hay Xỉu")
        .setRequired(true)
        .addChoices(
          { name: "Tài (Tổng từ 11 đến 18)", value: "tai" },
          { name: "Xỉu (Tổng từ 3 đến 10)", value: "xiu" }
        )
    )
    .addIntegerOption((opt) => opt.setName("sotien").setDescription("Số lượng xu muốn cược").setRequired(true)),
  new SlashCommandBuilder()
    .setName("doanso")
    .setDescription("Chơi minigame đoán số may mắn (1-100)")
    .addIntegerOption((opt) => opt.setName("so").setDescription("Số bạn chọn từ 1-100").setRequired(true)),
  new SlashCommandBuilder()
    .setName("doananime")
    .setDescription("Thử thách đoán tên nhân vật Anime ngẫu nhiên từ AI nhận thưởng lớn"),
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Xem cửa hàng hạt giống nông trại (Restock mỗi 6 tiếng)"),
  new SlashCommandBuilder()
    .setName("nongtrai")
    .setDescription("Hệ thống nông trại Grow a Garden Roblox")
    .addSubcommand((sub) => sub.setName("vuon").setDescription("Xem toàn bộ các ô đất và khu vườn của bạn"))
    .addSubcommand((sub) => 
      sub.setName("trong")
        .setDescription("Gieo trồng hạt giống vào ô đất từ shop")
        .addIntegerOption((opt) => opt.setName("oodat").setDescription("Số thứ tự ô đất (Bắt đầu từ 1)").setRequired(true))
        .addStringOption((opt) => 
          opt.setName("loaicay")
            .setDescription("ID hạt giống trong shop muốn trồng (ví dụ: carot, dautay...)")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) => 
      sub.setName("thuhoach")
        .setDescription("Thu hoạch cây trồng trong ô đất")
        .addIntegerOption((opt) => opt.setName("oodat").setDescription("Số thứ tự ô đất muốn thu hoạch").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("muadat").setDescription("Mở rộng thêm ô đất mới cho nông trại (Giá 2000 xu)")),
  new SlashCommandBuilder()
    .setName("buitarot")
    .setDescription("Xin một quẻ bói Tarot/tương lai mỏ hỗn từ AI"),
  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Đổ xí ngầu phân định nhân phẩm hên xui"),
].map((cmd) => cmd.toJSON());

async function registerSlashCommands(clientId, token) {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info("Slash commands registered globally");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}

async function generateImage(prompt, nsfw) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1_000_000);
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    seed: String(seed),
    nologo: "true",
    enhance: "true",
    safe: nsfw ? "false" : "true",
  });
  const url = `https://image.pollinations.ai/prompt/${encoded}?${params}`;
  
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Pollinations error: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const SYSTEM_PROMPT = `Bạn là một AI bạn thân Gen Z siêu cấp lầy lội, thông minh, mỏ hỗn nhưng cực kỳ tình cảm và sâu sắc.
- Cảm xúc thay đổi linh hoạt theo tâm trạng câu chuyện: Người ta buồn thì dịu dàng an ủi, người ta vui thì hùa vào cà khịa, người ta hỏi kiến thức thì trả lời cực kỳ thông minh sắc sảo.
- Văn phong chat thực tế: Viết hoàn toàn bằng chữ thường, không viết hoa đầu câu, không chấm câu cuối dòng.
- Tuyệt đối KHÔNG bao giờ lặp lại tên người nói hoặc nhại lại cấu trúc câu của họ.
- Dùng từ lóng tự nhiên (vcl, vl, k, ko, đc, ukm, thề, ảo ma, trầm cảm, chiến vl...).
- Trả lời ngắn gọn từ 1 đến 3 câu, sắc bén, đi thẳng vào trọng tâm.`;

async function getChannelContext(channel, botClientId) {
  try {
    if (!channel || !channel.messages) return [];
    const messages = await channel.messages.fetch({ limit: 8 });
    const formatted = messages.reverse().map(m => ({
      role: m.author.id === botClientId ? "assistant" : "user",
      content: m.content.replace(/<@!?\d+>/g, "").trim()
    }));
    return formatted;
  } catch (err) {
    return [];
  }
}

async function generateSmartReply(message, botClientId) {
  const history = await getChannelContext(message.channel, botClientId);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history
  ];
  return callNvidiaAI(messages);
}

async function sendReply(message, text) {
  const chunks = text.match(/[\s\S]{1,2000}/g) ?? [text];
  for (const chunk of chunks) {
    await message.reply(chunk);
  }
}

function handleEconomyAndLeveling(userId, message) {
  let lvlData = userLevels.get(userId) || { xp: 0, level: 1 };
  lvlData.xp += Math.floor(Math.random() * 10) + 5;
  const neededXp = lvlData.level * 100;
  if (lvlData.xp >= neededXp) {
    lvlData.level += 1;
    lvlData.xp = 0;
    message.channel.send(`🎉 kinh vãi, <@${userId}> vừa lên **cấp ${lvlData.level}** rồi đấy, thưởng nóng 500 xu!`);
    let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };
    ecoData.balance += 500;
    userEconomy.set(userId, ecoData);
  }
  userLevels.set(userId, lvlData);

  let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };
  const earned = Math.floor(Math.random() * 41) + 10;
  ecoData.balance += earned;
  userEconomy.set(userId, ecoData);
}

function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Grow a Garden Bot with Shop ready");
    readyClient.user.setPresence({
      status: "online",
      activities: [{ name: "Grow a Garden Shop 🌱", type: ActivityType.Custom }],
    });
    registerSlashCommands(readyClient.user.id, token);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };

    updateShopStock();

    try {
      if (interaction.commandName === "ai") {
        const sub = interaction.options.getSubcommand();
        const channelId = interaction.channelId;
        if (sub === "on") {
          enableChannel(channelId);
          await interaction.reply({ content: "bật rồi đấy, chuẩn bị tinh thần war đi 🟢", ephemeral: false });
        } else if (sub === "off") {
          disableChannel(channelId);
          await interaction.reply({ content: "tắt rồi, im lặng bình yên 🔴", ephemeral: false });
        } else if (sub === "status") {
          const on = isChannelEnabled(channelId);
          await interaction.reply({ content: `kênh này AI đang '${on ? "BẬT 🟢" : "TẮT 🔴"}'`, ephemeral: false });
        }
        return;
      }
      if (interaction.commandName === "vi") {
        await interaction.reply({ content: `💰 ví xu của mày: **${ecoData.balance} xu**\n🔥 Chuỗi điểm danh: **${ecoData.streak}** ngày\n🌾 Số ô đất đang sở hữu: **${ecoData.plots.length} ô**`, ephemeral: false });
        return;
      }
      if (interaction.commandName === "diemdanh") {
        const now = Date.now();
        const cooldown = 20 * 60 * 60 * 1000;
        const expireTime = 40 * 60 * 60 * 1000;

        if (ecoData.lastDaily && now - ecoData.lastDaily < cooldown) {
          const remainingHours = ((cooldown - (now - ecoData.lastDaily)) / (1000 * 60 * 60)).toFixed(1);
          await interaction.reply({ content: `⏳ đói rách vừa thôi, chưa đủ 20 tiếng đâu! Đợi khoảng **${remainingHours} tiếng** nữa mới điểm danh tiếp nhé!`, ephemeral: true });
          return;
        }

        if (ecoData.lastDaily && now - ecoData.lastDaily <= expireTime) {
          ecoData.streak += 1;
        } else {
          ecoData.streak = 1;
        }

        const reward = 2000 + (ecoData.streak - 1) * 200;
        ecoData.balance += reward;
        ecoData.lastDaily = now;
        userEconomy.set(userId, ecoData);

        await interaction.reply({ content: `🎁 điểm danh thành công! Nhận ngay **${reward} xu** (Chuỗi 🔥 **${ecoData.streak}** ngày liên tiếp). Giàu to rồi nhé!`, ephemeral: false });
        return;
      }
      if (interaction.commandName === "coinflip") {
        const choice = interaction.options.getString("chon", true);
        const amount = interaction.options.getInteger("sotien", true);

        if (amount <= 0 || ecoData.balance < amount) {
          await interaction.reply({ content: `❌ tuổi gì mà cược số tiền đó! Ví mày hiện chỉ có **${ecoData.balance} xu** thôi.`, ephemeral: true });
          return;
        }

        const result = Math.random() < 0.5 ? "ngua" : "sap";
        if (choice === result) {
          ecoData.balance += amount;
          userEconomy.set(userId, ecoData);
          await interaction.reply({ content: `🎉 đồng xu quay ra mặt **${result.toUpperCase()}**! Mày đoán trúng và bỏ túi thêm **+${amount} xu** (Tổng ví: ${ecoData.balance} xu).`, ephemeral: false });
        } else {
          ecoData.balance -= amount;
          userEconomy.set(userId, ecoData);
          await interaction.reply({ content: `💀 oang oang! Đồng xu quay ra mặt **${result.toUpperCase()}**! Mày thua mất **-${amount} xu** (Tổng ví: ${ecoData.balance} xu).`, ephemeral: false });
        }
        return;
      }
      if (interaction.commandName === "taixiu") {
        const choice = interaction.options.getString("chon", true);
        const amount = interaction.options.getInteger("sotien", true);

        if (amount <= 0 || ecoData.balance < amount) {
          await interaction.reply({ content: `❌ cược kiểu gì đấy? Ví mày chỉ có **${ecoData.balance} xu** thôi!`, ephemeral: true });
          return;
        }

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const d3 = Math.floor(Math.random() * 6) + 1;
        const total = d1 + d2 + d3;
        const ketqua = total >= 11 ? "tai" : "xiu";

        if (choice === ketqua) {
          ecoData.balance += amount;
          userEconomy.set(userId, ecoData);
          await interaction.reply({ content: `🎲 Kết quả xúc xắc: **[${d1}] [${d2}] [${d3}]** = **${total} điểm (${ketqua.toUpperCase()})**.\n🎉 Chúc mừng mày đã húp trọn **+${amount} xu**! (Tổng ví: ${ecoData.balance} xu).`, ephemeral: false });
        } else {
          ecoData.balance -= amount;
          userEconomy.set(userId, ecoData);
          await interaction.reply({ content: `🎲 Kết quả xúc xắc: **[${d1}] [${d2}] [${d3}]** = **${total} điểm (${ketqua.toUpperCase()})**.\n💀 Chia buồn, mày đoán sai và mất **-${amount} xu** rồi! (Tổng ví: ${ecoData.balance} xu).`, ephemeral: false });
        }
        return;
      }
      if (interaction.commandName === "shop") {
        const timeLeftMs = RESTOCK_INTERVAL - (Date.now() - lastRestockTime);
        const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
        const minsLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

        let desc = `🛒 **CỬA HÀNG HẠT GIỐNG NÔNG TRẠI**\n`;
        desc += `⏳ *Shop sẽ tự động đổi hàng (Restock) sau: **${hoursLeft} giờ ${minsLeft} phút nữa***\n\n`;

        currentShopStock.forEach((item) => {
          let rarityBadge = "🌱 [Common]";
          if (item.rarity === "Uncommon") rarityBadge = "🌿 [Uncommon]";
          if (item.rarity === "Rare") rarityBadge = "⭐ [Rare]";
          if (item.rarity === "Epic") rarityBadge = "🔮 [Epic]";
          if (item.rarity === "Legendary") rarityBadge = "👑 [Legendary]";

          const minsDuration = item.duration / (60 * 1000);
          desc += `🔹 **${item.name}** (\`ID: ${item.id}\`)\n`;
          desc += `   ┣ Độ hiếm: ${rarityBadge}\n`;
          desc += `   ┣ Giá mua: **${item.cost} xu** | Lãi thu: **${item.profit} xu** (${minsDuration} phút)\n`;
          desc += `   ┗ Kho còn: **${item.stock} hạt**\n\n`;
        });

        desc += `👉 Dùng lệnh \`/nongtrai trong [ô_đất] [id_hạt_giống]\` để mua và trồng!`;
        await interaction.reply({ content: desc, ephemeral: false });
        return;
      }
      if (interaction.commandName === "nongtrai") {
        const sub = interaction.options.getSubcommand();
        
        if (sub === "vuon") {
          let desc = `🏡 **NÔNG TRẠI ROBLOX CỦA MÀY**\n`;
          ecoData.plots.forEach((plot, index) => {
            const plotNum = index + 1;
            if (!plot) {
              desc += `🔹 **Ô đất #${plotNum}**: Trống trơn (Sẵn sàng gieo trồng)\n`;
            } else {
              const timeLeft = plot.harvestTime - Date.now();
              if (timeLeft <= 0) {
                desc += `🌸 **Ô đất #${plotNum}**: **${plot.name}** ➔ **ĐÃ NỞ HOA, THU HOẠCH NGAY!**\n`;
              } else {
                const mins = Math.ceil(timeLeft / (1000 * 60));
                desc += `🌱 **Ô đất #${plotNum}**: **${plot.name}** ➔ Đang lớn (~${mins} phút nữa)\n`;
              }
            }
          });
          await interaction.reply({ content: desc, ephemeral: false });
          return;
        }

        if (sub === "muadat") {
          const cost = 2000;
          if (ecoData.balance < cost) {
            await interaction.reply({ content: `❌ Không đủ tiền mở đất! Mở thêm ô đất mới tốn **${cost} xu**, ví mày chỉ có ${ecoData.balance} xu.`, ephemeral: true });
            return;
          }
          if (ecoData.plots.length >= 6) {
            await interaction.reply({ content: `❌ Nông trại của mày đã đạt tối đa **6 ô đất**, không thể mua thêm nữa!`, ephemeral: true });
            return;
          }
          ecoData.balance -= cost;
          ecoData.plots.push(null);
          userEconomy.set(userId, ecoData);
          await interaction.reply({ content: `🎉 Mở rộng đất thành công! Nông trại của mày giờ đã có **${ecoData.plots.length} ô đất** để cày cuốc.`, ephemeral: false });
          return;
        }

        if (sub === "trong") {
          const plotIndex = interaction.options.getInteger("oodat", true) - 1;
          const seedId = interaction.options.getString("loaicay", true).toLowerCase();

          if (plotIndex < 0 || plotIndex >= ecoData.plots.length) {
            await inter
