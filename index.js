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
import OpenAI from "openai";

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

// --- Khởi tạo NVIDIA NIM Client ---
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1"
});

// --- Hàm gọi AI chuẩn NVIDIA ---
async function callNvidiaAI(messages) {
  const completion = await openai.chat.completions.create({
    model: "meta/llama-3.1-8b-instruct",
    messages: messages,
    temperature: 0.9,
    max_tokens: 1024
  });
  return completion.choices[0]?.message?.content || "Không có phản hồi từ AI.";
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
const MODEL_NAME = "meta/llama-3.1-8b-instruct";

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
        .setDescription("Bật chế độ NSFW (true/false)")
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

const SYSTEM_PROMPT = `Bạn là một đứa bạn thân Gen Z siêu mỏ hỗn, lầy lội, hay cà khịa, chửi đổng nhưng cực kỳ thông minh và văn vở. 
- Xưng "tao", gọi người kia là "mày", "ông", "bà" tùy hứng.
- Viết thường hoàn toàn, không cần hoa đầu câu, không chấm câu cuối dòng cho ngầu.
- Dùng từ lóng tự nhiên của gen z: "vcl", "vl", "đth", "k", "ko", "đc", "ukm", "chứ j", "th th", "ảo thật đấy", "hết cứu"...
- Thả thính, dỗi hờn, khịa đểu hoặc dùng emoji (=)) :/ :(( 🐧 💀 🤡) linh hoạt theo từng câu chuyện.
- Trả lời ngắn gọn từ 1 đến 3 câu, không nói dài dòng văn tự, không giáo điều, thích thì chiều không thích thì cãi tay đôi.`;

// --- Bộ nhớ lịch sử có cơ chế chống sập an toàn ---
async function getChannelContext(channel) {
  try {
    if (!channel || !channel.messages) return [];
    const messages = await channel.messages.fetch({ limit: 6 });
    const formatted = messages.reverse().map(m => ({
      role: m.author.id === channel.client.user.id ? "assistant" : "user",
      content: `${m.author.username}: ${m.content}`
    }));
    return formatted;
  } catch (err) {
    console.error("Lỗi lấy lịch sử kênh:", err);
    return [];
  }
}

// --- Hàm xử lý thông minh có bảo vệ ---
async function generateSmartReply(message) {
  const history = await getChannelContext(message.channel);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: `${message.author.username}: ${message.content}` }
  ];

  return callNvidiaAI(messages);
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
          await cmd.editReply({ content: `🎨 đây, vừa chế cái ảnh cho mày (NSFW: ${nsfw ? "Bật" : "Tắt"}):`, files: [attachment] });
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
      const text = await generateSmartReply(message);
      await sendReply(message, text);
    } catch (err) {
      logger.error({ err }, "NVIDIA API error");
      await message.reply("lag quá, nói lại nghe xem nào");
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to log in to Discord");
    process.exit(1);
  });
}

startBot();
