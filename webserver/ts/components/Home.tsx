import * as React from "react";
import {ReactNode} from "react";
import {ordinalize} from "../utils";
import {CommonDataProps, RegionSelect} from "./Layout";
import {Localization} from "../Localization";
import {Highscore} from "../apiHandler";

export default class Home extends React.Component<HomeProps> {
	public render(): ReactNode {
		return (<React.Fragment>
			<div id="home-logo">
				<img src="/img/logo-icon.png" alt=""/>
				<img src="/img/logo-text.png" alt="ChampionMastery.GG"/>
			</div>

			{/* TODO make this taller/bigger */}
			<div className="summoner-lookup">
				<form className="summoner-form" action="/summoner">
					<input type="text" name="summoner" placeholder={this.props.commonData.T["Summoner name"]}/>
					<RegionSelect regions={this.props.commonData.regions}/>
					<input type="hidden" name="lang" value={this.props.commonData.T["LOCALE_CODE"]}/>
					<button type="submit">
						<span className="material-symbols-outlined">search</span>
					</button>
				</form>
			</div>

			<div className="responsiveAd">
				<script async
						src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5598552437938145"
						crossOrigin="anonymous"></script>
				{/*CMGG/home-mid-responsive*/}
				<ins className="adsbygoogle"
					 style={{display: "block"}}
					 data-ad-client="ca-pub-5598552437938145"
					 data-ad-slot="8405530677"
					 data-ad-format="auto"
					 data-full-width-responsive="true"></ins>
				<script>
					(adsbygoogle = window.adsbygoogle || []).push({});
				</script>
			</div>

			<div id="champion-filter-container">
				<input type="text" placeholder={this.props.commonData.T["Champion name"]} id="champion-filter"/>
				<span className="material-symbols-outlined">filter_list</span>
			</div>

			{/*TODO fix bug when 2/3 champs are displayed on last row*/}
			<div id="highscores">
				{this.props.champions.map((champion) => (
					<ChampionSummary
						champion={champion}
						dragonUrl={this.props.commonData.dragonUrl}
						localization={this.props.commonData.T}
						key={champion.id}/>
				))}
			</div>
		</React.Fragment>);
	}
}

class ChampionSummary extends React.Component<ChampionSummaryProps> {
	public render(): ReactNode {
		return <div className="champion well" key={this.props.champion.id}>
			<div className="champion-icon">
				<a className="internalLink" href={`/champion?champion=${this.props.champion.id}`}>
						<span className="championSpritesheet"
							  style={{background: `url("${this.props.dragonUrl}/img/championSpritesheet.png") 0 -${this.props.champion.spritesheetY}px`}}></span>
				</a>
			</div>
			<div className="champion-info">
				<a className="internalLink" href={`/champion?champion=${this.props.champion.id}`}>
					<strong className="champion-name">{this.props.champion.localizedName}</strong>
				</a>
				{this.props.champion.scores.map((score, index) => (
					<div key={index}>
						<strong>{ordinalize(index + 1, this.props.localization)} </strong>
						{score.name ?
							<a className="internalLink"
							   href={`/summoner?summoner=${encodeURIComponent(score.name)}&region=${score.region}`}>
								{score.name} ({score.region})
							</a>
							:
							<a className="internalLink" href="/privacy">
								[{this.props.localization["HIDDEN"]}] ({score.region})
							</a>
						}
						<span>: </span>
						<span data-format-number={score.points}>{score.points}</span>
					</div>
				))}
			</div>
		</div>;
	}
}

interface HomeProps extends CommonDataProps{
	champions: ChampionHighscoreSummary[];
}

interface ChampionSummaryProps {
	champion: ChampionHighscoreSummary;
	dragonUrl: string;
	localization: Localization;
}

export interface ChampionHighscoreSummary {
	id: number;
	localizedName: string;
	spritesheetY: number;
	scores: Highscore[];
}
