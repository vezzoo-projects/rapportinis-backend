const { STRING, INTEGER } = require('sequelize')

function register() {
    return {
        user_id: {
            type: INTEGER,
            allowNull: false,
            primaryKey: true,
            unique: 'user_id_u',
        },
        username: {
            type: STRING,
            allowNull: false,
        },
        password: {
            type: STRING,
            allowNull: false,
        },
    }
}

function registered(table) {}

function default_data() {
    return []
}

module.exports = { register, registered, default_data }
