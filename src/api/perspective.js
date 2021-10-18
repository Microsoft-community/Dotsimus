const fetch = require('request-promise-native');

async function getToxicity (rawMessage, message, dataCollection) {
    const getSanitizedEmojis = new RegExp(/<((!?\d+)|(:.+?:\d+))>/g),
        getSanitizedMentions = new RegExp(/<!?(@|@!|@&)(\d+)>/g),
        getSanitizedChannels = new RegExp(/<!?#(\d+)>/g),
        names = ['Jack', 'Jennifer'];
    let unsanitizedMessage = rawMessage.replace(/([\u2011-\u27BF]|[\uE000-\uF8FF]|[\uD800-\uDBFF][\uDC00-\uDFFF])/g, '')
    unsanitizedMessage = unsanitizedMessage.replace(getSanitizedEmojis, '');
    unsanitizedMessage = unsanitizedMessage.replace(getSanitizedChannels, '#' + message.channel.name);
    const sanitizedMessage = unsanitizedMessage.replace(getSanitizedMentions, names[Math.floor(Math.random() * 2)]);

    if (!sanitizedMessage.startsWith(message.server.prefix) && !sanitizedMessage.startsWith('>') && sanitizedMessage.length !== 0) {
        try {
            const result = await fetch({
                method: 'POST',
                uri: `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_KEY}`,
                body: {
                    comment: {
                        text: sanitizedMessage,
                        type: 'PLAIN_TEXT'
                    },
                    languages: ['en'],
                    requestedAttributes: { SEVERE_TOXICITY: {}, INSULT: {} },
                    doNotStore: dataCollection,
                    communityId: `${message.server.name}/${message.channel.name}`
                },
                json: true
            })
            return { toxicity: result.attributeScores.SEVERE_TOXICITY.summaryScore.value, insult: result.attributeScores.INSULT.summaryScore.value, combined: (result.attributeScores.SEVERE_TOXICITY.summaryScore.value + result.attributeScores.INSULT.summaryScore.value) / 2 }
        } catch (e) {
            console.error(e)
            return { toxicity: NaN, insult: NaN, combined: NaN }
        }
    } else {
        return { toxicity: NaN, insult: NaN, combined: NaN }
    }
}

async function sendFeedback (attribute, comment, suggestedScore, messageContext) {
    const requestBody = {
        method: 'POST',
        uri: `https://commentanalyzer.googleapis.com/v1alpha1/comments:suggestscore?key=${process.env.PERSPECTIVE_KEY}`,
        body: {
            comment: {
                text: comment,
                type: 'PLAIN_TEXT'
            },
            attributeScores: {},
            languages: ['en'],
            communityId: `${messageContext.channel.guild.name}/${messageContext.channel.name}`
        },
        json: true
    };
    switch (attribute) {
        case 'toxicity':
            requestBody.body.attributeScores = Object.assign(requestBody.body.attributeScores, {
                "TOXICITY": {
                    "summaryScore": {
                        "value": suggestedScore
                    }
                }
            })
            break;
        case 'insult':
            requestBody.body.attributeScores = Object.assign(requestBody.body.attributeScores, {
                "INSULT": {
                    "summaryScore": {
                        "value": suggestedScore
                    }
                }
            })
            break;
        default:
            return 'Invalid or no attribute provided.';
            break;
    }
    try {
        const feedbackRequest = await fetch(requestBody)
        return 'Feedback submitted successfully.'
    } catch (e) {
        console.error(e)
        return 'Feedback submission failed.'
    }
}

module.exports = { sendFeedback, getToxicity }