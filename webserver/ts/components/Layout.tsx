import * as React from "react";
import {ReactNode} from "react";
import {Localization} from "../Localization";
import {CommonData} from "../server";

export default class Layout extends React.Component<LayoutProps> {
	public render(): ReactNode {
		return (
			<html lang={this.props.commonData.langCode}>
			<head>
				<meta charSet="UTF-8"/>
				<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
				<meta name="google-site-verification" content="alkAXvVRRlUYhxyDLGOky7uTxdjil4P3n86Ax4Jbpsg"/>
				<meta name="twitter:card" content="summary"/>

				<title>{this.props.title}</title>
				<meta property="og:title" content={this.props.title}/>
				<meta name="description" content={this.props.description}/>
				<meta property="og:description" content={this.props.description}/>
				<meta property="og:type" content="website"/>
				<meta property="og:image" content={`${this.props.commonData.siteUrl}/img/logo-icon.png`}/>
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
				<link rel="manifest" href="/site.webmanifest"/>
				<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5"/>
				<meta name="msapplication-TileColor" content="#00aba9"/>
				<meta name="theme-color" content="#ffffff"/>
				<link rel="stylesheet" type="text/css" href="/css/styles.css"/>
				<link rel="stylesheet"
					  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,500,0,200"/>

				<link rel="stylesheet" type="text/css" href="/css/styles.css"/>
				{this.props.stylesheets.map((url, index) => (
					<link rel="stylesheet" type="text/css" href={url} key={index}/>
				))}

				<script src="/js/script.js"/>

				{/* Google Analytics*/}
				<script dangerouslySetInnerHTML={{
					__html: `
					window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
					ga('create', 'UA-72665536-1', 'auto');
					ga('send', 'pageview');
				`
				}}/>
				<script async src="https://www.google-analytics.com/analytics.js"/>

				{/* Google tag (gtag.js)*/}
				<script async src="https://www.googletagmanager.com/gtag/js?id=G-KL0MJEHFX0"/>
				<script dangerouslySetInnerHTML={{
					__html: `
					window.dataLayer = window.dataLayer || [];
					function gtag(){dataLayer.push(arguments);}
					gtag('js', new Date());

					gtag('config', 'G-KL0MJEHFX0');
					`
				}}/>

				{/* Google AdSense*/}
				<script data-ad-client="ca-pub-5598552437938145" async
						src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"/>

				{this.props.commonData.supportedLocales.map((localization: Localization) => (
					this.generateAlternateLangLink(localization)
				))}

				<link rel="stylesheet" type="text/css" href="/css/styles.css"/>
				{this.props.scripts.map((url, index) => (
					<script src={url} key={index}/>
				))}
			</head>
			<body>
			<nav id="navbar">
				<a id="navbar-logo" className="internalLink" href="/">
					<img src="/img/logo-icon.png" alt="ChampionMastery.GG"/>
					<img id="navbar-logo-title" src="/img/logo-text.png" alt="ChampionMastery.GG"/>
				</a>
				<button id="toggle-search-button">&#x25BC;</button>
				<div id="navbar-lookup" className="summoner-lookup">
					<form id="navbar-form" className="summoner-form" action="/player">
						<input type="text" name="riotId" placeholder={this.props.commonData.T["Riot ID #TAG"]}/>
						<RegionSelect regions={this.props.commonData.regions}/>
						<input type="hidden" name="lang" value={this.props.commonData.T["LOCALE_CODE"]}/>
						<button type="submit">
							<span className="material-symbols-outlined">search</span>
						</button>
					</form>
				</div>
			</nav>

			{this.props.commonData.announcement.message && (
				<div id="announcement">
					{this.props.commonData.announcement.link ? (
						<a href={this.props.commonData.announcement.link}>{this.props.commonData.announcement.message}</a>
					) : (
						this.props.commonData.announcement.message
					)}
				</div>
			)}

			<div id="content">
				{this.props.body}
			</div>


			<div id="footer">
				<div>
					<span><a
						href="https://github.com/Derpthemeus/ChampionMastery.GG">Made with &#9825; by Derpthemeus <img
						src="/img/github-mark.svg" width="17" alt="(GitHub)"/></a></span>
					<span><a className="internalLink" href="/faq">{this.props.commonData.T["Help & Info"]}</a></span>
					<span><a className="internalLink" href="/legal">{this.props.commonData.T["Legal info"]}</a></span>
					<span><a className="internalLink"
							 href="/privacy">{this.props.commonData.T["Player privacy"]}</a></span>
				</div>
				<div>
					<a href="https://www.digitalocean.com/?refcode=52977c31ea5b&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge"><img
						src="https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%202.svg"
						alt="Powered by DigitalOcean"/></a>
				</div>
			</div>
			</body>
			</html>
		);
	}

	private generateAlternateLangLink(localization: Localization) {
		const localeCode = localization.LOCALE_CODE;
		const currentUrl = this.props.commonData.currentUrl;
		let href: string;
		// This will need to be changed if another query parameter with a *lang suffix is ever added.
		if (currentUrl.includes("lang=")) {
			const startIndex = currentUrl.indexOf("lang=");
			// End of "lang=en_US"
			let endIndex;
			if (currentUrl.indexOf("&", startIndex) > 0) {
				endIndex = currentUrl.indexOf("&", startIndex);
			} else {
				endIndex = currentUrl.length;
			}

			href = `${currentUrl.slice(0, startIndex)}lang=${localeCode}${currentUrl.slice(endIndex)}`;
		} else if (currentUrl.includes("?")) {
			// If query params are already present, add the new param to the start of the list.
			const index = currentUrl.indexOf("?") - 1;
			href = `${currentUrl.slice(0, index)}lang=${localeCode}${currentUrl.slice(index)}`;
		} else {
			// Just add query to end of path
			href = `${currentUrl}?lang=${localeCode}`;
		}

		return <link rel="alternate" hrefLang={localeCode.split("_")[0]} href={href} key={localeCode}/>;
	}
}


export class RegionSelect extends React.Component<RegionSelectProps> {
	public render(): ReactNode {
		return (
			<select className="region" name="region">
				{this.props.regions.map((region: string) => (
					<option value={region} key={region}>{region}</option>
				))}
			</select>
		);
	}

}

interface RegionSelectProps {
	regions: string[];
}

interface LayoutProps extends CommonDataProps {
	body: ReactNode;
	title: string;
	description: string;
	stylesheets: string[];
	scripts: string[];
}

export interface CommonDataProps {
	commonData: CommonData;
}
