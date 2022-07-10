const { default: axios } = require('axios');
const postgres = require('pg');
const riotApi = require('teemojs');
const riotApiKey = 'RGAPI-ad4a3daf-1bc6-4208-b57d-1c04913df4fa';

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
    console.log('Connected to database');
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

async function main(summonerName, start, count){
    const puuid = await getUserPuuid(summonerName);
    console.log(puuid);
    const matches = await getMatches(puuid, start, count);
    console.log(matches);
    const result = await matches.map(match => {
        getMatchDetails(match, summonerName).then(match => {
            client.query(`INSERT INTO matches (matchId, summonerId, championId, championName, role, lane, kills, deaths, assists, win, duration)
            VALUES (
            '${match.matchId}',
            '${match.summonerId}',
            ${match.championId},
            '${match.championName}',
            '${match.role}',
            '${match.lane}',
            ${match.kills},
            ${match.deaths},
            ${match.assists},
            '${match.win}',
            '${match.duration}')`);
        });
    });
    console.log(result);
}
main('Meruszka', 10, 10);