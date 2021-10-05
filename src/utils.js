const fs = require('fs'),
    strawpoll = require('./api/strawpoll');

const getTime = () => {
    const today = new Date()
    return today.getHours() + ':' + today.getMinutes()
}

function toxicityReport (timestamp, userId, user, message, toxicity) {
    this.timestamp = timestamp;
    this.userId = userId;
    this.user = user;
    this.message = message;
    this.toxicity = toxicity;
}

const getStatusColor = (presenceStatus) => {
    switch (presenceStatus) {
        case 'online':
            return '#43b581';
        case 'dnd':
            return '#e4717a';
        case 'idle':
            return '#faa61a';
        case 'offline':
            return '#747f8d';
        default:
            return '#43b581';
    }
}

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const getDate = (timestamp, locale) => {
    const date = new Date(timestamp);
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    };
    return date.toLocaleDateString(locale, options);
}

const getDaysSince = (current, previous) => {
    const msPerMinute = 60 * 1000,
        msPerHour = msPerMinute * 60,
        msPerDay = msPerHour * 24,
        elapsed = current - previous;
    return Math.round(elapsed / msPerDay);
}

const collectCommandAnalytics = async (commandName, subCommandName) => {
    const updateAnalytics = (fileName, data) => {
        fs.writeFile(fileName, JSON.stringify(data, null, 2), function (err) {
            if (err) console.log('error', err);
        })
    },
        analyticsFile = fs.readFileSync("./events.json", "utf8"),
        parsedAnalytics = JSON.parse(analyticsFile),
        findCommand = (name) => parsedAnalytics.filter(event => event?.name === name);
    if (findCommand(commandName)[0] !== undefined) {
        ++findCommand(commandName)[0].used
        findCommand(commandName)[0].lastUsed = +new Date
        updateAnalytics('./events.json', parsedAnalytics);
    } else {
        parsedAnalytics.push({
            type: 'command',
            name: commandName,
            used: 1,
            lastUsed: +new Date
        })
        updateAnalytics('./events.json', parsedAnalytics);
    }
    if (subCommandName !== undefined) {
        if (findCommand(`${commandName} ${subCommandName}`)[0] !== undefined) {
            ++findCommand(`${commandName} ${subCommandName}`)[0].used
            findCommand(`${commandName} ${subCommandName}`)[0].lastUsed = +new Date
            updateAnalytics('./events.json', parsedAnalytics);
        } else {
            if (subCommandName === undefined) return
            parsedAnalytics.push({
                type: 'subCommand',
                name: `${commandName} ${subCommandName}`,
                used: 1,
                lastUsed: +new Date
            })
            updateAnalytics('./events.json', parsedAnalytics);
        }
    }
}

const apiDateToTimestamp = (date) => {
    const dateObj = new Date(date);
    return Math.floor(dateObj.getTime() / 1000);
};

const updateResults = (interaction, embed) => {
    const pollEmbed = embed, pollId = embed.footer.text.split(' ').at(-1);

    strawpoll.getStrawpollResults(pollId).then(response => {
        let votes = [], stringEmbed = "";

        for (let i = 0; i < response.pollAnswersArray.length; i++) {
            votes.push(response.pollAnswersArray[i].votes);
            stringEmbed += `⦿ ${response.pollAnswersArray[i].answer}: **${response.pollAnswersArray[i].votes}**\n`;
        }
        pollEmbed.fields[0].value = stringEmbed;
        pollEmbed.fields[1].value = `<t:${apiDateToTimestamp(Date.now())}:R> by ${interaction.member}`;
        interaction.message ? interaction.message.edit({ embeds: [pollEmbed] }) : interaction.editReply({ embeds: [pollEmbed] });
    });
};

module.exports = { getTime, toxicityReport, getStatusColor, capitalizeFirstLetter, getDate, getDaysSince, collectCommandAnalytics, apiDateToTimestamp, updateResults };