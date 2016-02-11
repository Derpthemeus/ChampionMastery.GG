#!/bin/env node
var riotAPIKey = process.env.RIOT_API_KEY;
var champions;
var championIds;
var highscores = {};
var HSCOUNT = {
    display: 20,
    track: 25
};
//auto updated, manual value is a backup
var version = "6.1.1";
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
    }
};
var express = require("express");
var URL = require("url");
var HTTP = require("http");
var HTTPS = require("https");
var mongodb = require("mongodb");
var fs = require("fs");
var cron = require("cron");
var ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var app = express();
var db;

function makePage(req, response) {
    if (req.query.summoner && req.query.region) {
        var region = regions[req.query.region.toUpperCase()];
        if (region) {
            getMasteredChampions(region, req.query.summoner, function (data) {
                if (!data.error) {
                    var res = '';
                    res += '<div class="title">';
                    res += '<img src="' + data.player.icon + '">';
                    res += data.player.name;
                    res += '</div>';
                    res += '<div id="chart">';
                    res += '<table id="playerscores">';
                    res += '<tbody>';
                    res += '<thead>';
                    res += '<tr>';
                    res += '<th>Champion</th>';
                    res += '<th>Mastery level</th>';
                    res += '<th>Mastery points</th>';
                    res += '<th>Last played</th>';
                    res += '</tr>';
                    res += '</thead>';
                    var total = {
                        championLevel: 0,
                        championPoints: 0
                    };
                    data.champions.forEach(function (champ) {
                        res += '<tr>';
                        res += '<td>';
                        res += '<a href="http://championmasterylookup-derpthemeus.rhcloud.com/highscores?champion=' + champ.championId + '">';
                        res += champions[champ.championId].name;
                        res += '</a>';
                        res += '</td>';
                        res += '<td>' + champ.championLevel + '</td>';
                        total.championLevel += champ.championLevel;
                        res += '<td class="score">' + champ.championPoints + '</td>';
                        total.championPoints += champ.championPoints;
                        res += '<td class="time">' + champ.lastPlayTime + '</td>';
                        res += '</tr>';
                    });
                    res += '</tbody>';
                    res += '<tfoot>';
                    res += '<tr>';
                    res += '<td><a href="http://championmasterylookup-derpthemeus.rhcloud.com/highscores?champion=-1">TOTAL</a></td>';
                    res += '<td>' + total.championLevel + '</td>';
                    res += '<td class="score">' + total.championPoints.toLocaleString() + '</td>';
                    res += '<td></td>';
                    res += '</tr>';
                    res += '</tfoot>';
                    res += '</table>';
                    res += '<br>';
                    res += 'All times are local';
                    res += '</div>';
                    response.send(makeHTML(res));
                } else {
                    error(response, data);
                }
            });
        } else {
            error(response, {error: "Invalid region"});
        }
    } else {
        makeHome(response);
    }
}

var template;
function makeHTML(data) {
    return template.replace("<!--DATA GOES HERE-->", data);
}

function makeHome(response) {
    var res = '';
    res += '<div id=about>';
    res += '<h2>Enter a summoner name and region in the top right to look up their champion mastery scores</h2>';
    res += '<br>';
    res += 'I just added a highscore feature, be sure to check it out!';
    res += '<br>';
    res += 'Hopefully stuff isn\'t as ugly as before, I got a friend to help fix things';
    res += '</div>';
    response.send(makeHTML(res));
}

function error(response, error) {
    var res = '';
    res += '<h1>Uh... whoops</h1>';
    res += 'Error: ' + error.error;
    res += '<br><br>';
    res += 'Something went wrong. Make sure summoner name and region are correct and try again. If it still doesn\'t work, blame Teemo and try again later.';
    response.send(makeHTML(res));
}


var places = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th", "20th"];

function makeHighscores(req, response) {
    if (req.query.champion) {
        makeChampionHighscores(response, req.query.champion);
    } else {
        makeSummaryHighscores(response);
    }
}

