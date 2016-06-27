function lookup() {
    window.location.href = "/?summoner=" + encodeURIComponent(document.getElementById("name").value) + "&region=" + document.getElementById("region").value;
}

function handleKey(e) {
    e = e || window.event;
    if (e.keyCode === 13) {
        document.getElementById("go").click();
    }
}

function makeTime(timestamp) {
    return new moment(timestamp).format("MMM D YYYY, h:mm:ss a");
}

function updateSelectedRegion() {
    var params = window.location.search.substring(1).split("&");
    params.forEach(function (param) {
        var pair = param.split("=");
        if (pair[0] === "region") {
            document.getElementById("region").value = pair[1];
            return;
        }
    });
}

window.addEventListener("load", function () {
    var times = document.getElementsByClassName("time");
    for (var i = 0; i < times.length; i++) {
        var timestamp = times[i].innerHTML;
        times[i].innerHTML = makeTime(parseInt(timestamp));
    }

    var scores = document.getElementsByClassName("score");
    for (var i = 0; i < scores.length; i++) {
        var timestamp = scores[i].innerHTML;
        scores[i].innerHTML = parseInt(timestamp).toLocaleString();
    }
    updateSelectedRegion();
});

//Google Analytics
(function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function () {
        (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date();
    a = s.createElement(o),
            m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m)
})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-72665536-1', 'auto');
ga('send', 'pageview');
