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
const Auth = require('./auth');
const Workspace = require('./workspace');

function getAgentURLDialog() {
    Auth.authorize()
        .then((accessToken) => {
            vscode.window.showInputBox({ prompt: 'Enter a valid device Id:' })
                .then((deviceID) => {
                    const api = new ImpCentralApi();
                    api.auth.accessToken = accessToken;
                    api.devices.get(deviceID)
                        .then((device) => {
                            vscode.window.showInformationMessage(device.data.attributes.agent_url);
                        }, (err) => {
                            vscode.window.showErrorMessage(`Cannot get device: ${err}`);
                        });
                });
        }, (err) => {
            vscode.window.showErrorMessage(`Auth error: ${err}`);
        });
}
module.exports.getAgentURLDialog = getAgentURLDialog;

function addDeviceToDGDialog() {
    const config = Workspace.getWorkspaceData();
    if (config === undefined) {
        return;
    }

    Auth.authorize()
        .then((accessToken) => {
            vscode.window.showInputBox({ prompt: 'Enter a valid device ID:' })
                .then((deviceID) => {
                    if (!deviceID) {
                        vscode.window.showErrorMessage('The device Id is empty');
                        return;
                    }

                    const api = new ImpCentralApi();
                    api.auth.accessToken = accessToken;
                    api.deviceGroups.addDevices(config.deviceGroupId, deviceID)
                        .then(() => {
                            vscode.window.showInformationMessage(`The ${deviceID} is added to ${config.deviceGroupId}`);
                        }, (err) => {
                            vscode.window.showErrorMessage(`Can not add device: ${err}`);
                        });
                });
        }, (err) => {
            vscode.window.showErrorMessage(`Auth error: ${err}`);
        });
}
module.exports.addDeviceToDGDialog = addDeviceToDGDialog;

function removeDeviceFromDGDialog() {
    const config = Workspace.getWorkspaceData();
    if (config === undefined) {
        return;
    }

    Auth.authorize()
        .then((accessToken) => {
            vscode.window.showInputBox({ prompt: 'Enter a valid device Id:' })
                .then((deviceID) => {
                    if (!deviceID) {
                        vscode.window.showErrorMessage('The device Id is empty');
                        return;
                    }

                    const api = new ImpCentralApi();
                    api.auth.accessToken = accessToken;
                    api.deviceGroups.removeDevices(config.deviceGroupId, null, deviceID)
                        .then(() => {
                            vscode.window.showInformationMessage(`The ${deviceID} is removed from ${config.deviceGroupId}`);
                        }, (err) => {
                            vscode.window.showErrorMessage(`Can not remove device: ${err}`);
                        });
                });
        }, (err) => {
            vscode.window.showErrorMessage(`Auth error: ${err}`);
        });
}
module.exports.removeDeviceFromDGDialog = removeDeviceFromDGDialog;
