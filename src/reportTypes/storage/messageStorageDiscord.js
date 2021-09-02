/**
 * Uses Discord as a storage for reports, this is a workaround till a proper database is used for report references.
 */

const UserCases = require('../../userCases.js');
const Report = require('../../reportObject.js');

module.exports.findByContentId = async function findByContentId(client, guild, user, id) {
    const channel = await UserCases.getChannelForCases(client, guild);
    const thread = await UserCases.findThreadCase(channel, user);

    const messages = await thread.messages.fetch({ limit: 50 });
    // filter messages created by the bot
    message = messages.find(m => {
        if (!m.embeds || !m.embeds.length) return false;
        if (m.embeds.length > 1) return false;

        const embed = m.embeds[0];
        if (!embed.fields) return false;
        const messageId = embed.fields.find(f => f.name === 'Message ID' && f.value == id);
        return messageId !== undefined;
    });

    if (!message) {
        throw new Error('report not found');
    }

    parseMessage(message);
    return message;
};

module.exports.findByGeneratedReport = async function findByGeneratedReport(client, message) {
    return parseMessage(message);
}

module.exports.store = async function store(client, guild, user, id) {
    // this function doesn't make effect because this storage uses Discord
}

function parseMessage(message) {
    const embed = message.embeds[0];
    const messageId = embed.fields.find(f => f.name === 'Message ID');

    const reportersField = embed.fields.find(f => f.name === 'Reported by');
    if (!reportersField) throw new Error('No owner for this report');
    const reasonField = embed.fields.find(f => f.name == 'Rules');
    const statusField = embed.fields.find(f => f.name == 'Status');
    const reportIdField = embed.fields.find(f => f.name === 'ID');
    const contentField = embed.fields.find(f => f.name === 'Content');
    const linkField = embed.fields.find(f => f.name === 'Context link');
    const userIdField = embed.fields.find(f => f.name === 'User ID');

    signalers = [];

    reporterList = reportersField.value.split('|');
    reporterList.forEach((element) => {
        const id = parseId(element);
        signalers.push(id);
    });

    return {
        id: reportIdField?.value,
        guildId: message.guild.id,
        ownerId: signalers[0],
        reportedUserId: parseId(userIdField?.value),
        reportedContent: {
            link: linkField?.value,
            content: contentField?.value,
            message: {
                id: messageId.value
            }
        },
        signalersId: signalers,
        status: statusField?.value,
        reason: reasonField?.value,
        investigationId: message.id,
        threadId: message.channel.id
    };
}

function parseId(string) {
    const match = string.match(/<@([0-9]*)>/);
    return match[1];
}
