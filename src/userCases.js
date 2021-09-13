db = require('./db');

class UserCase {
    constructor(thread, message) {
        this.thread = thread;
        this.message = message;
    }
}
  
module.exports = {
    /**
     * Create a new case about an user.
     * @param {*} client
     * @param {*} guild which guild to create the case on.
     * @param {*} user which user this case belongs to.
     * @param {*} embed
     * @param {*} components
     * @param {*} reason the reason as to why this case is being created.
     * @returns user case object.
     */
    async createCase(client, guild, user, embed, components, reason) {
        const channel = await this.getChannelForCases(client, guild);
        const thread = await this.findThreadCase(channel, user);

        if (thread) {
            await thread.setArchived(false);

            userCase = await createCaseOnThread(thread, embed, components);
        } else {
            userCase = await createThreadCase(channel, user, embed, components, reason);
        }

        // pin the latest case
        pinCase(userCase);

        return userCase;
    },
    /**
     * This method will modify an existing case by removing the message and creating a new message.
     * @param {*} message the case's message to modify
     * @param {*} embed
     * @param {*} components
     * @returns new user case.
     */
    async modifyCase(message, embed, components) {
        await message.delete();
        const thread = message.channel;

        // create a new case so mods get pinged again
        const userCase = await createCaseOnThread(thread, embed, components);

        // pin the latest case
        pinCase(userCase);

        return userCase;
    },

    async getChannelForCases(client, guild) {
        alerts = await db.getAlerts(guild.id);
        alert = alerts.find(a => a.serverId == guild.id);
        if (!alert) {
            throw 'No alert was setup.';
        }
        channelId = alert.channelId;

        return await guild.channels.fetch(channelId);
    },

    async findThreadCase(channel, user) {
        // fetch all threads, even archived one
        let threadList = await channel.threads.fetch({ active: true });
        const thread = await this.findThreadCaseList(threadList, user);
        if (thread) {
            return thread;
        }

        // have to fetch active and archived threads separately
        threadList = await channel.threads.fetch({ archived: {
            fetchAll: true
        } });
    
        return await this.findThreadCaseList(threadList, user);
    },

    async findThreadCaseList(threadList, user) {
        return await threadList.threads.find(
            thread => {
                return thread.name.split(/ +/g).slice(-1)[0] === user.id;
            }
        );
    }
}

module.exports.UserCase = UserCase;

async function createCaseOnThread(thread, embed, components) {
    await thread.setArchived(false);

    const message = await thread.send({
        content: '@here',
        embeds: [embed],
        components: components
    });

    //channelMembersWithAccess = await client.guilds.cache.get(server.id).channels.fetch(alert.channelId).then(channel => (channel.members.filter((member) => ((member.permissions.serialize().KICK_MEMBERS || hardCodedApplePerms(member)) && member.presence !== null && member.presence?.status !== 'offline' && member.user?.bot === false))));

    // FIXME: add moderators to the thread

    return new UserCase(thread, message);
}

async function createThreadCase(channel, user, embed, components, reason) {
    try {
        const thread = await channel.threads.create({
            name: `${user.username.slice(0, 10)} ${user.id}`,
            autoArchiveDuration: 1440,
            reason: reason,
        });

        return await createCaseOnThread(thread, embed, components);
    } catch(e) {
        console.log(`Couldn't create a thread on this server: ${e}`);
        throw e;
    }
}

async function pinCase(userCase) {
    // fetch & unpin the latest pinned message
    const pins = await userCase.thread.messages.fetchPinned();
    if (pins.size >= 49) pins.last().unpin();
    userCase.message.pin(true);
}
