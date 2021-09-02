const Report = require('../reportObject.js');
const Storage = require('./storage/messageStorageDiscord.js');
const { Mutex, MutexInterface } = require('async-mutex');
const { MessageActionRow, MessageButton, User, ThreadChannel, Message, Guild } = require('discord.js');
const UserCases = require('../userCases.js');

class ReportedMessage extends Report.ReportedContentInterface {
    constructor(message) {
        super(message);

        this.reportType = 'Message';
        this.message = message;
        this.link = message.url;
        this.content = message.content;

        this.fields = {
            'Message ID': `${message.id}`
        };
    }

    static fromJSON(client, data) {
        const match = data.link.match('/channels/([0-9]+)/([0-9]+)/([0-9]+)');

        const reportedContent = new ReportedMessage(new Message(client, {
            id: data.message.id,
            guild_id: match[1],
            channel_id: match[2],
            content: data.content
        }));

        return reportedContent;
    }

    isSame() {
        return this.content == this.message.content;
    }

    async approve() {
        // approving will delete the message
        try {
            await this.message.delete();
        } catch(e) {
            // if the bot doesn't have right to delete the message
            // then maybe let moderators delete it
        }
    }

    getContent() {
        // return the content at the time of the report
        return this.content;
    }
}

const messageMutex = new Mutex();

module.exports = {
    parseReport(client, reportData) {
        const reportObject = new Report.ReportObject(
            new Guild(client, { id: reportData.guildId }),
            new User(client, { id: reportData.ownerId }),
            reportData.reason,
            ReportedMessage.fromJSON(client, reportData.reportedContent),
            new User(client, { id: reportData.reportedUserId })
        );

        reportObject.signalers = [];

        reportData.signalersId.forEach((id) => {
            reportObject.signalers.push(new User(client, { id }));
        });

        reportObject.thread = new ThreadChannel(reportObject.guild, { id: reportData.threadId }, client);
        reportObject.thread.name = '';
        reportObject.investigation = new Message(client, { id: reportData.investigationId });
        reportObject.investigation.channelId = reportObject.thread.id;

        return reportObject;
    },
    async findOrCreateReport(client, member, message, reason) {
        const reportedContent = new ReportedMessage(message);

        let reportData;
        try {
            reportData = await Storage.findByContentId(client, member.guild, message.author, message.id);
        } catch(e) {
            // create a new message-related report
            return new Report.ReportObject(
                message.guild,
                member,
                reason,
                reportedContent,
                message.author
            );
        }

        if (reportData.status !== Report.ReportStatus.Pending) {
            throw new Error('already_reviewed');
        }

        const existingMember = reportData.signalersId.find(id => id === member.id);
        //if (existingMember) throw new Error('already_reported');

        const reportObject = this.parseReport(client, reportData);
        // boost by adding the new member
        reportObject.signalers.push(member);
        reportObject.reportedUser = await reportObject.reportedUser.fetch(false);

        return reportObject;
    },
    async findReport(client, message) {
        const reportData = await Storage.findByContentId(client, message.guild, message.author, message.id);
        return reportData;
    },
    async report(client, member, message, reason) {
        const reportObject = await this.findOrCreateReport(client, member, message, reason);

        const embed = Report.ReportEmbed.createModeratorReportEmbed(reportObject);
        const components = [
            new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('modMessageApproveReport')
                        .setLabel('Approve')
                        .setStyle('PRIMARY')
                )
                .addComponents(
                    new MessageButton()
                        .setCustomId('modMessageRejectReport')
                        .setLabel('Reject')
                        .setStyle('DANGER')
                )
        ];

        let userCase;
        if (!reportObject.investigation) {
            userCase = await UserCases.createCase(client, reportObject.guild, reportObject.reportedUser, embed, components, 'New report');
        } else {
            userCase = await UserCases.modifyCase(reportObject.investigation, embed, components);
        }
    
        reportObject.thread = userCase.thread;
        reportObject.investigation = userCase.message;

        await Storage.store(reportObject);

        return reportObject;
    }
}

module.exports.Storage = Storage;
module.exports.ReportedMessage = ReportedMessage;
