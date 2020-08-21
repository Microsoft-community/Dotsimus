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

module.exports = { getTime, toxicityReport };