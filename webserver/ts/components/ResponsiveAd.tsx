import * as React from "react";
import {CommonDataProps} from "./Layout";
import {ReactNode} from "react";

export default class ResponsiveAd extends React.Component<ResponsiveAdProps> {
	public render(): ReactNode {
		return (<React.Fragment>
			<div className="responsiveAd">
				<script async
						src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5598552437938145"
						crossOrigin="anonymous"/>
				<ins className="adsbygoogle"
					 style={{display: "block"}}
					 data-ad-client="ca-pub-5598552437938145"
					 data-ad-slot={this.props.adSlot}
					 data-ad-format="auto"
					 data-full-width-responsive="true"/>
				<script dangerouslySetInnerHTML={{
					__html: `
					(adsbygoogle = window.adsbygoogle || []).push({});
					`
				}}/>
			</div>

		</React.Fragment>);
	}
}

interface ResponsiveAdProps {
	adSlot: number;
}
