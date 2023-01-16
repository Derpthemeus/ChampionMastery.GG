import express = require("express");
import {getCommonData} from "../server";
import * as ReactDOMServer from "react-dom/server";
import Layout from "../components/Layout";
import * as React from "react";
import {ReactNode} from "react";
import FaqPage from "../components/FaqPage";


async function renderStaticPage(req: express.Request, res: express.Response, title: string, description: string, content: ReactNode): Promise<void> {
	const commonData = getCommonData(req);
	const body = ReactDOMServer.renderToString(<Layout
		commonData={commonData}
		title={title}
		description={description}
		body={content}
		stylesheets={["/css/faq.css"]}
		scripts={["/js/faq.js"]}
	/>);

	res.status(200).send(body);
}

export async function renderFaq(req: express.Request, res: express.Response): Promise<void> {
	const commonData = getCommonData(req);
	const T = commonData.T;

	return renderStaticPage(req, res,
		"ChampionMastery.GG - FAQ",
		`${T["League of Legends"]} ${T["champion mastery highscores"]} ${T["and player lookup"]}`,
		<FaqPage commonData={commonData}/>
	);
}
