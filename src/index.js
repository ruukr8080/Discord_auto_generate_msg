// index.js
const { Client, GatewayIntentBits } = require("discord.js");
const { readdirSync } = require("fs");
const path = require("path");
const cron = require("node-cron");
const fs = require("fs");

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; // 여기에 봇 토큰을 넣어주세요.
const TARGET_FORUM_CHANNEL_ID = process.env.TARGET_FORUM_CHANNEL_ID; // 여기에 포럼 채널 ID를 넣어주세요.
const MENTION_ROLE_ID = process.env.MENTION_ROLE_ID; // 여기에 알림을 보낼 역할 ID를 넣어주세요.
const QUESTIONS_FILE_PATH = path.join(__dirname, "questions.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// src/events 폴더의 모든 이벤트 핸들러를 동적으로 불러옵니다.
const eventFiles = readdirSync(path.join(__dirname, "events")).filter((file) =>
  file.endsWith(".js")
);
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// 매일 오후 1시(13시)에 스케줄 실행하여 스레드를 생성합니다.
cron.schedule(
  "0 13 * * *",
  async () => {
    console.log("매일 13시에 스레드 생성 작업 실행.");

    const forumChannel = client.channels.cache.get(TARGET_FORUM_CHANNEL_ID);
    if (!forumChannel) {
      console.error("포럼 채널을 찾을 수 없습니다.");
      return;
    }

    let questions = [];
    try {
      const fileData = fs.readFileSync(QUESTIONS_FILE_PATH, "utf8");
      questions = JSON.parse(fileData);
    } catch (error) {
      console.error("질문 파일을 읽는 중 에러 발생:", error.message);
      return;
    }

    if (questions.length === 0) {
      console.warn("질문이 없습니다.");
      return;
    }

    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];
    const threadContent =
      `# 오늘의 ${randomQuestion.category.toUpperCase()} 질문\n` +
      `Q. ${randomQuestion.question}\n\n` +
      `## 답변 방법\n` +
      `아래에 자동으로 생성되는 스레드에서 답변해주세요!\n` +
      `카테고리: ${randomQuestion.category} | 인덱스: ${randomQuestion.index})`;

    try {
      const thread = await forumChannel.send({
        content: threadContent,
        name: `면접 질문: ${randomQuestion.question.substring(0, 50)}...`,
        autoArchiveDuration: 60,
      });

      console.log(`새 스레드 생성 완료`);

      // 알림 기능
      await thread.send({
        content: `<@&${MENTION_ROLE_ID}> 새로운 면접 질문 스레드가 생성되었습니다!`,
        allowedMentions: { roles: [MENTION_ROLE_ID] },
      });
    } catch (error) {
      console.error("스레드 생성 또는 알림 전송 중 에러 발생:", error);
    }
  },
  {
    timezone: "Asia/Seoul",
  }
);

client.login(BOT_TOKEN);
