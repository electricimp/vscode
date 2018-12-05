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


const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const ImpCentralApi = require('imp-central-api');
const Builder = require('Builder');
const Auth = require('./auth');

const DevGroups = ImpCentralApi.DeviceGroups;

// This class provides the constants required for workspace manipulation.
class Consts {
    static get authFileName() {
        return 'auth.info';
    }

    static get gitIgnoreFileName() {
        return '.gitignore';
    }

    static get gitIgnoreFileContent() {
        return Consts.authFileName;
    }

    static get configFileName() {
        return 'imp.config';
    }

    static get agentSourceFileName() {
        return 'agent.nut';
    }

    static get agentSourceHeader() {
        return '// This is agent code';
    }

    static get deviceSourceFileName() {
        return 'device.nut';
    }

    static get deviceSourceHeader() {
        return '// This is device code';
    }
}
module.exports.Consts = Consts;

// Get path to workspace working directory.
//
// Parameters:
//     none
function getCurrentFolderPath() {
    const folders = vscode.workspace.workspaceFolders;
    let folder;
    if (!folders) {
        return undefined;
    }

    if (folders.length === 1) {
        [folder] = folders;
    } else {
        vscode.window.showErrorMessage('Multi-root workspaces are not supported.');
        return undefined;
    }

    return folder.uri.fsPath;
}
module.exports.getCurrentFolderPath = getCurrentFolderPath;

// Check, if workspace working directory was selected by user.
//
// Parameters:
//     none
function isWorkspaceFolderOpened() {
    if (getCurrentFolderPath()) {
        return true;
    }

    vscode.window.showErrorMessage('Please select the workspace folder proceed.');
    return false;
}
module.exports.isWorkspaceFolderOpened = isWorkspaceFolderOpened;

// Get workspace config object.
// If it is not possible, return undefined.
//
// Parameters:
//     none
function getWorkspaceData(doNotDisplayNotExist) {
    const folderPath = getCurrentFolderPath();
    const cfgFile = path.join(folderPath, Consts.configFileName);
    if (fs.existsSync(cfgFile)) {
        try {
            return JSON.parse(fs.readFileSync(cfgFile).toString());
        } catch (err) {
            vscode.window.showErrorMessage(`Cannot read project file: ${err}`);
            return undefined;
        }
    }

    if (doNotDisplayNotExist === undefined) {
        vscode.window.showErrorMessage('Project file does not exist');
    }

    return undefined;
}
module.exports.getWorkspaceData = getWorkspaceData;

function createProjectFiles(folderPath, cfgFile, dgID) {
    const options = {
        deviceGroupId: dgID,
        device_code: Consts.deviceSourceFileName,
        agent_code: Consts.agentSourceFileName,
    };

    try {
        const agentPath = path.join(folderPath, Consts.agentSourceFileName);
        const devPath = path.join(folderPath, Consts.deviceSourceFileName);

        fs.writeFileSync(cfgFile, JSON.stringify(options));
        fs.writeFileSync(agentPath, Consts.agentSourceHeader);
        fs.writeFileSync(devPath, Consts.deviceSourceHeader);
    } catch (err) {
        vscode.window.showErrorMessage(`Project files: ${err}`);
    }
}

// Initialize vscode workspace, create plugin conlfiguration file in the directory.
//
// Parameters:
//     none
function newProjectDGExistDialog() {
    Auth.authorize().then((accessToken) => {
        const folderPath = getCurrentFolderPath();
        const cfgFile = path.join(folderPath, Consts.configFileName);
        if (getWorkspaceData(true)) {
            vscode.window.showErrorMessage('An imp configuration file already exists.');
            const document = vscode.workspace.openTextDocument(cfgFile);
            vscode.window.showTextDocument(document);
        } else {
            vscode.window.showInputBox({ prompt: 'Enter an exist device group ID:' })
                .then((deviceGroupId) => {
                    if (!deviceGroupId) {
                        vscode.window.showErrorMessage('The device group ID is empty');
                        return;
                    }

                    const api = new ImpCentralApi();
                    api.auth.accessToken = accessToken;
                    api.deviceGroups.get(deviceGroupId)
                        .then((dg) => {
                            createProjectFiles(folderPath, cfgFile, dg.data.id);
                        }, (err) => {
                            vscode.window.showErrorMessage(`Cannot use DG: ${err}`);
                        });
                });
        }
    }, (err) => {
        vscode.window.showErrorMessage(`Auth error: ${err}`);
    });
}
module.exports.newProjectDGExistDialog = newProjectDGExistDialog;

