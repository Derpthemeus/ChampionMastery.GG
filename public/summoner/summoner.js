//how many tokens are needed to continue from a level
var tokensNeeded = {
    5: 2,
    6: 3
};

//sorts based on the "data-value" attribute
$.tablesorter.addParser({
    id: "data-value",
    is: function (s) {
        return false;
    },
    format: function (string, table, cell) {
        return $(cell).data("value");
    },
    type: "numeric"
});

requestJSON("/getPlayer?summoner=" + getURLParameter("summoner") + "&region=" + getURLParameter("region"), function (data) {
    document.getElementById("summonerName").appendChild(document.createTextNode(data.player.name));
    document.getElementById("summonerIcon").src = data.player.icon;
    var table = document.createElement("table");
    table.id = "table";
    table.className = "table well well-sm";

    var tbody = document.createElement("tbody");

    var totalLevel = 0, totalPoints = 0, totalChests = 0;
    data.champions.forEach(function (champion) {
        totalLevel += champion.level;
        totalPoints += champion.points;
        totalChests += champion.chest ? 1 : 0;

        var tr = document.createElement("tr");

        var name = document.createElement("td");
        var a = document.createElement("a");
        a.href = "/champion?champion=" + champion.id;
        a.appendChild(document.createTextNode(champion.name));
        name.appendChild(a);
        tr.appendChild(name);

        var level = document.createElement("td");
        level.appendChild(document.createTextNode(champion.level));
        tr.appendChild(level);

        var points = document.createElement("td");
        points.appendChild(document.createTextNode(formatNumber(champion.points)));
        points.dataset.value = champion.points;
        tr.appendChild(points);

        var chest = document.createElement("td");
        var chestImg = document.createElement("img");
        chestImg.src = "chest.png";
        chestImg.className = champion.chest ? "chest" : "notEarned chest";
        chest.appendChild(chestImg);
        chest.dataset.value = champion.chest ? 1 : 0;
        tr.appendChild(chest);

        var lastPlayed = document.createElement("td");
        lastPlayed.appendChild(document.createTextNode(makeTime(champion.lastPlayed)));
        lastPlayed.dataset.value = champion.lastPlayed;
        lastPlayed.dataset.toggle = "tooltip";
        lastPlayed.title = new moment(champion.lastPlayed).from(new moment());
        tr.appendChild(lastPlayed);

        var progress = document.createElement("td");
        if (champion.level === 7) {
            progress.appendChild(document.createTextNode("Completed"));
            progress.dataset.value = 300;
        } else if (champion.level === 5 || champion.level === 6) {
            for (var i = 0; i < tokensNeeded[champion.level]; i++) {
                var token = document.createElement("img");
                token.src = "token.png";
                token.className = i < champion.tokens ? "token" : "token notEarned";
                progress.appendChild(token);
            }
            //hacky solution to organize things.
            progress.dataset.value = ((champion.level - 4) * 100) + (champion.tokens / tokensNeeded[champion.level]);
        } else {
            //I don't like Bootstrap's progress bars
            var outer = document.createElement("div");
            outer.className = "progressBar-outer";
            var inner = document.createElement("div");
            inner.className = "progressBar-inner";
            var pct = Math.round(champion.pointsSinceLastLevel / (champion.pointsSinceLastLevel + champion.pointsNeeded) * 10000) / 100;
            inner.style.width = pct + "%";
            outer.dataset.toggle = "tooltip";
            outer.title = champion.pointsSinceLastLevel + "/" + (champion.pointsSinceLastLevel + champion.pointsNeeded) + " (" + pct + "%)";
            progress.dataset.value = pct;
            outer.appendChild(inner);
            progress.appendChild(outer);
        }
        tr.appendChild(progress);

        tbody.appendChild(tr);
    });



    var thead = document.createElement("thead");
    var columns = ["Champion", "Mastery Level", "Mastery Points", "Chest Earned", "Last Played", "Progress"];
    var labels = document.createElement("tr");
    columns.forEach(function (column) {
        var th = document.createElement("th");
        th.appendChild(document.createTextNode(column));
        //used for sorting arrows
        th.appendChild(document.createElement("span"));
        labels.appendChild(th);
    });
    thead.appendChild(labels);
    table.appendChild(thead);

    table.appendChild(tbody);

    var tfoot = document.createElement("tfoot");
    var totalsRow = document.createElement("tr");

    [
        data.champions.length + " champions",
        formatNumber(totalLevel),
        formatNumber(totalPoints),
        totalChests + "/" + data.champions.length,
        "",
        ""
    ].forEach(function (total) {
        var th = document.createElement("th");
        th.appendChild(document.createTextNode(total));
        totalsRow.appendChild(th);
    });

    tfoot.appendChild(totalsRow);
    table.appendChild(tfoot);

    document.getElementById("content").appendChild(table);


    $("#table").tablesorter({
        headers: {
            2: {sorter: "data-value"},
            3: {sorter: "data-value"},
            4: {sorter: "data-value"},
            5: {sorter: "data-value"}
        },
        //primary level, secondary points
        sortList: [[1, 1], [2, 1]]
    });
}, {
    302: function (message) {
        window.location.href = "/summoner?summoner=" + message + "&region=" + getURLParameter("region");
    },
    400: function (message) {
        error("Invalid request", message);
    },
    404: function (message) {
        error("Summoner not found", message);
    },
    500: function (message) {
        error("Server error", message);
    },
    0: function (message, code) {
        error("An unknown error has occured", message + " (" + code + ")");
    }
});

function makeTime(timestamp) {
    return new moment(timestamp).format("MMM D YYYY, h:mm:ss a");
}

