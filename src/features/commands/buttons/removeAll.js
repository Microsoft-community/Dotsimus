const {
    Client
} = require('discord.js'),
    db = require('../../../db'),
    perspective = require('../../../api/perspective');

module.exports = {
    name: 'removeAll',
    type: 'button',
    description: 'Removes all watched keywords.',
    async execute(client, interaction) {
        let trackingWord;
        let watchedKeywordsCollection = db.getWatchedKeywords(),
            activeUsersCollection = [];
        const refreshWatchedCollection = () => (
            watchedKeywordsCollection = db.getWatchedKeywords()
        )
        if (interaction.isButton()) {
            try {
                db.removeWatchedKeyword(interaction.user.id, interaction.guild.id).then(resp => {
                    refreshWatchedCollection()
                })
                interaction.update({
                    content: `Removed all keywords being tracked.`,
                    components: [],
                    ephemeral: true,
                })
                return
            } catch (error) {
                console.log(error)
                interaction.reply({
                    content: `Something went wrong:\n${error}`,
                    ephemeral: true
                })
            }
        }
    },
};