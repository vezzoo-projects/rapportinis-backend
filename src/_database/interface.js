let Sequelize = require('sequelize')
let path = require('path')
const DATABASE = require('../configs/db.env')

async function connect() {
    if (DATABASE.dialect === 'sqlite') {
        DATABASE.storage = path.join(DATABASE.path, DATABASE.storage)
        global.sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: DATABASE.storage,
        })
    } else if (DATABASE.use_url) {
        global.sequelize = new Sequelize(process.env[DATABASE.env_url])
    } else {
        global.sequelize = new Sequelize({
            database: DATABASE.db,
            username: DATABASE.user,
            password: DATABASE.password,
            host: DATABASE.host,
            port: DATABASE.port,
            dialect: DATABASE.dialect,
            pool: DATABASE.pool,
        })
    }

    sequelize.tables = {}
    await sequelize.authenticate()

    let tables = Object.keys(DATABASE.models)

    for (let table of tables) {
        const t = require(table)
        const tableName = DATABASE.models[table]

        const o = t.register()
        sequelize.tables[tableName] = await sequelize.define(tableName, o, {
            timestamps: false,
            underscored: true,
            freezeTableName: true,
            tableName: tableName,
        })

        Object.keys(o).forEach((e) => {
            const o = t.register()[e]
            if (o.references) {
                sequelize.tables[o.references.model].hasMany(sequelize.tables[tableName], { foreignKey: o.references.key })
                sequelize.tables[tableName].belongsTo(sequelize.tables[o.references.model], { foreignKey: e })

                console.log(`Created relationship ${o.references.model}.${o.references.key} n<=>1 ${tableName}.${e}`)
            }
        })
        try {
            await sequelize.tables[tableName].findAll({ attributes: Object.keys(o) })
            if (DATABASE.rebuild) throw new Error()
        } catch (e) {
            console.log('RECREATING ' + tableName + e)
            await sequelize.tables[tableName].drop()
            await sequelize.tables[tableName].sync()

            let data = t.default_data()
            await Promise.all(
                data.map(async (e) => {
                    await sequelize.tables[tableName].build(e).save()
                }),
            )
        }
        t.registered(sequelize.tables[tableName])
    }

    return sequelize
}

function get(table) {
    return sequelize.tables[table]
}

module.exports = { connect, get }
