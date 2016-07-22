/* global places */

requestJSON("/getHighscores", function (data) {
    document.getElementById("quickJump").addEventListener("change", function (event) {
        //can be selected by going back or using other tomfoolery
        if (event.target.value !== "quick_jump") {
            window.location.href = "/champion?champion=" + event.target.value;
        }
    });
    data.champions.forEach(function (champion) {

        var option = document.createElement("option");
        option.value = champion.id;
        option.appendChild(document.createTextNode(champion.name));
        document.getElementById("quickJump").appendChild(option);


        var div = document.createElement("div");
        div.className = "col-sm-6";
        var container = document.createElement("div");
        container.className = "col-sm-12 well well-sm pull-left";

        var a = document.createElement("a");
        a.href = "/champion?champion=" + champion.id;
        var img = document.createElement("img");
        img.src = champion.icon;
        img.className = "championIcon pull-left";
        a.appendChild(img);
        container.appendChild(a);

        var text = document.createElement("div");
        text.className = "pull-left championText";

        var name = document.createElement("a");
        name.href = "/champion?champion=" + champion.id;
        name.className = "championName";
        name.appendChild(document.createTextNode(champion.name));
        text.appendChild(name);

        for (var i = 0; i < 3; i++) {
            var score = champion.scores[i];
            var row = document.createElement("div");
            row.className = "entry";

            var place = document.createElement("span");
            place.className = "place";
            place.appendChild(document.createTextNode(places[i]));
            row.appendChild(place);
            if (score) {
                var a = document.createElement("a");
                a.appendChild(document.createTextNode(score.name + " (" + score.region + ")"));
                a.href = "/summoner?summoner=" + score.name + "&region=" + score.region;
                row.appendChild(a);
                row.appendChild(document.createTextNode(": " + formatNumber(score.points)));
            } else {
                row.appendChild(document.createTextNode("Nobody"));
            }

            text.appendChild(row);
        }
        container.appendChild(text);
        div.appendChild(container);
        document.getElementById("content").appendChild(div);

    });
}, function (message, code) {
    error("An unknown error has occured", message + " (" + code + ")");
});
