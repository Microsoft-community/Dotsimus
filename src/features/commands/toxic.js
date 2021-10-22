const { SlashCommandBuilder } = require('@discordjs/builders'),
    { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js'),
    perspective = require('../../api/perspective');

module.exports = {
type: 'slash',
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('toxic')
        .setDescription('Machine learning filter for toxicity evaluations.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Evaluates message\'s toxicity with the power of machine learning.')
                .setRequired(true)
        ),
    async execute (client, interaction) {

        const Buttons = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId(`sendToxicityEmbed`)
                .setLabel(`Send anyways`)
                .setStyle(`DANGER`),
            new MessageButton()
                .setCustomId(`hideToxicityEmbed`)
                .setLabel(`Dont send`)
                .setStyle(`SECONDARY`)
        )

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
                const embedColor = (toxicity.toxicity >= 0.60 ? "#ff0000" : "#5fd980");
                const embedResponse = new MessageEmbed()
                    .setColor(embedColor)
                    .addFields(
                        { name: 'Message', value: (toxicity.toxicity >= 0.60 ? `||${interaction.options._hoistedOptions[0].value.slice(0, 1020)}||` : `${interaction.options._hoistedOptions[0].value.slice(0, 1020)}`) },
                        { name: 'Probability', value: `**Toxicity:** ${toxicity.toxicity} \n**Insult:** ${toxicity.insult}` },
                        { name: 'Dotsimus combined probability', value: `${toxicity.combined}` }
                    );

                if (toxicity.toxicity >= 0.60) {
                    interaction.reply({
                        content: `Are you sure that you want to share this content? It might be seen as inappropriate by the moderation team.`,
                        embeds: [embedResponse],
                        components: [Buttons],
                        ephemeral: true,
                    })
                } else {
                    interaction.reply({
                        type: 4,
                        embeds: [embedResponse],
                    })
                }
            } else {
                interaction.reply({
                    //type: 4,
                    ephemeral: true,
                    content: 'Provided message cannot be analyzed.'
                })
            }
        })
    },
}
