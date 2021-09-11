const {
    Client
} = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');

module.exports = {
    name: 'keywords',
    type: 'selectMenu',
    description: 'Retracts from sending Toxicity embed in the channel.',
    async execute(client, interaction) {

        let trackingWord;
        let watchedKeywordsCollection = db.getWatchedKeywords(),
            activeUsersCollection = [];
        const refreshWatchedCollection = () => (
            watchedKeywordsCollection = db.getWatchedKeywords()
        )

        if (interaction.isSelectMenu()) {
            const list = [];
            for (i = 0; i <= interaction.values.length; i++) {
                list.push(interaction.values[i])
                try {
                    db.removeWatchedKeyword1(interaction.user.id, interaction.guild.id, `${interaction.values[i]}`).then(resp => {
                        refreshWatchedCollection()
                    })                    

                } catch (error) {
                    console.log(error)
                    interaction.reply({
                        content: `Something went wrong:\n${error}`,
                        ephemeral: true
                    })
                }
                continue
            }
            interaction.update({
                content: `Removed ${interaction.values.length} keyword(s).`,
                components: [],
                ephemeral: true,
            })
            
        }
    },
};