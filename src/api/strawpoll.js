const { default: axios } = require('axios');

async function createStrawpoll (title, choicesArray, multipleAnsAllowed, member) {
    try {
        const result = await axios.post(`https://strawpoll.com/api/poll`, {
            "poll": {
                "title": title,
                "answers": choicesArray,
                "ma": multipleAnsAllowed,
                "description": `Created by @${member.user.tag} - ${member.user.id}`
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'API-KEY': process.env.STRAWPOLL_KEY
            }
        })
        return { pollId: result.data.content_id }
    } catch (e) {
        console.error(e)
    }
}

async function getStrawpollResults (pollId) {
    try {
        const result = await axios.get(`https://strawpoll.com/api/poll/${pollId}`, {
            headers: {
                'Content-Type': 'application/json',
                'API-KEY': process.env.STRAWPOLL_KEY
            }
        })
        return { pollId: result.data.content.id, pollAnswersArray: result.data.content.poll.poll_answers, description: result.data.content.poll.poll_info.description }
    } catch (e) {
        console.error(e)
    }
}

module.exports = { createStrawpoll, getStrawpollResults }