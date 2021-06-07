const Discord = require('discord.js'),
    perspective = require('../../api/perspective');

module.exports = {
    name: 'toxic',
    description: 'Evaluates message\'s toxicity with the power of machine learning.',
    execute (client, interaction) {
        console.log(interaction);
        perspective.getToxicity(interaction.data.options[0].value, {
            channel: {
                name: interaction.channel_id
            },
            server: {
                prefix: interaction.guild_id, name: interaction.guild_id
            }
        }, true).then(toxicity => {
            const messageToxicity = toxicity.toxicity
            if (!isNaN(messageToxicity)) {
                const embedResponse = new Discord.MessageEmbed()
                    .setColor('#ffbd2e')
                    .addFields(
                        { name: 'Message', value: `||${interaction.data.options[0].value.slice(0, 1020)}||` },
                        { name: 'Probability', value: `**Toxicity:** ${toxicity.toxicity} \n **Insult:** ${toxicity.insult}` },
                        { name: 'Dotsimus combined probability', value: toxicity.combined }
                    );
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            embeds: [embedResponse]

                        },
                    },
                });
            } else {
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: {
                            flags: 64,
                            content: 'Message cannot be analyzed.'
                        },
                    },
                });
            }
        })
    },
};
