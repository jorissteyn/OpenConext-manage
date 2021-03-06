import React from "react";
import I18n from "i18n-js";
import CopyToClipboard from "react-copy-to-clipboard";
import PropTypes from "prop-types";
import {migrate, ping, push, pushPreview, validate} from "../api";
import {stop} from "../utils/Utils";
import JsonView from "react-pretty-json";
import ConfirmationDialog from "../components/ConfirmationDialog";
import "./System.css";
import "react-pretty-json/assets/json-view.css";
import {setFlash} from "../utils/Flash";

export default class System extends React.PureComponent {

    constructor(props) {
        super(props);
        const tabs = props.currentUser.featureToggles.map(feature => feature.toLowerCase());
        this.state = {
            tabs: tabs,
            selectedTab: tabs[0],
            migrationResults: undefined,
            validationResults: undefined,
            pushPreviewResults: undefined,
            pushResults: undefined,
            loading: false,
            copiedToClipboardClassName: "",
            confirmationDialogOpen: false,
            confirmationQuestion: "",
            confirmationDialogAction: () => this,
            cancelDialogAction: () => this.setState({confirmationDialogOpen: false})
        };
    }

    componentDidMount() {
        ping();
    }

    runMigration = (e) => {
        stop(e);
        if (this.state.loading) {
            return;
        }
        this.setState({loading: true});
        migrate().then(json => this.setState({migrationResults: json, loading: false}));
    };

    runValidations = (e) => {
        stop(e);
        if (this.state.loading) {
            return;
        }
        this.setState({loading: true});
        validate().then(json => this.setState({validationResults: json, loading: false}));
    };

    switchTab = tab => e => {
        stop(e);
        this.setState({selectedTab: tab});
        if (tab !== "push_preview") {
            this.setState({pushPreviewResults: undefined});
        }
        if (tab !== "push") {
            this.setState({pushResults: undefined, pushPreviewResults: undefined});
        }
    };

    renderTab = (tab, selectedTab) =>
        <span key={tab} className={tab === selectedTab ? "active" : ""} onClick={this.switchTab(tab)}>
            {I18n.t(`playground.${tab}`)}
        </span>;

    runPush = e => {
        stop(e);
        if (this.state.loading) {
            return;
        }
        this.setState({loading: true});
        push().then(json => {
            this.setState({loading: false, pushResults: json.deltas});
            const ok = json.status === "OK";
            const msg = ok ? "playground.pushedOk" : "playground.pushedNotOk";
            setFlash(I18n.t(msg, {name: this.props.currentUser.push.name}), ok ? "info" : "error");
        });
    };

    renderDeltaValue = value => {
        if (value === null) {
            return "null";
        }
        return value.toString();
    };

    runPushPreview = e => {
        stop(e);
        if (this.state.loading) {
            return;
        }
        this.setState({loading: true});
        pushPreview().then(json => this.setState({pushPreviewResults: json, loading: false}));
    };

    renderPush = () => {
        const {loading, pushResults} = this.state;
        const {currentUser} = this.props;
        const action = () => {
            this.setState({confirmationDialogOpen: false});
            this.runPush();
        };
        const showNoDeltas = pushResults !== undefined && pushResults.length === 0;
        const showDeltas = pushResults !== undefined && pushResults.length > 0;
        return (
            <section className="push">
                <p>{I18n.t("playground.pushInfo", {url: currentUser.push.url, name: currentUser.push.name})}</p>
                <a className={`button ${loading ? "grey disabled" : "green"}`}
                   onClick={() => this.setState({
                       confirmationDialogOpen: true,
                       confirmationQuestion: I18n.t("playground.pushConfirmation", {
                           url: currentUser.push.url,
                           name: currentUser.push.name
                       }),
                       confirmationDialogAction: action
                   })}>{I18n.t("playground.runPush")}
                    <i className="fa fa-refresh"></i>
                </a>
                <section className="deltas">
                    {showNoDeltas && <p className="push-result-info">{I18n.t("playground.pushResults.noDeltas")}</p>}
                    {showDeltas &&
                    <p className="push-result-info differences">{I18n.t("playground.pushResults.deltas")}</p>}
                    {showDeltas && <table className="push-results">
                        <thead>
                        <tr>
                            <th className="entityId">{I18n.t("playground.pushResults.entityId")}</th>
                            <th className="attribute">{I18n.t("playground.pushResults.attribute")}</th>
                            <th className="prePushValue">{I18n.t("playground.pushResults.prePushValue")}</th>
                            <th className="postPushValue">{I18n.t("playground.pushResults.postPushValue")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pushResults.map((delta, index) =>
                            <tr key={`${index}`}>
                                <td>{delta.entityId}</td>
                                <td>{delta.attribute}</td>
                                <td>{this.renderDeltaValue(delta.prePushValue)}</td>
                                <td>{this.renderDeltaValue(delta.postPushValue)}</td>
                            </tr>
                        )}
                        </tbody>
                    </table>}
                </section>
            </section>
        );
    };

