const { SlashCommandBuilder } = require('@discordjs/builders'),
    { MessageEmbed } = require('discord.js');

module.exports = {
    type: 'slash',
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Timeouts a user for a specified amount of time.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Shows general information about bot and its commands.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Select user to timeout.')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('time')
                        .setDescription('Specify time in amount of hours.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for a timeout.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Removes a timeout from a user.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Select user to remove timeout.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists all timeouts.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-user')
                .setDescription('Lists all timeouts from a user.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Select user to list timeouts.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-all')
                .setDescription('Lists all timeouts from all guilds.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-all-user')
                .setDescription('Lists all timeouts from a user from all guilds.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Select user to list timeouts.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand => subcommand
            .setName('ping')
            .setDescription('Shows bots latency.'))
        .addSubcommand(subcommand => subcommand
            .setName('restart')
            .setDescription('⚠️ [Owner command] Restarts the bot.'))
        .addSubcommand(subcommand => subcommand
            .setName('usage')
            .setDescription('Shows how many times commands were used and when they were used last.'))
        .addSubcommand(subcommand => subcommand
            .setName('submit-a-review')
            .setDescription('Explains the importance of reviews and guides on where to submit one.')),
    async execute (client, interaction) {
        switch (interaction.options._subcommand) {
            case 'add':
                await interaction.deferReply()
                await interaction.guild.members.fetch(interaction.options._hoistedOptions[0].value).then(member => {
                    const hoursToMilliseconds = (hours) => hours * 60 * 60 * 1000,
                        time = hoursToMilliseconds(interaction.options._hoistedOptions[1].value);
                    member.timeout(time ?? 0, interaction.options.get('reason') ? interaction.options.get('reason').value : null).then(async () => {
                        await interaction.editReply({
                            type: 4,
                            embeds: [
                                new MessageEmbed()
                                    .setTitle('Timeout added')
                                    .setDescription(`${member} has been timed out for ${interaction.options._hoistedOptions[1].value} hour(s). \nReason: **${interaction.options.get('reason')?.value ?? "No reason specified."}**`)
                                    .setColor(0x00FF00)
                            ],
                            ephemeral: false
                        });
                        member.send(new MessageEmbed()
                            .setTitle('You have been timed out')
                            .setDescription(`You have been timed out for ${interaction.options._hoistedOptions[1].value} hour(s). \nReason: **${interaction.options.get('reason')?.value ?? "No reason specified."}**`)
                            .setColor(0x00FF00)).catch(() => {});
                    }).catch(async () => {
                        await interaction.editReply({
                            content: 'Something went horribly wrong, check whether bot has required permissions enabled.',
                            ephemeral: true
                        })
                    })
                })
                break;
            case 'remove':
                await interaction.deferReply()
                await interaction.guild.members.fetch(interaction.options._hoistedOptions[0].value).then(async member => {
                    member.timeout(null).then(async () => {
                        await interaction.editReply({
                            type: 4,
                            embeds: [
                                new MessageEmbed()
                                    .setTitle('User updated')
                                    .setDescription(`${member.user.tag}'s timeout has been removed.`)
                                    .setColor('#00ff00')
                            ],
                            ephemeral: false
                        });
                        await member.send(new MessageEmbed()
                            .setTitle('You have been unmuted')
                            .setDescription(`You have been unmuted on ${interaction.guild.name}.`)
                            .setColor('#00ff00')
                        );
                    }).catch(async () => {
                        await interaction.editReply({
                            content: 'Something went horribly wrong, check whether bot has required permissions enabled.',
                            ephemeral: true
                        })
                    })
                })
                break;
            default:
                break;
        }
    },
};
