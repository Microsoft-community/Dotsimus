const fetch = require('request-promise-native');

async function createStrawpoll(title, choicesArray, multipleAnsAllowed) {
    try {
        const result = await fetch({
            method: 'POST',
            uri: `https://strawpoll.com/api/poll`,
            body: {
                "poll": {
                    "title": title,
                    "answers": choicesArray,
                    "ma": multipleAnsAllowed
                }
            },
            json: true,
            headers: {
                'Content-Type': 'application/json',
            	'API-KEY': process.env.STRAWPOLL_KEY
            }
        })
        return { pollId: result.content_id }
    } catch (e) {
        console.error(e)
    }
}

async function getStrawpollResults(pollId) {
    try {
        const result = await fetch({
            method: 'GET',
            uri: `https://strawpoll.com/api/poll/${pollId}`,
            json: true,
            headers: {
                'Content-Type': 'application/json',
            	'API-KEY': process.env.STRAWPOLL_KEY
            }
        });
        return { pollAnswersArray: result.content.poll.poll_answers }
    } catch (e) {
        console.error(e)
    }
}

module.exports = { createStrawpoll, getStrawpollResults }