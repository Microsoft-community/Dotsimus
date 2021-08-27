const { User } = require('discord.js'),
    db = require('../../../db');

const Reports = require('../../../reportObject');
const MessageReports = require('../../../reportTypes/message');

module.exports = {
    name: 'modMessageApproveReport',
    type: 'button',
    description: 'Notify all reporters that this report is a valid one',
    async execute (client, interaction) {
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
    }
};

async function sendApprovalDM(user) {
    const DM = await user.createDM();
    await DM.send({
        content: 'The moderation team has reviewed your report and took appropriate actions. The reported content was found to be against the server rules, we thank you for your report'
    });
}
