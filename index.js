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
  EmbedBuilder,
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
    return "hệ thống AI đang bận chút, thử lại sau nhé!";
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running smoothly 24/7 with stunning animations!");
});

app.listen(PORT, () => {
  logger.info(`Express web server listening on port ${PORT}`);
});

const commands = [
  new SlashCommandBuilder().setName("ai").setDescription("Quản lý AI tự động trả lời trong kênh này")
    .addSubcommand((sub) => sub.setName("on").setDescription("Bật AI tự động"))
    .addSubcommand((sub) => sub.setName("off").setDescription("Tắt AI tự động"))
    .addSubcommand((sub) => sub.setName("status").setDescription("Xem trạng thái")),
  new SlashCommandBuilder().setName("imagine").setDescription("Tạo ảnh AI từ mô tả cực nét")
    .addStringOption((opt) => opt.setName("prompt").setDescription("Mô tả bức ảnh").setRequired(true))
    .addBooleanOption((opt) => opt.setName("nsfw").setDescription("Bật cờ NSFW").setRequired(false)),
  new SlashCommandBuilder().setName("summary").setDescription("Tóm tắt nhanh các tin nhắn gần đây"),
  new SlashCommandBuilder().setName("rank").setDescription("Xem cấp độ (Level) và XP của bạn"),
  new SlashCommandBuilder().setName("vi").setDescription("Kiểm tra ví tiền và nông trại"),
  new SlashCommandBuilder().setName("diemdanh").setDescription("Điểm danh nhận xu hàng ngày"),
  new SlashCommandBuilder().setName("coinflip").setDescription("Chơi tung đồng xu cược xu")
    .addStringOption((opt) => opt.setName("chon").setDescription("Chọn mặt").setRequired(true)
      .addChoices({ name: "Mặt Ngửa", value: "ngua" }, { name: "Mặt Sấp", value: "sap" }))
    .addIntegerOption((opt) => opt.setName("sotien").setDescription("Số lượng xu cược").setRequired(true)),
  new SlashCommandBuilder().setName("taixiu").setDescription("Chơi minigame Tài Xỉu hiệu ứng xịn")
    .addStringOption((opt) => opt.setName("chon").setDescription("Chọn Tài/Xỉu").setRequired(true)
      .addChoices({ name: "Tài", value: "tai" }, { name: "Xỉu", value: "xiu" }))
    .addIntegerOption((opt) => opt.setName("sotien").setDescription("Số lượng xu cược").setRequired(true)),
  new SlashCommandBuilder().setName("doanso").setDescription("Đoán số may mắn từ 1 đến 100")
    .addIntegerOption((opt) => opt.setName("so").setDescription("Nhập số của bạn").setRequired(true)),
  new SlashCommandBuilder().setName("doananime").setDescription("Minigame đoán tên nhân vật Anime siêu vui"),
  new SlashCommandBuilder().setName("shop").setDescription("Xem cửa hàng hạt giống nông trại"),
  new SlashCommandBuilder().setName("nongtrai").setDescription("Hệ thống quản lý nông trại Roblox")
    .addSubcommand((sub) => sub.setName("vuon").setDescription("Xem khu vườn của bạn"))
    .addSubcommand((sub) => sub.setName("trong").setDescription("Trồng hạt giống")
      .addIntegerOption((opt) => opt.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true))
      .addStringOption((opt) => opt.setName("loaicay").setDescription("ID hạt giống").setRequired(true)))
    .addSubcommand((sub) => sub.setName("thuhoach").setDescription("Thu hoạch cây trồng")
      .addIntegerOption((opt) => opt.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true)))
    .addSubcommand((sub) => sub.setName("muadat").setDescription("Mở rộng thêm ô đất (2000 xu)")),
  new SlashCommandBuilder().setName("buitarot").setDescription("Bói bài Tarot định mệnh"),
  new SlashCommandBuilder().setName("dice").setDescription("Đổ xúc xắc giải trí"),
].map((cmd) => cmd.toJSON());

