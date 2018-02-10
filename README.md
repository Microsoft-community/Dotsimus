# Basic Requirements

1. Create an auth.json file with your Discord bot user's token and your Perspective API key.

```json
{
  "discordToken": "...",
  "perspectiveKey": "..."
}
```

2. Ensure your bot user is in your discord server.

Visit https://discordapp.com/oauth2/authorize?&client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=0

3. Run `npm start`.

# Features

* The bot responds to `!toxic <phrase>` with an assessment about whether the phrase is toxic.
* The bot automatically warns a user when it is sufficiently confident that they have sent a toxic message.
* The bot automatically notifies moderators when it has a high degree of confidence that a toxic message has been sent.
