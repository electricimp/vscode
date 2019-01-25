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

async function getDeviceIDPick(accessToken, ownerID, dgIDAssigned, dgIDUnAssigned) {
    let devices;
    try {
        devices = await Api.getDeviceList(accessToken, ownerID, dgIDAssigned, dgIDUnAssigned);
    } catch (err) {
        User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err);
        return err;
    }

    const pick = await vscode.window.showQuickPick(
        Array.from(devices.keys()).map(label => ({ label })),
        {
            placeHolder: 'Select device ID',
            ignoreFocusOut: true,
            canPickMany: false,
        },
    );

    if (pick === undefined) {
        throw Error('empty deviceID');
    }

    return pick.label;
}
module.exports.getDeviceIDPick = getDeviceIDPick;

// Get agent URL related with device.
// The URL will be displayed in the pop-up message.
//
// Parameters:
//     none
//
// Returns:
//     none
function getAgentURLDialog() {
    Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo()])
        .then(([accessToken, cfg]) => {
            getDeviceIDPick(accessToken, cfg.ownerId, undefined, undefined)
                .then(deviceID => Api.getAgentURL(accessToken, deviceID))
                .then(agentUrl => vscode.window.showInformationMessage(agentUrl))
                .catch(err => User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err));
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
    Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo()])
        .then(([accessToken, cfg]) => {
            getDeviceIDPick(accessToken, cfg.ownerId, undefined, cfg.deviceGroupId)
                .then(deviceID => Api.addDeviceToDG(accessToken, cfg.deviceGroupId, deviceID))
                .then(() => {
                    vscode.window.showInformationMessage(`The device is added to DG:${cfg.deviceGroupId}`);
                })
                .catch(err => User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err));
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
    Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo()])
        .then(([accessToken, cfg]) => {
            getDeviceIDPick(accessToken, cfg.ownerId, cfg.deviceGroupId, undefined)
                .then(deviceID => Api.removeDeviceFromDG(accessToken, cfg.deviceGroupId, deviceID))
                .then(() => {
                    vscode.window.showInformationMessage(`The device is removed from DG:${cfg.deviceGroupId}`);
                })
                .catch(err => User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err));
        }).catch(err => vscode.window.showErrorMessage(err.message));
}
module.exports.removeDeviceFromDGDialog = removeDeviceFromDGDialog;
