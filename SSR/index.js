const app = require('express')();
const axios = require('axios');
const PORT = process.env.PORT || 3000;

function getData(url) {
  return axios.get(url)
    .then(response => response.data)
    .catch(error => console.log(error));
}

app.get('/', async (req, res) => {
    const data = await getData('http://localhost:5000/');
    res.send(data);
});

app.get('/:summonerName', async (req, res) => {
    const summonerName = req.params.summonerName;
    const data = await getData(`http://localhost:5000/${summonerName}`);
    res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>${summonerName}</title>
    </head>
    <body>
        <h1>${data.summonerName}</h1>
            <h2>${data.level}</h2>
    </body>
    </html>`);
    });

app.get('/:summonerName/matches', async (req, res) => {
    const summonerName = req.params.summonerName;
    const data = await getData(`http://localhost:5000/${summonerName}/matches`);
    const summoner = await getData(`http://localhost:5000/${summonerName}`);
    res.send(`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>${summonerName}</title>
        </head>
        <body>
            <div style="display: flex; justify-content: center;">
            <h1>${summoner.summonerName}</h1>
            <h2>${summoner.level}</h2>
            </div>
            <ul style="list-style-type: none;width:40%; margin: auto;">
                ${data.map(match => match.win ?
                    (`<li style="background-color: green; height: 30px; text-align: center">
                    <div>
                        <h5>${match.championname}  ${match.lane}  ${match.kills}/${match.deaths}/${match.assists}</h5>
                    </div>
                    </li>`) : 
                    (`
                    <li style="background-color: red; height: 30px; text-align: center"">
                    <div>
                        <h5>${match.championname}  ${match.lane}  ${match.kills}/${match.deaths}/${match.assists}</h5>
                    </div>
                    </li>`)).join('')}
            </ul>
        </body>
        </html>`);
    });




app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    }
);