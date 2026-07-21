const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  AttachmentBuilder 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= DATABASE BỘ NHỚ TẠM =================
const userEconomy = new Map(); // userId -> { balance, lastDaily, streak, plots, rod, fishes }
const userLevels = new Map();  // userId -> { xp, level }
const aiChannels = new Set();  // Danh sách channel ID bật AI tự động

// Hàm giả lập tạo ảnh AI (có thể tích hợp API Stable Diffusion / Midjourney thực tế)
async function generateImage(prompt, nsfw = false) {
  // Trả về Buffer giả lập mẫu
  return Buffer.from("mock-image-buffer");
}

// ================= ĐỊNH NGHĨA HỆ THỐNG LỆNH (SLASH COMMANDS) =================
const commands = [
  // --- NHÓM 1: AI & TIỆN ÍCH ---
  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Quản lý hệ thống AI tự động trả lời trong kênh")
    .addSubcommand(sub => sub.setName("on").setDescription("Bật AI tự động"))
    .addSubcommand(sub => sub.setName("off").setDescription("Tắt AI tự động"))
    .addSubcommand(sub => sub.setName("status").setDescription("Kiểm tra trạng thái AI")),

  new SlashCommandBuilder()
    .setName("imagine")
    .setDescription("Tạo hình ảnh nghệ thuật bằng AI cực nét")
    .addStringOption(opt => opt.setName("prompt").setDescription("Mô tả bức ảnh bạn muốn vẽ").setRequired(true))
    .addBooleanOption(opt => opt.setName("nsfw").setDescription("Bật bộ lọc nội dung nhạy cảm").setRequired(false)),

  new SlashCommandBuilder()
    .setName("summary")
    .setDescription("Tóm tắt nhanh 20 tin nhắn gần nhất bằng AI"),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Xem ảnh đại diện độ phân giải cao của thành viên")
    .addUserOption(opt => opt.setName("nguoidung").setDescription("Chọn người muốn xem").setRequired(false)),

  // --- NHÓM 2: KINH TẾ & CẤP ĐỘ ---
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Kiểm tra cấp độ (Level) và thanh tiến trình XP"),

  new SlashCommandBuilder()
    .setName("vi")
    .setDescription("Mở ví tiền, kiểm tra số dư, giỏ cá và tài sản nông trại"),

  new SlashCommandBuilder()
    .setName("diemdanh")
    .setDescription("Điểm danh hàng ngày nhận chuỗi thưởng xu khủng"),

  new SlashCommandBuilder()
    .setName("chuyenxu")
    .setDescription("Chuyển tiền mặt từ ví của bạn cho người chơi khác")
    .addUserOption(opt => opt.setName("nguoinhan").setDescription("Người nhận xu").setRequired(true))
    .addIntegerOption(opt => opt.setName("sotien").setDescription("Số lượng xu muốn chuyển").setRequired(true)),

  // --- NHÓM 3: MINIGAME GIẢI TRÍ ---
  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Tung đồng xu sấp/ngửa nhân đôi tài sản")
    .addStringOption(opt => opt.setName("chon").setDescription("Chọn mặt đồng xu").setRequired(true)
      .addChoices({ name: "🪙 Mặt Ngửa", value: "ngua" }, { name: "🟡 Mặt Sấp", value: "sap" }))
    .addIntegerOption(opt => opt.setName("sotien").setDescription("Số xu cược").setRequired(true)),

  new SlashCommandBuilder()
    .setName("taixiu")
    .setDescription("Lắc tài xỉu đỉnh cao với hiệu ứng chuyển động chân thực")
    .addStringOption(opt => opt.setName("chon").setDescription("Chọn cửa Tài hoặc Xỉu").setRequired(true)
      .addChoices({ name: "📈 Tài (11 - 18 điểm)", value: "tai" }, { name: "📉 Xỉu (3 - 10 điểm)", value: "xiu" }))
    .addIntegerOption(opt => opt.setName("sotien").setDescription("Số xu cược").setRequired(true)),

  new SlashCommandBuilder()
    .setName("doanso")
    .setDescription("Đoán con số may mắn từ 1 đến 100 nhận thưởng lớn")
    .addIntegerOption(opt => opt.setName("so").setDescription("Con số dự đoán của bạn").setRequired(true)),

  new SlashCommandBuilder()
    .setName("doananime")
    .setDescription("Minigame đoán tên nhân vật Anime (Full 50 nhân vật + Ảnh minh họa)"),

  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Đổ xúc xắc giải trí nhanh"),

  new SlashCommandBuilder()
    .setName("buitarot")
    .setDescription("Rút lá bài Tarot tiên tri vận mệnh trong ngày"),

  // --- NHÓM 4: SÒNG BẠC GAMBLING ---
  new SlashCommandBuilder()
    .setName("slot")
    .setDescription("Quay hũ Slot Machine săn Jackpot đổi đời")
    .addIntegerOption(opt => opt.setName("sotien").setDescription("Số xu cược quay hũ").setRequired(true)),

  new SlashCommandBuilder()
    .setName("baucua")
    .setDescription("Trò chơi dân gian Bầu Cua Tôm Cá truyền thống")
    .addStringOption(opt => opt.setName("chon").setDescription("Chọn linh vật cược").setRequired(true)
      .addChoices(
        { name: "🍐 Bầu", value: "bau" },
        { name: "🦀 Cua", value: "cua" },
        { name: "🦐 Tôm", value: "tom" },
        { name: "🐟 Cá", value: "ca" },
        { name: "🐓 Gà", value: "ga" },
        { name: "🦌 Nai", value: "nai" }
      ))
    .addIntegerOption(opt => opt.setName("sotien").setDescription("Số xu cược").setRequired(true)),

  // --- NHÓM 5: NÔNG TRẠI ---
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Mở cửa hàng vật phẩm & hạt giống nông trại"),

  new SlashCommandBuilder()
    .setName("nongtrai")
    .setDescription("Hệ thống trang trại Roblox ảo")
    .addSubcommand(sub => sub.setName("vuon").setDescription("Xem toàn cảnh khu vườn của bạn"))
    .addSubcommand(sub => sub.setName("trong").setDescription("Gieo trồng hạt giống xuống ô đất")
      .addIntegerOption(opt => opt.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true))
      .addStringOption(opt => opt.setName("loaicay").setDescription("Tên hạt giống").setRequired(true)))
    .addSubcommand(sub => sub.setName("thuhoach").setDescription("Thu hoạch nông sản khi đã chín")
      .addIntegerOption(opt => opt.setName("oodat").setDescription("Số thứ tự ô đất").setRequired(true)))
    .addSubcommand(sub => sub.setName("muadat").setDescription("Mở rộng thêm ô đất canh tác mới (2,000 xu)")),

  // --- NHÓM 6: CÂU CÁ & THỦY SẢN ---
  new SlashCommandBuilder()
    .setName("shopcauca")
    .setDescription("Xem danh mục cửa hàng nâng cấp cần câu"),

  new SlashCommandBuilder()
    .setName("muacan")
    .setDescription("Nâng cấp các loại cần câu chuyên nghiệp")
    .addStringOption(opt => opt.setName("loaican").setDescription("Chọn loại cần nâng cấp").setRequired(true)
      .addChoices(
        { name: "Cần Carbon dẻo dai (2,000 xu)", value: "carbon" },
        { name: "Cần Titan Thần Thánh (10,000 xu)", value: "titan" }
      )),

  new SlashCommandBuilder()
    .setName("cauca")
    .setDescription("Đi câu cá giải trí tại hồ nước thần kỳ"),

  new SlashCommandBuilder()
    .setName("banca")
    .setDescription("Bán toàn bộ khoang chứa cá lấy tiền mặt"),
].map(cmd => cmd.toJSON());

