const Discord = require('discord.js'),
    { fetchRules } = require('./../../api/discord-gating');

module.exports = {
    name: 'rules',
    description: 'Allows you to guide new users through rules without hitting them with a wall of text.',
    execute: async function (client, interaction) {
        const fetchedRules = await fetchRules(interaction.guild_id).then(data => data)
        if (fetchedRules === 0) {
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: `This community doesn't have rules defined in **Settings** > **Membership Screening** section.`
                    },
                },
            });
            return;
        } else {
            switch (interaction.data.options[0].name) {
                case 'rule':
                    if (interaction.data.options[0].options[0].value > 0 && interaction.data.options[0].options[0].value <= fetchedRules.form_fields[0].values.length) {
                        const ruleEmbed = new Discord.MessageEmbed()
                            .setTitle(`Rule ${interaction.data.options[0].options[0].value}`)
                            .setDescription(fetchedRules.form_fields[0].values[interaction.data.options[0].options[0].value - 1])
                            .setColor('#e4717a')
                            .setFooter(`Initiated with /rules rule number:${interaction.data.options[0].options[0].value} command by ${interaction.member.user.username}#${interaction.member.user.discriminator}.`)
                        client.api.interactions(interaction.id, interaction.token).callback.post({
                            data: {
                                type: 2,
                                data: {
                                    embeds: [ruleEmbed]
                                },
                            },
                        });
                    } else {
                        client.api.interactions(interaction.id, interaction.token).callback.post({
                            data: {
                                type: 4,
                                data: {
                                    content: `Rule ${interaction.data.options[0].options[0].value} does not exist, there are ${fetchedRules.form_fields[0].values.length} rules defined in this community.`
                                },
                            },
                        });
                    }
                    break;
                case 'search':
                    const findRule = (rule, term) => {
                        term = term.toLowerCase();
                        if (rule.value.toLowerCase().search(term) !== -1 || rule.name.toLowerCase().search(term) !== -1) {
                            return true;
                        }
                        return false;
                    }
                    const embedCollection = fetchedRules.form_fields[0].values.map((rule, index) => ({ name: 'Rule ' + (index + 1), value: rule })),
                        getSearchResults = embedCollection.filter(rule => findRule(rule, interaction.data.options[0].options[0].value));
                    if (getSearchResults.length !== 0) {
                        const foundRules = new Discord.MessageEmbed()
                            .setColor('#e4717a')
                            .setFooter(`Initiated with /rules rule keyword:${interaction.data.options[0].options[0].value} command by ${interaction.member.user.username}#${interaction.member.user.discriminator}.`)
                            .addFields(getSearchResults);
                        client.api.interactions(interaction.id, interaction.token).callback.post({
                            data: {
                                type: 2,
                                data: {
                                    embeds: [foundRules]
                                },
                            },
                        });
                    } else {
                        client.api.interactions(interaction.id, interaction.token).callback.post({
                            data: {
                                type: 4,
                                data: {
                                    content: `Unable to find any rules that contain \`${interaction.data.options[0].options[0].value}\` keyword.`
                                },
                            },
                        });
                    }
                    break;
                case 'all':
                    const rulesAll = fetchedRules.form_fields[0].values.map((rule, index) => ({ name: 'Rule ' + (index + 1), value: rule })),
                        rulesEmbed = new Discord.MessageEmbed()
                            .setTitle(`${client.guilds.cache.get(interaction.guild_id).name} rules`)
                            .setDescription(fetchedRules.description)
                            .setColor('#e4717a')
                            .setFooter('Last updated: ' + fetchedRules.version)
                            .addFields(rulesAll);
                    client.users.cache.get(interaction.member.user.id).send(rulesEmbed).catch(error => {
                        client.api.interactions(interaction.id, interaction.token).callback.post({
                            data: {
                                type: 4,
                                data: {
                                    content: 'Failed to send community rules to you, please enable direct messaging in this server by **right clicking the server icon** and going to **privacy settings**.'
                                },
                            },
                        });
                        throw 'DMs are disabled.';
                    }).then(() => client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: 'Sent community rules to your direct messages!'
                            },
                        },
                    }))
                    break;
                default:
                    break;
            }
        }
    }
};
