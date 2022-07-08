const app = require('express')();
const teemoJS = require('teemojs');
const pg = require('pg');
const port = process.env.PORT || 5000;
const cors = require('cors');

app.use(cors());
const client = new pg.Client({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'lol'
});

const API_key = process.env.API_KEY || "RGAPI-e9f5621c-8ed8-4224-bf8e-a95c80a20cd5";
let api_riot = new teemoJS(API_key);

app.get('/', (req, res) => {
    api_riot.get('eun1', 'summoner.getBySummonerName', 'Meruszka').then(data => {
        res.send(data);
    }).catch(err => {
        res.send(err);
    });  
});

// Dodać favicon.ico, pewnie z reacta lol
app.get('/favicon.ico', (req, res) => res.end())

app.get('/:summonerName', async (req, res) => {
    console.log(req.params.summonerName);
    const DB_respond = await client.query(`SELECT * FROM summoners WHERE LOWER(summonerName) = LOWER('${req.params.summonerName}')`);
    if (DB_respond.rows.length === 0) {
        console.log('No summoner found in DB');
        api_riot.get('eun1', 'summoner.getBySummonerName', req.params.summonerName).then(data => {
            client.query(`INSERT INTO summoners (summonerName, summonerId, accountId, puuid, level) 
                VALUES ('${data.name}', '${data.id}', '${data.accountId}', '${data.puuid}', '${data.summonerLevel}')`);
            res.send({
                summonerName: data.name,
                summonerId: data.id,
                accountId: data.accountId,
                puuid: data.puuid,
                level: data.summonerLevel
            });
        }).catch(err => {
            res.send(err);
        });
    } else {
        console.log('DB')
        res.send({
            summonerName: DB_respond.rows[0].summonerName,
            summonerId: DB_respond.rows[0].summonerId,
            accountId: DB_respond.rows[0].accountId,
            puuid: DB_respond.rows[0].puuid,
            level: DB_respond.rows[0].level
        });
    }
})

app.get('/:summonerName/matches', (req, res) => {
    client.query(`SELECT * FROM matches WHERE summonerName = '${req.params.summonerName}'`)
    .then(result => {
        const puuid = result.rows[0].puuid;
        api_riot.get('eun1', 'match.getMatchIdsByPUUID', puuid).then(data => {
            res.send(data);
        }).catch(err => {
            res.send(err);
        });
    }
    ).catch(err => {
        console.log(err);
        res.status(500).send(err);
    }
    );
});

client.connect().then(() => {
    console.log('Connected to database');
    console.log('Init database');
    client.query(`
    
    CREATE TABLE IF NOT EXISTS summoners (
        summonerId VARCHAR(255) NOT NULL PRIMARY KEY,
        summonerName VARCHAR(255) NOT NULL ,
        puuid VARCHAR(255) NOT NULL ,
        accountId VARCHAR(255) NOT NULL,
        level INTEGER NOT NULL
        );
    CREATE TABLE IF NOT EXISTS matches (
        matchId VARCHAR(255) NOT NULL PRIMARY KEY,
        summonerId VARCHAR(255) NOT NULL,
        championId INTEGER NOT NULL,
        championName VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        lane VARCHAR(255) NOT NULL,
        kills INTEGER NOT NULL,
        deaths INTEGER NOT NULL,
        assists INTEGER NOT NULL,
        win BOOLEAN NOT NULL,
        duration INTEGER NOT NULL,
        CONSTRAINT summoners_id 
            FOREIGN KEY (summonerId)
            REFERENCES summoners (summonerId)
            ON DELETE CASCADE
        );
        `)
    console.log('Database inited');
        
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        
    });
}).catch(err => {
    console.log(err);
});



