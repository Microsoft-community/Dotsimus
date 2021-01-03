const fetch = require('request-promise-native');

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

module.exports = { sendFeedback }