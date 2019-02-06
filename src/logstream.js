// MIT License
//
// Copyright 2018 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.


const fs = require('fs');
const path = require('path');
const strftime = require('strftime');
const vscode = require('vscode');
const ImpCentralApi = require('imp-central-api');
const Api = require('./api');
const Devices = require('./devices');
const User = require('./user');
const Auth = require('./auth');
const Workspace = require('./workspace');

/*
 * Here we will have all logic related with logstreams manipulation.
 * Currently the class functions do nothing, but the appropriate command is exported.
 * The command uses vscode outputChannel api to print hello-like message for now.
 */

class LogStream {
    constructor(diagnostic) {
        this.diagnostic = diagnostic;
        /*
         * The ImpCentralApi instance below is used only for creating and closing
         * ImpCentralApi logstreams. Because these two functions cannot be called
         * from different ImpCentralApi instances.
         */
        this.impCentralApi = new ImpCentralApi();
        this.logStreamID = undefined;
        this.outputChannel = undefined;
        this.devices = new Set();
        this.pause = false;
    }

    static getTypeInfo(type) {
        const typeInfo = {
            name: undefined,
            className: '',
        };

        switch (type) {
        case 'server.log':
            typeInfo.name = 'Device';
            typeInfo.className = 'device-log';
            break;
        case 'server.error':
            typeInfo.name = 'Device';
            typeInfo.className = 'device-error';
            break;
        case 'server.sleep':
            typeInfo.name = 'Device';
            typeInfo.className = 'device-sleep';
            break;
        case 'agent.log':
            typeInfo.name = 'Agent';
            typeInfo.className = 'agent-log';
            break;
        case 'agent.error':
            typeInfo.name = 'Agent';
            typeInfo.className = 'agent-error';
            break;
        case 'status':
            typeInfo.name = 'Status';
            typeInfo.className = 'status';
            break;
        case 'powerstate':
            typeInfo.name = 'Power State';
            typeInfo.className = 'power-state';
            break;
        case 'lastexitcode':
            typeInfo.name = 'Exit Code';
            typeInfo.className = 'last-exit-code';
            break;
        case 'firmware':
            typeInfo.name = 'Firmware';
            typeInfo.className = 'firmware';
            break;
        case 'IDE.log':
            typeInfo.name = 'IDE';
            typeInfo.className = 'ide-log';
            break;
        default:
            return undefined;
        }

        return typeInfo;
    }

    static getTypeString(typeInfo) {
        switch (typeInfo.className) {
        case 'device-log':
            return `[${typeInfo.name}]`;
        case 'device-sleep':
            return `[${typeInfo.name}]`;
        case 'device-error':
            return `[${typeInfo.name}]`;
        case 'agent-log':
            return `[${typeInfo.name}] `;
        case 'agent-error':
            return `[${typeInfo.name}] `;
        case 'status':
            return `[${typeInfo.name}]`;
        case 'power-state':
            return `[${typeInfo.name}]`;
        case 'last-exit-code':
            return `[${typeInfo.name}]`;
        case 'firmware':
            return `[${typeInfo.name}]`;
        case 'ide-log':
            return `[${typeInfo.name}]`;
        default:
            return undefined;
        }
    }

