const { INTEGER, STRING } = require('sequelize')

function register() {
    return {
        activity_id: {
            type: INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
            unique: 'activity_id_u',
        },
        date: {
            type: STRING,
            allowNull: false,
        },
        activity: {
            type: STRING,
            allowNull: false,
        },
        user_id: {
            type: INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'user_id',
            },
        },
    }
}

function registered(table) {}

function default_data() {
    return []
}

module.exports = { register, registered, default_data }
