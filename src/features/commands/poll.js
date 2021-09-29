const {
    MessageActionRow,
    MessageSelectMenu,
    MessageButton,
    MessageEmbed
} = require('discord.js'),
    {
        SlashCommandBuilder
    } = require('@discordjs/builders'),
    db = require('../../db'),
    strawpoll = require('../../api/strawpoll'),
    QuickChart = require('quickchart-js');
module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Creates a poll.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Creates a poll.')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title for the poll.')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('allow-multiple-answers')
                        .setDescription('Choose whether to allow multiple answers in the poll or not.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('choice-a')
                        .setDescription('First choice.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('choice-b')
                        .setDescription('Second choice.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('choice-c').setDescription('Third choice.'))
                .addStringOption(option =>
                    option.setName('choice-d').setDescription('Fourth choice.'))
                .addStringOption(option =>
                    option.setName('choice-e').setDescription('Fifth choice.')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists polls that were created in this server.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('results')
                .setDescription('Displays results of a poll.')
                .addStringOption(option => option.setName("poll-id").setDescription("The poll ID to get results from.").setRequired(true))),
    async execute(client, interaction) {
        const pollTitle = interaction.options.getString("title");
        const pollChoices = [interaction.options.getString("choice-a"), interaction.options.getString("choice-b"), interaction.options.getString("choice-c"), interaction.options.getString("choice-d"), interaction.options.getString("choice-e")].filter((a) => a);

        if (!interaction.guild) {
            interaction.reply({ content: 'You can only use this command in servers!', ephemeral: true });
            return;
        }

        switch (interaction.options._subcommand) {
            case "create":
                const multipleAnswersAllowed = interaction.options.getBoolean('allow-multiple-answers', true);
                strawpoll.createStrawpoll(pollTitle, pollChoices, multipleAnswersAllowed).then(response => {
                    db.createPoll(interaction.member.user.id, interaction.guild.id, `${pollTitle}:${response.pollId}`).then(resp => {
                        const publicPollEmbed = new MessageEmbed()
                            .setColor("#0099ff")
                            .setTitle(`Poll: ${pollTitle}`)
                            .setDescription(`You can vote [here](https://strawpoll.com/${response.pollId}).`)
                            .setFooter(`Poll ID: ${response.pollId}`);

                        interaction.reply({ embeds: [publicPollEmbed] });
                    });
                });
                break;
            case "list":
                db.getPolls(interaction.guild.id).then(polls => {
                    if (!polls.length) {
                        interaction.reply({
                            content: 'There are no polls in this server.',
                            ephemeral: true
                        });
                        return;
                    }
                    const title = polls[0].polls,
                        listEmbed = new MessageEmbed()
                            .setColor('#0099ff')
                            .setTitle('Created polls')
                            .setDescription(title.map((pollTitle) => `⦿ [${pollTitle.split(':')[0]}](https://strawpoll.com/${pollTitle.split(':')[1]})`).join('\n'));
                    interaction.reply({
                        embeds: [listEmbed],
                        ephemeral: true,
                    })
                });
                break;
            case "results":
                const pollId = interaction.options.getString("poll-id", true);

                db.getPolls(interaction.guild.id).then(polls => {
                    if (!polls.length) {
                        interaction.reply({
                            content: 'There are no polls in this server.',
                            ephemeral: true
                        });
                        return;
                    }
                    strawpoll.getStrawpollResults(pollId).then(resp => {
                        const quickChartClient = new QuickChart();
                        let answers = [],
                        votes = [],
                        stringEmbed = '';

                        for (let i = 0; i < resp.pollAnswersArray.length; i++) {
                            answers.push(resp.pollAnswersArray[i].answer);
                            votes.push(resp.pollAnswersArray[i].votes);
                            stringEmbed += `${resp.pollAnswersArray[i].answer}: ${resp.pollAnswersArray[i].votes}\n`;
                        }

                        quickChartClient.setConfig({
                            type: 'bar',
                            data: { labels: answers, datasets: [{ label: 'Votes', data: votes }] },
                        });

                        quickChartClient.setBackgroundColor("#ffffff");

                        const resultsEmbed = new MessageEmbed()
                            .setColor("#0099ff")
                            .setTitle("Poll results")
                            .addFields(
                                { name: 'In text', value: stringEmbed },
                                { name: 'In a chart', value: `[Chart image link](${quickChartClient.getUrl()})` }
                            )
                            .setImage(quickChartClient.getUrl());

                        interaction.reply({ embeds: [resultsEmbed]});
                    }).catch(err => {
                        interaction.reply({ content: "Something went wrong.", ephemeral: true });
                    });
                });
                break;
        }
    },
};
