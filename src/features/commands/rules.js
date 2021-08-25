const { SlashCommandBuilder } = require('@discordjs/builders'),
    { MessageEmbed } = require('discord.js'),
    { fetchRules } = require('./../../api/discord-gating');



module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Allows you to guide new users through rules without hitting them with a wall of text.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('rule')
                .setDescription('Shows selected rule.')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('Type in rule number.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Searches for rule with provided keyword.')
                .addStringOption(option =>
                    option.setName('keyword')
                        .setDescription('Type in keyword.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                // setDefaultPermission(true) waiting for this to be merged
                .setDescription('Shows all of the community rules and guidelines.')),
    execute: async function (client, interaction) {
        const fetchedRules = await fetchRules(interaction.guildId).then(data => data)
        if (fetchedRules === 0) {
            interaction.reply({
                type: 4,
                ephemeral: true,
                content: `This community doesn't have rules defined in **Settings** > **Membership Screening** section.`
            })
            return;
        } else {
            switch (interaction.options._subcommand) {
                case 'rule':
                    if (interaction.options._hoistedOptions[0].value === 69) {
                        interaction.reply({ content: 'nice' })
                        return;
                    }
                    if (interaction.options._hoistedOptions[0].value === 420) {
                        interaction.reply({ content: 'hahah, weed weed' })
                        return;
                    }
                    if (interaction.options._hoistedOptions[0].value > 0 && interaction.options._hoistedOptions[0].value <= fetchedRules.form_fields[0].values.length) {
                        const ruleEmbed = new MessageEmbed()
                            .setTitle(`Rule ${interaction.options._hoistedOptions[0].value}`)
                            .setDescription(fetchedRules.form_fields[0].values[interaction.options._hoistedOptions[0].value - 1])
                            .setColor('#e4717a')
                        interaction.reply({ type: 4, embeds: [ruleEmbed] })
                    } else {
                        interaction.reply({
                            type: 4,
                            ephemeral: true,
                            content: `Rule ${interaction.options._hoistedOptions[0].value} does not exist, there are ${fetchedRules.form_fields[0].values.length} rules defined in this community.`
                        })
                    }
                    break;
                case 'search':
                    const findRule = (rule, term) => {
                        term = term.toLowerCase();
                        if (rule.value.toLowerCase().search(term) !== -1 || rule.name.toLowerCase().search(term) !== -1) {
                            return true;
                        }
                        return false;
                    },
                        embedCollection = fetchedRules.form_fields[0].values.map((rule, index) => ({ name: 'Rule ' + (index + 1), value: rule })),
                        getSearchResults = embedCollection.filter(rule => findRule(rule, interaction.options._hoistedOptions[0].value));
                    if (getSearchResults.length !== 0) {
                        const foundRules = new MessageEmbed()
                            .setColor('#e4717a')
                            .addFields(getSearchResults);
                        interaction.reply({
                            type: 4,
                            embeds: [foundRules]
                        })
                    } else {
                        interaction.reply({
                            type: 4,
                            ephemeral: true,
                            content: `Unable to find any rules that contain \`${interaction.options._hoistedOptions[0].value}\` keyword.`
                        })
                    }
                    break;
                case 'all':
                    const rulesAll = fetchedRules.form_fields[0].values.map((rule, index) => ({ name: 'Rule ' + (index + 1), value: rule })),
                        rulesEmbed = new MessageEmbed()
                            .setTitle(`${client.guilds.cache.get(interaction.guildId).name} rules`)
                            .setDescription(fetchedRules.description)
                            .setColor('#e4717a')
                            .setFooter('Last updated: ' + new Date(fetchedRules.version).toUTCString())
                            .addFields(rulesAll);
                    interaction.reply({
                        embeds: [rulesEmbed],
                        ephemeral: true
                    }).catch(error => {
                        interaction.reply({
                            ephemeral: true,
                            content: 'Failed to send community rules.'

                        })
                    })
                    break;
                default:
                    break;
            }
        }
    }
};

