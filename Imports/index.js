const { default: axios } = require('axios');
const postgres = require('pg');
const riotApi = require('teemojs');
require('dotenv').config();
const riotApiKey = process.env.riot_api_key || 'Riot API Key';

const api = new riotApi(riotApiKey, {
    retrys: 10
});
const client = new postgres.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'lol',
    password: 'postgres',
    port: 5432
});
client.connect().then(() => {
    client.query(`CREATE TABLE IF NOT EXISTS matches (
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
        );`)
    .then(() => {

        console.log('Connected to database');
    });
}).catch(err => {
    console.log('Error connecting to database');
});


function getUserPuuid(summonerName){
    return api.get('eun1', 'summoner.getBySummonerName', summonerName).then(summoner => summoner.puuid).catch(err => {
        console.log(err);
    });
}
function getMatches(puuid, start, count){
    const headers = {
        'X-Riot-Token': riotApiKey
    };
    return axios.get(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=${start}&count=${count}`, {
        headers: headers
    }).then(res => {
        return res.data;
    }).catch(err => {
        console.log(err);
    }
    );
}
function getMatchDetails(matchId, summonerName){
    return api.get('europe', 'match.getMatch', matchId)
    .then(match => {
        const player = match.info.participants.filter(participant => participant.summonerName=== summonerName)[0];
        return {
            matchId: match.metadata.matchId,
            gameTime: match.info.gameCreation,
            summonerId: player.summonerId,
            championId: player.championId,
            championName: player.championName,
            role: player.role,
            lane: player.lane,
            kills: player.kills,
            deaths: player.deaths,
            assists: player.assists,
            win: player.win,
            duration: match.info.gameDuration
        }
    })
    .catch(err => {
        console.log(err);
    });
}

async function importToDatabase(summonerName, start, count){
    const puuid = await getUserPuuid(summonerName);
    const matches = await getMatches(puuid, start, count);
      matches.map(match => {
        getMatchDetails(match, summonerName).then(match => {
            client.query(`INSERT INTO matches (matchId, gameTime, summonerId, championId, championName, role, lane, kills, deaths, assists, win, duration)
            VALUES (
            '${match.matchId}',
            '${match.gameTime}',
            '${match.summonerId}',
            ${match.championId},
            '${match.championName}',
            '${match.role}',
            '${match.lane}',
            ${match.kills},
            ${match.deaths},
            ${match.assists},
            '${match.win}',
            '${match.duration}')`).then(() => {
                return 0;
            }).catch(err => {
                console.log(err);
            });
        }).catch(err => {
            console.log(err);
        });
    });
    
}
for (let i = 0; i < 10; i++) {
    importToDatabase('Meruszka', i*50, 50).then(() => {
        console.log('Imported', i*50, 'to', (i+1)*50);
    }).catch(err => {
        console.log(err);
    });    
}