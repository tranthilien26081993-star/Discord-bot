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
const userEconomy = new Map();

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
const RESTOCK_INTERVAL = 6 * 60 * 60 * 1000;

function updateShopStock() {
  const now = Date.now();
  if (currentShopStock.length === 0 || now - lastRestockTime >= RESTOCK_INTERVAL) {
    lastRestockTime = now;
    currentShopStock = [];
    const shuffled = [...ALL_SEEDS].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 4;
    for (let i = 0; i < count; i++) {
      const seed = shuffled[i];
      const stockQty = Math.floor(Math.random() * 8) + 3;
      currentShopStock.push({ ...seed, stock: stockQty });
    }
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
  new SlashCommandBuilder().setName("ai").setDescription("Quản lý AI tự động trả lời trong kênh này")
    .addSubcommand((sub) => sub.setName("on").setDescription("Bật AI tự động"))
    .addSubcommand((sub) => sub.setName("off").setDescription("Tắt AI tự động"))
    .addSubcommand((sub) => sub.setName("status").setDescription("Xem trạng thái")),
  new SlashCommandBuilder().setName("imagine").setDescription("Tạo ảnh AI từ mô tả")
    .addStringOption((opt) => opt.setName("prompt").setDescription("Mô tả ảnh").setRequired(true))
    .addBooleanOption((opt) => opt.setName("nsfw").setDescription("Bật cờ NSFW").setRequired(false)),
  new SlashCommandBuilder().setName("summary").setDescription("Tóm tắt nhanh các tin nhắn gần đây trong kênh"),
  new SlashCommandBuilder().setName("rank").setDescription("Xem cấp độ (Level) và XP chat của bạn"),
  new SlashCommandBuilder().setName("vi").setDescription("Kiểm tra số dư xu và nông trại của bạn"),
  new SlashCommandBuilder().setName("diemdanh").setDescription("Điểm danh nhận xu hàng ngày"),
  new SlashCommandBuilder().setName("coinflip").setDescription("Chơi tung đồng xu cược xu")
    .addStringOption((opt) => opt.setName("chon").setDescription("Chọn mặt").setRequired(true)
      .addChoices({ name: "Mặt Ngửa", value: "ngua" }, { name: "Mặt Sấp", value: "sap" }))
    .addIntegerOption((opt) => opt.setName("sotien").setDescription("Số lượng xu").setRequired(true)),
  new SlashCommandBuilder().setName("taixiu").setDescription("Chơi minigame Tài Xỉu")
    .addStringOption((opt) => opt.setName("chon").setDescription("Chọn Tài/Xỉu").setRequired(true)
      .addChoices({ name: "Tài", value: "tai" }, { name: "Xỉu", value: "xiu" }))
    .addIntegerOption((opt) => opt.setName("sotien").setDescription("Số lượng xu").setRequired(true)),
  new SlashCommandBuilder().setName("doanso").setDescription("Đoán số may mắn").addIntegerOption((opt) => opt.setName("so").setDescription("1-100").setRequired(true)),
  new SlashCommandBuilder().setName("doananime").setDescription("Đoán tên nhân vật Anime"),
  new SlashCommandBuilder().setName("shop").setDescription("Xem cửa hàng hạt giống"),
  new SlashCommandBuilder().setName("nongtrai").setDescription("Hệ thống nông trại Roblox")
    .addSubcommand((sub) => sub.setName("vuon").setDescription("Xem vườn"))
    .addSubcommand((sub) => sub.setName("trong").setDescription("Trồng cây")
      .addIntegerOption((opt) => opt.setName("oodat").setDescription("Ô đất").setRequired(true))
      .addStringOption((opt) => opt.setName("loaicay").setDescription("ID cây").setRequired(true)))
    .addSubcommand((sub) => sub.setName("thuhoach").setDescription("Thu hoạch").addIntegerOption((opt) => opt.setName("oodat").setDescription("Ô đất").setRequired(true)))
    .addSubcommand((sub) => sub.setName("muadat").setDescription("Mở rộng đất")),
  new SlashCommandBuilder().setName("buitarot").setDescription("Bói Tarot"),
  new SlashCommandBuilder().setName("dice").setDescription("Đổ xí ngầu"),
].map((cmd) => cmd.toJSON());

async function registerSlashCommands(clientId, token) {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
  } catch (err) {}
}

