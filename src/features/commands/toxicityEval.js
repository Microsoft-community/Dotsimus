const { MessageEmbed } = require('discord.js'),
    perspective = require('../../api/perspective');

module.exports = {
    name: 'toxic',
    description: 'Evaluates message\'s toxicity with the power of machine learning.',
    execute (client, interaction) {
        perspective.getToxicity(interaction.options._hoistedOptions[0].value, {
            channel: {
                name: interaction.channel_id
            },
            server: {
                prefix: interaction.guildId, name: interaction.guildId
            }
        }, true).then(toxicity => {
            const messageToxicity = toxicity.toxicity
            if (!isNaN(messageToxicity)) {
                const embedResponse = new MessageEmbed()
                    .setColor('#ffbd2e')
                    .addFields(
                        { name: 'Message', value: `||${interaction.options._hoistedOptions[0].value.slice(0, 1020)}||` },
                        { name: 'Probability', value: `**Toxicity:** ${toxicity.toxicity} \n **Insult:** ${toxicity.insult}` },
                        { name: 'Dotsimus combined probability', value: `${toxicity.combined}` }
                    );
                interaction.reply({
                    type: 4,
                    embeds: [embedResponse]
                })
            } else {
                interaction.reply({
                    type: 4,
                    ephemeral: true,
                    content: 'Provided message cannot be analyzed.'
                })
            }
        })
    },
};
