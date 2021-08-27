const { MessageEmbed } = require('discord.js');

const ReportStatus = {
    Pending: 'Pending',
    Approved: 'Approved',
    Rejected: 'Rejected'
};

class ReportedContentInterface {
    constructor() {
        this.reportType = "Unknown";
        this.link = "";
        this.fields = {};
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

class ReportObject {
    constructor(guild, author, reason, content, reportedUser) {
        this.id = 0;
        this.guild = guild;
        this.owner = author;
        this.reportedContent = content;
        this.reportedUser = reportedUser;
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
    static normalizeReason(rules) {
        if (Array.isArray(rules)) {
            let ruleStr = '';
            rules.forEach((element, index) => {
                if (index) ruleStr += '/';
                ruleStr += element.toString();
            })

            return ruleStr;
        } else if (typeof rules === 'string') {
            return rules;
        } else {
            return rules.toString();
        }
    }
    static createBasicReportEmbed(reportObject) {
        let embed = new MessageEmbed()
            .setTitle(`Report ${reportObject.id}`)
            .setAuthor(reportObject.reportedUser.tag, reportObject.reportedUser.displayAvatarURL())
            .addFields(
                { name: 'ID', value: reportObject.id.toString(), inline: true },
                { name: 'User ID', value: reportObject.reportedUser.toString() },
                { name: 'Type', value: reportObject.reportedContent.reportType }
            );

        if (reportObject.reason) {
            embed = embed.addFields(
                { name: 'Rules', value: ReportEmbed.normalizeReason(reportObject.reason), inline: true }
            );
        }

        Object.entries(reportObject.reportedContent.fields).forEach(([key, value]) => {
            embed = embed.addFields({ name: key, value });
        });

        embed = embed.addFields(
            { name: 'Content', value: reportObject.reportedContent.getContent() },
            { name: 'Context link', value: reportObject.reportedContent.link }
        );

        return embed;
    }

    static createModeratorReportEmbed(reportObject) {
        let reporters = reportObject.owner.toString();
        if (reportObject.signalers.length > 1) {
            // add boosters to the list
            reportObject.signalers.forEach((element, index) => {
                if (!index) return;
                reporters += ` | <@${element.id}>`;
            });
        }

        let embed = ReportEmbed.createBasicReportEmbed(reportObject)
            .addFields(
                { name: 'Status', value: reportObject.status, inline: true },
                { name: 'Reported by', value: reporters, inline: true }
            );

        if (reportObject.status != ReportStatus.Pending) {
            if (reportObject.acceptor) {
                embed = embed.addFields(
                    { name: 'Reviewed by', value: reportObject.acceptor.toString() }
                );
            }

            if (reportObject.actionTaken) {
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
module.exports.ReportEmbed = ReportEmbed;
module.exports.ReportedContentInterface = ReportedContentInterface;
