import * as React from "react";
import {ReactNode} from "react";
import {ordinalize} from "../utils";
import {CommonDataProps, RegionSelect} from "./Layout";
import {Localization} from "../Localization";
import {Highscore} from "../apiHandler";
import ResponsiveAd from "./ResponsiveAd";
import {SummonerLink} from "./Components";

export default class HomePage extends React.Component<HomeProps> {
	public render(): ReactNode {
		return (<React.Fragment>
			<div id="home-logo">
				<img src="/img/logo-icon.png" alt=""/>
				<img src="/img/logo-text.png" alt="ChampionMastery.GG"/>
			</div>

			{/* TODO make this taller/bigger */}
			<div className="summoner-lookup">
				<form className="summoner-form" action="/player">
					<input type="text" name="riotId" placeholder={this.props.commonData.T["Riot ID #TAG"]}/>
					<RegionSelect regions={this.props.commonData.regions}/>
					<input type="hidden" name="lang" value={this.props.commonData.T["LOCALE_CODE"]}/>
					<button type="submit" aria-label="Search">
						<img src="/img/search.svg" alt="Search"/>
					</button>
				</form>
			</div>
			{/*CMGG/home-mid-responsive*/}
			<ResponsiveAd adSlot={8405530677}/>

			<div id="champion-filter-container">
				<input type="text" placeholder={this.props.commonData.T["Champion name"]} id="champion-filter"/>
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

			{/*CMGG/home-bottom-responsive*/}
			<ResponsiveAd adSlot={1508949837}/>
		</React.Fragment>);
	}
}

class ChampionSummary extends React.Component<ChampionSummaryProps> {
	public render(): ReactNode {
		return <div className="champion well" key={this.props.champion.id}>
			<div className="champion-icon">
				<a className="internalLink" href={`/champion?champion=${this.props.champion.id}`}
				   aria-label={`${this.props.champion.localizedName} ${this.props.localization["Highscores"]}`}>
						<span className="championSpritesheet"
							  style={{background: `url("${this.props.dragonUrl}/img/championSpritesheet.webp") 0 -${this.props.champion.spritesheetY}px`}}></span>
				</a>
			</div>
			<div className="champion-info">
				<a className="internalLink" href={`/champion?champion=${this.props.champion.id}`}
				   aria-label={`${this.props.champion.localizedName} ${this.props.localization["Highscores"]}`}>
					<strong className="champion-name">{this.props.champion.localizedName}</strong>
				</a>
				{this.props.champion.scores.map((score, index) => (
					<div className="summoner" key={index}>
						<strong>{ordinalize(index + 1, this.props.localization)} </strong>
						<SummonerLink
							riotId={score.name}
							regionId={score.region}
							T={this.props.localization}/>
						<span>: </span>
						<span data-format-number={score.points}>{score.points}</span>
					</div>
				))}
			</div>
		</div>;
	}
}

interface HomeProps extends CommonDataProps {
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
