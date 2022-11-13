const CONNECTION = require('./configs/connection.env.json')
const { doLogin, addActivity, editActivity, calculateTimes, getRawActivities } = require('./db_interface')
const { connect } = require('./_database/interface')
const cors = require('cors')

const express = require('express')
const bodyParser = require('body-parser')
const server = express()

function log(method, path, status, body) {
    console.log(method + ' ' + path + ', status' + status + ', body' + JSON.stringify(body))
}

connect().then(async () => {
    server.use(bodyParser.json())
    server.use(cors())
    server.listen(CONNECTION.port, async () => {
        console.log(`Server listening at ${CONNECTION.port}`)

        server.post('/login', async (req, res) => {
            const result = await doLogin(req.body)
            log('POST', '/login', result.status, result.body)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/addActivity', async (req, res) => {
            const result = await addActivity(req.body, req.headers.user)
            log('POST', '/addActivity', result.status, result.body)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/editActivity', async (req, res) => {
            const result = await editActivity(req.body, req.headers.user)
            log('POST', '/editActivity', result.status, result.body)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/getComputedActivities', async (req, res) => {
            const result = await calculateTimes(req.headers.user, req.body.startTimestamp)
            log('POST', '/getComputedActivities', result.status, result.body)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/getRawActivities', async (req, res) => {
            const result = await getRawActivities(req.headers.user, req.body.startTimestamp)
            log('POST', '/getRawActivities', result.status, result.body)

            res.status(result.status)
            res.send(result.body)
        })
    })
})