function makeChampionHighscores(response, championId) {
    var champion = champions[championId];
    if (champion) {
        var res = '';
        res += '<div class="title">';
        res += '<img src="' + champion.icon + '">';
        res += champion.name;
        res += '<br>';
        res += '</div>';
        res += '<div id="chart">';
        res += '<div class="hsdisclaimer">Players must be looked up for their scores to be shown here. If you think somebody is missing or has a wrong score, look them up.</div>';
        res += '<table id="championhighscores">';
        res += '<thead>';
        res += '<tr>';
        res += '<th>Rank</td>';
        res += '<th>Player (Region)</th>';
        res += '<th>Score</th>';
        res += '</tr>';
        res += '</thead>';
        for (var i = 0; i < HSCOUNT.display; i++) {
            res += '<tr>';
            res += '<td>' + places[i] + '</td>';
            var score = highscores[championId][i];
            if (score) {
                res += '<td><a href="http://championmasterylookup-derpthemeus.rhcloud.com/?summoner=' + score.name + '&region=' + score.region + '">' + score.name + " (" + score.region + ")" + '</a></td>';
                res += '<td class="score">' + score.points + '</td>';
            } else {
                res += '<td>Nobody</td><td>0</td>';
            }
            res += '</tr>';
        }
        res += '</table>';
        res += '</div>';
        response.send(makeHTML(res));
    } else {
        error(response, {error: "Invalid champion"});
    }
}

function makeSummaryHighscores(response) {
    var res = '';
    res += '<div class="title">';
    res += 'Highscores';
    res += '</div>';
    res += '<div class="hsdisclaimer">Players must be looked up for their scores to be shown here. If you think somebody is missing or has a wrong score, look them up.</div>';
    res += '<div id="chart">';
    res += '<table id="highscoresummary">';
    res += '<thead>';
    res += '<tr>';
    res += '<th></th>';
    res += '<th>Champion</td>';
    res += '<th>Rank</th>';
    res += '<th>Player (Region)</th>';
    res += '<th>Score</th>';
    res += '</tr>';
    res += '</thead>';
    championIds.forEach(function (championId) {
        var champion = champions[championId];
        for (var i = 0; i < 3; i++) {
            res += '<tr>';
            if (i === 0) {
                res += '<td rowspan="3"><img src="' + champion.icon + '" width="80" height="80"></td>';
                res += '<td rowspan="3"><a class="championName" href="http://championmasterylookup-derpthemeus.rhcloud.com/highscores?champion=' + champion.id + '">';
                //res += '<br>';
                res += champion.name;
                res += '</a></td>';
            }
            res += '<td class="place-' + i + '">' + places[i] + '</td>';
            var score = highscores[champion.id][i];
            if (score) {
                res += '<td class="place-' + i + '"><a href="http://championmasterylookup-derpthemeus.rhcloud.com/?summoner=' + score.name + '&region=' + score.region + '">' + score.name + " (" + score.region + ")" + '</a></td>';
                res += '<td class="score place-' + i + '">' + score.points + '</td>';
            } else {
                res += '<td class="place-' + i + '">Nobody</td><td class="place-' + i + '">0</td>';
            }
            res += '</tr>';
        }
    });
    res += '</table>';
    res += '</div>';
    response.send(makeHTML(res));
}


function updateHighscores(data, summonerId, region) {
    var totalPoints = 0;
    foreach(data.champions, function (index, champion) {
        updateHighscore(data, summonerId, region, champion);
        totalPoints += champion.championPoints;
    });

    updateHighscore(data, summonerId, region, {
        championId: -1,
        championPoints: totalPoints
    });
}