    replaceFileNameToLink(msg) {
        const haveAgent = msg.indexOf('agent_code') > -1;
        const haveDevice = msg.indexOf('device_code') > -1;
        if (haveAgent === false && haveDevice === false) {
            return msg;
        }

        if (this.diagnostic.pre) {
            const regex = /.*((?:device_code|agent_code)):(\d+)/;
            const result = msg.match(regex);
            if (result == null) {
                return msg;
            }

            const src = this.diagnostic.getSource(result[1]);
            if (src === undefined) {
                return msg;
            }

            const errData = src.pre.getErrorLocation(parseInt(result[2], 10) - 1);
            if (errData === undefined) {
                return msg;
            }

            /*
             * There are two cases, how the line control statements could be generated by Builder.
             * The included file could be placed with absolute path
             * or relative path with include directory.
             * Check the both cases below.
             */
            const relativeFilePath = path.join(path.dirname(src.file), errData[0]);
            const absoluteFilePath = errData[0];
            if (fs.existsSync(relativeFilePath)) {
                return `${msg.replace(`${result[1]}:${result[2]}`, `${relativeFilePath}:${errData[1]}`)}:0`;
            } else if (fs.existsSync(absoluteFilePath)) {
                return `${msg.replace(`${result[1]}:${result[2]}`, `${absoluteFilePath}:${errData[1]}`)}:0`;
            }

            /*
             * If we cannot find the full path to file with error, just log the filename.
             */
            return `${msg.replace(`${result[1]}:${result[2]}`, `${path.basename(errData[0])}:${errData[1]}`)}:0`;
        }

        const replaceIfPreNotDefined = false;
        if (replaceIfPreNotDefined) {
            const paths = Workspace.Data.getSourcesPathsSync();
            if (haveAgent) {
                return `${msg.replace('agent_code', paths.agent_path)}:0`;
            } else if (haveDevice) {
                return `${msg.replace('device_code', paths.device_path)}:0`;
            }
        }

        return msg;
    }

    getLogStreamLogMessage(message) {
        const regex = /\b[0-9a-f]{16}\s(.*)\s(?:development|production)\s([a-z.]+)\s(.*)/;
        const result = message.match(regex);
        if (result == null) {
            // If we can not parse the message, return it as is.
            return message;
        }

        const ts = strftime('%Y-%m-%d %H:%M:%S%z');
        const type = LogStream.getTypeString(LogStream.getTypeInfo(result[2]));
        const msg = this.replaceFileNameToLink(result[3]);

        return `${ts} ${type} ${msg}`;
    }

    getErrorMessage(msg) {
        let regex = /\b[0-9a-f]{16}\s(.*)\s(?:development|production)\s([a-z.]+)\sERROR:(.*)/;
        let result = msg.match(regex);
        if (result == null || this.diagnostic.pre === undefined) {
            return undefined;
        }

        const errMsg = result[3];
        regex = /(.*):(\d+)/;
        result = errMsg.match(regex);
        if (result == null) {
            return undefined;
        }

        if (errMsg.includes('agent_code')) {
            return {
                source: 'agent_code',
                file: this.diagnostic.getSource('agent_code').file,
                line: result[2],
            };
        } else if (errMsg.includes('device_code')) {
            return {
                source: 'device_code',
                file: this.diagnostic.getSource('device_code').file,
                line: result[2],
            };
        }

        return undefined;
    }

    logMsg(msg) {
        try {
            if (this.pause) {
                return;
            }

            let err;
            try {
                err = this.getErrorMessage(msg);
            } catch (error) {
                console.log("======== !catch! => logMsg():this.getErrorMessage(msg)" + error);
                console.log("======== msg: " + msg);
                return;
            }

            try {
                if (err) {
                    this.diagnostic.addLogStreamError(err);
                }
            } catch (error) {
                console.log("======== !catch! => logMsg():this.diagnostic.addLogStreamError(err)" + error);
                console.log("======== msg: " + msg);
                return;
            }

            try {
                /*
                * If we got message like 'Downloading new code'.
                * It mean that we should clean the diagnostic collection
                * to report the actual problems from fresh deploy.
                */
                const regex = /.*(Downloading new code).*(program storage used)/;
                const result = msg.match(regex);
                if (result) {
                    this.diagnostic.clearDiagnostic();
                }
            } catch (error) {
                console.log("======== !catch! => logMsg():this.diagnostic.clearDiagnostic()" + error);
                console.log("======== msg: " + msg);
                return;
            }

            this.outputChannel.appendLine(this.getLogStreamLogMessage(msg));
        } catch (err) {
            console.log("======== !catch! => logMsg()" + err);
            console.log("======== msg: " + msg);
        }
    }

    logState(msg) {
        console.log("logState() " + msg);
        const doNotPrintState = true;
        if (doNotPrintState) {
            return;
        }

        if (this.pause) {
            return;
        }

        this.outputChannel.appendLine(msg);
    }

