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
  PermissionFlagsBits,
} from "discord.js";
import express from "express";
import fetch from "node-fetch";

// --- Logger utility ---
const logger = {
  info: (obj, msg) => console.log(JSON.stringify({ level: "info", ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
  error: (obj, msg) => console.error(JSON.stringify({ level: "error", ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) })),
  warn: (obj, msg) => console.warn(JSON.stringify({ level: "warn", ...(typeof obj === 'string' ? { msg: obj } : { ...obj, msg }) }))
};

// --- Simple In-Memory Channel State ---
const enabledChannels = new Set();
function isChannelEnabled(channelId) {
  return enabledChannels.has(channelId);
}
function enableChannel(channelId) {
  enabledChannels.add(channelId);
}
function disableChannel(channelId) {
  enabledChannels.delete(channelId);
}

// --- Groq Key Rotation Pool ---
let groqKeys = [];
let currentKeyIndex = 0;
let keyCooldowns = {};

function initKeyPool() {
  groqKeys = [];
  if (process.env.GROQ_API_KEY) groqKeys.push(process.env.GROQ_API_KEY);
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) groqKeys.push(k);
  }
  if (groqKeys.length === 0) {
    throw new Error("No Groq API keys found in environment variables!");
  }
  logger.info({ total: groqKeys.length }, "Groq API key pool initialized");
}

function getNextKey() {
  const now = Date.now();
  for (let i = 0; i < groqKeys.length; i++) {
    const idx = (currentKeyIndex + i) % groqKeys.length;
    if (!keyCooldowns[idx] || now > keyCooldowns[idx]) {
      currentKeyIndex = (idx + 1) % groqKeys.length;
      return groqKeys[idx];
    }
  }
  let bestIdx = 0;
  let minTime = Infinity;
  for (let i = 0; i < groqKeys.length; i++) {
    if (keyCooldowns[i] < minTime) {
      minTime = keyCooldowns[i];
      bestIdx = i;
    }
  }
  return groqKeys[bestIdx];
}

async function groqChatWithRotation(model, messages) {
  const maxAttempts = groqKeys.length * 2;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const apiKey = getNextKey();
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.9,
        max_tokens: 1024
      })
    });

    if (res.status === 429) {
      const currentIdx = (currentKeyIndex - 1 + groqKeys.length) % groqKeys.length;
      keyCooldowns[currentIdx] = Date.now() + 60_000;
      logger.warn(`Groq key index ${currentIdx} rate limited (429), switching key...`);
      attempts++;
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "Không có phản hồi từ AI.";
  }

  const err = new Error("All Groq keys exhausted due to rate limits.");
  err.retrySec = 60;
  throw err;
}

// --- Render Express Web Server ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Discord Bot is alive and running 24/7 on Render!");
});

app.listen(PORT, () => {
  logger.info(`Express web server listening on port ${PORT}`);
});

// --- Bot Main Logic ---
const MODEL_NAME = "llama-3.1-8b-instant";

const commands = [
  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Quản lý AI tự động trả lời trong kênh này")
    .addSubcommand((sub) =>
      sub.setName("on").setDescription("Bật AI tự động trả lời trong kênh này")
    )
    .addSubcommand((sub) =>
      sub.setName("off").setDescription("Tắt AI tự động trả lời trong kênh này")
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Xem trạng thái AI của kênh này")
    ),
  new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Tạo ảnh AI từ mô tả")
    .addStringOption((opt) =>
      opt
        .setName("prompt")
        .setDescription("Mô tả ảnh muốn tạo")
        .setRequired(true)
    )
    .addBooleanOption((opt) =>
      opt
        .setName("nsfw")
        .setDescription("Bật chế độ NSFW")
        .setRequired(false)
    ),
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

const SYSTEM_PROMPT = `Mày là một đứa gen z Việt Nam thực thụ đang chat trên discord với bạn bè. TUYỆT ĐỐI không nhận mình là AI, không xưng tôi/bạn, không nói mấy câu vô tri kiểu "tôi có thể giúp gì cho bạn".

QUY TẮC PHẢN HỨNG THEO HOÀN CẢNH (CỰC KỲ QUAN TRỌNG):
1. NẾU NGƯỜI DÙNG VUI VẺ / KHOE SỰ THẬT / PHA TRÒ:
   - Hùa theo, tung hứng, khen ngợi hoặc cười cợt trêu đùa lại một cách hào hứng, thân thiết.
2. NẾU NGƯỜI DÙNG BUỒN / TÂM SỰ / NẢN LÒNG:
   - Chuyển sang giọng điệu dịu lại, bớt cà khịa đi, an ủi kiểu anh em cây khế, khuyên nhủ chân thật hoặc lắng nghe.
3. NẾU NGƯỜI DÙNG CHỬI MÀY / CÁU GẮT / MẮNG MỎC:
   - Tùy cơ ứng biến: Lúc thì tỏ ra rén, xin lỗi, sợ sệt (kiểu "thôi tha cho bố", "sợ quá cơ"), lúc thì bật lại gắt gao, cãi tay đôi khô máu không chịu thua để tạo sự hài hước, tự nhiên như người thật.

NHÂN CÁCH & CÁCH VIẾT:
- Xưng "tao", gọi người kia là "mày", "ông", "bà", "ông tướng", v.v. tùy độ thân thiết.
- Viết thường hoàn toàn, không cần hoa đầu câu, không format văn bản dài dòng cứng nhắc.
- Dùng từ lóng tự nhiên của gen z: "vcl", "vl", "chill", "cay thế nhờ", "tội vcl", "thôi đi bố", "bùm", "ảo thật đấy",...
- Trả lời ngắn gọn từ 1 đến 3 câu, không nói dài dòng văn tự trừ khi người ta thực sự cần phân tích.`;

async function generateReply(userMessage) {
  return groqChatWithRotation(MODEL_NAME, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ]);
}

