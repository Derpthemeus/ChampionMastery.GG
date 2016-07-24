#!/bin/env node
//secrets.js contains authorization/login details and is not included in the repository. Check out 'secrets-EXAMPLE.js' for more info
var secrets;
try {
    secrets = require("./secrets.js");
} catch (e) {
    //secrets.js will not exist on the server since files are pushed via git, no problem here
}
var riotAPIKey = process.env.RIOT_API_KEY || secrets.riotApiKey;
var highscoreDataPath = (process.env.OPENSHIFT_DATA_DIR || "") + "highscoreData.json";
var champions;
var championIds;
var highscores = {};
var HSCOUNT = {
    display: 20,
    track: 25
};
var ddragon;
var regions = {
    NA: {
        region: "NA",
        platform: "NA1",
        host: "https://na.api.pvp.net"
    },
    BR: {
        region: "BR",
        platform: "BR1",
        host: "https://br.api.pvp.net"
    },
    EUNE: {
        region: "EUNE",
        platform: "EUN1",
        host: "https://eune.api.pvp.net"
    },
    EUW: {
        region: "EUW",
        platform: "EUW1",
        host: "https://euw.api.pvp.net"
    },
    KR: {
        region: "KR",
        platform: "KR",
        host: "https://kr.api.pvp.net"
    },
    LAN: {
        region: "LAN",
        platform: "LA1",
        host: "https://lan.api.pvp.net"
    },
    LAS: {
        region: "LAS",
        platform: "LA2",
        host: "https://las.api.pvp.net"
    },
    OCE: {
        region: "OCE",
        platform: "OC1",
        host: "https://oce.api.pvp.net"
    },
    TR: {
        region: "TR",
        platform: "TR1",
        host: "https://tr.api.pvp.net"
    },
    RU: {
        region: "RU",
        platform: "RU",
        host: "https://ru.api.pvp.net"
    },
    JP: {
        region: "JP",
        platform: "JP1",
        host: "https://jp.api.pvp.net"
    }
};
var express = require("express");
var URL = require("url");
var HTTP = require("http");
var HTTPS = require("https");
var fs = require("fs");
var ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 80;
var app = express();

//a list of regions
function getRegions(req, res) {
    res.status(200).send(Object.keys(regions));
}

//top 3 for each champion
function getHighscores(req, res) {
    var response = {
        champions: []
    };
    championIds.forEach(function (championId) {
        var champion = champions[championId];
        var resChampion = {
            icon: champion.icon,
            name: champion.name,
            id: champion.id,
            scores: []
        };

        for (var i = 0; i < 3; i++) {
            var score = highscores[champion.id][i];
            resChampion.scores[i] = (score ? {
                points: score.points,
                name: score.name,
                region: score.region
            } : null);
        }
        response.champions.push(resChampion);
    });
    res.status(200).send(response);
}


//gets top 20 players for specified champion
function getChampion(req, res) {
    var championId = req.query.champion;
    if (championId) {
        var champion = champions[championId];
        if (champion) {
            var response = {
                champion: champion,
                scores: []
            };
            for (var i = 0; i < HSCOUNT.display; i++) {
                var score = highscores[championId][i];
                response.scores[i] = score ? {
                    points: score.points,
                    name: score.name,
                    region: score.region
                } : null;
            }
            res.status(200).send(response);
        } else {
            res.status(404).send("Champion not found");
        }
    } else {
        res.status(400).send("Champion not specified");
    }
}

