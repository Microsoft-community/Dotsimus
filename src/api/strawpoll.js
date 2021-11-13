const fetch = require('request-promise-native');

async function createStrawpoll(title, choicesArray, multipleAnsAllowed, member) {
    try {
        const result = await fetch({
            method: 'POST',
            uri: `https://strawpoll.com/api/poll`,
            body: {
                "poll": {
                    "title": title,
                    "answers": choicesArray,
                    "ma": multipleAnsAllowed,
                    "description": `Created by @${member.user.tag} - ${member.user.id}`
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
        return { pollId: result.content.id, pollAnswersArray: result.content.poll.poll_answers, description: result.content.poll.poll_info.description }
    } catch (e) {
        console.error(e)
    }
}

module.exports = { createStrawpoll, getStrawpollResults }