async function generateImage(prompt, nsfw) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&safe=${nsfw ? "false" : "true"}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error();
  return Buffer.from(await res.arrayBuffer());
}

const SYSTEM_PROMPT = `Bạn là một AI bạn thân Gen Z siêu cấp lầy lội, thông minh, mỏ hỗn nhưng cực kỳ tình cảm. Viết hoàn toàn bằng chữ thường, không viết hoa đầu câu, không chấm câu cuối dòng.`;

async function getChannelContext(channel, botClientId) {
  try {
    if (!channel || !channel.messages) return [];
    const messages = await channel.messages.fetch({ limit: 8 });
    return messages.reverse().map(m => ({
      role: m.author.id === botClientId ? "assistant" : "user",
      content: m.content.replace(/<@!?\d+>/g, "").trim()
    }));
  } catch (err) { return []; }
}

async function generateSmartReply(message, botClientId) {
  const history = await getChannelContext(message.channel, botClientId);
  return callNvidiaAI([{ role: "system", content: SYSTEM_PROMPT }, ...history]);
}

async function sendReply(message, text) {
  for (const chunk of (text.match(/[\s\S]{1,2000}/g) ?? [text])) {
    await message.reply(chunk);
  }
}

function handleEconomyAndLeveling(userId, message) {
  let lvlData = userLevels.get(userId) || { xp: 0, level: 1 };
  lvlData.xp += Math.floor(Math.random() * 10) + 5;
  if (lvlData.xp >= lvlData.level * 100) {
    lvlData.level += 1;
    lvlData.xp = 0;
    message.channel.send(`🎉 <@${userId}> lên cấp ${lvlData.level}, thưởng 500 xu!`);
    let eco = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };
    eco.balance += 500;
    userEconomy.set(userId, eco);
  }
  userLevels.set(userId, lvlData);
  let eco = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };
  eco.balance += Math.floor(Math.random() * 41) + 10;
  userEconomy.set(userId, eco);
}
function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return;

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once(Events.ClientReady, (readyClient) => {
    readyClient.user.setPresence({ status: "online", activities: [{ name: "Grow a Garden Shop 🌱", type: ActivityType.Custom }] });
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
        if (sub === "on") { enableChannel(interaction.channelId); await interaction.reply("bật AI rồi 🟢"); }
        else if (sub === "off") { disableChannel(interaction.channelId); await interaction.reply("tắt AI rồi 🔴"); }
        else { await interaction.reply(`kênh này đang ${isChannelEnabled(interaction.channelId) ? "BẬT 🟢" : "TẮT 🔴"}`); }
        return;
      }
      if (interaction.commandName === "vi") {
        await interaction.reply(`💰 ví: **${ecoData.balance} xu** | 🔥 chuỗi: **${ecoData.streak}** | 🌾 ô đất: **${ecoData.plots.length} ô**`);
        return;
      }
      if (interaction.commandName === "diemdanh") {
        const now = Date.now();
        if (ecoData.lastDaily && now - ecoData.lastDaily < 20 * 60 * 60 * 1000) {
          await interaction.reply({ content: "chưa đủ 20 tiếng để điểm danh lại!", ephemeral: true });
          return;
        }
        ecoData.streak = (ecoData.lastDaily && now - ecoData.lastDaily <= 40 * 60 * 60 * 1000) ? ecoData.streak + 1 : 1;
        const reward = 2000 + (ecoData.streak - 1) * 200;
        ecoData.balance += reward;
        ecoData.lastDaily = now;
        userEconomy.set(userId, ecoData);
        await interaction.reply(`🎁 nhận **${reward} xu** điểm danh (Chuỗi 🔥 ${ecoData.streak} ngày)!`);
        return;
      }
      if (interaction.commandName === "coinflip") {
        const choice = interaction.options.getString("chon", true);
        const amount = interaction.options.getInteger("sotien", true);
        if (amount <= 0 || ecoData.balance < amount) { await interaction.reply({ content: "không đủ tiền cược!", ephemeral: true }); return; }
        const res = Math.random() < 0.5 ? "ngua" : "sap";
        ecoData.balance += (choice === res ? amount : -amount);
        userEconomy.set(userId, ecoData);
        await interaction.reply(`🪙 ra mặt **${res.toUpperCase()}**! Mày ${choice === res ? "thắng +" + amount : "thua -" + amount} xu (Ví: ${ecoData.balance})`);
        return;
      }
      if (interaction.commandName === "taixiu") {
        const choice = interaction.options.getString("chon", true);
        const amount = interaction.options.getInteger("sotien", true);
        if (amount <= 0 || ecoData.balance < amount) { await interaction.reply({ content: "không đủ tiền!", ephemeral: true }); return; }
        const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1, d3 = Math.floor(Math.random() * 6) + 1;
        const total = d1 + d2 + d3, ketqua = total >= 11 ? "tai" : "xiu";
        ecoData.balance += (choice === ketqua ? amount : -amount);
        userEconomy.set(userId, ecoData);
        await interaction.reply(`🎲 Xúc xắc: [${d1}][${d2}][${d3}] = ${total} (${ketqua.toUpperCase()}). Mày ${choice === ketqua ? "thắng" : "thua"}! (Ví: ${ecoData.balance})`);
        return;
      }
      if (interaction.commandName === "shop") {
        let desc = `🛒 **CỬA HÀNG HẠT GIỐNG**\n\n`;
        currentShopStock.forEach(i => { desc += `🔹 **${i.name}** (\`ID: ${i.id}\`) - Giá: ${i.cost} xu | Lãi: ${i.profit} xu | Còn: ${i.stock}\n`; });
        await interaction.reply(desc);
        return;
      }
      if (interaction.commandName === "nongtrai") {
        const sub = interaction.options.getSubcommand();
        if (sub === "vuon") {
          let desc = `🏡 **NÔNG TRẠI**\n`;
          ecoData.plots.forEach((p, idx) => {
            desc += `🔹 Ô #${idx + 1}: ${!p ? "Trống" : (Date.now() >= p.harvestTime ? `**${p.name} (ĐÃ CHÍN!)**` : `**${p.name} (Đang lớn)**`)}\n`;
          });
          await interaction.reply(desc);
          return;
        }
        if (sub === "muadat") {
          if (ecoData.balance < 2000 || ecoData.plots.length >= 6) { await interaction.reply({ content: "Không đủ tiền hoặc đã tối đa 6 ô!", ephemeral: true }); return; }
          ecoData.balance -= 2000; ecoData.plots.push(null);
          userEconomy.set(userId, ecoData);
          await interaction.reply(`🎉 Mở rộng đất thành công! Tổng ${ecoData.plots.length} ô.`);
          return;
        }
        if (sub === "trong") {
          const pIdx = interaction.options.getInteger("oodat", true) - 1;
          const sId = interaction.options.getString("loaicay", true).toLowerCase();
          if (pIdx < 0 || pIdx >= ecoData.plots.length || ecoData.plots[pIdx] !== null) { await interaction.reply({ content: "Ô đất không hợp lệ hoặc đang bận!", ephemeral: true }); return; }
          const item = currentShopStock.find(s => s.id === sId);
          if (!item || item.stock <= 0 || ecoData.balance < item.cost) { await interaction.reply({ content: "Hết hàng hoặc không đủ tiền!", ephemeral: true }); return; }
          item.stock--; ecoData.balance -= item.cost;
          ecoData.plots[pIdx] = { name: item.name, reward: item.profit, harvestTime: Date.now() + item.duration };
          userEconomy.set(userId, ecoData);
          await interaction.reply(`🌱 Đã trồng **${item.name}** vào ô #${pIdx + 1}!`);
          return;
        }
        if (sub === "thuhoach") {
          const pIdx = interaction.options.getInteger("oodat", true) - 1;
          const p = ecoData.plots[pIdx];
          if (!p || Date.now() < p.harvestTime) { await interaction.reply({ content: "Ô trống hoặc cây chưa lớn!", ephemeral: true }); return; }
          ecoData.balance += p.reward; ecoData.plots[pIdx] = null;
          userEconomy.set(userId, ecoData);
          await interaction.reply(`🎉 Thu hoạch thành công **${p.name}**, nhận **+${p.reward} xu**!`);
          return;
        }
        return;
      }
      if (interaction.commandName === "doananime") {
        await interaction.deferReply();
        let sel = { name: "Monkey D. Luffy", hint: "Thuyền trưởng mũ rơm, ăn trái ác quỷ cao su" };
        try {
          const res = await callNvidiaAI([{ role: "system", content: "Chọn 1 nhân vật anime. Trả về JSON: {'name': '...', 'hint': '...'}" }, { role: "user", content: "Chọn đi" }]);
          sel = JSON.parse(res.match(/\{[\s\S]*\}/)[0]);
        } catch(e) {}
        await interaction.editReply(`🎮 **ĐOÁN ANIME**: Gợi ý: *${sel.hint}* (Chat nhanh tên trong 30s nhận 1000 xu!)`);
        try {
          const collected = await interaction.channel.awaitMessages({ filter: m => !m.author.bot && m.content.toLowerCase().includes(sel.name.toLowerCase().split(" ")[0]), max: 1, time: 30000, errors: ['time'] });
          let wEco = userEconomy.get(collected.first().author.id) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };
          wEco.balance += 1000; userEconomy.set(collected.first().author.id, wEco);
          await interaction.channel.send(`🎉 <@${collected.first().author.id}> đoán đúng **${sel.name}**, nhận +1000 xu!`);
        } catch(e) { await interaction.channel.send(`⏰ Hết giờ! Đáp án là **${sel.name}**.`); }
        return;
      }
      if (interaction.commandName === "imagine") {
        await interaction.deferReply();
        try {
          const buf = await generateImage(interaction.options.getString("prompt", true), interaction.options.getBoolean("nsfw") ?? false);
          await interaction.editReply({ content: "🎨 Ảnh của mày đây:", files: [new AttachmentBuilder(buf, { name: "img.png" })] });
        } catch(e) { await interaction.editReply("⚠️ Lỗi tạo ảnh!"); }
        return;
      }
      if (interaction.commandName === "summary") {
        await interaction.deferReply();
        const msgs = await interaction.channel.messages.fetch({ limit: 25 });
        const res = await callNvidiaAI([{ role: "system", content: "Tóm tắt ngắn gọn." }, { role: "user", content: msgs.reverse().map(m => `${m.author.username}: ${m.content}`).join("\n") }]);
        await interaction.editReply(`📌 **Tóm tắt:**\n${res}`);
        return;
      }
      if (interaction.commandName === "rank") {
        const d = userLevels.get(userId) || { xp: 0, level: 1 };
        await interaction.reply(`📊 Level **${d.level}** (${d.xp}/${d.level * 100} XP)`);
        return;
      }
      if (interaction.commandName === "doanso") {
        const secret = Math.floor(Math.random() * 100) + 1;
        const win = interaction.options.getInteger("so", true) === secret;
        if (win) { ecoData.balance += 5000; userEconomy.set(userId, ecoData); }
        await interaction.reply(win ? "🎉 Đoán chuẩn xác, +5000 xu!" : `😢 Tạch rồi, số đúng là ${secret}`);
        return;
      }
      if (interaction.commandName === "buitarot") {
        await interaction.deferReply();
        const res = await callNvidiaAI([{ role: "system", content: "Thầy bói mỏ hỗn." }, { role: "user", content: "Bói bài." }]);
        await interaction.editReply(`🔮 **Tarot:**\n${res}`);
        return;
      }
      if (interaction.commandName === "dice") {
        const t = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
        await interaction.reply(`🎲 Tổng điểm xí ngầu: **${t}**`);
        return;
      }
    } catch(e) { if (!interaction.replied) await interaction.reply({ content: "Lỗi lệnh!", ephemeral: true }); }
  });

  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot || (msg.channel.type !== ChannelType.DM && !isChannelEnabled(msg.channelId))) return;
    handleEconomyAndLeveling(msg.author.id, msg);
    try {
      if ("sendTyping" in msg.channel) await msg.channel.sendTyping();
      await sendReply(msg, await generateSmartReply(msg, client.user.id));
    } catch(e) { await msg.reply("lag quá nói lại xem"); }
  });

  client.login(token);
}

startBot();