async function registerSlashCommands(clientId, token) {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info("Đăng ký thành công toàn bộ Slash Commands lên Discord!");
  } catch (err) {
    logger.error("Lỗi đăng ký lệnh:", err);
  }
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
    const embed = new EmbedBuilder().setColor(0x00FF00).setDescription(`🎉 Chúc mừng <@${userId}> đã thăng hạng lên **cấp ${lvlData.level}**, nhận ngay 500 xu thưởng nóng!`);
    message.channel.send({ embeds: [embed] });
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
    readyClient.user.setPresence({ status: "online", activities: [{ name: "Grow a Garden & Minigames 🌱", type: ActivityType.Custom }] });
    registerSlashCommands(readyClient.user.id, token);
    logger.info(`Bot đã đăng nhập thành công với tên ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };
    updateShopStock();

    try {
      if (interaction.commandName === "ai") {
        const sub = interaction.options.getSubcommand();
        if (sub === "on") { 
          enableChannel(interaction.channelId); 
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription("🟢 Đã bật chế độ AI tự động trò chuyện trong kênh này (Cần tag bot để trò chuyện)!")] }); 
        } else if (sub === "off") { 
          disableChannel(interaction.channelId); 
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("🔴 Đã tắt chế độ AI tự động trong kênh này!")] }); 
        } else { 
          const embed = new EmbedBuilder().setColor(0x00AE86).setDescription(`🤖 Trạng thái AI tại kênh này đang: **${isChannelEnabled(interaction.channelId) ? "BẬT 🟢" : "TẮT 🔴"}**`);
          await interaction.reply({ embeds: [embed] }); 
        }
        return;
      }

      if (interaction.commandName === "vi") {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("💰 VÍ TIỀN & NÔNG TRẠI CỦA BẠN")
          .addFields(
            { name: "💵 Số dư", value: `\`${ecoData.balance.toLocaleString()} xu\``, inline: true },
            { name: "🔥 Điểm danh liên tiếp", value: `\`${ecoData.streak} ngày\``, inline: true },
            { name: "🌾 Tổng số ô đất", value: `\`${ecoData.plots.length} ô\``, inline: true }
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "diemdanh") {
        const now = Date.now();
        if (ecoData.lastDaily && now - ecoData.lastDaily < 20 * 60 * 60 * 1000) {
          const remain = ((20 * 60 * 60 * 1000 - (now - ecoData.lastDaily)) / 3600000).toFixed(1);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`⏳ Bạn đã điểm danh rồi! Hãy quay lại sau khoảng **${remain} tiếng** nữa nhé.`)], ephemeral: true });
          return;
        }
        ecoData.streak = (ecoData.lastDaily && now - ecoData.lastDaily <= 40 * 60 * 60 * 1000) ? ecoData.streak + 1 : 1;
        const reward = 2000 + (ecoData.streak - 1) * 200;
        ecoData.balance += reward;
        ecoData.lastDaily = now;
        userEconomy.set(userId, ecoData);
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle("🎁 ĐIỂM DANH THÀNH CÔNG")
          .setDescription(`Nhận ngay **+${reward.toLocaleString()} xu** vào ví!\n🔥 Chuỗi điểm danh: **${ecoData.streak} ngày**\n💰 Tổng ví hiện tại: **${ecoData.balance.toLocaleString()} xu**`);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "coinflip") {
        const choice = interaction.options.getString("chon", true);
        const amount = interaction.options.getInteger("sotien", true);
        if (amount <= 0 || ecoData.balance < amount) { 
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`❌ Số tiền cược không hợp lệ hoặc ví không đủ! Ví bạn chỉ có **${ecoData.balance.toLocaleString()} xu** thôi.`)], ephemeral: true }); 
          return; 
        }

        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle("🪙 TUNG ĐỒNG XU").setDescription("🪙 Đang tung đồng xu lên không trung...\n🔄 `[ ● ○ ○ ]`")] });
        await new Promise(r => setTimeout(r, 800));
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle("🪙 TUNG ĐỒNG XU").setDescription("🪙 Đồng xu đang xoay tít...\n🔄 `[ ○ ● ○ ]`")] });
        await new Promise(r => setTimeout(r, 800));

        const res = Math.random() < 0.5 ? "ngua" : "sap";
        const win = (choice === res);
        ecoData.balance += (win ? amount : -amount);
        userEconomy.set(userId, ecoData);

        const embed = new EmbedBuilder()
          .setColor(win ? 0x00FF00 : 0xFF0000)
          .setTitle("🪙 KẾT QUẢ TUNG ĐỒNG XU")
          .setDescription(`Đồng xu rơi xuống lộ diện mặt: **${res.toUpperCase()}**\n${win ? `🎉 Bạn đoán chuẩn xác và húp trọn **+${amount.toLocaleString()} xu**!` : `💀 Rất tiếc, bạn đoán sai và mất **-${amount.toLocaleString()} xu**!`}\n💰 Số dư ví: **${ecoData.balance.toLocaleString()} xu**`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "taixiu") {
        const choice = interaction.options.getString("chon", true);
        const amount = interaction.options.getInteger("sotien", true);
        if (amount <= 0 || ecoData.balance < amount) { 
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`❌ Không đủ tiền cược! Ví bạn chỉ có **${ecoData.balance.toLocaleString()} xu**.`)], ephemeral: true }); 
          return; 
        }

        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle("🎲 LẮC TÀI XỈU").setDescription("🎲 Đang lắc ống xúc xắc...\n🎲 `[ ⚀ ][ ⚁ ][ ⚂ ]`")] });
        await new Promise(r => setTimeout(r, 900));
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xF1C40F).setTitle("🎲 LẮC TÀI XỈU").setDescription("🎲 Xúc xắc đang nhảy múa trên bàn...\n🎲 `[ ⚃ ][ ⚄ ][ ⚅ ]`")] });
        await new Promise(r => setTimeout(r, 900));

        const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1, d3 = Math.floor(Math.random() * 6) + 1;
        const total = d1 + d2 + d3, ketqua = total >= 11 ? "tai" : "xiu";
        const win = (choice === ketqua);
        ecoData.balance += (win ? amount : -amount);
        userEconomy.set(userId, ecoData);

        const embed = new EmbedBuilder()
          .setColor(win ? 0x00FF00 : 0xFF0000)
          .setTitle("🎲 KẾT QUẢ TÀI XỈU")
          .setDescription(`Kết quả xúc xắc: **[${d1}] [${d2}] [${d3}]** = **${total} điểm (${ketqua.toUpperCase()})**\n${win ? `🎉 Chúc mừng bạn ăn lớn **+${amount.toLocaleString()} xu**!` : `💀 Chia buồn, bạn thua cược **-${amount.toLocaleString()} xu**!`}\n💰 Tổng ví: **${ecoData.balance.toLocaleString()} xu**`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "shop") {
        const timeLeftMs = RESTOCK_INTERVAL - (Date.now() - lastRestockTime);
        const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
        const minsLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

        const embed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle("🛒 CỬA HÀNG HẠT GIỐNG NÔNG TRẠI")
          .setDescription(`⏳ Shop sẽ tự động làm mới sau: **${hoursLeft} giờ ${minsLeft} phút**\n`);

        currentShopStock.forEach(i => {
          embed.addFields({
            name: `${i.name} (\`ID: ${i.id}\`)`,
            value: `• Độ hiếm: \`${i.rarity}\`\n• Giá mua: **${i.cost.toLocaleString()} xu** | Lãi: **${i.profit.toLocaleString()} xu** (${i.duration / 60000} phút)\n• Kho còn lại: **${i.stock} hạt**`,
            inline: false
          });
        });
        embed.setFooter({ text: "Dùng lệnh /nongtrai trong [ô] [id] để mua và trồng ngay!" });
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "nongtrai") {
        const sub = interaction.options.getSubcommand();
        if (sub === "vuon") {
          const embed = new EmbedBuilder().setColor(0x2ECC71).setTitle("🏡 KHU VƯỜN NÔNG TRẠI CỦA BẠN");
          let desc = "";
          ecoData.plots.forEach((p, idx) => {
            if (!p) {
              desc += `🔹 **Ô đất #${idx + 1}**: Trống (Sẵn sàng gieo trồng)\n`;
            } else if (Date.now() >= p.harvestTime) {
              desc += `🌸 **Ô đất #${idx + 1}**: **${p.name}** ➔ **ĐÃ CHÍN, THU HOẠCH NGAY!**\n`;
            } else {
              const mins = Math.ceil((p.harvestTime - Date.now()) / 60000);
              desc += `🌱 **Ô đất #${idx + 1}**: **${p.name}** ➔ Đang lớn (~${mins} phút nữa)\n`;
            }
          });
          embed.setDescription(desc);
          await interaction.reply({ embeds: [embed] });
          return;
        }
        if (sub === "muadat") {
          if (ecoData.balance < 2000 || ecoData.plots.length >= 6) { 
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Không đủ 2000 xu hoặc nông trại đã đạt tối đa 6 ô đất")], ephemeral: true }); 
            return; 
          }
          ecoData.balance -= 2000; 
          ecoData.plots.push(null);
          userEconomy.set(userId, ecoData);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`🎉 Mở rộng đất thành công! Nông trại của bạn giờ sở hữu **${ecoData.plots.length} ô đất**.`)] });
          return;
        }
        if (sub === "trong") {
          const pIdx = interaction.options.getInteger("oodat", true) - 1;
          const sId = interaction.options.getString("loaicay", true).toLowerCase();
          if (pIdx < 0 || pIdx >= ecoData.plots.length || ecoData.plots[pIdx] !== null) { 
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Ô đất không hợp lệ hoặc đang có cây trồng khác!")], ephemeral: true }); 
            return; 
          }
          const item = currentShopStock.find(s => s.id === sId);
          if (!item || item.stock <= 0 || ecoData.balance < item.cost) { 
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Hạt giống không có trong shop, đã hết hàng hoặc bạn không đủ xu!")], ephemeral: true }); 
            return; 
          }
          item.stock--; 
          ecoData.balance -= item.cost;
          ecoData.plots[pIdx] = { name: item.name, reward: item.profit, harvestTime: Date.now() + item.duration };
          userEconomy.set(userId, ecoData);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`🌱 Đã gieo trồng **${item.name}** vào ô đất **#${pIdx + 1}**! Đợi ${item.duration / 60000} phút để thu hoạch.`)] });
          return;
        }
        if (sub === "thuhoach") {
          const pIdx = interaction.options.getInteger("oodat", true) - 1;
          const p = ecoData.plots[pIdx];
          if (!p || Date.now() < p.harvestTime) { 
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Ô đất đang trống hoặc cây trồng chưa lớn để thu hoạch!")], ephemeral: true }); 
            return; 
          }
          ecoData.balance += p.reward; 
          const name = p.name;
          ecoData.plots[pIdx] = null;
          userEconomy.set(userId, ecoData);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`🎉 Thu hoạch thành công **${name}** tại ô đất **#${pIdx + 1}**! Bỏ túi **+${p.reward.toLocaleString()} xu**.`)] });
          return;
        }
        return;
      }

      if (interaction.commandName === "doananime") {
        await interaction.deferReply();
        const ANIME_LIST = [
          { name: "Monkey D. Luffy", hint: "Thuyền trưởng mũ rơm, thích ăn thịt và có ước mơ làm Vua Hải Tặc" },
          { name: "Naruto Uzumaki", hint: "Ninja làng Lá, có Cửu Vĩ bên trong và miệng hô 'Dattebayo'" },
          { name: "Son Goku", hint: "Người Saiyan nuôi dưỡng ở Trái Đất, thích tỉ thí võ công" },
          { name: "Tanjiro Kamado", hint: "Thợ săn quỷ có vết sẹo trên trán, luôn mang theo em gái hóa quỷ" },
          { name: "Gojo Satoru", hint: "Thầy giáo tóc trắng mắt xanh mạnh nhất chú thuật hội" },
          { name: "Sasuke Uchiha", hint: "Thiên tài tộc Uchiha, sở hữu đôi mắt Sharingan" },
          { name: "Zoro Roronoa", hint: "Kiếm sĩ phái tam kiếm, nổi tiếng với kỹ năng 'mù đường'" }
        ];
        const sel = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
        
        const embed = new EmbedBuilder()
          .setColor(0xE67E22)
          .setTitle("🎮 ĐOÁN TÊN NHÂN VẬT ANIME")
          .setDescription(`💡 **Gợi ý:** *${sel.hint}*\n\n👉 Chat nhanh tên nhân vật vào kênh trong **30 giây** để nhận **1,000 xu** thưởng!`);
        await interaction.editReply({ embeds: [embed] });

        try {
          const collected = await interaction.channel.awaitMessages({ 
            filter: m => !m.author.bot && sel.name.toLowerCase().split(" ").some(part => m.content.toLowerCase().includes(part)), 
            max: 1, 
            time: 30000, 
            errors: ['time'] 
          });
          const winnerId = collected.first().author.id;
          let wEco = userEconomy.get(winnerId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null] };
          wEco.balance += 1000; 
          userEconomy.set(winnerId, wEco);

          await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`🎉 Chính xác! Nhân vật đó là **${sel.name}**.\n🏆 Xin chúc mừng <@${winnerId}> đã húp trọn **+1,000 xu**!`)] });
        } catch(e) { 
          await interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0x95A5A6).setDescription(`⏰ Hết giờ rồi! Không ai đoán đúng đáp án **${sel.name}** cả.`)] }); 
        }
        return;
      }

      if (interaction.commandName === "imagine") {
        const prompt = interaction.options.getString("prompt", true);
        const nsfw = interaction.options.getBoolean("nsfw") ?? false;
        await interaction.deferReply();
        try {
          const buf = await generateImage(prompt, nsfw);
          const attachment = new AttachmentBuilder(buf, { name: "imagine.png" });
          const embed = new EmbedBuilder().setColor(0x9B59B6).setTitle("🎨 TẠO ẢNH AI THÀNH CÔNG").setImage("attachment://imagine.png");
          await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch(e) { 
          await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription("⚠️ Không thể tạo ảnh (Có thể do bộ lọc an toàn hoặc đường truyền mạng bận).")] }); 
        }
        return;
      }

      if (interaction.commandName === "summary") {
        await interaction.deferReply();
        const msgs = await interaction.channel.messages.fetch({ limit: 25 });
        const textBlock = msgs.reverse().map(m => `${m.author.username}: ${m.content}`).join("\n");
        const res = await callNvidiaAI([
          { role: "system", content: "Tóm tắt ngắn gọn, hài hước bằng tiếng Việt." }, 
          { role: "user", content: `Tóm tắt các tin nhắn sau:\n${textBlock}` }
        ]);
        const embed = new EmbedBuilder().setColor(0x3498DB).setTitle("📌 TÓM TẮT NHANH DRAMA").setDescription(res);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "rank") {
        const d = userLevels.get(userId) || { xp: 0, level: 1 };
        const embed = new EmbedBuilder().setColor(0xE91E63).setTitle("📊 CẤP ĐỘ CỦA BẠN").setDescription(`• **Level hiện tại:** \`${d.level}\`\n• **Điểm XP:** \`${d.xp} / ${d.level * 100} XP\``);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "doanso") {
        const userNum = interaction.options.getInteger("so", true);
        const secret = Math.floor(Math.random() * 100) + 1;
        const win = (userNum === secret);
        if (win) { 
          ecoData.balance += 5000; 
          userEconomy.set(userId, ecoData); 
        }
        const embed = new EmbedBuilder()
          .setColor(win ? 0x00FF00 : 0xFF0000)
          .setTitle("🎯 MINIGAME ĐOÁN SỐ")
          .setDescription(`Con số bí mật là: **${secret}**\n${win ? "🎉 Quá đỉnh, bạn đã đoán chuẩn xác con số và nhận thưởng **+5,000 xu**!" : "😢 Rất tiếc, bạn đoán lệch mất rồi, thử lại lần sau nhé!"}`);
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "buitarot") {
        await interaction.deferReply();
        const tarotCards = [
          "Quẻ bài The Fool: Hôm nay cực kỳ thích hợp để làm mấy chuyện điên rồ, cẩn thận té ngã nhé.",
          "Quẻ bài The Magician: Bạn đang nắm giữ mọi quyền lực trong tay, thích làm gì thì triển luôn đi.",
          "Quẻ bài The Star: Vận may đang mỉm cười, làm gì cũng hanh thông, trúng kèo lớn.",
          "Quẻ bài The Tower: Chuẩn bị tinh thần đón nhận một cú lừa hoặc drama bất ngờ xảy ra đi là vừa."
        ];
        const res = tarotCards[Math.floor(Math.random() * tarotCards.length)];
        const embed = new EmbedBuilder().setColor(0x8E44AD).setTitle("🔮 QUẺ BÓI TAROT ĐỊNH MỆNH").setDescription(res);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (interaction.commandName === "dice") {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x34495E).setTitle("🎲 ĐỔ XÍ NGẦU").setDescription("🎲 Đang tung xí ngầu lên bàn... ⚀ ⚁ ⚂")] });
        await new Promise(r => setTimeout(r, 1000));

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const total = d1 + d2;
        const embed = new EmbedBuilder().setColor(0x34495E).setTitle("🎲 ĐỔ XÍ NGẦU").setDescription(`Kết quả xúc xắc: **[${d1}] và [${d2}]**\nTổng điểm: **${total} điểm** (${total > 6 ? "Nhân phẩm hôm nay khá đỏ đấy 🔥" : "Nhân phẩm hơi âm rồi nha 💀"})`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

    } catch(e) { 
      logger.error("Lỗi tương tác lệnh:", e);
      try {
        const errorEmbed = new EmbedBuilder().setColor(0xFF0000).setDescription("❌ Đã có lỗi xảy ra hoặc lệnh đã quá hạn phản hồi!");
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed], files: [] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (err) {}
    }
  });

  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;
    
    // Nếu không phải tin nhắn DM và kênh chưa bật AI thì bỏ qua
    if (msg.channel.type !== ChannelType.DM && !isChannelEnabled(msg.channelId)) return;
    
    // Nếu ở server (không phải DM) và KHÔNG CÓ tag bot thì bỏ qua, chỉ tính tương tác nền (XP/xu)
    if (msg.channel.type !== ChannelType.DM && !msg.mentions.has(client.user)) {
      handleEconomyAndLeveling(msg.author.id, msg);
      return;
    }

    handleEconomyAndLeveling(msg.author.id, msg);
    try {
      if ("sendTyping" in msg.channel) await msg.channel.sendTyping();
      await sendReply(msg, await generateSmartReply(msg, client.user.id));
    } catch(e) { await msg.reply("lag quá nói lại xem nào"); }
  });

  client.login(token);
}

startBot();
      
