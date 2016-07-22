/* global places */

requestJSON("/getChampion?champion=" + getURLParameter("champion"), function (data) {
    document.getElementById("championName").appendChild(document.createTextNode(data.champion.name));
    document.getElementById("championIcon").src = data.champion.icon;

    var table = document.createElement("table");
    table.className = "table well well-sm";

    var columns = ["Place", "Name (Region)", "Mastery Points"];
    var labels = document.createElement("tr");
    columns.forEach(function (column) {
        var th = document.createElement("th");
        th.appendChild(document.createTextNode(column));
        labels.appendChild(th);
    });
    var thead = document.createElement("thead");
    thead.appendChild(labels);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    data.scores.forEach(function (score, i) {
        var tr = document.createElement("tr");


        var place = document.createElement("td");
        place.appendChild(document.createTextNode(places[i]));
        tr.appendChild(place);

        var name = document.createElement("td");
        if (score) {
            var a = document.createElement("a");
            a.href = "/summoner?summoner=" + score.name + "&region=" + score.region;
            a.appendChild(document.createTextNode(score.name + " (" + score.region + ")"));
            name.appendChild(a);
        } else {
            name.appendChild(document.createTextNode("Nobody"));
        }
        tr.appendChild(name);

        var points = document.createElement("td");
        points.appendChild(document.createTextNode(score ? formatNumber(score.points) : 0));
        tr.appendChild(points);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    document.getElementById("content").appendChild(table);

}, {
    400: function (message) {
        error("Invalid request", message);
    },
    404: function (message) {
        error("Champion not found", message);
    },
    0: function (message, code) {
        error("An unknown error has occured", message + " (" + code + ")");
    }
});

