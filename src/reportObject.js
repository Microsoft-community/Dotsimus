const { MessageEmbed } = require('discord.js');

const ReportStatus = {
    Pending: 'Pending',
    Validated: 'Validated',
    Rejected: 'Rejected'
};

class ReportedContentInterface {
    constructor() {
        this.reportType = "Unknown";
        this.link = "";
    }

    /**
     * Returns whether or not the content is the same or has changed since then
     * @returns True if same.
     */
    isSame() {
        throw "unimplemented";
        return false;
    }

    /**
     * Called when the report has been approved.
     */
    approve() {
        throw "unimplemented";
    }

    /**
     * Returns the content text to display.
     * @returns content string.
     */
    getContent() {
        throw "unimplemented";
        return "";
    }
}

class ReportedMessage extends ReportedContentInterface {
    constructor(message) {
        super(message);

        this.reportType = "Message";
        this.message = message;
        this.link = message.url;
        this.content = message.content;
    }

    isSame() {
        return this.content == this.message.content;
    }

    approve() {
        // approving will delete the message
        try
        {
            this.message.delete();
        }
        catch(e)
        {
            // if the bot doesn't have right to delete the message
            // then maybe let moderators delete it
        }
    }

    getContent() {
        // return the content at the time of the report
        return this.content;
    }
}

class ReportObject {
    constructor(guild, author, reason, content, reportedUser) {
        this.id = 0;
        this.guild = guild;
        this.owner = author;
        this.reportedContent = content;
        this.reportedUser = message.author;
        this.signalers = [ author ];
        this.reason = reason;
        this.investigation = 0;
        this.thread = 0;
        this.status = ReportStatus.Pending;
        this.acceptor = 0;
        this.actionTaken = null;
    }

    setOwner(user) {
        this.owner = user;
        this.signalers = [ user ];
    }

    boost(user) {
        this.signalers.push(user);
    }
}

class ReportEmbed {
    static createBasicReportEmbed(reportObject) {
        let embed = new MessageEmbed()
            .setTitle(`Report ${reportObject.id}`)
            .setAuthor(reportObject.reportedUser.tag, reportObject.reportedUser.displayAvatarURL())
            .addFields(
                { name: 'User ID', value: reportObject.reportedUser.toString() },
                { name: 'Type', value: reportObject.reportedContent.reportType }
            );

        if (reportObject.reason) {
            embed = embed.addFields(
                { name: 'Reason', value: reportObject.reason, inline: true }
            );
        }

        embed = embed.addFields(
            { name: 'Content', value: reportObject.reportedContent.getContent() },
            { name: 'Context link', value: reportObject.reportedContent.link }
        );

        return embed;
    }

    static createModeratorReportEmbed(reportObject) {
        let embed = ReportEmbed.createBasicReportEmbed(reportObject)
            .addFields(
                { name: 'ID', value: reportObject.id.toString(), inline: true },
                { name: 'Status', value: reportObject.status, inline: true },
                { name: 'Reported by', value: reportObject.owner.toString(), inline: true }
            );

        if (reportObject.status != ReportStatus.Pending) {
            if (reportObject.acceptor != null) {
                embed = embed.addFields(
                    { name: 'Reviewed by', value: reportObject.acceptor }
                );
            }

            if (reportObject.actionTaken != null) {
                embed = embed.addFields(
                    { name: 'Action taken', value: reportObject.actionTaken }
                );
            }
        }

        return embed;
    }
};

module.exports.ReportObject = ReportObject;
module.exports.ReportStatus = ReportStatus;
module.exports.ReportedMessage = ReportedMessage;
module.exports.ReportEmbed = ReportEmbed;
