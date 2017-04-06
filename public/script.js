var places = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th", "20th"];

function lookup() {
    window.location.href = "/summoner?summoner=" + encodeURIComponent(document.getElementById("name").value) + "&region=" + document.getElementById("region").value;
    //http://stackoverflow.com/a/6094213
    return false;
}

function updateSelectedRegion() {
    document.getElementById("region").value = getURLParameter("region") || "NA";
}

window.addEventListener("load", function () {
    jQuery.get("/header.html", function (data) {
        $("body").prepend(data);
        requestJSON("/getRegions", function (regions) {
            regions.forEach(function (region) {
                var option = document.createElement("option");
                option.value = region;
                option.appendChild(document.createTextNode(region));
                document.getElementById("region").appendChild(option);
            });
            updateSelectedRegion();
        });
        requestJSON("/getAnnouncement", function (announcement) {
            if (announcement.message) {
                var announcementBody = document.getElementById("announcementBody");
                announcementBody.appendChild(document.createTextNode(announcement.message));
                if (announcement.link) {
                    announcementBody.href = announcement.link;
                }
                document.getElementById("announcement").hidden = false;
            }
        });
    });

    jQuery.get("/footer.html", function (data) {
        $("body").append(data);
    });
});

function formatNumber(number) {
    return number.toLocaleString();
}

function getURLParameter(name) {
    var query = window.location.search.substr(1).split("&");
    for (var i = 0; i < query.length; i++) {
        var param = query[i];
        var split = param.split("=");
        if (split[0] === name) {
            return split[1];
        }
    }
    return null;
}

function error(title, message) {
    var div = document.createElement("div");
    div.className = "text-center";
    var h = document.createElement("h2");
    h.appendChild(document.createTextNode(title));
    div.appendChild(h);
    div.appendChild(document.createTextNode(message));
    document.getElementById("content").appendChild(div);
}

function requestJSON(url, success, errors) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState === 4) {
            var body = xmlHttp.responseText;
            if (xmlHttp.status === 200) {
                var data = body ? JSON.parse(body) : null;
                success(data);
            } else if (errors) {
                if (typeof (errors) === "function") {
                    errors(body, xmlHttp.status);
                } else {
                    if (errors[xmlHttp.status]) {
                        errors[xmlHttp.status](body, xmlHttp.status);
                    } else if (errors[0]) {
                        errors[0](body, xmlHttp.status);
                    }
                }
            }
        }
    };
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}

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
