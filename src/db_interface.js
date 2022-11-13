const { get } = require('./_database/interface')
const crypto = require('crypto')
const { Op } = require('sequelize')

const TABLES = {
    users: 'Users',
    activities: 'Activities',
}

const STATES = {
    launchBreak: '--%launch-break%--',
    dayEnd: '--%day-end%--',
}

const TIMES = ['08:45', '13:00', '14:15', '18:00']

async function doLogin(user) {
    if (!user) {
        return buildErrorResponse('No user provided')
    }

    user.password = crypto.createHash('sha256').update(user.password).digest('base64')
    const res = await readFromTableWhere(TABLES.users, user)

    if (!res) {
        return buildErrorResponse('Cannot read database')
    } else if (res.length > 1) {
        return buildErrorResponse('Multiple matching')
    } else if (res.length === 0) {
        return buildErrorResponse('Invalid user or password')
    }

    return buildOkResponse(buildUser(res[0]))
}

async function addActivity(body, user_id) {
    if (body.date && body.activity && user_id) {
        await addToTable(TABLES.activities, { ...body, user_id })
        return buildOkResponse({})
    } else {
        return buildErrorResponse('No date/activity/user_id provided')
    }
}

async function editActivity(body, user_id) {
    if (body.date && body.activity && body.activity_id && user_id) {
        await editTable(TABLES.activities, { ...body }, { activity_id: body.activity_id, user_id: Number(user_id) })
        return buildOkResponse({})
    } else {
        return buildErrorResponse('No date/activity/user_id provided')
    }
}

async function calculateTimes(user_id, startTimestamp) {
    const activities = await getActivities(user_id, startTimestamp)
    if (!activities) return buildErrorResponse('Cannot read activities')

    let total = 0
    let delta = 0
    const body = activities
        .map((a) => {
            delete a.activity_id
            delete a.user_id
            return a
        })
        .map((a, i) => {
            let time = 0

            if (activities[i + 1]) {
                const diff = activities[i + 1].date - a.date
                time = diff

                if (a.activity !== STATES.launchBreak && a.activity !== STATES.dayEnd) {
                    total += diff
                }
            } else {
                time = null
            }

            return { activity: a.activity, time: time }
        })
        .filter((a) => a.activity !== STATES.dayEnd && a.activity !== STATES.launchBreak)
        .reduce((accumulator, currentValue) => {
            const a = accumulator.find((act) => act.activity === currentValue.activity)

            if (a) {
                a.time += currentValue.time
                return accumulator
            } else {
                return accumulator.concat(currentValue)
            }
        }, [])
        .map((a) => {
            const hours = normalize(a.time / (60 * 60))
            const minutes = normalize((a.time % (60 * 60)) / 60)

            return { ...a, time: `${hours}:${minutes}` }
        })
    const deltaSeconds = activities
        .sort((a, b) => a.date - b.date)
        .filter(
            (a, i) =>
                i === 0 || // inizio giornata
                a.activity === STATES.launchBreak || // inizio pausa pranzo
                activities[i - 1].activity === STATES.launchBreak || // prima attività del pome
                a.activity === STATES.dayEnd, // fine giornata
        )
        .map((a, i) => {
            const date = new Date(a.date * 1000)
            const referenceHours = Number(TIMES[i].split(':')[0])
            const referenceMinutes = Number(TIMES[i].split(':')[1])
            const referenceDate = new Date()
            referenceDate.setFullYear(date.getFullYear())
            referenceDate.setMonth(date.getMonth())
            referenceDate.setDate(date.getDate())
            referenceDate.setHours(referenceHours)
            referenceDate.setMinutes(referenceMinutes)
            referenceDate.setSeconds(0)
            referenceDate.setMilliseconds(0)

            const dSeconds = (referenceDate.getTime() - date.getTime()) / 1000
            return i % 2 === 0 ? dSeconds : -dSeconds
        })
        .reduce((accumulator, currentValue) => (accumulator += currentValue), 0)

    const totalHours = normalize(total / (60 * 60))
    const totalMinutes = normalize((total % (60 * 60)) / 60)
    total = `${totalHours}:${totalMinutes}`

    const sign = deltaSeconds < 0 ? `-` : `+`
    const deltaHours = normalize(Math.abs(deltaSeconds / (60 * 60)))
    const deltaMinutes = normalize(Math.abs((deltaSeconds % (60 * 60)) / 60))
    delta = `${sign}${deltaHours}:${deltaMinutes}`

    return buildOkResponse({ body, total, delta })
}

async function getRawActivities(user_id, startTimestamp) {
    const activities = await getActivities(user_id, startTimestamp)
    if (!activities) return buildErrorResponse('Cannot read activities')

    const body = activities
        .map((a) => {
            delete a.user_id
            return a
        })
        .sort((a, b) => a.date - b.date)
        .map((a) => {
            const date = new Date(Number(a.date) * 1000)
            const hours = normalize(date.getHours())
            const minutes = normalize(date.getMinutes())

            return { ...a, date: `${hours}:${minutes}` }
        })
        .reverse()

    return buildOkResponse(body)
}

async function getActivities(user_id, startTimestamp) {
    const endTimestamp = startTimestamp + 60 * 60 * 24
    const activities = await readFromTableWhere(TABLES.activities, {
        user_id: user_id,
        date: {
            [Op.between]: [startTimestamp, endTimestamp],
        },
    })

    return activities.map((a) => a.dataValues).sort((a, b) => a.date - b.date)
}

function normalize(number) {
    return ('0' + Math.floor(number)).substr(-2)
}

function buildUser(user) {
    if (!user) return {}

    return {
        username: user.username,
        id: user.user_id,
    }
}

function buildOkResponse(body) {
    return {
        body: body,
        status: 200,
    }
}

function buildErrorResponse(errorMessage) {
    return {
        body: {
            errorMessage: errorMessage,
        },
        status: 400,
    }
}

async function readFromTableWhere(table, where) {
    return get(table).findAll({ where: where })
}

async function addToTable(table, object) {
    let fileObj = await get(table).build(object)
    return await fileObj.save()
}

async function editTable(table, object, where) {
    return await get(table).update(object, { where: where })
}

module.exports = {
    doLogin,
    addActivity,
    editActivity,
    calculateTimes,
    getRawActivities,
}
