const { User } = require('discord.js'),
    db = require('../../../db');

const Reports = require('../../../reportObject');
const MessageReports = require('../../../reportTypes/message');

module.exports = {
    name: 'modMessageApproveReport',
    type: 'button',
    description: 'Notify all reporters that this report is a valid one',
    async execute (client, interaction) {
        if (!interaction.member.permissions.serialize().KICK_MEMBERS) {
            interaction.reply({
                content: 'Insufficient permission to execute this command.'
            });
            return;
        }
        interaction.deferUpdate();

        let reportData;
        try {
            reportData = await MessageReports.Storage.findByGeneratedReport(client, interaction.message);
        } catch(e) {
            await interaction.reply({
                content: e.message
            });
            return;
        }

        reportObject = MessageReports.parseReport(client, reportData);

        for (let i = 0; i < reportObject.signalers.length; i++) {
            sendApprovalDM(reportObject.signalers[i]);
        }

        reportObject.status = Reports.ReportStatus.Approved;
        reportObject.reportedUser = await reportObject.reportedUser.fetch();
        reportObject.acceptor = interaction.member;
        reportObject.reportedContent.approve();

        await reportObject.investigation.edit({
            embeds: [ Reports.ReportEmbed.createModeratorReportEmbed(reportObject) ],
            components: []
        });

        if (reportObject.thread) {
            await reportObject.thread.setArchived(true);
        }
    }
};

async function sendApprovalDM(user) {
    const DM = await user.createDM();
    await DM.send({
        content: 'Thank you for the report! The moderation team has reviewed your report and took action.'
    });
}
