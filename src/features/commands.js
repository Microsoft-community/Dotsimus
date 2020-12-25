const { helpCommand } = require('./commands/help');

function interactionsTracking (client) {
    // client.api.applications('731190736996794420').commands('789798739740721182').delete()
    // client.api.applications('731190736996794420').commands.get().then(data => console.log(data))
    client.ws.on("INTERACTION_CREATE", async (interaction) => {
        switch (interaction.data.name) {
            case 'help':
                helpCommand(client, interaction);
                break;
            default:
                console.info(interaction.data.name);
                break;
        }
    });
}

module.exports = { interactionsTracking };