// ================= SỰ KIỆN KHỞI CHẠY BOT =================
client.once('ready', async () => {
  console.log(`========================================`);
  console.log(`🤖 Bot đã sẵn sàng hoạt động: ${client.user.tag}`);
  console.log(`========================================`);
  
  const rest = new REST({ version: '10' }).setToken('YOUR_DISCORD_BOT_TOKEN');
  try {
    console.log('🔄 Đang đồng bộ hóa Slash Commands lên hệ thống Discord...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Đồng bộ thành công toàn bộ lệnh!');
  } catch (error) {
    console.error('❌ Lỗi đồng bộ lệnh:', error);
  }
});
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;
  
  // Khởi tạo tài khoản ví cho người chơi mới
  if (!userEconomy.has(userId)) {
    userEconomy.set(userId, { 
      balance: 1000, 
      lastDaily: 0, 
      streak: 0, 
      plots: [null, null], 
      rod: 'tre', 
      fishes: [] 
    });
  }
  let ecoData = userEconomy.get(userId);

  try {
    // ================= 1. NHÓM AI & TIỆN ÍCH =================
    if (interaction.commandName === "ai") {
      const sub = interaction.options.getSubcommand();
      const channelId = interaction.channelId;
      
      if (sub === "on") {
        aiChannels.add(channelId);
        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle("🤖 HỆ THỐNG AI TỰ ĐỘNG")
          .setDescription("Đã **bật** tính năng AI tự động trả lời trong kênh này thành công!");
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } 
      else if (sub === "off") {
        aiChannels.delete(channelId);
        const embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle("🤖 HỆ THỐNG AI TỰ ĐỘNG")
          .setDescription("Đã **tắt** tính năng AI tự động trả lời trong kênh này.");
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } 
      else if (sub === "status") {
        const status = aiChannels.has(channelId) ? "🟢 ĐANG BẬT" : "🔴 ĐANG TẮT";
        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle("🤖 TRẠNG THÁI AI")
          .setDescription(`Trạng thái AI tại kênh này hiện tại: **${status}**`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      return;
    }

    if (interaction.commandName === "imagine") {
      const prompt = interaction.options.getString("prompt", true);
      const nsfw = interaction.options.getBoolean("nsfw") || false;
      
      await interaction.deferReply();
      const buf = await generateImage(prompt, nsfw);
      const attachment = new AttachmentBuilder(buf, { name: "generated.png" });
      
      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("🎨 KẾT QUẢ SÁNG TẠO HÌNH ẢNH AI")
        .addFields(
          { name: "📝 Từ khóa (Prompt)", value: `\`${prompt}\``, inline: false },
          { name: "🔒 Chế độ NSFW", value: nsfw ? "Bật" : "Tắt", inline: true }
        )
        .setImage("attachment://generated.png")
        .setFooter({ text: "Được tạo bởi hệ thống AI hiện đại" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });
      return;
    }

    if (interaction.commandName === "summary") {
      await interaction.deferReply();
      const messages = await interaction.channel.messages.fetch({ limit: 20 });
      const textContent = messages.map(m => `🔹 **${m.author.username}**: ${m.content}`).reverse().join("\n");
      
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle("📝 TÓM TẮT HOẠT ĐỘNG KÊNH")
        .setDescription(textContent.substring(0, 4000))
        .setFooter({ text: "Tổng hợp từ 20 tin nhắn gần nhất" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "avatar") {
      const targetUser = interaction.options.getUser("nguoidung") || interaction.user;
      const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });
      
      const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle(`🖼️ Ảnh đại diện: ${targetUser.username}`)
        .setImage(avatarUrl)
        .setDescription(`🔗 [Tải ảnh gốc chất lượng cao tại đây](${avatarUrl})`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ================= 2. NHÓM KINH TẾ & CẤP ĐỘ =================
    if (interaction.commandName === "vi") {
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`💰 VÍ TÀI SẢN & KINH TẾ CỦA ${interaction.user.username.toUpperCase()}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: "💵 Số dư hiện tại", value: `**${ecoData.balance.toLocaleString()} xu**`, inline: true },
          { name: "🎣 Trang bị Cần câu", value: `\`${ecoData.rod.toUpperCase()}\``, inline: true },
          { name: "📦 Khoang chứa cá", value: `**${ecoData.fishes.length}/15 con**`, inline: true },
          { name: "🔥 Chuỗi điểm danh", value: `**${ecoData.streak} ngày liên tiếp**`, inline: true },
          { name: "🌱 Ô đất canh tác", value: `**${ecoData.plots.length} ô đất**`, inline: true }
        )
        .setFooter({ text: "Hãy chăm chỉ làm vườn và câu cá để làm giàu!" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "rank") {
      const levelData = userLevels.get(userId) || { xp: 0, level: 1 };
      const nextLevelXp = levelData.level * 100;
      
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`📊 BẢNG XẾP HẠNG CẤP ĐỘ`)
        .addFields(
          { name: "⭐ Cấp độ (Level)", value: `**Cấp ${levelData.level}**`, inline: true },
          { name: "📈 Điểm kinh nghiệm", value: `**${levelData.xp} / ${nextLevelXp} XP**`, inline: true }
        )
        .setFooter({ text: "Tích cực chat trong server để nhận thêm XP!" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "diemdanh") {
      const now = Date.now();
      const cooldown = 86400000; // 24 giờ
      
      if (now - ecoData.lastDaily < cooldown) {
        const remainingHours = Math.ceil((cooldown - (now - ecoData.lastDaily)) / 3600000);
        const embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle("⏳ ĐÃ ĐIỂM DANH RỒI")
          .setDescription(`Bạn đã nhận quà hôm nay rồi. Vui lòng quay lại sau **${remainingHours} giờ** nữa nhé!`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      ecoData.streak = (ecoData.streak || 0) + 1;
      const reward = 500 + (ecoData.streak * 100);
      ecoData.balance += reward; 
      ecoData.lastDaily = now;
      userEconomy.set(userId, ecoData);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle("✅ ĐIỂM DANH THÀNH CÔNG")
        .setDescription(`🎉 Điểm danh ngày thứ **${ecoData.streak}** thành công!\n💰 Nhận ngay phần thưởng: **+${reward.toLocaleString()} xu**.`);

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "chuyenxu") {
      const targetUser = interaction.options.getUser("nguoinhan", true);
      const amount = interaction.options.getInteger("sotien", true);
      
      if (targetUser.id === userId || targetUser.bot || amount <= 50 || ecoData.balance < amount) {
        const embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle("❌ GIAO DỊCH THẤT BẠI")
          .setDescription("Giao dịch không hợp lệ! Kiểm tra lại số dư (tối thiểu 50 xu) hoặc không thể chuyển cho chính mình/bot.");
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      ecoData.balance -= amount; 
      userEconomy.set(userId, ecoData);
      
      let targetEco = userEconomy.get(targetUser.id) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] };
      targetEco.balance += amount; 
      userEconomy.set(targetUser.id, targetEco);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle("💸 CHUYỂN XU THÀNH CÔNG")
        .setDescription(`Bạn đã chuyển thành công **+${amount.toLocaleString()} xu** cho <@${targetUser.id}>!`);

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ================= 3. NHÓM MINIGAME GIẢI TRÍ (CÓ ANIMATION) =================
    if (interaction.commandName === "coinflip") {
      const choice = interaction.options.getString("chon", true);
      const amount = interaction.options.getInteger("sotien", true);
      
      if (amount <= 0 || ecoData.balance < amount) {
        await interaction.reply({ content: "❌ Số tiền cược không hợp lệ hoặc vượt quá số dư!", ephemeral: true });
        return;
      }
      
      const result = Math.random() < 0.5 ? "ngua" : "sap";
      const win = (choice === result);
      ecoData.balance += (win ? amount : -amount); 
      userEconomy.set(userId, ecoData);

      const embed = new EmbedBuilder()
        .setColor(win ? 0x2ECC71 : 0xE74C3C)
        .setTitle("🪙 MINIGAME TUNG ĐỒNG XU")
        .addFields(
          { name: "🎯 Bạn chọn", value: `\`${choice.toUpperCase()}\``, inline: true },
          { name: "🪙 Kết quả quay", value: `\`${result.toUpperCase()}\``, inline: true },
          { name: "📊 Kết quả tài chính", value: win ? `🎉 Thắng lớn **+${amount.toLocaleString()} xu**` : `💀 Thua cược **-${amount.toLocaleString()} xu**`, inline: false }
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "taixiu") {
      const choice = interaction.options.getString("chon", true);
      const amount = interaction.options.getInteger("sotien", true);
      
      if (amount <= 0 || ecoData.balance < amount) {
        await interaction.reply({ content: "❌ Không đủ tiền để tham gia cược!", ephemeral: true });
        return;
      }
      
      // Hiệu ứng Animation lắc xúc xắc mô phỏng qua message edits
      const loadingEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🎲 HỆ THỐNG TÀI XỈU ĐANG LẮC")
        .setDescription("🎲 Đang lắc xúc xắc...\n`[ 🔄 ][ 🔄 ][ 🔄 ]`");
      await interaction.reply({ embeds: [loadingEmbed] });

      await new Promise(r => setTimeout(r, 600));

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + d3;
      const ketqua = total >= 11 ? "tai" : "xiu";
      const win = (choice === ketqua);
      
      ecoData.balance += (win ? amount : -amount); 
      userEconomy.set(userId, ecoData);

      const embed = new EmbedBuilder()
        .setColor(win ? 0x2ECC71 : 0xE74C3C)
        .setTitle("🎲 KẾT QUẢ TÀI XỈU HOÀNH TRÁNG")
        .addFields(
          { name: "🎲 Xúc xắc ra", value: `[ **${d1}** ] [ **${d2}** ] [ **${d3}** ] ➔ Tổng: **${total} điểm (${ketqua.toUpperCase()})**`, inline: false },
          { name: "💰 Thưởng / Phạt", value: win ? `🎉 Chúc mừng bạn thắng **+${amount.toLocaleString()} xu**!` : `😢 Rất tiếc, bạn đã thua **-${amount.toLocaleString()} xu**!`, inline: false }
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "doanso") {
      const guess = interaction.options.getInteger("so", true);
      const target = Math.floor(Math.random() * 100) + 1;
      const win = (guess === target);
      
      if (win) { 
        ecoData.balance += 5000; 
        userEconomy.set(userId, ecoData); 
      }
      
      const embed = new EmbedBuilder()
        .setColor(win ? 0x2ECC71 : 0xE74C3C)
        .setTitle("🎯 MINIGAME ĐOÁN SỐ MAY MẮN")
        .addFields(
          { name: "🔢 Số bạn chọn", value: `**${guess}**`, inline: true },
          { name: "🎯 Con số bí ẩn", value: `**${target}**`, inline: true },
          { name: "🏆 Kết quả", value: win ? "🎉 **Chính xác tuyệt đối! Nhận ngay +5,000 xu thưởng nóng!**" : "💀 **Sai rồi! Chúc bạn may mắn lần sau.**", inline: false }
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "dice") {
      const roll = Math.floor(Math.random() * 6) + 1;
      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("🎲 ĐỔ XÚC XẮC NHANH")
        .setDescription(`🎲 Bạn tung được mặt số: **[ ${roll} ]**`);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (interaction.commandName === "buitarot") {
      const tarots = ["The Fool", "The Magician", "The Empress", "The Lovers", "Death", "The Star", "The Hermit"];
      const chosenCard = tarots[Math.floor(Math.random() * tarots.length)];
      
      const embed = new EmbedBuilder()
        .setColor(0x8E44AD)
        .setTitle("🔮 BÓI BÀI TAROT ĐỊNH MỆNH")
        .setDescription(`Lá bài định mệnh rút được hôm nay của bạn là: **${chosenCard}**\n✨ Hãy tin tưởng vào trực giác và hướng về phía trước!`);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ================= 4. MINIGAME ĐOÁN TÊN ANIME (FULL 50 NHÂN VẬT + ANIMATION ẢNH) =================
    if (interaction.commandName === "doananime") {
      await interaction.deferReply();
      
      // Danh sách chuẩn đủ 50 nhân vật Anime huyền thoại
      const ANIME_LIST = [
        { name: "Monkey D. Luffy", hint: "Thuyền trưởng mũ rơm, thích ăn thịt và có ước mơ làm Vua Hải Tặc" },
        { name: "Naruto Uzumaki", hint: "Ninja làng Lá, có Cửu Vĩ bên trong và miệng hô 'Dattebayo'" },
        { name: "Son Goku", hint: "Người Saiyan nuôi dưỡng ở Trái Đất, thích tỉ thí võ công" },
        { name: "Tanjiro Kamado", hint: "Thợ săn quỷ có vết sẹo trên trán, luôn mang theo em gái hóa quỷ" },
        { name: "Gojo Satoru", hint: "Thầy giáo tóc trắng mắt xanh mạnh nhất chú thuật hội" },
        { name: "Sasuke Uchiha", hint: "Thiên tài tộc Uchiha, sở hữu đôi mắt Sharingan" },
        { name: "Zoro Roronoa", hint: "Kiếm sĩ phái tam kiếm, nổi tiếng với kỹ năng 'mù đường'" },
        { name: "Saitama", hint: "Anh hùng đầu trọc đấm phát chết luôn một kẻ địch" },
        { name: "Eren Yeager", hint: "Nhân vật chính Attack on Titan với khát vọng tự do cháy bỏng" },
        { name: "Levi Ackerman", hint: "Đội trưởng chiến binh mạnh nhất nhân loại, cuồng sạch sẽ" },
        { name: "Light Yagami", hint: "Học sinh thiên tài nhặt được cuốn sổ tử thần Death Note" },
        { name: "Anya Forger", hint: "Cô bé đọc được suy nghĩ, thích ăn đậu phộng và biểu cảm 'Heh'" },
        { name: "Loid Forger", hint: "Điệp viên đỉnh cao có mật danh 'Twilight'" },
        { name: "Yor Forger", hint: "Sát thủ khét tiếng với mật danh 'Thương Công Chúa'" },
        { name: "Denji", hint: "Thợ săn quỷ cưa nghèo khổ, có ước mơ cực kỳ mặn mòi" },
        { name: "Power", hint: "Quỷ máu ngạo mạn, bạn thân của Denji" },
        { name: "Makima", hint: "Sĩ quan cấp cao điều khiển Chiếm Hữu ác quỷ quyền lực" },
        { name: "Katsuki Bakugo", hint: "Thiếu gia nổ tung cá tính mạnh, bạn thời thơ ấu của Deku" },
        { name: "Midoriya Izuku", hint: "Cậu bé vô năng nhận lại sức mạnh One For All từ All Might" },
        { name: "Jotaro Kujo", hint: "Chàng trai ngầu lòi với Stand Star Platinum và câu cửa miệng 'Yare yare daze'" },
        { name: "Nezuko Kamado", hint: "Cô em gái hóa quỷ ngậm ống tre đáng yêu" },
        { name: "Rem", hint: "Cô hầu gái tóc xanh trung thành trong Re:Zero" },
        { name: "Kaneki Ken", hint: "Chàng trai bán hoa sinh viên hóa thành bán quỷ một mắt" },
        { name: "Killua Zoldyck", hint: "Sát thủ thiên tài tóc bạc xuất thân từ gia đình khét tiếng Zoldyck" },
        { name: "Gon Freecss", hint: "Cậu bé tìm cha, sở hữu khả năng niệm hệ Tăng cường" },
        { name: "Edward Elric", hint: "Thiên tài thuật giả kim lùn nhưng cực kỳ nóng tính" },
        { name: "L Lawliet", hint: "Thám tử thiên tài nghiện đồ ngọt chuyên săn Kira" },
        { name: "Sano Manjiro", hint: "Tổng trưởng vô địch của băng Tokyo Manji (Mikey Vô Địch)" },
        { name: "Shinobu Kocho", hint: "Trùng trụ sử dụng độc dược hạ gục quỷ" },
        { name: "Rengoku Kyojuro", hint: "Viêm trụ hào sảng với câu nói 'Hãy thắp sáng ngọn lửa trong tim'" },
        { name: "Megumi Fushiguro", hint: "Pháp sư triệu hồi thức thần bóng tối trong Jujutsu Kaisen" },
        { name: "Yuji Itadori", hint: "Vật chứa của Nguyền Vương Sukuna, vận động viên điền kinh cao thủ" },
        { name: "Sukuna", hint: "Nguyền vương tàn ác ngàn năm" },
        { name: "Hinata Shouyou", hint: "Cánh chim bay cao, 'Giống lùn bay nhảy' của câu lạc bộ bóng chuyền Karasuno" },
        { name: "Kageyama Tobio", hint: "Chuyền hai thiên tài được mệnh danh là 'Vua sân đấu'" },
        { name: "Sung Jin-woo", hint: "Thợ săn yếu nhất biến thành Chúa tể bóng tối quyền năng" },
        { name: "Thorfinn", hint: "Chiến binh Viking tìm thấy con đường hòa bình thực sự" },
        { name: "Violet Evergarden", hint: "Búp bê ký ức tự động tìm hiểu ý nghĩa từ 'Tôi yêu em'" },
        { name: "Lelouch vi Britannia", hint: "Hoàng tử lưu vong sở hữu sức mạnh Geass thống trị người khác" },
        { name: "Aqua", hint: "Nữ thần nước vô dụng nhưng hài hước trong KonoSuba" },
        { name: "Megumin", hint: "Pháp sư cuồng ma pháp nổ tung một phát rồi ngất" },
        { name: "Rimuru Tempest", hint: "Slime siêu cấp bá đạo chuyển sinh quản lý cả quốc gia ma vật" },
        { name: "Inosuke Hashibira", hint: "Thợ săn quỷ đội đầu lợn rừng, hệ chiến xông pha" },
        { name: "Zenitsu Agatsuma", hint: "Thợ săn quỷ chuyên hệ ngủ gật mới bộc lộ sức mạnh sấm sét" },
        { name: "Shanks Tóc Đỏ", hint: "Tứ hoàng quyền uy cầm kiếm Gryphon, truyền cảm hứng cho Luffy" },
        { name: "Trafalgar Law", hint: "Bác sĩ tử thần sở hữu trái ác quỷ Ope Ope no Mi" },
        { name: "Portgas D. Ace", hint: "Anh trai quốc dân sử dụng sức mạnh lửa Mera Mera no Mi" },
        { name: "Boa Hancock", hint: "Nữ hoàng hải tặc tuyệt sắc quyến rũ mê mẩn Luffy" },
        { name: "Chisaki Kai", hint: "Kẻ phản diện đại tu sửa trong My Hero Academia" },
        { name: "Emilia", hint: "Thiếu nữ bán yêu bạc tóc trong Re:Zero" }
      ];
      
      const sel = ANIME_LIST[Math.floor(Math.random() * ANIME_LIST.length)];
      
      const startEmbed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle("🎮 THỬ TÁI ĐOÁN TÊN NHÂN VẬT ANIME")
        .setDescription(`💡 **Gợi ý:** *${sel.hint}*\n\n👉 Nhanh tay chat tên nhân vật vào kênh trong **30 giây** để nhận thưởng **1,000 xu**!`)
        .setFooter({ text: "Hệ thống đang chờ câu trả lời từ các thành viên..." });

      await interaction.editReply({ embeds: [startEmbed] });

      try {
        const collected = await interaction.channel.awaitMessages({ 
          filter: m => !m.author.bot && sel.name.toLowerCase().split(" ").some(part => m.content.toLowerCase().includes(part)), 
          max: 1, 
          time: 30000, 
          errors: ['time'] 
        });
        
        const winnerId = collected.first().author.id;
        let wEco = userEconomy.get(winnerId) || { balance: 1000, lastDaily: 0, streak: 0, plots: [null, null], rod: 'tre', fishes: [] };
        wEco.balance += 1000; 
        userEconomy.set(winnerId, wEco);

        // Tạo hình minh họa khi đoán đúng
        let attachment = null;
        try {
          const buf = await generateImage(`${sel.name} anime character portrait, high quality masterpiece`, false);
          attachment = new AttachmentBuilder(buf, { name: "character.png" });
        } catch(e) {}

        const winEmbed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle("🎉 ĐOÁN ĐÚNG NHÂN VẬT ANIME!")
          .setDescription(`Chính xác! Nhân vật đó là **${sel.name}**.\n🏆 Xin chúc mừng <@${winnerId}> đã giành chiến thắng và nhận **+1,000 xu**!`);

        if (attachment) {
          winEmbed.setImage("attachment://character.png");
          await interaction.channel.send({ embeds: [winEmbed], files: [attachment] });
        } else {
          await interaction.channel.send({ embeds: [winEmbed] });
        }

      } catch(e) { 
        // Hết giờ không ai trả lời
        let attachment = null;
        try {
          const buf = await generate                                         
