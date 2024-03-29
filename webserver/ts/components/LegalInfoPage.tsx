import * as React from "react";
import {ReactNode} from "react";
import {CommonDataProps} from "./Layout";

export default class LegalInfoPage extends React.Component<CommonDataProps> {
	public render(): ReactNode {
		return (<React.Fragment>
				<p>
					ChampionMastery.GG isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends.
					League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
					League of Legends © Riot Games, Inc.
				</p>
				<p>
					This site uses Google Analytics to collect non-personally identifiable information about visitors, which lets me improve the site based on how it is being used.
					Collected information includes the URLs of the pages you visit on this site, the type of device you are using (i.e. computer, phone, or tablet), and how you were referred to the site (e.g. searching for it on Google, clicking a link on Reddit, or entering the URL directly into your address bar).
					You can read about how Google collects and uses this information <a href="https://www.google.com/policies/privacy/partners/">here</a>.
				</p>
				<p>
					This site uses ads provided by various third party vendors. These services may use browser cookies to show you ads that are related to your interests. If you do not want to be shown ads that are targeted towards your interests, you can opt out of personalized advertising <a href="http://www.aboutads.info/choices/">here</a>.
				</p>
			</React.Fragment>
		);
	}
}