//displays info for a player
function getPlayer(req, res) {
    if (req.query.summoner) {
        if (req.query.region && regions[req.query.region]) {
            var region = regions[req.query.region];
            requestJSON(region.host + "/api/lol/" + region.region + "/v1.4/summoner/by-name/" + encodeURIComponent(req.query.summoner) + "?api_key=" + riotAPIKey, function (players) {
                var player = players[Object.keys(players)[0]];
                requestJSON(region.host + "/championmastery/location/" + region.platform + "/player/" + player.id + "/champions?api_key=" + riotAPIKey, function (data) {
                    var result = {
                        player: {
                            icon: ddragon + "img/profileicon/" + player.profileIconId + ".png",
                            name: player.name
                        },
                        champions: []
                    };
                    data.forEach(function (champion) {
                        var info = {
                            name: champions[champion.championId].name,
                            id: champion.championId,
                            level: champion.championLevel,
                            points: champion.championPoints,
                            lastPlayed: champion.lastPlayTime,
                            chest: champion.chestGranted
                        };
                        if (champion.championPointsUntilNextLevel === 0) {
                            info.tokens = champion.tokensEarned;
                        } else {
                            info.pointsSinceLastLevel = champion.championPointsSinceLastLevel;
                            info.pointsNeeded = champion.championPointsUntilNextLevel;
                        }

                        result.champions.push(info);
                    });
                    updateHighscores(result, player.id, region);
                    res.status(200).send(result);
                }, function (code) {
                    res.status(500).send("Error from Riot's API server (" + code + ")");
                });
            }, {
                404: function () {
                    // check if the summoner does exist in the highscores and if update the summoner
                    var summonerId;
                    if (function() {
                            for (var i = 0; i < highscores.length; i++) {
                                var score = highscores[i].filter(function(score) {
                                    return (score.region == region.region && score.name == req.query.summoner);
                                })
                                if (score.length > 0) {
                                    summonerId = score.id;
                                    highscores[i].splice(highscores[i].indexOf(score), 1);
                                    return true;
                                } else {
                                    return false;
                                }
                            }
                        }) {
                        requestJSON(region.host + "/api/lol/" + region.region + "/v1.4/summoner/" + summonerId + "/name?api_key=" + riotAPIKey, function (player) {
                            res.redirect(302, "/summoner/?summoner=" + encodeURIComponent(player[0]) + "&region=" + region.region);
                        }
                    } else {
                        res.status(404).send("Summoner not found. Make sure the name and region are correct.");
                    }
                },
                0: function (code) {
                    res.status(500).send("Unknown error: " + code);
                }
            });
        } else {
            res.status(400).send("Invalid region");
        }
    } else {
        res.status(400).send("Player not specified");
    }
}

function updateHighscores(data, summonerId, region) {
    var totalPoints = 0;
    foreach(data.champions, function (key, champion) {
        updateHighscore(data, summonerId, region, champion);
        totalPoints += champion.points;
    });

    updateHighscore(data, summonerId, region, {
        id: -1,
        points: totalPoints
    });
}

function updateHighscore(data, summonerId, region, champion) {
    var championId = champion.id;
    for (var i = 0; i < HSCOUNT.track; i++) {
        if (highscores[championId][i]) {
            if (highscores[championId][i].id !== summonerId) {
                if (champion.points > highscores[championId][i].points) {
                    setScore(championId, i, data.player.name, summonerId, region.region, champion.points, false);
                    for (var currentPos = i + 1; currentPos < HSCOUNT.track; currentPos++) {
                        if (highscores[championId][currentPos] && highscores[championId][currentPos].id === summonerId) {
                            highscores[championId].splice(currentPos, 1);
                            break;
                        }
                    }
                    break;
                }
            } else {
                highscores[championId][i] = {
                    name: data.player.name,
                    id: summonerId,
                    region: region.region,
                    points: champion.points
                };
                console.log("Updated highscore for " + championId + " by " + summonerId + " with " + champion.points + " at " + i);
                break;
            }
        } else {
            setScore(championId, i, data.player.name, summonerId, region.region, champion.points, true);
            break;
        }
    }
}

function setScore(championId, place, name, summonerId, region, points, isNew) {
    var score = {
        name: name,
        id: summonerId,
        region: region,
        points: points
    };
    highscores[championId].splice(place, 0, score);
    highscores[championId] = highscores[championId].slice(0, HSCOUNT.track);
    if (isNew) {
        console.log("Created highscore for " + championId + " by " + score.id + " with " + score.points + " at " + place);
    } else {
        console.log("Modified highscore for " + championId + " by " + score.id + " with " + score.points + " at " + place);
    }
}

function saveHighscores() {
    fs.writeFile(highscoreDataPath, JSON.stringify(highscores, null, "\t"), function (err) {
        if (err) {
            console.error("Error saving highscores: " + err);
        } else {
            console.log("Saved highscores");
        }
    });
}

function requestJSON(url, success, errors) {
    (url.toLowerCase().indexOf("https://") === 0 ? HTTPS : HTTP).get(url, function (response) {
        if (response.statusCode === 200) {
            var body = "";
            response.on("data", function (segment) {
                body += segment;
            });
            response.on("end", function () {
                var data = JSON.parse(body);
                success(data);
            });
        } else if (errors) {
            if (typeof (errors) === "function") {
                errors(response.statusCode);
            } else {
                if (errors[response.statusCode]) {
                    errors[response.statusCode]();
                } else if (errors[0]) {
                    errors[0](response.statusCode);
                }
            }
        }
    });
}

function foreach(obj, func) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = obj[key];
        func(key, value);
    }
}