function updateHighscore(data, summonerId, region, champion) {
    var championId = champion.championId;
    for (var i = 0; i < HSCOUNT.track; i++) {
        if (highscores[championId][i]) {
            if (highscores[championId][i].id !== summonerId) {
                if (champion.championPoints > highscores[championId][i].points) {
                    setScore(championId, i, data.player.name, summonerId, region.region, champion.championPoints, false);
                    break;
                }
            } else {
                highscores[championId][i] = {
                    name: data.player.name,
                    id: summonerId,
                    region: region.region,
                    points: champion.championPoints
                };
                console.log("Updated highscore for " + championId + " by " + summonerId + " with " + champion.championPoints + " at " + i);
                break;
            }
        } else {
            setScore(championId, i, data.player.name, summonerId, region.region, champion.championPoints, true);
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
    db.collection("highscoreData").update({}, highscores, function (err) {
        if (err) {
            console.log("Error saving highscores: " + err);
        } else {
            console.log("Saved highscores");
        }
    });
}


function getMasteredChampions(region, name, callback) {
    requestJSON(region.host + "/api/lol/" + region.region + "/v1.4/summoner/by-name/" + encodeURIComponent(name) + "?api_key=" + riotAPIKey, function (players) {
        var player = players[Object.keys(players)[0]];
        requestJSON(region.host + "/championmastery/location/" + region.platform + "/player/" + player.id + "/champions?api_key=" + riotAPIKey, function (data) {
            var result = {
                player: {
                    icon: ddragon + "img/profileicon/" + player.profileIconId + ".png",
                    name: player.name
                },
                champions: data
            };
            updateHighscores(result, player.id, region);
            callback(result);
        }, {
            404: function () {
                callback({error: "champion mastery data not found"});
            },
            500: function () {
                callback({error: "shit got cray"});
            },
            0: function (code) {
                callback({error: "Unknown error: " + code});
            }
        });
    }, {
        404: function () {
            callback({error: "summoner not found"});
        },
        0: function (code) {
            callback({error: "Unknown error: " + code});
        }
    });
}

function requestJSON(url, success, errors) {
    HTTPS.get(url, function (response) {
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
            if (errors[response.statusCode]) {
                errors[response.statusCode]();
            } else if (errors[0]) {
                errors[0](response.statusCode);
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
    fs.readFile("./template.html", "utf8", function (err, _template) {
        if (!err) {
            console.log("template loaded");
            var regionHTML = '';
            foreach(regions, function (key, region) {
                regionHTML += '<option value="' + region.region + '">' + region.region + '</option>';
            });
            template = _template.replace(" <!--REGIONS GO HERE-->", regionHTML);
            requestJSON("https://global.api.pvp.net/api/lol/static-data/na/v1.2/versions?api_key=" + riotAPIKey, function (versions) {
                console.log("got versions");
                version = versions[0];
                ddragon = "http://ddragon.leagueoflegends.com/cdn/" + version + "/";
                requestJSON("https://global.api.pvp.net/api/lol/static-data/na/v1.2/champion?dataById=true&api_key=" + riotAPIKey, function (_champions) {
                    console.log("got champion data");
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
                        icon: "/img/masteryIcon.png"
                    };
                    championIds.push(-1);

                    app.use(express.static("public"));
                    app.all("/", function (req, response) {
                        makePage(req, response);
                    });

                    var url = "mongodb://" + process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" + process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" + process.env.OPENSHIFT_MONGODB_DB_HOST + ":" + process.env.OPENSHIFT_MONGODB_DB_PORT + "/";
                    mongodb.MongoClient.connect(url, function (err, _db) {
                        if (!err) {
                            console.log("connected to mongodb");
                            db = _db;
                            db.collection("highscoreData").findOne({}, function (err, _highscores) {
                                if (!err) {
                                    highscores = _highscores || {};
                                    foreach(champions, function (index, champion) {
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

                                    app.all("/highscores", function (req, response) {
                                        makeHighscores(req, response);
                                    });

                                    new cron.CronJob("0 * * * * *", function () {
                                        saveHighscores();
                                    }, null, true).start();

                                } else {
                                    app.all("/highscores", function (req, response) {
                                        error(response, {error: "There was an error setting up highscores or this feature is currently disabled. Check again later (actually later. Refreshing won't help)"});
                                    });
                                }
                            });
                        } else {
                            console.log("CRITICAL ERROR CONNECTING TO MONGODB (" + err + ")");
                            app.all("/highscores", function (req, response) {
                                error(response, {error: "There was an error setting up highscores or this feature is currently disabled. Check again later (actually later. Refreshing won't help)"});
                            });
                        }
                    });
                    app.listen(port, ipaddr);
                });
            });
        } else {
            throw err;
        }
    });
}

start();
