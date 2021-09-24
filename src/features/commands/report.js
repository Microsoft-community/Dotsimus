const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageActionRow, MessageButton, MessageSelectMenu, MessageSelectOptionData, Constants, MessageEmbed } = require('discord.js');
const { report } = require('process');
const { promisify } = require('util')
const Report = require('../../reportObject.js');
const UserCases = require('../../userCases.js');
const db = require('../../db');
const { fetchRules } = require('./../../api/discord-gating');
const { values } = require('lodash');
const wait = promisify(setTimeout);
const MessageReports = require('../../reportTypes/message.js');
const { assert } = require('console');

function getMessageId (linkOrId) {
    if (!isNaN(linkOrId)) {
        return linkOrId;
    } else {
        const match = linkOrId.match('/discord.com/channels/([0-9]+)/([0-9]+)/([0-9]+)');
        return match[3];
    }
}

// Minimum time before allowing the user to report
const reportAwaitTime = 5000;
// Time before dropping the report to delete interactions.
// This is used to avoid resource leaks because of users creating many interactions and forgetting about them.
const reportTimeout = 30000;

const alreadyReportedText = 'You already reported this message.';
const alreadyReviewedText = 'This report was already reviewed by a moderator.';
const blockedReportingText = `You are prevented from reporting, this could be because you abused the system.\n
If you want more info, or if you think this is an error, contact moderators.`;
const warnText = 'You are about to report a message. Inappropriate use of reporting system may lead to punishment.';
const genericReportText = 'Report is pending a review, please note that this might take some time. You will receive a direct message once moderators review your report, make sure you have enabled them for this server!';
const noRulesDefinedText = 'No rule was found. Make sure this server is a community server and the bot has enough permission to fetch rules.';

// map of current report challenges by user
const userReportMap = new Map();

module.exports = {
    type: 'app',
    data: {
        name: 'Report message',
        type: Constants.ApplicationCommandTypes.MESSAGE,
        defaultPermission: true
    },

    async execute (client, interaction) {
        // disabled for Apple community
        const isPremium = await db.getServerConfig(interaction.guild.id).then(config => config[0]?.isSubscribed)
        const reportedMessage = interaction.options.getMessage('message');
        if (interaction.guild.id === '332309672486895637') {
            return interaction.reply({
                content: 'This functionality is currently disabled on this server, learn more over at [Dotsimus.com](https://dotsimus.com/).',
                ephemeral: true
            });
        }
        if (!isPremium) {
            return interaction.reply({
                content: 'This is a premium feature, learn more over at [Dotsimus.com](https://dotsimus.com/).',
                ephemeral: true
            });
        }
        if (!interaction.guild.rulesChannelId) {
            return await interaction.reply({
                content: 'Reports are supported only in community guilds.',
                ephemeral: true
            });
        }
        if (reportedMessage.author.bot) {
            return await interaction.reply({
                content: 'Message reports can not be used on bots.',
                ephemeral: true
            });
        }

        const rules = await fetchRules(interaction.guild.id);
        if (!rules) {
            return await interaction.reply({
                content: noRulesDefinedText,
                ephemeral: true
            });
        }

        if (!await canReport(interaction.user)) {
            return await interaction.reply({
                content: blockedReportingText,
                ephemeral: true
            });
        }

        let challenge;
        try {
            // create a report challenge to prevent users from trying to report the same message
            challenge = createUniqueChallenge(interaction.user, reportedMessage);
        } catch (e) {
            let error;
            if (e.message === 'already_exists') {
                error = 'You are already making a report for this message.';
            } else {
                error = e.message;
            }

            return await interaction.reply({
                content: error,
                ephemeral: true
            });
        }

        try {
            const reportData = await MessageReports.findReport(client, reportedMessage);
            removeChallenge(challenge);

            if (reportData.status === Report.ReportStatus.Pending) {
                return await interaction.reply({
                    content: alreadyReportedText,
                    ephemeral: true
                });
            } else {
                return await interaction.reply({
                    content: alreadyReviewedText,
                    ephemeral: true
                });
            }
        } catch (e) {
            // no existing report found
        }

        const awaitTimeSeconds = Math.floor(reportAwaitTime / 1000);
        await interaction.reply({
            embeds: [generateChallengeEmbed(challenge, `${warnText}\nYou will be allowed to report in ${awaitTimeSeconds} seconds.`)],
            ephemeral: true
        });

        // give the user a chance to read
        await wait(reportAwaitTime);

        const filter = (i) => {
            if (i.user.id !== interaction.user.id) {
                return false;
            }

            if (!i.message.embeds || !i.message.embeds[0].footer) {
                return false;
            }

            const list = i.message.embeds[0].footer.text.split(' ');
            const foundChallenge = list[0];
            const foundMessage = list[1];

            return foundChallenge == challenge.id && foundMessage == reportedMessage.id;
        };

        const cleanup = () => {
            collector.removeAllListeners();
            collector.stop('canceled');
            removeChallenge(challenge);
        };

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: reportTimeout
        });

        ruleList = [];

        collector.on('collect', async i => {
            if (i.customId === 'user_report_reason') {
                ruleList = i.values;
                i.deferUpdate();
            } else if (i.customId === 'user_report_cancel') {
                cleanup();

                await interaction.editReply({
                    embeds: [generateChallengeEmbed(null, `${warnText}`)],
                    components: []
                });

                await interaction.followUp({
                    embeds: [generateChallengeEmbed(null, 'The operation was canceled by the user.')],
                    ephemeral: true
                })
            }
        });

        collector.on('end', async (collected, reason) => {
            cleanup();

            await interaction.editReply({
                embeds: [generateChallengeEmbed(null, `${warnText}`)],
                components: []
            });

            await interaction.followUp({
                embeds: [generateChallengeEmbed(null, 'Message not reported in the mean time.')],
                ephemeral: true
            })
        });

        collector.on('collect', i => {
            if (i.customId === 'user_report_accept') {
                if (!ruleList.length) {
                    i.reply({
                        content: 'Please select one or more rules.',
                        ephemeral: true
                    });
                } else {
                    cleanup();

                    interaction.editReply({
                        embeds: [generateChallengeEmbed(null, `${warnText}`)],
                        components: []
                    });

                    handleSendReport(client, i, reportedMessage, ruleList.sort());
                }
            }
        })

        const timeoutSeconds = Math.floor(reportTimeout / 1000);
        await interaction.editReply({
            embeds: [generateChallengeEmbed(challenge, `${warnText}\n${timeoutSeconds} seconds before the report expires.`)],
            components: createReportComponents(rules, false)
        });
    }
}

