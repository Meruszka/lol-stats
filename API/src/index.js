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

const API_key = process.env.API_KEY || "RGAPI-82b78258-7601-4873-b40b-3749d38d0f8b";
config = {
    retrys: 10,
}
let api_riot = new teemoJS(API_key, config);

app.get('/', (req, res) => {
    res.send('Hello and welcome to the LoL API');  
});

// Dodać favicon.ico, pewnie z reacta lol
app.get('/favicon.ico', (req, res) => res.end())

app.get('/:summonerName', async (req, res) => {
    const DB_respond = await client.query(`SELECT * FROM summoners WHERE LOWER(summonerName) = LOWER('${req.params.summonerName}');`);
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
            summonerName: DB_respond.rows[0].summonername,
            summonerId: DB_respond.rows[0].summonerid,
            accountId: DB_respond.rows[0].accountid,
            puuid: DB_respond.rows[0].puuid,
            level: DB_respond.rows[0].level
        });
    }
})

app.get('/:summonerName/matches', async (req, res) => {
    const summoner = await client.query(`SELECT * FROM summoners WHERE LOWER(summonerName) = LOWER('${req.params.summonerName}')`);
    const puuid = summoner.rows[0].puuid;
    const summonerId = summoner.rows[0].summonerid;
    const matches = await client.query(`SELECT * FROM matches WHERE LOWER(summonerId) = LOWER('${summonerId}')`);

    if (matches.rows.length === 0) {
        console.log('No matches found in DB');
        const api_matches = await api_riot.get('europe', 'match.getMatchIdsByPUUID', puuid)
        api_matches.forEach(async match => {
           const data = await api_riot.get('europe', 'match.getMatch', match);
            const player = data.info.participants.filter(participant => participant.summonerName.toLowerCase() === req.params.summonerName)[0];
            client.query(`INSERT INTO matches (matchId, gameTime, summonerId, championId, championName, role, lane, kills, deaths, assists, win, duration) 
                VALUES (
                '${data.metadata.matchId}', 
                '${data.info.gameCreation}',
                '${player.summonerId}', 
                ${player.championId}, 
                '${player.championName}', 
                '${player.role}', 
                '${player.lane}', 
                ${player.kills}, 
                ${player.deaths}, 
                ${player.assists}, 
                '${player.win}', 
                '${data.info.gameDuration}')`);
        });
    } 
    const matches_DB = await client.query(`SELECT * FROM matches WHERE LOWER(summonerId) = LOWER('${summonerId}')`);
    res.send(matches_DB.rows);
});

client.connect().then(() => {
    console.log('Connected to database');
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
        gameTime VARCHAR(255) NOT NULL,
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
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        
    });
}).catch(err => {
    console.log(err);
});



