const axios = require('axios');

async function createStrawpoll(title, choicesArray, multipleAnsAllowed) {
    try {
        const result = await axios.post(`https://strawpoll.com/api/poll`,
            {
                'poll': {
                    'title': title,
                    'answers': choicesArray,
                    'ma': multipleAnsAllowed
                }
            },
            {
                headers: {
                    'API-KEY': process.env.STRAWPOLL_KEY ?? ''
                }
            }
        );

        return { pollId: result.data.content_id }
    } catch (e) {
        console.error(e)
    }
}

async function getStrawpollResults(pollId) {
    try {
        const result = await axios.get(`https://strawpoll.com/api/poll/${pollId}`, {
            headers: {
                'API-KEY': process.env.STRAWPOLL_API_KEY ?? ''
            }
        });
        
        return { pollAnswersArray: result.data.content.poll.poll_answers }
    } catch (e) {
        console.error(e)
    }
}

module.exports = { createStrawpoll, getStrawpollResults }