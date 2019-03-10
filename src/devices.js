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

const pickDeviceIDRetVal = {
    empty: 'empty',
    esc: 'esc',
};

async function pickDeviceID(cloudUrl, accessToken, ownerID, dgIDAssigned, dgIDUnAssigned) {
    let devices;
    try {
        devices = await Api.getDeviceList(cloudUrl, accessToken, ownerID, dgIDAssigned, dgIDUnAssigned);
    } catch (err) {
        User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err);
        return err;
    }

    const display = [];
    devices.forEach((item) => {
        const onlineState = item.attributes.device_online ? 'online' : 'offline';
        const name = item.attributes.name === null ? 'noName' : item.attributes.name;
        display.push(`${item.id} ${onlineState} ${name}`);
    });

    if (display.length === 0) {
        vscode.window.showWarningMessage('There are no available devices.');
        throw pickDeviceIDRetVal.empty;
    }

    const pick = await vscode.window.showQuickPick(
        display.map(label => ({ label })),
        {
            placeHolder: 'Select device ID',
            ignoreFocusOut: true,
            canPickMany: false,
        },
    );

    if (pick === undefined) {
        // Case, when Esc key was pressed.
        throw pickDeviceIDRetVal.esc;
    }

    const regex = /(.*)\s(online|offline)\s(.*)/;
    const result = pick.label.match(regex);
    if (result == null) {
        throw Error('Bad regexp');
    }

    return result[1];
}
module.exports.pickDeviceID = pickDeviceID;

function pickDeviceIDError(err) {
    if (err === pickDeviceIDRetVal.empty || err === pickDeviceIDRetVal.esc) {
        return;
    }

    User.showImpApiError(User.ERRORS.DEVICE_RETRIEVE, err);
}
module.exports.pickDeviceIDError = pickDeviceIDError;

// Get agent URL related with device.
// The URL will be displayed in the pop-up message and copied to clipboard.
//
// Parameters:
//     none
//
// Returns:
//     none
function getAgentURLDialog() {
    Promise.all([Auth.authorize(), Workspace.Data.getWorkspaceInfo()])
        .then(([accessToken, cfg]) => Workspace.validateDG(accessToken, cfg))
        .then((ret) => {
            pickDeviceID(ret.cfg.cloudUrl, ret.token, ret.cfg.ownerId, ret.cfg.deviceGroupId, undefined)
                .then(deviceID => Api.getAgentURL(ret.cfg.cloudUrl, ret.token, deviceID))
                .then((agentUrl) => {
                    vscode.env.clipboard.writeText(agentUrl);
                    vscode.window.showInformationMessage(agentUrl);
                }).catch(err => pickDeviceIDError(err));
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
        .then(([accessToken, cfg]) => Workspace.validateDG(accessToken, cfg))
        .then((ret) => {
            pickDeviceID(ret.cfg.cloudUrl, ret.token, ret.cfg.ownerId, undefined, ret.cfg.deviceGroupId)
                .then(deviceID => Api.addDeviceToDG(ret.cfg.cloudUrl, ret.token, ret.cfg.deviceGroupId, deviceID))
                .then(() => {
                    vscode.window.showInformationMessage('The device is added to DG');
                }).catch(err => pickDeviceIDError(err));
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
        .then(([accessToken, cfg]) => Workspace.validateDG(accessToken, cfg))
        .then((ret) => {
            pickDeviceID(ret.cfg.cloudUrl, ret.token, ret.cfg.ownerId, ret.cfg.deviceGroupId, undefined)
                .then(deviceID => Api.removeDeviceFromDG(ret.cfg.cloudUrl, ret.token, ret.cfg.deviceGroupId, deviceID))
                .then(() => {
                    vscode.window.showInformationMessage('The device is removed from DG');
                }).catch(err => pickDeviceIDError(err));
        }).catch(err => vscode.window.showErrorMessage(err.message));
}
module.exports.removeDeviceFromDGDialog = removeDeviceFromDGDialog;
