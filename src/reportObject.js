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
    isSame () {
        throw "unimplemented";
        return false;
    }

    /**
     * Called when the report has been approved.
     */
    approve () {
        throw "unimplemented";
    }

    /**
     * Returns the content text to display.
     * @returns content string.
     */
    getContent () {
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
        this.signalers = [author];
        this.reason = reason;
        this.investigation = 0;
        this.thread = 0;
        this.status = ReportStatus.Pending;
        this.acceptor = 0;
        this.actionTaken = null;
    }

    setOwner (user) {
        this.owner = user;
        this.signalers = [user];
    }

    boost (user) {
        this.signalers.push(user);
    }
}

class ReportEmbed {
    static normalizeReason (rules) {
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

    static createBasicReportEmbed (reportObject) {
        let embed = new MessageEmbed()
            .setTitle(`❗ Message Reported`)
            .setURL(reportObject.reportedContent.link)
            .setAuthor(reportObject.reportedUser.tag, reportObject.reportedUser.displayAvatarURL());

        if (reportObject.reason) {
            embed = embed.addField('Rule(s)', ReportEmbed.normalizeReason(reportObject.reason), true);
        }
    
        let footerContent = `User ID: ${reportObject.reportedUser.id}`;
        Object.entries(reportObject.reportedContent.fields).forEach(([key, value]) => {
            footerContent += `  •  ${key}: ${value}`;
        });
        embed = embed.setFooter(footerContent)

        if (!reportObject.reportedContent.getContent()) {
            embed = embed.addField('Type', 'Attachment(s)', true);
        } else {
            embed = embed.addFields(
                { name: 'Type', value: reportObject.reportedContent.reportType, inline: true },
                { name: 'Content', value: reportObject.reportedContent.getContent().length > 1024 ? reportObject.reportedContent.getContent().slice(0, 1021).padEnd(1024, '.') : reportObject.reportedContent.getContent(), inline: true }
            );
        }

        return embed;
    }
    
    static createAttachmentEmbedArray (reportObject) {
        const embeds = [];
        let attachmentCount = 0;
        reportObject.reportedContent.message.attachments.forEach(attachment => {
            let urlSplits = attachment.url.split('/');
            let embed = new MessageEmbed()
                .setTitle(urlSplits[urlSplits.length - 1])
                .setImage(attachment.url)
                .setFooter(`${attachmentCount += + 1}  •  Attachment ID: ${urlSplits[5]}`);
            embeds.push(embed);
        });
        return embeds;
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

        let embeds = [embed];
        ReportEmbed.createAttachmentEmbedArray(reportObject).forEach(attachmentEmbed => {
            embeds.push(attachmentEmbed)
        })

        return embeds;
    }
};

module.exports.ReportObject = ReportObject;
module.exports.ReportStatus = ReportStatus;
module.exports.ReportEmbed = ReportEmbed;
module.exports.ReportedContentInterface = ReportedContentInterface;
