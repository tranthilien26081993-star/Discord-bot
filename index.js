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
const userLevels = new Map(); // Lưu trữ XP/Level người dùng
const userEconomy = new Map(); // Lưu trữ ví tiền: userId -> { balance, lastDaily }

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
  res.send("Ultimate Economy Discord Bot is alive and running 24/7 on Render!");
});

app.listen(PORT, () => {
  logger.info(`Express web server listening on port ${PORT}`);
});

// --- Thêm các lệnh kinh tế vào Slash Commands ---
const commands = [
  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Quản lý AI tự động trả lời trong kênh này")
    .addSubcommand((sub) => sub.setName("on").setDescription("Bật AI tự động"))
    .addSubcommand((sub) => sub.setName("off").setDescription("Tắt AI tự động"))
    .addSubcommand((sub) => sub.setName("status").setDescription("Xem trạng thái")),
  new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Tạo ảnh AI đỉnh cao từ mô tả")
    .addStringOption((opt) => opt.setName("prompt").setDescription("Mô tả ảnh").setRequired(true))
    .addBooleanOption((opt) => opt.setName("nsfw").setDescription("Bật NSFW").setRequired(false)),
  new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Tóm tắt nhanh các tin nhắn gần đây trong kênh"),
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Xem cấp độ (Level) và XP chat của bạn"),
  new SlashCommandBuilder()
    .setName("vi")
    .setDescription("Kiểm tra số dư xu trong ví của bạn"),
  new SlashCommandBuilder()
    .setName("diemdanh")
    .setDescription("Điểm danh nhận xu miễn phí mỗi ngày"),
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
    .setName("doanso")
    .setDescription("Chơi minigame đoán số may mắn (1-100)")
    .addIntegerOption((opt) => opt.setName("so").setDescription("Số bạn chọn từ 1-100").setRequired(true)),
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
  // Xử lý Level
  let lvlData = userLevels.get(userId) || { xp: 0, level: 1 };
  lvlData.xp += Math.floor(Math.random() * 10) + 5;
  const neededXp = lvlData.level * 100;
  if (lvlData.xp >= neededXp) {
    lvlData.level += 1;
    lvlData.xp = 0;
    message.channel.send(`🎉 kinh vãi, <@${userId>> vừa lên **cấp ${lvlData.level}** rồi đấy, thưởng nóng 500 xu!`);
    let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0 };
    ecoData.balance += 500;
    userEconomy.set(userId, ecoData);
  }
  userLevels.set(userId, lvlData);

  // Xử lý thưởng xu ngẫu nhiên khi chat (từ 10 đến 50 xu mỗi tin nhắn)
  let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0 };
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
    logger.info({ tag: readyClient.user.tag }, "Ultimate Economy Bot ready");
    readyClient.user.setPresence({
      status: "online",
      activities: [{ name: "cày coin đổi đời cùng ae", type: ActivityType.Custom }],
    });
    registerSlashCommands(readyClient.user.id, token);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const userId = interaction.user.id;
    let ecoData = userEconomy.get(userId) || { balance: 1000, lastDaily: 0 };

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
        await interaction.reply({ content: `💰 ví của mày đang có: **${ecoData.balance} xu** (chăm chat và điểm danh để giàu thêm nhé)`, ephemeral: false });
        return;
      }
      if (interaction.commandName === "diemdanh") {
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 giờ
        if (now - ecoData.lastDaily < cooldown) {
          const remaining = Math.ceil((cooldown - (now - ecoData.lastDaily)) / (1000 * 60 * 60));
          await interaction.reply({ content: `⏳ đói rách vừa thôi, hôm nay điểm danh rồi, đợi thêm khoảng **${remaining} tiếng** nữa mới nhận tiếp nhé!`, ephemeral: true });
          return;
        }
        ecoData.balance += 2000;
        ecoData.lastDaily = now;
        userEconomy.set(userId, ecoData);
        await interaction.reply({ content: `🎁 điểm danh thành công! nhận ngay **2000 xu** vào ví, giàu to rồi nhé!`, ephemeral: false });
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
      if (interaction.commandName === "imagine") {
        const prompt = interaction.options.getString("prompt", true);
        const nsfw = interaction.options.getBoolean("nsfw") ?? false;
        await interaction.deferReply();
        const imageBuffer = await generateImage(prompt, nsfw);
        const attachment = new AttachmentBuilder(imageBuffer, { name: "imagine.png" });
        await interaction.editReply({ content: `🎨 đây, siêu phẩm ảnh của mày đây:`, files: [attachment] });
        return;
      }
      if (interaction.commandName === "summary") {
        await interaction.deferReply();
        const messages = await interaction.channel.messages.fetch({ limit: 25 });
        const textBlock = messages.reverse().map(m => `${m.author.username}: ${m.content}`).join("\n");
        
        const summaryPrompt = [
          { role: "system", content: "Bạn là chuyên gia tóm tắt nội dung ngắn gọn bằng tiếng Việt, hài hước, sắc sảo." },
          { role: "user", content: `Hãy tóm tắt lại các đoạn hội thoại sau thành các ý chính cực kỳ ngắn gọn, hài hước:\n${textBlock}` }
        ];
        const result = await callNvidiaAI(summaryPrompt);
        await interaction.editReply({ content: `📌 **tóm tắt nhanh drama trong kênh:**\n${result}` });
        return;
      }
      if (interaction.commandName === "rank") {
        const data = userLevels.get(userId) || { xp: 0, level: 1 };
        await interaction.reply({ content: `📊 cấp độ của mày: **Level ${data.level}** (${data.xp} / ${data.level * 100} XP)`, ephemeral: false });
        return;
      }
      if (interaction.commandName === "doanso") {
        const userChoice = interaction.options.getInteger("so", true);
        const botNumber = Math.floor(Math.random() * 100) + 1;
        if (userChoice === botNumber) {
          ecoData.balance += 5000;
          userEconomy.set(userId, ecoData);
          await interaction.reply({ content: `🎉 vãi chưởng! Mày đoán chuẩn xác số **${botNumber}**, thưởng nóng **+5000 xu** vào ví!`, ephemeral: false });
        } else {
          await interaction.reply({ content: `😢 tạch rồi em ơi, số chuẩn là **${botNumber}**, mất toi một lần đoán!`, ephemeral: false });
        }
        return;
      }
      if (interaction.commandName === "buitarot") {
        await interaction.deferReply();
        const tarotPrompts = [
          { role: "system", content: "Bạn là một thầy bói tarot mỏ hỗn, hài hước, phũ phàng nhưng chuẩn xác." },
          { role: "user", content: "Hãy bói một quẻ tarot ngắn gọn, cực kỳ lầy lội và phũ phàng về vận mệnh tình duyên, tiền tài cho tôi hôm nay." }
        ];
        const result = await callNvidiaAI(tarotPrompts);
        await interaction.editReply({ content: `🔮 **quẻ tarot hômNaOMe của mày:**\n${result}` });
        return;
      }
      if (interaction.commandName === "dice") {
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2;
        await interaction.reply({ content: `🎲 mày lắc ra hai con xí ngầu: **[${dice1}]** và **[${dice2}]** — tổng điểm là **${total}** điểm! (${total > 6 ? "hơi bị đỏ đấy 🔥" : "nhân phẩm hơi âm rồi 💀"})`, ephemeral: false });
        return;
      }
    } catch (err) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "lỗi hệ thống rồi mày ơi", ephemeral: true });
      }
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const isDM = message.channel.type === ChannelType.DM;
    if (!isDM && !isChannelEnabled(message.channelId)) return;

    // Tự động cộng xu và kinh nghiệm khi chat
    handleEconomyAndLeveling(message.author.id, message);

    logger.info({ author: message.author.tag, content: message.content }, "Message received");

    try {
      if ("sendTyping" in message.channel) {
        await message.channel.sendTyping();
      }
      const text = await generateSmartReply(message, client.user.id);
      await sendReply(message, text);
    } catch (err) {
      logger.error({ err }, "NVIDIA API error");
      await message.reply("lag quá, nói lại nghe xem nào");
    }
  });

  client.login(token);
}

startBot();
                                          
