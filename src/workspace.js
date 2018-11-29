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

'use strict';

const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const ImpCentralApi = require('imp-central-api');
const DeviceGroups = ImpCentralApi.DeviceGroups;
const AuthHelper = require('./auth');

/*
 * Workspace helper class.
 * Here we should have the logic related with working directory manipulations.
 * Source code files manipulation. Store the information required for source code deployment.
 */

class WorkspaceHelper {
    static get authFileName() {
        return 'auth.info';
    }

    static get gitIgnoreFileName() {
        return '.gitignore';
    }

    static get gitIgnoreFileContent() {
        return WorkspaceHelper.authFileName;
    }

    static get configFileName() {
        return 'imp.config';
    }

    static get agentSourceFileName() {
        return 'agent.nut';
    }

    static get deviceSourceFileName() {
        return 'device.nut';
    }

    static getCurrentFolderPath() {
        let folders = vscode.workspace.workspaceFolders;
        let folder = undefined;
        if (!folders) {
            return undefined;
        }

        if (folders.length === 1) {
            folder = folders[0];
        } else {
            vscode.window.showErrorMessage('Multi-root Workspaces are not supported.');
            return undefined;
        }

        return folder.uri.fsPath;
    }

    static isWorkspaceFolderOpened() {
        if (WorkspaceHelper.getCurrentFolderPath())
            return true;

        vscode.window.showErrorMessage('Please select the workspace folder proceed.');
        return false;
    }

    static _createSourceFiles(folderPath) {
        const agentFile = path.join(folderPath, WorkspaceHelper.agentSourceFileName);
        const deviceFile = path.join(folderPath, WorkspaceHelper.deviceSourceFileName);
        fs.writeFileSync(agentFile, '// This is agent code');
        fs.writeFileSync(deviceFile, '// This is device code');
    }

    static _updateConfigurationFile(configFilePath, deviceGroup, agentSource, deviceSource) {
        const options = {
            deviceGroupId: deviceGroup,
            device_code : agentSource,
            agent_code : deviceSource,
        };

        fs.writeFileSync(configFilePath, JSON.stringify(options) , 'utf-8');
    }

    // Initialize vscode workspace, create plugin conlfiguration file in the directory.
    // 
    // Parameters:
    //     none
    newProject() {
        AuthHelper.authorize().then(accessToken => {
            let folderPath = WorkspaceHelper.getCurrentFolderPath();
            let impConfigFile = path.join(folderPath, WorkspaceHelper.configFileName);
            if (fs.existsSync(impConfigFile)) {
                vscode.window.showInformationMessage('An imp configuration file already exists.');
                let document = vscode.workspace.openTextDocument(impConfigFile);
                vscode.window.showTextDocument(document);
            } else {
                vscode.window.showInputBox({ prompt: 'Enter an exist device group Id:' }).then(deviceGroupId => {
                    if (!deviceGroupId) {
                        vscode.window.showErrorMessage('The device group Id is empty');
                        return;
                    }

                    var impCentralApi = new ImpCentralApi();
                    impCentralApi.auth.accessToken = accessToken;
                    impCentralApi.deviceGroups.get(deviceGroupId).then(function(/* result */) {
                        WorkspaceHelper._updateConfigurationFile(impConfigFile, deviceGroupId, WorkspaceHelper.agentSourceFileName, WorkspaceHelper.deviceSourceFileName);
                        WorkspaceHelper._createSourceFiles(folderPath);
                    }, function(err) {
                        vscode.window.showErrorMessage('The device group ' + deviceGroupId + ' is invalid');
                    });
                });
            }
        }, err => {
            vscode.window.showErrorMessage('Can not create project ' + err);
        });
    }

    // Deploy the source code (agent.nut, device.nut) on device group.
    // 
    // Parameters:
    //     none
    deploy() {
        let folderPath = WorkspaceHelper.getCurrentFolderPath();
        let impConfigFile = path.join(folderPath, WorkspaceHelper.configFileName);
        let config = JSON.parse(fs.readFileSync(impConfigFile).toString());

        // TODO: Check configuration file... and everything above and below

        let agentSource = fs.readFileSync(path.join(folderPath, WorkspaceHelper.agentSourceFileName)).toString();
        let deviceSource = fs.readFileSync(path.join(folderPath, WorkspaceHelper.deviceSourceFileName)).toString();
        agentSource = agentSource.replace(/\\/g, "/");
        deviceSource = deviceSource.replace(/\\/g, "/");

        const attrs = {
            device_code : deviceSource,
            agent_code : agentSource,
        };

        AuthHelper.authorize().then(accessToken => {
            var impCentralApi = new ImpCentralApi();
            impCentralApi.auth.accessToken = accessToken;
            impCentralApi.deployments.create(config.deviceGroupId, DeviceGroups.TYPE_DEVELOPMENT, attrs).then(function(result) {
                vscode.window.showInformationMessage('deploy ' + result);

                // TODO: Move all devices related logic to not-exist devices.js file.

                impCentralApi.deviceGroups.restartDevices(config.deviceGroupId).then(function(result) {
                    vscode.window.showInformationMessage('All devices in the group ' + config.deviceGroupId + ' were reset');
                }, function(err) {
                    vscode.window.showErrorMessage('reset ' + err);
                });

            }, function(err) {
                vscode.window.showErrorMessage('deploy ' + err);
            });
        }, err => {
            vscode.window.showErrorMessage('Can not deploy project ' + err);
        });
    }
}

module.exports = WorkspaceHelper;
