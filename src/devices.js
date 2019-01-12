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
const Api = require('./api');
const Auth = require('./auth');
const User = require('./user');
const Workspace = require('./workspace');

function getDeviceIDPrompt() {
    return new Promise((resolve, reject) => {
        vscode.window.showInputBox({ prompt: User.MESSAGES.DEVICE_PROMPT_DEVICE_ID })
            .then((deviceID) => {
                if (!deviceID) {
                    reject(new Error(`${User.ERRORS.DEVICE_ID_EMPTY}`));
                    return;
                }

                resolve(deviceID);
            });
    });
}
module.exports.getDeviceIDPrompt = getDeviceIDPrompt;

// Get agent URL related with device.
// The URL will be displayed in the pop-up message.
//
// Parameters:
//     none
//
// Returns:
//     none
function getAgentURLDialog() {
    Promise.all([Auth.authorize(), getDeviceIDPrompt()]).then(([accessToken, deviceID]) => {
        Api.getAgentURL(accessToken, deviceID)
            .then(agentUrl => vscode.window.showInformationMessage(agentUrl), (err) => {
                User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err);
            });
    }).catch(err => vscode.window.showErrorMessage(err.message));
}
module.exports.getAgentURLDialog = getAgentURLDialog;

// Add device to DG using device ID.
//
// Parameters:
//     none
//
// Returns:
//     none
function addDeviceToDGDialog() {
    Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo(), getDeviceIDPrompt()])
        .then(([accessToken, config, deviceID]) => {
            Api.addDeviceToDG(accessToken, config.deviceGroupId, deviceID)
                .then(() => {
                    vscode.window.showInformationMessage(`The ${deviceID} is added to DG:${config.deviceGroupId}`);
                }, (err) => {
                    User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err);
                });
        }).catch(err => vscode.window.showErrorMessage(err.message));
}
module.exports.addDeviceToDGDialog = addDeviceToDGDialog;

// Remove device from DG using device ID.
//
// Parameters:
//     none
//
// Returns:
//     none
function removeDeviceFromDGDialog() {
    Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo(), getDeviceIDPrompt()])
        .then(([accessToken, config, deviceID]) => {
            Api.removeDeviceFromDG(accessToken, config.deviceGroupId, deviceID)
                .then(() => {
                    vscode.window.showInformationMessage(`The ${deviceID} is removed from DG:${config.deviceGroupId}`);
                }, (err) => {
                    User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err);
                });
        }).catch(err => vscode.window.showErrorMessage(err.message));
}
module.exports.removeDeviceFromDGDialog = removeDeviceFromDGDialog;
