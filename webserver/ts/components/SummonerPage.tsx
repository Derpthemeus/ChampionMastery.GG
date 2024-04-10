import * as React from "react";
import {ReactElement, ReactNode} from "react";
import {CommonDataProps} from "./Layout";
import {ChampionInfo} from "../routes/player";
import {SummonerInfo} from "../apiHandler";
import Region from "../Region";
import {CommonData} from "../server";
import ResponsiveAd from "./ResponsiveAd";

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
						<HeaderColumn name={this.props.commonData.T["Chest"]}/>
						<HeaderColumn name={this.props.commonData.T["Last played"]}/>
						<HeaderColumn name={this.props.commonData.T["Progress"]} collapsible={true}/>
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
							<td data-value={champion.chestGranted ? 1 : 0}>
								<img src="/img/chest.png"
									 className={champion.chestGranted ? "chest" : "chest notEarned"}/>
							</td>
							<td data-format-time={champion.lastPlayTime} data-value={champion.lastPlayTime}
								data-toggle="tooltip"></td>
							<ProgressCell champion={champion} commonData={this.props.commonData}/>
							<td className={champion.championLevel >= 5 ? "collapsible" : ""}
								data-value={champion.pointsToNextLevel}>
								{champion.championLevel < 5 ?
									<span data-format-number={champion.championPointsUntilNextLevel}></span> : ""}
							</td>
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
						<td>{this.props.totals.chests}/{this.props.totals.champions}</td>
						<td></td>
						<td></td>
						<td className="collapsible"></td>
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
	let innerContent: ReactNode;
	if (props.champion.championLevel === 7) {
		innerContent = props.commonData.T["Mastered"];
	} else if (props.champion.championLevel >= 5) {
		innerContent = getTokens(props.champion);
	} else {
		innerContent = <div className="progressBar-outer">
			{/* sortingValue is the percentage to next level when champion level is <5 */}
			<div className="progressBar-inner" style={{width: `${props.champion.sortingValue}%`}}></div>
		</div>;
	}

	return <td className={props.champion.championLevel < 5 ? "collapsible" : ""}
			   data-value={props.champion.sortingValue} data-tooltip="tooltip"
			   title={props.champion.tooltip}>
		{innerContent}
	</td>;
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
	};
}
