# Requirements

1. Create an .env file and provide required tokens and keys as per example below.

```js
BOT_TOKEN=TOKEN
BOT_TOKEN_DEV=STAGING_TOKEN
DB_HOST=DB
DB_HOST_DEV=STAGING_DB
PERSPECTIVE_KEY=KEY
DEVELOPMENT=false
SENTRY_DSN=SENTRY_KEY
OWNER=BOT_OWNER_ID
DEV_GUILD=DEVELOPMENT_GUILD_ID
```

2. Add bot to your server https://discord.com/oauth2/authorize?&client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=0

3. Run `npm install && npm start`.

# Features
## Automated moderation (Premium feature)
Machine learning powered moderation brings misbehaving, toxic users to moderators attention quicker than you can say hop.

## Track topics, names or keywords, stay in the loop of things!
Keywords tracking will make sure that you know whenever you're mentioned and missed! It can also be used to track topics that you find interesting.

`/watch add`

## Point users to rules easily!
Dotsimus allows you to guide new users through rules without hitting them with a wall of text.

## One of the very first public bots to support slash commands.
What more there is to say? Slash commands make our lives a lot easier.
