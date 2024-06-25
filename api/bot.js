const { Telegraf } = require('telegraf');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const redis = new Redis(process.env.REDIS_URL);

// Commands
bot.command('link', async (ctx) => {
    const userId = ctx.from.id;
    const referralLink = `https://t.me/testingBotApi_bot?start=${userId}`;
    await redis.sadd(`user:${userId}:links`, referralLink);
    ctx.reply(`Your referral link: ${referralLink}`);
});

bot.command('referrals', async (ctx) => {
    const userId = ctx.from.id;
    const referrals = await redis.scard(`user:${userId}:referrals`);
    ctx.reply(`You have referred ${referrals} members.`);
});

bot.command('leaderboard', async (ctx) => {
    const allKeys = await redis.keys('user:*:referrals');
    const leaderboard = [];

    for (const key of allKeys) {
        const userId = key.split(':')[1];
        const count = await redis.scard(key);
        const user = await bot.telegram.getChat(userId);
        leaderboard.push({ name: user.username || user.first_name, count });
    }

    leaderboard.sort((a, b) => b.count - a.count);
    const leaderboardText = leaderboard.map((entry, index) => `${index + 1}. ${entry.name}: ${entry.count}`).join('\n');
    ctx.reply(leaderboardText);
});

// Referral tracking
bot.start(async (ctx) => {
    const referrerId = ctx.startPayload.split('-')[0];
    if (referrerId) {
        await redis.sadd(`user:${referrerId}:referrals`, ctx.from.id);
        ctx.reply('Welcome! Here is your link to the group/channel: https://t.me/+qKanFchZSsBmNDU0');
    } else {
        ctx.reply('Welcome! Here is your link to the group/channel: https://t.me/+qKanFchZSsBmNDU0');
    }
});

bot.launch();


module.exports = (req, res) => {
    res.status(200).send('Bot is running');
};