require('dotenv').config();
const { Telegraf } = require('telegraf');
const Redis = require('ioredis');

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.REDIS_URL || !process.env.BOT_USERNAME || !process.env.GROUP_OR_CHANNEL_LINK) {
    console.error("Missing required environment variables.");
    process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const redis = new Redis();

async function generateReferralLink(userId) {
    return `https://t.me/${process.env.BOT_USERNAME}?start=${userId}`;
}

async function getReferralCount(userId) {
    return redis.scard(`user:${userId}:referrals`);
}

bot.command('link', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const referralLink = await generateReferralLink(userId);
        await redis.sadd(`user:${userId}:links`, referralLink);
        ctx.reply(`Your referral link: ${referralLink}`);
    } catch (error) {
        console.error("Error in 'link' command:", error);
        ctx.reply("An error occurred while generating your referral link.");
    }
});

bot.command('referrals', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const referrals = await getReferralCount(userId);
        ctx.reply(`You have referred ${referrals} members.`);
    } catch (error) {
        console.error("Error in 'referrals' command:", error);
        ctx.reply("An error occurred while fetching your referrals.");
    }
});

bot.command('leaderboard', async (ctx) => {
    try {
        const allKeys = await redis.keys('user:*:referrals');
        const leaderboard = await Promise.all(allKeys.map(async (key) => {
            const userId = key.split(':')[1];
            const count = await redis.scard(key);
            const user = await bot.telegram.getChat(userId);
            return { name: user.username || user.first_name, count };
        }));

        leaderboard.sort((a, b) => b.count - a.count);
        const leaderboardText = leaderboard.map((entry, index) => `${index + 1}. ${entry.name}: ${entry.count}`).join('\n');
        ctx.reply(leaderboardText);
    } catch (error) {
        console.error("Error in 'leaderboard' command:", error);
        ctx.reply("An error occurred while generating the leaderboard.");
    }
});

bot.start(async (ctx) => {
    try {
        const payload = ctx.message.text.split(' ')[1]; // Corrected payload extraction
        const referrerId = payload ? payload.split('-')[0] : null;
        let message = `Welcome! Here is your link to the group/channel: ${process.env.GROUP_OR_CHANNEL_LINK}`;
        if (referrerId) {
            await redis.sadd(`user:${referrerId}:referrals`, ctx.from.id);
        }
        ctx.reply(message);
    } catch (error) {
        console.error("Error in 'start' command:", error);
        ctx.reply("An error occurred while processing your request.");
    }
});

bot.launch();

module.exports = (req, res) => {
    res.status(200).send('Bot is running');
};