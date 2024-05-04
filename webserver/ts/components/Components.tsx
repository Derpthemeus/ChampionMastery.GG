import * as React from "react";
import {Localization} from "../Localization";

export function SummonerLink(props: { riotId: string, regionId: string, T: Localization }) {
	if (!props.riotId) {
		return <a className="internalLink" href="/privacy">
			[{props.T["HIDDEN"]}] ({props.regionId})
		</a>;
	}

	return <a className="internalLink"
			  href={`/player?riotId=${encodeURIComponent(props.riotId)}&region=${props.regionId}`}>
		{props.riotId} ({props.regionId})
	</a>;
}
