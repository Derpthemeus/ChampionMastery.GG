//redirects from old URL format to new one

if (getURLParameter("summoner") && getURLParameter("region")) {
    window.location.pathname = "summoner";
}