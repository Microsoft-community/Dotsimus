const {
    MessageActionRow,
    MessageSelectMenu,
    MessageButton,
    MessageEmbed
} = require('discord.js'),
    {
        SlashCommandBuilder
    } = require('@discordjs/builders'),
    db = require('../../db');
module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('watch')
        .setDescription('Sends a direct message to you whenever keyword that you track gets mentioned.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Allows to remove tracked keywords.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Sends a direct message to you whenever keyword that you track gets mentioned.')
                .addStringOption(option =>
                    option.setName('keyword')
                        .setDescription('Allows to set up tracking for preferred keywords.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists tracked keywords.')),
    async execute (client, interaction) {
        let keyword = interaction.options.getString('keyword'),
            trackingWord,
            watchedKeywordsCollection = db.getWatchedKeywords();
        const refreshWatchedCollection = () => (
            watchedKeywordsCollection = db.getWatchedKeywords()
        )

        if (!interaction.guild) {
            interaction.reply({ content: 'You can only use this command in servers!', ephemeral: true });
            return;
        }

        switch (interaction.options._subcommand) {
            case "add":
                let watching = [],
                    length;
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
                    const common = string.indexOf(trackingWord);
                    if (common >= 0) {
                        interaction.reply({
                            content: `You're already tracking this keyword.`,
                            ephemeral: true,
                        })
                        return;
                    }
                    if (keyword.length < 3 || !keyword || keyword === 'null') {
                        interaction.reply({
                            content: `Keyword must be of 3 or more characters.`,
                            ephemeral: true,
                        })
                        return;
                    }
                    if (length === 5) {
                        interaction.reply({
                            content: `You cannot track more than 5 keywords.`,
                            ephemeral: true,
                        })
                        return;
                    }
                    try {
                        db.watchKeyword(interaction.user.id, interaction.guild.id, trackingWord).then(resp => {
                            refreshWatchedCollection().then(resp => db.getWatchedKeywords(interaction.user.id, interaction.guild.id).then(keywords => {
                                const list = keywords[0].watchedWords.length > 5 ? keywords[0].watchedWords.slice(1) : keywords[0].watchedWords,
                                    listEmbed = new MessageEmbed()
                                        .setColor('#0099ff')
                                        .setTitle('Your tracked keywords for this server')
                                        .setDescription(list.map((keyword) => `⦿ ${keyword} \n`).join(''))
                                        .setFooter(`${list.length === 5 ? 
                                            'You cannot track more than 5 keywords.' : 
                                            `You can track ${5 - list.length} more ${list.length >= 4 ? 'keyword' : 'keywords'}.`}\n❗️Direct messages must be enabled for this feature to work.`);
                                interaction.reply({
                                    content: `\`${trackingWord}\` keyword tracking is set up successfully on this server.`,
                                    embeds: [listEmbed],
                                    ephemeral: true,
                                })
                            }).then(refreshWatchedCollection()))
                        })

                    } catch (error) {
                        console.log(error);
                        interaction.reply({
                            content: 'Something went wrong.',
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
                            .setLabel(`Disable tracking`)
                            .setStyle(`DANGER`)
                    )
                db.getWatchedKeywords(interaction.user.id, interaction.guild.id).then(keywords => {
                    if (!keywords.length || !keywords[0].watchedWords.length) {
                        interaction.reply({
                            content: `You aren't tracking any keywords for this server. Track words by using the \`/watch\` command!`,
                            ephemeral: true,
                        })
                    } else {
                        try {
                            const nonDuplicateList = Array.from(new Set(keywords[0].watchedWords));
                            let components = [];
                            for (i = 0; i < nonDuplicateList.length; i++) {
                                const value = {
                                    label: `${nonDuplicateList[i]}`,
                                    description: `Remove ${nonDuplicateList[i]} from watched keywords.`,
                                    value: `${nonDuplicateList[i]}`
                                }
                                components.push(value)
                            }
                            keywordList.addComponents(
                                new MessageSelectMenu()
                                    .setCustomId('keywords')
                                    .setPlaceholder('Nothing is Selected')
                                    .setMinValues(1)
                                    .setMaxValues(nonDuplicateList.length)
                                    .addOptions(components),
                            );
                            interaction.reply({
                                content: `Select keywords that you want to remove.`,
                                components: [keywordList, Buttons],
                                ephemeral: true,
                            })
                            return
                        } catch (error) {
                            console.log(error)
                            interaction.reply({
                                content: 'Something went wrong.',
                                ephemeral: true
                            })
                        }
                    }
                });
                break;
            case "list":
                db.getWatchedKeywords(interaction.user.id, interaction.guild.id).then(keywords => {
                    if (!keywords.length || !keywords[0].watchedWords.length) {
                        interaction.reply({
                            content: 'You aren\'t tracking any keywords for this server. Track keywords by using the /watch command!',
                            ephemeral: true
                        });
                        return;
                    }
                    const list = keywords[0].watchedWords.length > 5 ? keywords[0].watchedWords.slice(1) : keywords[0].watchedWords,
                        listEmbed = new MessageEmbed()
                            .setColor('#0099ff')
                            .setTitle('Your tracked keywords for this server')
                            .setDescription(list.map((keyword) => `⦿ ${keyword} \n`).join(''));
                    interaction.reply({
                        embeds: [listEmbed],
                        ephemeral: true,
                    })
                });
                break;
        }
    },
};
