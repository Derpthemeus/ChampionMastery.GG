import * as React from "react";
import {ReactNode} from "react";
import {CommonDataProps} from "./Layout";

export default class ErrorPage extends React.Component<ErrorProps> {
	public render(): ReactNode {
		return (<React.Fragment>
			<div id="container">
				{/*TODO localize 404 error and default message*/}
				<h1>{this.props.commonData.T["Error"]}</h1>
				<h2>{this.props.error}</h2>
				{this.props.details ? this.props.details : ""}
			</div>
		</React.Fragment>);
	}
}

interface ErrorProps extends CommonDataProps {
	error: string;
	details?: string;
}