    logError(msg) {
        console.log("logError() " + msg);
        this.outputChannel.appendLine(msg);
    }

    deviceAdded(deviceID, silent = false) {
        this.outputChannel.show(true);
        this.devices.add(deviceID);
        this.playPauseItem.show();
        if (!silent) {
            vscode.window.showInformationMessage(`Device added: ${deviceID}`);
        }
    }

    addDevice(accessToken, deviceID, silent = false) {
        return new Promise(((resolve) => {
            this.impCentralApi.auth.accessToken = accessToken;
            Api.logStreamClose(this.impCentralApi, this.logStreamID)
                .then(() => {
                    const message = this.logMsg.bind(this);
                    const state = this.logState.bind(this);
                    const error = this.logError.bind(this);
                    Api.logStreamCreate(this.impCentralApi, message, state, error)
                        .then((logStreamID) => {
                            this.logStreamID = logStreamID;
                            if (this.outputChannel === undefined) {
                                this.outputChannel =
                                    vscode.window.createOutputChannel(User.NAMES.OUTPUT_CHANNEL);
                            }

                            Api.logStreamAddDevice(accessToken, logStreamID, deviceID)
                                .then(() => {
                                    this.deviceAdded(deviceID, silent);
                                    resolve();
                                });
                        }, (err) => {
                            User.showImpApiError(`Cannot open ${User.NAMES.OUTPUT_CHANNEL}`, err);
                        });
                });
        }));
    }

    // Add device to LogStream and send it's logs to the outputChannel.
    //
    // Parameters:
    //     none
    addDeviceDialog() {
        Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo()])
            .then(([accessToken, cfg]) => {
                Devices.pickDeviceID(accessToken, cfg.ownerId, cfg.deviceGroupId, undefined)
                    .then(deviceID => this.addDevice(accessToken, deviceID))
                    .catch(err => User.showImpApiError('Cannot add device:', err));
            }).catch(err => vscode.window.showErrorMessage(err.message));
    }

    // Remove device from LogStream.
    //
    // Parameters:
    //     none
    removeDeviceDialog() {
        Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo()])
            .then(([accessToken, cfg]) => {
                Devices.pickDeviceID(accessToken, cfg.ownerId, cfg.deviceGroupId, undefined)
                    .then((deviceID) => {
                        Api.logStreamRemoveDevice(accessToken, this.logStreamID, deviceID)
                            .then(() => {
                                this.devices.delete(deviceID);
                                vscode.window.showInformationMessage(`Device removed: ${deviceID}`);
                            }).catch(err => User.showImpApiError(`Cannot remove ${deviceID}`, err));
                    });
            }).catch(err => vscode.window.showErrorMessage(err.message));
    }

    // Clear LogStream output window.
    //
    // Parameters:
    //     none
    clearLogOutput() {
        if (this.isOpened() === undefined) {
            vscode.window.showErrorMessage(`Cannot clear ${User.NAMES.OUTPUT_CHANNEL}`);
            return;
        }

        this.outputChannel.clear();
    }

    // Pause LogStream output window
    //
    // Parameters:
    //     none
    pauseLogOutput() {
        if (this.isOpened() === undefined) {
            vscode.window.showErrorMessage(`Cannot pause ${User.NAMES.OUTPUT_CHANNEL}`);
            return;
        }

        this.pause = !this.pause;
        if (this.pause) {
            this.playPauseItem.text = `LogStream ${this.playChar}`;
        } else {
            this.playPauseItem.text = `LogStream ${this.pauseChar}`;
        }
    }

    setPauseLogsItem(playPauseItem) {
        // Play/Pause LogStream status bar item
        this.playChar = '\u25b6';
        this.pauseChar = '\u23f8';
        this.playPauseItem = playPauseItem;
        this.playPauseItem.text = `LogStream ${this.pauseChar}`;
        this.playPauseItem.tooltip = 'Play/Pause the LogStream';
    }
}
module.exports = LogStream;
