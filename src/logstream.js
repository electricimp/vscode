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


const vscode = require('vscode');
const ImpCentralApi = require('imp-central-api');
const User = require('./user');
const Auth = require('./auth');

/*
 * Here we will have all logic related with logstreams manipulation.
 * Currently the class functions do nothing, but the appropriate command is exported.
 * The command uses vscode outputChannel api to print hello-like message for now.
 */

class LogStream {
    constructor() {
        this.logStreamID = undefined;
        this.outputChannel = undefined;
        this.devices = new Set();
        this.pause = false;
    }

    logMsg(message) {
        if (this.pause === false) {
            this.outputChannel.appendLine(message);
        }
    }

    logState(message) {
        if (this.pause === false) {
            this.outputChannel.appendLine(message);
        }
    }

    isOpened() {
        return this.logStreamID && this.outputChannel;
    }

    static promptDeviceID() {
        return new Promise(((resolve, reject) => {
            vscode.window.showInputBox({ prompt: User.MESSAGES.DEVICE_PROMPT_DEVICE_ID })
                .then((deviceID) => {
                    if (!deviceID) {
                        vscode.window.showErrorMessage(User.ERRORS.DEVICE_ID_EMPTY);
                        reject();
                    }

                    resolve(deviceID);
                });
        }));
    }

    impAddDevice(impCentralApi, deviceID) {
        impCentralApi.logStreams.addDevice(this.logStreamID, deviceID)
            .then(() => {
                this.outputChannel.show(true);
                this.devices.add(deviceID);
                vscode.window.showInformationMessage(`Device added: ${deviceID}`);
            }, (err) => {
                vscode.window.showErrorMessage(`The device ${deviceID} cannot be added: ${err}`);
            });
    }

    addDevice(accessToken) {
        LogStream.promptDeviceID()
            .then((deviceID) => {
                const api = new ImpCentralApi();
                api.auth.accessToken = accessToken;
                if (this.isOpened() === undefined) {
                    api.logStreams.create(this.logMsg.bind(this), this.logState.bind(this))
                        .then((logStream) => {
                            this.logStreamID = logStream.data.id;
                            this.outputChannel =
                                vscode.window.createOutputChannel(User.NAMES.OUTPUT_CHANNEL);
                            this.impAddDevice(api, deviceID);
                        }, (err) => {
                            vscode.window.showErrorMessage(`Cannot open ${User.NAMES.OUTPUT_CHANNEL}: ${err}`);
                        });
                } else {
                    this.impAddDevice(api, deviceID);
                }
            });
    }

    // Add device to LogStream and send it's logs to the outputChannel.
    //
    // Parameters:
    //     none
    addDeviceDialog() {
        Auth.authorize()
            .then(this.addDevice.bind(this), (err) => {
                vscode.window.showErrorMessage(`${User.ERRORS.AUTH_LOGIN} ${err}`);
            });
    }

    impRemoveDevice(impCentralApi, deviceID) {
        impCentralApi.logStreams.removeDevice(this.logStreamID, deviceID)
            .then(() => {
                this.devices.delete(deviceID);
                vscode.window.showInformationMessage(`Device removed: ${deviceID}`);
            }, (err) => {
                vscode.window.showErrorMessage(`The device ${deviceID} cannot be removed: ${err}`);
            });
    }

    removeDevice(accessToken) {
        if (this.isOpened() === undefined) {
            vscode.window.showErrorMessage(`Cannot remove device from ${User.NAMES.OUTPUT_CHANNEL}`);
            return;
        }

        LogStream.promptDeviceID()
            .then((deviceID) => {
                const api = new ImpCentralApi();
                api.auth.accessToken = accessToken;
                this.impRemoveDevice(api, deviceID);
            });
    }

    // Remove device from LogStream.
    //
    // Parameters:
    //     none
    removeDeviceDialog() {
        Auth.authorize()
            .then(this.removeDevice.bind(this), (err) => {
                vscode.window.showErrorMessage(`${User.ERRORS.AUTH_LOGIN} ${err}`);
            });
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
    }
}
module.exports = LogStream;
