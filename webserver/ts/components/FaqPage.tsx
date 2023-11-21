import * as React from "react";
import {ReactNode} from "react";
import {CommonDataProps} from "./Layout";

export default class FaqPage extends React.Component<CommonDataProps> {
	public render(): ReactNode {
		return (<React.Fragment>
				<h1>Frequently Asked Questions</h1>

				<FaqPage.Question question="Somebody is missing from the highscores list!">
					Players must be looked up on the site to appear on the highscores.
					Look them up (using the search box in the top right) and they will be added to the list.
				</FaqPage.Question>

				<FaqPage.Question
					question="When I click on a player on the highscores list, it says they weren't found or it brings me to the wrong player!">
					<b>If their mastery data is slightly outdated: </b>
					champion mastery info is cached for 10 minutes.
					Try refreshing the page in a few minutes to update it.
					<br/>

					{/*https://github.com/Derpthemeus/ChampionMastery.GG/issues/8*/}
					<b>If the mastery data is completely incorrect: </b>
					this can happen in certain rare situations. <a
					href="https://www.reddit.com/message/compose/?to=Derpthemeus">Message me on
					Reddit</a> or <a href="https://github.com/Derpthemeus/ChampionMastery.GG/issues">create an issue
					on GitHub</a> and I will fix it manually.
				</FaqPage.Question>

				<FaqPage.Question question="Can you add a separate highscores list for each region?">
					I am considering doing this in the future after some other higher priority projects.
				</FaqPage.Question>

				<FaqPage.Question
					question="Can you show everybody on the highscores (instead of just the top 50 players)?">
					I hope to do this in the future, but it will require a large amount of development work to support.
				</FaqPage.Question>

				<FaqPage.Question question="Do you have an API for the highscores list?">
					Since player IDs from the Riot Games API are different for each application, there isn't a reliable
					way to share this data.
				</FaqPage.Question>

				<FaqPage.Question question={"Can I have my name removed from the highscores list?"}>
					See <a className="internalLink" href="/privacy">this article</a> for information about how you can
					have your name redacted on the highscores.
				</FaqPage.Question>

				<FaqPage.Question question={this.props.commonData.T["Contact"]}>
					If the answers above haven't helped, <a href="mailto:championmastery.gg@gmail.com">email
					me</a> or <span><a
					href="https://www.reddit.com/message/compose/?to=Derpthemeus">Message me on Reddit</a></span>
				</FaqPage.Question>
			</React.Fragment>
		);
	}

	private static Question(props: QuestionProps): React.ReactElement {
		return (
			<div className="question well">
				<h3 className="question-question"> {props.question}</h3>
				{props.children}
			</div>
		);
	}
}

interface QuestionProps {
	question: string;
	children: React.ReactNode;
}