async function sendReply(message, text) {
  const chunks = text.match(/[\s\S]{1,2000}/g) ?? [text];
  for (const chunk of chunks) {
    await message.reply(chunk);
  }
}

function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.error("DISCORD_BOT_TOKEN is not set in environment variables!");
    return;
  }

  initKeyPool();

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
    logger.info({ tag: readyClient.user.tag, model: MODEL_NAME, guilds: readyClient.guilds.cache.size }, "Discord bot ready");
    readyClient.user.setPresence({
      status: "online",
      activities: [{ name: "sẵn sàng đôi co", type: ActivityType.Custom }],
    });
    registerSlashCommands(readyClient.user.id, token);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction;

    try {
      if (cmd.commandName === "ai") {
        const sub = cmd.options.getSubcommand();
        const channelId = cmd.channelId;
        if (sub === "on") {
          enableChannel(channelId);
          await cmd.reply({ content: "bật rồi đấy, chuẩn bị tinh thần war đi 🟢", ephemeral: false });
        } else if (sub === "off") {
          disableChannel(channelId);
          await cmd.reply({ content: "tắt rồi, im lặng bình yên 🔴", ephemeral: false });
        } else if (sub === "status") {
          const on = isChannelEnabled(channelId);
          await cmd.reply({
            content: `kênh này AI đang '${on ? "BẬT 🟢" : "TẮT 🔴"}'`,
            ephemeral: false,
          });
        }
        return;
      }
      if (cmd.commandName === "imagine") {
        const prompt = cmd.options.getString("prompt", true);
        const nsfw = cmd.options.getBoolean("nsfw") ?? false;
        await cmd.deferReply();
        try {
          const imageBuffer = await generateImage(prompt, nsfw);
          const attachment = new AttachmentBuilder(imageBuffer, { name: "imagine.png" });
          await cmd.editReply({ content: `🎨 đây, vừa chế cái ảnh cho mày:`, files: [attachment] });
        } catch (err) {
          logger.error({ err }, "Image generation error");
          await cmd.editReply({ content: "lỗi render ảnh rồi, thử lại coi" });
        }
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
    if (!isChannelEnabled(message.channelId)) return;

    logger.info({ author: message.author.tag, channel: message.channelId, content: message.content }, "Message received");

    try {
      if ("sendTyping" in message.channel) {
        await message.channel.sendTyping();
      }
      const text = await generateReply(message.content);
      await sendReply(message, text);
    } catch (err) {
      if (err instanceof Error && err.message.includes("ALL_KEYS_EXHAUSTED")) {
        const sec = err.retrySec ?? 60;
        logger.warn({ sec }, "All Groq keys exhausted");
        await message.reply(`hết sạch key để gáy rồi 🥱 đợi ${sec} giây rồi cãi tiếp nhé`);
      } else {
        logger.error({ err }, "Groq API error");
        await message.reply("lag quá, nói lại nghe xem nào");
      }
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to log in to Discord");
    process.exit(1);
  });
}

startBot();
  