function start() {
    console.log("starting...");
    requestJSON("https://global.api.pvp.net/api/lol/static-data/na/v1.2/versions?api_key=" + riotAPIKey, function (versions) {
        var version = versions[0];
        console.log("Got DDragon version");
        ddragon = "https://ddragon.leagueoflegends.com/cdn/" + version + "/";
        requestJSON("https://global.api.pvp.net/api/lol/static-data/na/v1.2/champion?dataById=true&api_key=" + riotAPIKey, function (_champions) {
            console.log("Got champion data from DDragon");
            champions = _champions.data;
            foreach(champions, function (key, champion) {
                champion.icon = ddragon + "img/champion/" + champion.key + ".png";
                champions[key] = champion;
            });

            championIds = Object.keys(champions);
            championIds.sort(function (a, b) {
                var nameA = champions[a].name.toUpperCase();
                var nameB = champions[b].name.toUpperCase();
                return (nameA < nameB) ? -1 : (nameA > nameB) ? 1 : 0;
            });
            champions[-1] = {
                id: -1,
                name: "Total",
                icon: "/masteryIcon.png"
            };
            championIds.unshift(-1);

            fs.readFile(highscoreDataPath, function (err, json) {
                if (!err) {
                    highscores = json ? JSON.parse(json) : {};
                    console.log("loaded highscore data");
                    foreach(champions, function (key, champion) {
                        if (!highscores[champion.id]) {
                            highscores[champion.id] = [];
                        }
                    });

                    //There were some errors earlier, this should fix them. Kept just in case
                    foreach(highscores, function (key, champion) {
                        for (var i = champion.length - 1; i >= 0; i--) {
                            for (var j = 0; j < i; j++) {
                                //no idea what happened, but I fixed it
                                if (champion[j] && champion[i] && champion[j].id === champion[i].id) {
                                    console.log(champion[j].id + " has highscores for " + key + " at " + i + " and " + j);
                                    highscores[key].splice(i, 1);
                                }
                            }
                        }
                    });
                    //allows the homepage contents to be stored in their own folder
                    app.use(express.static("public/home"));
                    app.use(express.static("public"));
                    app.all("/getRegions", getRegions);
                    app.all("/getHighscores", getHighscores);
                    app.all("/getChampion", getChampion);
                    app.all("/getPlayer", getPlayer);

                    setInterval(saveHighscores, 60 * 1000);

                    app.listen(port, ipaddr);
                    console.log("started");
                } else {
                    console.error("CRITICAL ERROR LOADING HIGHSCORE DATA (" + err + ")");
                }
            });
        });
    });
}

start();