function newProjectDGNewDialog() {
    Auth.authorize().then((accessToken) => {
        const folderPath = getCurrentFolderPath();
        const cfgFile = path.join(folderPath, Consts.configFileName);
        if (getWorkspaceData(true)) {
            vscode.window.showErrorMessage('An imp configuration file already exists.');
            const document = vscode.workspace.openTextDocument(cfgFile);
            vscode.window.showTextDocument(document);
        } else {
            vscode.window.showInputBox({ prompt: 'Enter an exist product ID:' })
                .then((productID) => {
                    if (!productID) {
                        vscode.window.showErrorMessage('The product ID is empty');
                        return;
                    }

                    vscode.window.showInputBox({ prompt: 'Enter a new DG name:' })
                        .then((dgName) => {
                            if (!dgName) {
                                vscode.window.showErrorMessage('The DG name is empty');
                                return;
                            }

                            const attrs = {
                                name: dgName,
                            };

                            const api = new ImpCentralApi();
                            api.auth.accessToken = accessToken;
                            api.deviceGroups.create(productID, DevGroups.TYPE_DEVELOPMENT, attrs)
                                .then((dg) => {
                                    createProjectFiles(folderPath, cfgFile, dg.data.id);
                                }, (err) => {
                                    vscode.window.showErrorMessage(`Cannot create DG ${err}`);
                                });
                        });
                });
        }
    }, (err) => {
        vscode.window.showErrorMessage(`Auth error: ${err}`);
    });
}
module.exports.newProjectDGNewDialog = newProjectDGNewDialog;

function newProjectProductNewDialog() {
    Auth.authorize().then((accessToken) => {
        const folderPath = getCurrentFolderPath();
        const cfgFile = path.join(folderPath, Consts.configFileName);
        if (getWorkspaceData(true)) {
            vscode.window.showErrorMessage('An imp configuration file already exists.');
            const document = vscode.workspace.openTextDocument(cfgFile);
            vscode.window.showTextDocument(document);
        } else {
            vscode.window.showInputBox({ prompt: 'Enter a new product name:' })
                .then((productName) => {
                    if (!productName) {
                        vscode.window.showErrorMessage('The product name is empty');
                        return;
                    }

                    vscode.window.showInputBox({ prompt: 'Enter a new DG name:' })
                        .then((dgName) => {
                            if (!dgName) {
                                vscode.window.showErrorMessage('The DG name is empty');
                                return;
                            }

                            const attrs = {
                                name: productName,
                            };

                            const api = new ImpCentralApi();
                            api.auth.accessToken = accessToken;
                            api.products.create(attrs)
                                .then((product) => {
                                    const pID = product.data.id;
                                    attrs.name = dgName;
                                    api.deviceGroups.create(pID, DevGroups.TYPE_DEVELOPMENT, attrs)
                                        .then((dg) => {
                                            createProjectFiles(folderPath, cfgFile, dg.data.id);
                                        }, (err) => {
                                            vscode.window.showErrorMessage(`Cannot create DG ${err}`);
                                        });
                                }, (err) => {
                                    vscode.window.showErrorMessage(`Cannot create new product ${err}`);
                                });
                        });
                });
        }
    }, (err) => {
        vscode.window.showErrorMessage(`Auth error: ${err}`);
    });
}
module.exports.newProjectProductNewDialog = newProjectProductNewDialog;

function applyBuilder(inputFileName, input) {
    const builder = new Builder();

    builder.file = inputFileName;
    return builder.machine.execute(input.toString());
}

// Deploy the source code (agent.nut, device.nut) on device group.
//
// Parameters:
//     none
function deploy() {
    const config = getWorkspaceData();
    if (config === undefined) {
        return;
    }

    Auth.authorize().then((accessToken) => {
        let agentSource;
        let deviceSource;

        try {
            const agentSourcePath = path.join(getCurrentFolderPath(), Consts.agentSourceFileName);
            const deviceSourcePath = path.join(getCurrentFolderPath(), Consts.deviceSourceFileName);

            agentSource = fs.readFileSync(agentSourcePath).toString();
            deviceSource = fs.readFileSync(deviceSourcePath).toString();
        } catch (err) {
            vscode.window.showErrorMessage(`Cannot read source files: ${err}`);
            return;
        }

        agentSource = agentSource.replace(/\\/g, '/');
        deviceSource = deviceSource.replace(/\\/g, '/');

        try {
            agentSource = applyBuilder(Consts.agentSourceFileName, agentSource);
            deviceSource = applyBuilder(Consts.deviceSourceFileName, deviceSource);
        } catch (err) {
            /*
             * TODO: Seems like, it is part of sources processing errors.
             * Find a way to report it to user correctly.
             */
            vscode.window.showErrorMessage(`Cannot apply Builder: ${err}`);
            return;
        }

        const attrs = {
            device_code: agentSource.replace(/\\/g, '/'),
            agent_code: deviceSource.replace(/\\/g, '/'),
        };

        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.deployments.create(config.deviceGroupId, DevGroups.TYPE_DEVELOPMENT, attrs)
            .then((/* result */) => {
                // TODO: Move all devices related logic to not-exist devices.js file.
                api.deviceGroups.restartDevices(config.deviceGroupId)
                    .then(() => {
                        vscode.window.showInformationMessage(`Successfully deployed on ${config.deviceGroupId}`);
                    }, (err) => {
                        vscode.window.showErrorMessage(`Reset devices: ${err}`);
                    });
            }, (err) => {
                vscode.window.showErrorMessage(`Deploy failed: ${err}`);
            });
    }, (err) => {
        vscode.window.showErrorMessage(`Auth error: ${err}`);
    });
}
module.exports.deploy = deploy;