module.exports.data.toJSON = function () {
    return module.exports.data;
}

function createUniqueChallenge (user, message) {
    let userReport = userReportMap.get(user.id);
    if (userReport) {
        const reportingMessage = userReport.current.get(message.id);
        if (reportingMessage) {
            throw new Error('already_exists');
        }
    } else {
        userReport = {
            user: user,
            current: new Map(),
            count: 0
        };

        userReportMap.set(user.id, userReport);
    }

    userReport.count++;
    userReport.current.set(message.id, message);
    return {
        id: userReport.count,
        userReport,
        messageId: message.id
    };
}

async function canReport (user) {
    return !await db.usedPreventedFromReport(user.id);
}

function removeChallenge (challenge) {
    challenge.userReport.current.delete(challenge.messageId);
    if (!challenge.userReport.current.size) {
        // if there is no pending report for the user, no need to keep track of them
        userReportMap.delete(challenge.userReport.user.id);
    }
}

function generateChallengeEmbed (challenge, text) {
    const footer = challenge ? `${challenge.id} ${challenge.messageId}` : '';

    return new MessageEmbed()
        .setTitle('Report')
        .setDescription(text)
        .setFooter(footer);
}

function buildSelectMenu (rules) {
    selects = [];
    rules.form_fields[0].values.forEach((element, index) => {
        const ruleNum = index + 1;
        selects.push({
            label: `Rule #${ruleNum}`,
            value: `${ruleNum}`,
            description: `${element.substring(0, 50)}...`
        });
    });

    return selects;
}

function createReportComponents (rules, shouldDisable) {
    return [
        new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('user_report_reason')
                    .setMinValues(1)
                    .setMaxValues(3)
                    .addOptions(buildSelectMenu(rules))
            ),
        new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('user_report_accept')
                    .setLabel('Accept')
                    .setStyle('SUCCESS')
                    .setDisabled(shouldDisable),
                new MessageButton()
                    .setCustomId('user_report_cancel')
                    .setLabel('Cancel')
                    .setStyle('DANGER')
            )
    ];
}

function createReportText (ruleList) {
    if (ruleList.length <= 1) {
        return `You have selected rule #${ruleList[0]}.`;
    } else {
        ruleText = "";
        ruleList.forEach((element, index) => {
            if (index) {
                if (index < ruleList.length - 1) {
                    ruleText += ', ';
                } else {
                    ruleText += ' and ';
                }
            }
            ruleText += `#${element}`;
        });

        return `You have selected rules ${ruleText}.`;
    }
}

async function handleSendReport (client, interaction, message, ruleList) {
    let report;
    try {
        report = await MessageReports.report(client, interaction.member, message, ruleList);
    } catch (e) {
        let error;
        switch (e.message) {
            case 'already_reported':
                error = alreadyReportedText;
                break;
            case 'already_reviewed':
                error = alreadyReviewedText;
                break;
            default:
                // let user (could be server managers) to know about why it fails
                error = `Failed to send the report to moderators: \`${e.message}\``;
                console.error(e);
                break;
        }

        interaction.reply({
            content: error,
            ephemeral: true
        });
        console.error(e);
        return;
    }

    const reportEmbed = Report.ReportEmbed.createBasicReportEmbed(report);
    const attachmentEmbedArray = Report.ReportEmbed.createAttachmentEmbedArray(report)

    let embedArray = [reportEmbed];
    attachmentEmbedArray.forEach(attachmentEmbed => {
        embedArray.push(attachmentEmbed)
    })

    interaction.reply({
        content: `${createReportText(ruleList)}. ${genericReportText} Your report:`,
        embeds: embedArray,
        ephemeral: true
    });
}
