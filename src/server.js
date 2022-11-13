const CONNECTION = require('../configs/connection.env.json')
const { doLogin, addActivity, editActivity, calculateTimes, getRawActivities } = require('./db_interface')
const { connect } = require('../backend/_database/interface')
const cors = require('cors')

const express = require('express')
const bodyParser = require('body-parser')
const server = express()

connect().then(async () => {
    server.use(bodyParser.json())
    server.use(cors())
    server.listen(CONNECTION.port, async () => {
        console.log(`Server listening at ${CONNECTION.port}`)

        server.post('/login', async (req, res) => {
            console.log('POST /login')
            const result = await doLogin(req.body)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/addActivity', async (req, res) => {
            console.log('POST /addActivity')
            const result = await addActivity(req.body, req.headers.user)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/editActivity', async (req, res) => {
            console.log('POST /editActivity')
            const result = await editActivity(req.body, req.headers.user)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/getComputedActivities', async (req, res) => {
            console.log('POST /getComputedActivities')
            const result = await calculateTimes(req.headers.user, req.body.startTimestamp)

            res.status(result.status)
            res.send(result.body)
        })

        server.post('/getRawActivities', async (req, res) => {
            console.log('POST /getRawActivities')
            const result = await getRawActivities(req.headers.user, req.body.startTimestamp)

            res.status(result.status)
            res.send(result.body)
        })
    })
})
