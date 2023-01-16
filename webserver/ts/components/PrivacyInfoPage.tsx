import * as React from "react";
import {ReactNode} from "react";
import {CommonDataProps} from "./Layout";

export default class PrivacyInfoPage extends React.Component<CommonDataProps> {
	public render(): ReactNode {
		return (<React.Fragment>
				<p>
					Players who do not wish to appear on highscores lists may choose to have their names hidden.
					If a player does so, an entry will still be displayed on the highscores with their region and score,
					but their name will be redacted.
					If you want to have your name removed from the highscores, there are two ways you can do this:
				</p>
				<ul>
					<li>
						You can request to be removed from the ChampionMastery.GG highscores list.
						Doing so will cause your name to be hidden highscores list, but will not prevent users from
						looking up your mastery scores if the know your summoner name.
						This process currently must be initiated manually by sending me a message (contact information
						is available in the site footer).
					</li>

					<li>
						Alternatively, you can <a
						href="https://support.riotgames.com/hc/en-us/articles/360001316148-GDPR-and-Data-Processing">ask
						Riot Games to delete all data associated with your account</a>.
						Doing so will fully delete your account, which will make you unable to play League of Legends
						and prevent third-party sites (including ChampionMastery.GG) from accessing any information
						about your account.
						As a result, your name will be hidden on the highscores list and users will not be able to look
						up your scores on the site.
					</li>
				</ul>
			</React.Fragment>
		);
	}
}
