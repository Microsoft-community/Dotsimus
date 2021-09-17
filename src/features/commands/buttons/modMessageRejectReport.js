const { Client } = require('discord.js'),
    db = require('../../../db');

const Reports = require('../../../reportObject');
const MessageReports = require('../../../reportTypes/message');

module.exports = {
    name: 'modMessageRejectReport',
    type: 'button',
    description: 'Reject and notify all reporters that no action will be taken',
    async execute (client, interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.permissions.serialize().KICK_MEMBERS) {
            interaction.editReply({
                content: 'Insufficient permission to execute this command.',
                ephemeral: true
            });
            return;
        }

        let reportData;
        try {
            reportData = await MessageReports.Storage.findByGeneratedReport(client, interaction.message);
        } catch(e) {
            await interaction.editReply({
                content: e.message
            });
            console.error(e);
            return;
        }

        reportObject = MessageReports.parseReport(client, reportData);

        for (let i = 0; i < reportObject.signalers.length; i++) {
            sendRejectDM(reportObject.signalers[i]);
        }

        reportObject.status = Reports.ReportStatus.Rejected;
        reportObject.reportedUser = await reportObject.reportedUser.fetch();
        reportObject.acceptor = interaction.member;

        await reportObject.investigation.edit({
            embeds: [ Reports.ReportEmbed.createModeratorReportEmbed(reportObject) ],
            components: []
        });

        if (reportObject.thread) {
            await reportObject.thread.setArchived(true);
        }
    
        interaction.editReply({
            content: `Rejected by ${interaction.member.toString()}`
        });
    }
};

async function sendRejectDM(user) {
    const DM = await user.createDM();
    await DM.send({
        content: 'Thank you for your report! The moderation team has looked into the report and didn\'t take any action.\n'
            + 'If you think this is an error, please contact a moderator through the moderation team.'
    });
}
