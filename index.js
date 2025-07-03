require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");
const GenAI = require("@google/generative-ai");

const twitterClient = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

const genAI = new GenAI.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const generationConfig = { maxOutputTokens: 400 };
const INTERVAL = 6 * 60 * 60; // 6 jam (21600 detik)

// 🔍 Trending keyword (kode 23424846 = Indonesia)
async function getTrendingTopics() {
  try {
    const trends = await twitterClient.v1.trendsByPlace(23424846);
    const trending = trends[0].trends.slice(0, 5);
    return trending.map(t => t.name.replace(/^#/, "")).join(", ");
  } catch (error) {
    console.error("❌ Gagal ambil trending:", error);
    return "crypto, web3, airdrops"; // fallback
  }
}

// 🧠 Generate tweet dari Gemini
async function generateTweet() {
  const trendingKeywords = await getTrendingTopics();
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.0-flash",
    generationConfig,
  });

  const prompt = `Create a creative tweet about crypto, airdrops or meme content. Use these keywords if possible: ${trendingKeywords}. 
It must be useful, funny, or insightful. Under 280 characters, text only, emojis allowed.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tweet = response.text();
    console.log("🧠 Tweet generated:\n", tweet);
    await sendTweet(tweet);
  } catch (err) {
    console.error("❌ Error generating tweet:", err);
  }
}

// 🐦 Kirim tweet
async function sendTweet(tweetText) {
  try {
    await twitterClient.v2.tweet(tweetText);
    console.log("✅ Tweet sent successfully!");
  } catch (error) {
    console.error("❌ Error sending tweet:", error);
  }
}

// ⏱️ Countdown mundur
function countdown(seconds) {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      process.stdout.write(`⏳ Next tweet in ${seconds}s\r`);
      seconds--;
      if (seconds < 0) {
        clearInterval(interval);
        process.stdout.write("\n");
        resolve();
      }
    }, 1000);
  });
}

// 🔁 Posting 4 kali sehari
async function runPostingLoop() {
  for (let i = 1; i <= 4; i++) {
    console.log(`\n🚀 Posting #${i} dari 4 hari ini`);
    await generateTweet();
    if (i < 4) {
      await countdown(INTERVAL); // 6 jam antar tweet
    }
  }
}

// ♾️ Loop selamanya
async function runForever() {
  while (true) {
    await runPostingLoop();
    console.log("😴 Istirahat 24 jam sebelum hari berikutnya...");
    await countdown(24 * 60 * 60); // Tunggu 1 hari penuh
  }
}

// 🟢 Jalankan
runForever();
