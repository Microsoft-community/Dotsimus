const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton } = require('discord.js');
const { report } = require('process');
const { promisify } = require('util')
const Report = require('../../reportObject.js');
const UserCases = require('../../userCases.js');

function getMessageId(linkOrId)
{
    if (!isNaN(linkOrId)) {
        return linkOrId;
    } else {
        const match = linkOrId.match('/discord.com/channels/([0-9]+)/([0-9]+)/([0-9]+)');
        return match[3];
    }
}

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Reports a message')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message link, or message ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason of the report')
                .setRequired(false)),

    async execute(client, interaction)
    {
        reason = interaction.options.getString('reason');
        messageLinkOrId = interaction.options.get('message').value;

        try
        {
            // try to get the message id from the link
            const messageId = getMessageId(messageLinkOrId);
            message = await interaction.channel.messages.fetch(messageId);
        }
        catch(e)
        {
            interaction.reply({
                content: 'Please input a valid Discord message link, or a valid message ID',
                ephemeral: true
            });
            return;
        }

        try
        {
            const report = await reportMessage(interaction.member, message, reason);

            await sendReport(client, report);

            if (report.signalers.length <= 1)
            {
                interaction.reply({
                    content: `Your report was successfully created. Report #${report.id}. The reported user: ${report.reportedContent.author}`,
                    ephemeral: true
                });
            }
            else
            {
                // one or more users reported before us
                interaction.reply({
                    content: `The report already exists but was boosted.  Report #${report.id}. The reported user: ${report.reportedContent.author}`,
                    ephemeral: true
                });
            }
        }
        catch(e)
        {
            interaction.reply({
                content: 'Report creation failed: ' + e,
                ephemeral: true
            });
        }
    }
}

async function reportMessage(member, message, reason) {
    // create a new message-related report
    const reportedContent = new Report.ReportedMessage(message);
    const report = new Report.ReportObject(
        message.guild,
        member,
        reason,
        reportedContent,
        message.author
    );

    report.id = 12345;
    return report;
}

async function sendReport(client, reportObject) {
    const embed = Report.ReportEmbed.createModeratorReportEmbed(reportObject);
    const components = [
        new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('reportApprovalAction')
                    .setLabel('Approve')
                    .setStyle('PRIMARY')
            )
            .addComponents(
                new MessageButton()
                    .setCustomId('reportRejectionAction')
                    .setLabel('Reject')
                    .setStyle('DANGER')
            )
    ];

    userCase = await UserCases.getOrCreateCase(client, reportObject.guild, reportObject.reportedUser, embed, components, 'New report');
    reportObject.thread = userCase.thread;
    reportObject.investigation = userCase.message;
}