    copiedToClipboard = () => {
        this.setState({copiedToClipboardClassName: "copied"});
        setTimeout(() => this.setState({copiedToClipboardClassName: ""}), 5000);
    };


    renderPushPreview = () => {
        const {pushPreviewResults, loading, copiedToClipboardClassName} = this.state;
        const {currentUser} = this.props;
        const json = pushPreviewResults ? JSON.stringify(pushPreviewResults) : "";
        const showCopy = (pushPreviewResults && pushPreviewResults.length < 250 * 1000);
        return (
            <section className="push">
                <p>{I18n.t("playground.pushPreviewInfo", {name: currentUser.push.name})}</p>
                <a className={`button ${loading ? "grey disabled" : "green"}`}
                   onClick={this.runPushPreview}>{I18n.t("playground.runPushPreview")}
                    <i className="fa fa-refresh"></i></a>
                {showCopy &&
                <CopyToClipboard text={json} onCopy={this.copiedToClipboard}>
                    <span className={`button green ${copiedToClipboardClassName}`}>
                       Copy to clipboard <i className="fa fa-clone"></i>
                    </span>
                </CopyToClipboard>
                }
                {pushPreviewResults &&
                <section className="results pushPreviewResults">
                    {json}
                </section>}
            </section>
        );
    };

    renderMigrate = () => {
        const {migrationResults, loading} = this.state;
        const action = () => {
            this.setState({confirmationDialogOpen: false});
            this.runMigration();
        };
        return (
            <section className="migrate">
                <p>The migration will query the janus database - or a copy based on the server configuration - and
                    migrate all data to MongoDB collections.</p>
                <a className={`button ${loading ? "grey disabled" : "green"}`}
                   onClick={() => this.setState({
                       confirmationDialogOpen: true,
                       confirmationQuestion: I18n.t("playground.migrationConfirmation"),
                       confirmationDialogAction: action
                   })}>{I18n.t("playground.runMigration")}
                    <i className="fa fa-retweet" aria-hidden="true"></i></a>
                {migrationResults &&
                <section className="results">
                    <JsonView json={migrationResults}/>
                </section>}
            </section>
        );
    };

    renderValidate = () => {
        const {validationResults, loading} = this.state;
        return (
            <section className="validate">
                <p>All latest revisions of the migrated metadata with a production status will be validated against
                    the JSON schema. This validation is performed on every create and update and preferably
                    all migrated metadata is valid.</p>
                <a className={`button ${loading ? "grey disabled" : "green"}`}
                   onClick={this.runValidations}>{I18n.t("playground.runValidation")}
                    <i className="fa fa-check" aria-hidden="true"></i></a>
                {validationResults &&
                <section className="results">
                    <JsonView json={validationResults}/>
                </section>}
            </section>
        );
    };

    renderCurrentTab = selectedTab => {
        switch (selectedTab) {
            case "migration" :
                return this.renderMigrate();
            case "validation" :
                return this.renderValidate();
            case "push":
                return this.renderPush();
            case "push_preview":
                return this.renderPushPreview();
            default :
                throw new Error(`Unknown tab: ${selectedTab}`);
        }
    };

    render() {
        const {tabs, selectedTab, confirmationDialogOpen, confirmationQuestion, confirmationDialogAction, cancelDialogAction} = this.state;
        return (
            <div className="playground">
                <ConfirmationDialog isOpen={confirmationDialogOpen}
                                    cancel={cancelDialogAction}
                                    confirm={confirmationDialogAction}
                                    question={confirmationQuestion}/>
                <section className="tabs">
                    {tabs.map(tab => this.renderTab(tab, selectedTab))}

                </section>
                {this.renderCurrentTab(selectedTab)}
            </div>
        );
    }
}

System.propTypes = {
    history: PropTypes.object.isRequired,
    configuration: PropTypes.array.isRequired,
    currentUser: PropTypes.object.isRequired
};

