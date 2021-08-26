db = require('./db');

class UserCase {
    constructor(thread, message) {
        this.thread = thread;
        this.message = message;
    }
}
  
module.exports = {
    async getOrCreateCase(client, guild, user, embed, components, reason) {
        alerts = await db.getAlerts(guild.id);
        alert = alerts.find(a => a.serverId == guild.id);
        if (alert) {
            channelId = alert.channelId;
        } else {
            channelId = "880186175057444914";
        }

        channel = await client.guilds.cache.get(guild.id).channels.fetch(channelId);

        thread = await findThreadCase(channel, user);

        if (thread) {
            await thread.setArchived(false);

            userCase = await createCaseOnThread(thread, embed, components);
        } else {
            userCase = await createThreadCase(channel, user, embed, components, reason);
        }

        // pin the latest case
        pinCase(userCase);

        return userCase;
    }
}

module.exports.UserCase = UserCase;

async function findThreadCase(channel, user) {
    threadList = await channel.threads.fetch({
        active: true
    });

    return await threadList.threads.find(
        thread => {
            return thread.name.split(/ +/g).slice(-1)[0] === user.id;
        }
    );
}

async function createCaseOnThread(thread, embed, components) {
    await thread.setArchived(false);

    const message = await thread.send({
        content: '@here',
        embeds: [embed],
        components: components
      });

    // FIXME: add moderators to the thread

    return new UserCase(thread, message);
}

async function createThreadCase(channel, user, embed, components, reason) {
    const thread = await channel.threads.create({
        name: `${user.username.slice(0, 10)} ${user.id}`,
        autoArchiveDuration: 1440,
        reason: reason,
      });

    return await createCaseOnThread(thread, embed, components);
}

async function pinCase(userCase) {
    // fetch & unpin the latest pinned message
    const pins = await userCase.thread.messages.fetchPinned();
    if (pins.size >= 49) pins.last().unpin();
    userCase.message.pin(true);
}
