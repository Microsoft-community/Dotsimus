const {
    MessageActionRow,
    MessageSelectMenu,
    MessageButton,
    MessageEmbed
} = require('discord.js');
const {
    SlashCommandBuilder
} = require('@discordjs/builders'),
    wait = require('util').promisify(setTimeout);
const db = require('../../db')
module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('watch')
        .setDescription('Sends a direct message to you whenever keyword that you track gets mentioned.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Unwatches keywords.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('watch')
                .setDescription('Sends a direct message to you whenever keyword that you track gets mentioned.')
                .addStringOption(option =>
                    option.setName('keyword')
                        .setDescription('The keyword you want to track.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists all keywords you have tracked.')),
    async execute(client, interaction) {

        let keyword = interaction.options.getString('keyword');
        let trackingWord;
        let watchedKeywordsCollection = db.getWatchedKeywords(),
            activeUsersCollection = [];
        const refreshWatchedCollection = () => (
            watchedKeywordsCollection = db.getWatchedKeywords()
        )

        switch (interaction.options._subcommand) {
            case "watch":
                let watching = [];
                let length;
                db.getWatchedKeywords(interaction.user.id, interaction.guild.id).then(keywords => {
                    if (keywords.length === 0) {
                        length = 0
                    } else {
                        length = keywords[0].watchedWords.length
                    }
                    for (i = 0; i < length; i++) {
                        const str = keywords[0].watchedWords[i].toLowerCase();
                        watching.push(str)
                    }
                    const string = watching.join(' ');
                    trackingWord = keyword.toLowerCase();
                    const common = string.indexOf(trackingWord)
                    if (common >= 0) {
                        interaction.reply({
                            content: `You can't watch the same keyword \`(${trackingWord})\` multiple times.`,
                            ephemeral: true,
                        })
                        return
                    }
                    if (keyword.length < 3 || !keyword || keyword === 'null') {
                        interaction.reply({
                            content: `Keyword must be of 3 or more characters.`,
                            ephemeral: true,
                        })
                        return;
                    } 
                    try {
                        db.watchKeyword(interaction.user.id, interaction.guild.id, trackingWord).then(resp => {
                            refreshWatchedCollection().then(resp => db.getWatchedKeywords(interaction.user.id, interaction.guild.id).then(keywords => {
                                const list = keywords[0].watchedWords.length > 5 ? keywords[0].watchedWords.slice(1) : keywords[0].watchedWords

                                interaction.reply({
                                    content: `\`${trackingWord}\` keyword tracking is set up successfully on **${interaction.guild.name}** server.\nCurrently tracked keywords for the server:\n${list.map((keyword, index) => `${index + 1}. \`${keyword}\` \n`).join('')}*You can watch* ***${5 - list.length}*** *more keywords.*`,
                                    ephemeral: true,
                                })
                            }).then(refreshWatchedCollection()))
                        })

                    } catch (error) {
                        console.log(error);
                        interaction.reply({
                            content: 'Allow Direct Messages from server members in this server for this feature to work.',
                            ephemeral: true,
                        })
                    }
                });
                break;

            case "remove":
                const keywordList = new MessageActionRow();
                const Buttons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`removeAll`)
                            .setLabel(`Remove all keywords`)
                            .setStyle(`DANGER`),
                        new MessageButton()
                            .setCustomId(`doNothing`)
                            .setLabel(`Don't remove anything`)
                            .setStyle(`SECONDARY`)
                    )
                db.getWatchedKeywords(interaction.user.id, interaction.guild.id).then(keywords => {
                    if (keywords.length === 0) {
                        interaction.reply({
                            content: `You aren't tracking any keywords for this server. Track words by using the \`/watch\` command!`,
                            ephemeral: true,
                        })
                    } else {
                        try {
                            const list = keywords[0].watchedWords
                            let components = []
                            for (i = 0; i < list.length; i++) {
                                const value = {
                                    label: `${list[i]}`,
                                    description: `Remove ${list[i]} from watched keywords.`,
                                    value: `${list[i]}`
                                }
                                components.push(value)
                            }
                            keywordList.addComponents(
                                new MessageSelectMenu()
                                    .setCustomId('keywords')
                                    .setPlaceholder('Nothing Selected')
                                    .setMinValues(1)
                                    .setMaxValues(list.length)
                                    .addOptions(components),
                            );
                            interaction.reply({
                                content: `Select the keywords you want to remove.`,
                                components: [keywordList, Buttons],
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
                });
                break;
            case "list":
                db.getWatchedKeywords(interaction.user.id, interaction.guild.id).then(keywords => {
                    const list = keywords[0].watchedWords.length > 5 ? keywords[0].watchedWords.slice(1) : keywords[0].watchedWords

                    const listEmbed = new MessageEmbed()
                          .setColor('#0099ff')
                          .setTitle('Your tracked keywords')
                          .addField('List of keywords you have tracked:', list.map((keyword, index) => `${index + 1}. \`${keyword}\` \n`).join(''))
                          .setTimestamp();

                    interaction.reply({
                        embeds: [ listEmbed ],
                        ephemeral: true,
                    })
                });
                break;
        }
    },
};
