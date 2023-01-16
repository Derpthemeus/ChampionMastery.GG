import express = require("express");
import {getCommonData} from "../server";
import * as ReactDOMServer from "react-dom/server";
import Layout from "../components/Layout";
import * as React from "react";
import {ReactNode} from "react";
import FaqPage from "../components/FaqPage";
import PrivacyInfoPage from "../components/PrivacyInfoPage";
import LegalInfoPage from "../components/LegalInfoPage";


async function renderStaticPage(req: express.Request, res: express.Response, title: string, description: string, content: ReactNode, stylesheets: string[]): Promise<void> {
	const commonData = getCommonData(req);
	const body = ReactDOMServer.renderToString(<Layout
		commonData={commonData}
		title={title}
		description={description}
		body={content}
		stylesheets={stylesheets}
		scripts={[]}
	/>);

	res.status(200).send(body);
}

export async function renderFaq(req: express.Request, res: express.Response): Promise<void> {
	const commonData = getCommonData(req);
	const T = commonData.T;

	return renderStaticPage(req, res,
		"ChampionMastery.GG - FAQ",
		`${T["League of Legends"]} ${T["champion mastery highscores"]} ${T["and player lookup"]}`,
		<FaqPage commonData={commonData}/>,
		["/css/faq.css"]
	);
}

export async function renderPrivacyInfo(req: express.Request, res: express.Response): Promise<void> {
	const commonData = getCommonData(req);
	const T = commonData.T;

	return renderStaticPage(req, res,
		"ChampionMastery.GG - Privacy Info",
		`${T["League of Legends"]} ${T["champion mastery highscores"]} ${T["and player lookup"]}`,
		<PrivacyInfoPage commonData={commonData}/>,
		[]
	);
}

export async function renderLegalInfo(req: express.Request, res: express.Response): Promise<void> {
	const commonData = getCommonData(req);
	const T = commonData.T;

	return renderStaticPage(req, res,
		"ChampionMastery.GG - Legal Info",
		`${T["League of Legends"]} ${T["champion mastery highscores"]} ${T["and player lookup"]}`,
		<LegalInfoPage commonData={commonData}/>,
		[]
	);
}
