const { Client } = require('discord.js'),
    db = require('../../../db');

const Reports = require('../../../reportObject');
const MessageReports = require('../../../reportTypes/message');

module.exports = {
    name: 'modMessageRejectReport',
    type: 'button',
    description: 'Reject and notify all reporters that no action will be taken',
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

        reportedContent = MessageReports.ReportedMessage.fromJSON(reportData.reportedContent);
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
    }
};

async function sendRejectDM(user) {
    const DM = await user.createDM();
    await DM.send({
        content: 'Following your report, the moderation team has estimated that the message is not against the server rules.\n'
            + 'If you think this is an error, please contact a moderator through the moderation mail.'
    });
}
