const interactionsTracking = (client, activeUsersCollection) => {
    // client.api.applications('731190736996794420').commands('789798739740721182').delete()
    // client.api.applications('731190736996794420').commands.get().then(data => console.log(data))
    client.ws.on("INTERACTION_CREATE", async (interaction) => {
        try {
            client.commands.get(interaction.data.name).execute(client, interaction, activeUsersCollection);
        } catch (error) {
            console.error(error);
        }
    });
}

module.exports = { interactionsTracking };