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

module.exports = { getTime, toxicityReport, getStatusColor, capitalizeFirstLetter, getDate, getDaysSince };