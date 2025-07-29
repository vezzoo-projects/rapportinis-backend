const { get } = require('./_database/interface')
const crypto = require('crypto')
const { Op } = require('sequelize')

const TABLES = {
    users: 'Users',
    activities: 'Activities',
}

const STATES = {
    break: '--%break%--',
    dayEnd: '--%day-end%--',
}

const TIME_SLOTS = {
    morning: { start: '09:00', end: '13:00' },
    afternoon: { start: '14:00', end: '18:00' },
}

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

async function calculateTimes(user_id, startTimestamp, now) {
    if (!now) {
        return buildErrorResponse('You must valorize the "now" key')
    }

    const rawActivities = await getActivities(user_id, startTimestamp)
    if (!rawActivities) {
        return buildErrorResponse('Cannot read activities')
    }

    const activities = rawActivities
        .map((a, i) => {
            const { activity } = a
            const time = rawActivities[i + 1] ? rawActivities[i + 1].date - a.date : 0
            return { activity, time }
        })
        .filter((a) => a.activity !== STATES.dayEnd && a.activity !== STATES.break)
        .reduce((accumulator, currentValue) => {
            const a = accumulator.find((a) => a.activity === currentValue.activity)

            if (a) {
                a.time += currentValue.time
                return accumulator
            } else {
                return accumulator.concat(currentValue)
            }
        }, [])
    const body = activities.map((a) => ({ ...a, time: formatTime(a.time) }))
    const totalSeconds = activities.reduce((t, a) => (t += a.time), 0)
    const total = formatTime(totalSeconds)
    const sortedActivities = rawActivities.sort((a, b) => a.date - b.date)

    let actualTime = 0
    for (let i = 0; i < sortedActivities.length; i++) {
        const curr = sortedActivities[i]
        const next = sortedActivities[i + 1] || { activity: 'Fake', date: now }

        if (curr.activity !== STATES.break && curr.activity !== STATES.dayEnd && curr.date < now) {
            actualTime += next.date - curr.date
        }

        if (next.date > now) break
    }

    let expectedTime = 0
    const timeSlots = Object.values(TIME_SLOTS)
    for (let i = 0; i < timeSlots.length; i++) {
        const { start, end } = timeSlots[i]
        const startSeconds = getSecondsFromTime(start)
        const endSeconds = getSecondsFromTime(end)
        const nowSeconds = getSecondsFromDate(now)

        if (nowSeconds <= startSeconds) continue

        expectedTime += Math.min(endSeconds, nowSeconds) - startSeconds
    }

    const delta = formatTime(actualTime - expectedTime, true)
    return buildOkResponse({ body, total, delta })
}

async function getRawActivities(user_id, startTimestamp) {
    const rawActivities = await getActivities(user_id, startTimestamp)
    if (!rawActivities) return buildErrorResponse('Cannot read activities')

    const body = rawActivities
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

function formatTime(time, withSign = false) {
    const hours = normalize(Math.abs(time / (60 * 60)))
    const minutes = normalize(Math.abs((time % (60 * 60)) / 60))

    if (withSign) {
        const sign = time < 0 ? `-` : `+`
        return `${sign}${hours}:${minutes}`
    } else {
        return `${hours}:${minutes}`
    }
}

function getSecondsFromTime(time) {
    const [hours, minutes] = time.split(':')
    return Number(hours) * 60 * 60 + Number(minutes) * 60
}

function getTimeFromDate(timestamp) {
    const date = new Date(Number(timestamp) * 1000)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getSecondsFromDate(timestamp) {
    const time = getTimeFromDate(timestamp)
    return getSecondsFromTime(time)
}

module.exports = {
    doLogin,
    addActivity,
    editActivity,
    calculateTimes,
    getRawActivities,
}
