import * as React from "react";
import {ReactElement, ReactNode} from "react";
import {CommonDataProps} from "./Layout";
import {ChampionInfo} from "../routes/player";
import {SummonerInfo} from "../apiHandler";
import Region from "../Region";
import {CommonData} from "../server";
import ResponsiveAd from "./ResponsiveAd";
import RankThresholds from "../RankThresholds";
import {Localization} from "../Localization";

export default class SummonerPage extends React.Component<SummonerProps> {
	public render(): ReactNode {
		return (<React.Fragment>
			<div id="header">
				<h1>
					<img
						src={`${this.props.commonData.dragonUrl}/img/profileIcons/${this.props.summoner.profileIconId}.png`}
						id="summonerIcon"/>
					<span id="summonerName">{this.props.summoner.riotId} ({this.props.region.id})</span>
				</h1>
				<div id="profileLinks">
					<a className="profileLink"
					   href={`https://op.gg/summoners/${this.props.region.id.toLowerCase()}/${encodeURIComponent(this.props.summoner.riotId.replace("#", "-"))}`}>op.gg</a>
					<a className="profileLink"
					   href={`https://www.leagueofgraphs.com/summoner/${this.props.region.id.toLowerCase()}/${encodeURIComponent(this.props.summoner.riotId.replace("#", "-"))}`}>League
						of Graphs</a>
					<a className="profileLink"
					   href={`https://u.gg/lol/profile/${this.props.region.platformId.toLowerCase()}/${encodeURIComponent(this.props.summoner.riotId.toLowerCase().replace("#", "-"))}/overview`}>u.gg</a>
				</div>
			</div>

			{/*summoner-header-responsive*/}
			<ResponsiveAd adSlot={4796081437}/>

			<div id="container">
				<table className="well">
					<thead>
					<tr>
						<HeaderColumn name={this.props.commonData.T["Champion name"]}/>
						<HeaderColumn name={this.props.commonData.T["Level"]}/>
						<HeaderColumn name={this.props.commonData.T["Points"]}/>
						<HeaderColumn name={this.props.commonData.T["Rank"]} collapsible={true}/>
						{/*FIXME reenable*/}
						{/*<HeaderColumn name={this.props.commonData.T["Chest"]}/>*/}
						<HeaderColumn name={this.props.commonData.T["Last played"]}/>
						<HeaderColumn name={this.props.commonData.T["Points until next level"]}/>
					</tr>
					</thead>

					<tbody id="tbody"> {this.props.champions.map((champion: ChampionInfo) =>
						<tr key={champion.championId}>
							<td>
								<a className="internalLink" href={`/champion?champion=${champion.championId}`}>
									{champion.localizedChampionName}
								</a>
							</td>
							<td>{champion.championLevel}</td>
							<td data-format-number={champion.championPoints} data-value={champion.championPoints}>
								{champion.championPoints}
							</td>
							<td className="collapsible" data-value={champion.rank}>{RankThresholds.localizeRank(champion.rank, this.props.commonData.T)}</td>
							{/*<td data-value={champion.chestGranted ? 1 : 0}>*/}
							{/*	<img src="/img/chest.png"*/}
							{/*		 className={champion.chestGranted ? "chest" : "chest notEarned"}/>*/}
							{/*</td>*/}
							<td data-format-time={champion.lastPlayTime} data-value={champion.lastPlayTime}
								data-toggle="tooltip"></td>
							<ProgressCell champion={champion} commonData={this.props.commonData}/>
						</tr>
					)}</tbody>
					<tfoot>
					<tr>
						<td>
							<a className="internalLink" href="/champion?champion=-1">
								{this.props.totals.champions} {this.props.commonData.T["champions"]}
							</a>
						</td>
						<td data-format-number={this.props.totals.level}>{this.props.totals.level}</td>
						<td data-format-number={this.props.totals.points}>{this.props.totals.points}</td>
						<TotalsRank levelRank={this.props.totals.levelRank} pointsRank={this.props.totals.pointsRank} localization={this.props.commonData.T}/>
						{/*<td>{this.props.totals.chests}/{this.props.totals.champions}</td>*/}
						<td></td>
						<td></td>
					</tr>
					</tfoot>
				</table>
			</div>

			{/*summoner-footer-responsive*/}
			<ResponsiveAd adSlot={9866104978}/>
		</React.Fragment>);
	}
}


/** How many tokens are needed to continue from a level (the key) to the next */
const TOKENS_NEEDED = new Map([[5, 2], [6, 3]]);

function getTokens(champion: ChampionInfo): ReactNode {
	const content: ReactNode[] = [];
	for (let i = 0; i < TOKENS_NEEDED.get(champion.championLevel); i++) {
		content.push(<img className={`token${i >= champion.tokensEarned ? " notEarned" : ""}`}
						  src="/img/token.png"
						  key={i}/>);
	}
	return content;
}

function HeaderColumn(props: { name: string, collapsible?: boolean }): ReactElement {
	return <th className={props.collapsible ? "collapsible" : ""} data-sorting-order="0">
		{props.name}
		{/*Used for the sorting icon*/}
		<span className="collapsible"/>
	</th>;
}

function ProgressCell(props: { commonData: CommonData, champion: ChampionInfo }): ReactElement {
	let nextLevelPoints;
	if (props.champion.championPointsUntilNextLevel > 0) {
		nextLevelPoints = props.champion.championPointsSinceLastLevel + props.champion.championPointsUntilNextLevel;
	} else {
		if (props.champion.championLevel >= 6) {
			nextLevelPoints = 11000;
		} else if (props.champion.championLevel === 5) {
			nextLevelPoints = 10000;
		} else if (props.champion.championLevel === 4) {
			nextLevelPoints = 9000;
		} else {
			console.error(`Could not calculate progress for ${props.champion}`);
			return <td/>;
		}
	}

	const width = Math.min(props.champion.championPointsSinceLastLevel / nextLevelPoints * 100, 100);
	return (
		<td data-value={props.champion.sortingValue}
			data-tooltip="tooltip"
			title={props.champion.tooltip}
		>
			<div className="progressBar-outer">
				<div className="progressBar-inner" style={{width: `${width}%`}}></div>
				<span className="pointsToNextLevel">
					<span data-format-number={props.champion.championPointsSinceLastLevel}/>
					/
					<span data-format-number={nextLevelPoints}/>
				</span>
			</div>
		</td>
	);
}

function TotalsRank(props: { levelRank: number, pointsRank: number, localization: Localization }): ReactElement {
	let rank = "";
	if (props.pointsRank) {
		rank += `${RankThresholds.localizeRank(props.pointsRank, props.localization)} ${props.localization["Points"]}`;
	}
	if (props.pointsRank && props.levelRank) {
		rank += "\n";
	}
	if (props.levelRank) {
		rank += `${RankThresholds.localizeRank(props.levelRank, props.localization)} ${props.localization["Level"]}`;
	}

	return <td className="collapsible" style={{whiteSpace: "pre"}}>{rank}</td>;
}

interface SummonerProps extends CommonDataProps {
	region: Region;
	summoner: SummonerInfo;
	champions: ChampionInfo[];
	totals: {
		level: number;
		points: number;
		chests: number;
		champions: number;
		pointsRank: number;
		levelRank: number;
	};
}
