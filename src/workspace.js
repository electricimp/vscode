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
const Auth = require('./auth');
const Preproc = require('./preprocessor');
const User = require('./user');

const DevGroups = ImpCentralApi.DeviceGroups;
const Devs = ImpCentralApi.Devices;

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
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_MULTIROOT);
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

    /*
     * It is possible to choise user interaction action below.
     * In case of workspace folder is not opened,
     * we can display message with appropriate error or
     * display working directory selection dialog.
     */
    const displayOpenDirectoryDialog = undefined;
    if (displayOpenDirectoryDialog) {
        vscode.commands.executeCommand('workbench.action.files.openFolder');
    } else {
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_FOLDER_SELECT);
    }

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
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${err}`);
            return undefined;
        }
    }

    if (doNotDisplayNotExist === undefined) {
        vscode.window.showErrorMessage(User.ERRORS.WORSPACE_CFG_NONE);
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
        vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${err}`);
    }
}

function newProjectDGExist(accessToken) {
    const folderPath = getCurrentFolderPath();
    const cfgFile = path.join(folderPath, Consts.configFileName);
    if (getWorkspaceData(true)) {
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_CFG_EXIST);
        const document = vscode.workspace.openTextDocument(cfgFile);
        vscode.window.showTextDocument(document);
    } else {
        vscode.window.showInputBox({ prompt: User.MESSAGES.WORKSPACE_PROMPT_DG_EXIST })
            .then((deviceGroupId) => {
                if (!deviceGroupId) {
                    vscode.window.showErrorMessage(User.ERRORS.DG_ID_EMPTY);
                    return;
                }

                const api = new ImpCentralApi();
                api.auth.accessToken = accessToken;
                api.deviceGroups.get(deviceGroupId)
                    .then((dg) => {
                        createProjectFiles(folderPath, cfgFile, dg.data.id);
                    }, (err) => {
                        User.showImpApiError(`${User.ERRORS.DG_RETRIEVE}`, err);
                    });
            });
    }
}

// Initialize vscode workspace,
// create imp conlfiguration file in the directory based on exist DG.
//
// Parameters:
//     none
function newProjectDGExistDialog() {
    Auth.authorize().then(newProjectDGExist);
}
module.exports.newProjectDGExistDialog = newProjectDGExistDialog;

function promptDGNew() {
    return new Promise(((resolve, reject) => {
        vscode.window.showInputBox({ prompt: User.MESSAGES.WORKSPACE_PROMPT_PRODUCT_EXIST })
            .then((product) => {
                if (!product) {
                    vscode.window.showErrorMessage(User.ERRORS.PRODUCT_ID_EMPTY);
                    reject();
                }

                vscode.window.showInputBox({ prompt: User.MESSAGES.WORKSPACE_PROMPT_DG_NEW })
                    .then((dg) => {
                        if (!dg) {
                            vscode.window.showErrorMessage(User.MESSAGES.DG_ID_EMPTY);
                            reject();
                        }

                        const newDGOptions = {
                            productID: product,
                            dgName: dg,
                        };

                        resolve(newDGOptions);
                    });
            });
    }));
}

function newProjectDGNew(accessToken) {
    const folderPath = getCurrentFolderPath();
    const cfgFile = path.join(folderPath, Consts.configFileName);
    if (getWorkspaceData(true)) {
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_CFG_EXIST);
        const document = vscode.workspace.openTextDocument(cfgFile);
        vscode.window.showTextDocument(document);
    } else {
        promptDGNew()
            .then((newDGOptions) => {
                if (!newDGOptions.dgName) {
                    vscode.window.showErrorMessage(User.MESSAGES.DG_ID_EMPTY);
                    return;
                }

                const attrs = {
                    name: newDGOptions.dgName,
                };

                const api = new ImpCentralApi();
                api.auth.accessToken = accessToken;
                api.deviceGroups.create(newDGOptions.productID, DevGroups.TYPE_DEVELOPMENT, attrs)
                    .then((dg) => {
                        createProjectFiles(folderPath, cfgFile, dg.data.id);
                    }, (err) => {
                        User.showImpApiError(`${User.ERRORS.DG_CREATE}`, err);
                    });
            });
    }
}

// Initialize vscode workspace,
// create imp conlfiguration file in the directory based on new DG.
//
// Parameters:
//     none
function newProjectDGNewDialog() {
    Auth.authorize().then(newProjectDGNew);
}
module.exports.newProjectDGNewDialog = newProjectDGNewDialog;

function promptProductNew() {
    return new Promise(((resolve, reject) => {
        vscode.window.showInputBox({ prompt: User.MESSAGES.WORKSPACE_PROMPT_PRODUCT_NEW })
            .then((product) => {
                if (!product) {
                    vscode.window.showErrorMessage(User.ERRORS.PRODUCT_ID_EMPTY);
                    reject();
                }

                vscode.window.showInputBox({ prompt: User.MESSAGES.WORKSPACE_PROMPT_DG_NEW })
                    .then((dg) => {
                        if (!dg) {
                            vscode.window.showErrorMessage(User.ERRORS.DEVICE_ID_EMPTY);
                            reject();
                        }

                        const newProductOptions = {
                            productName: product,
                            dgName: dg,
                        };

                        resolve(newProductOptions);
                    });
            });
    }));
}

function newProjectProductNew(accessToken) {
    const folderPath = getCurrentFolderPath();
    const cfgFile = path.join(folderPath, Consts.configFileName);
    if (getWorkspaceData(true)) {
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_CFG_EXIST);
        const document = vscode.workspace.openTextDocument(cfgFile);
        vscode.window.showTextDocument(document);
    } else {
        promptProductNew().then((newProductOptions) => {
            const attrs = {
                name: newProductOptions.productName,
            };

            const api = new ImpCentralApi();
            api.auth.accessToken = accessToken;
            api.products.create(attrs)
                .then((product) => {
                    const pID = product.data.id;
                    attrs.name = newProductOptions.dgName;
                    api.deviceGroups.create(pID, DevGroups.TYPE_DEVELOPMENT, attrs)
                        .then((dg) => {
                            createProjectFiles(folderPath, cfgFile, dg.data.id);
                        }, (err) => {
                            User.showImpApiError(`${User.ERRORS.DG_CREATE}`, err);
                        });
                }, (err) => {
                    User.showImpApiError(`${User.ERRORS.PRODUCT_CREATE}`, err);
                });
        });
    }
}

// Initialize vscode workspace,
// create imp conlfiguration file in the directory based on new Product and new DG.
//
// Parameters:
//     none
function newProjectProductNewDialog() {
    Auth.authorize().then(newProjectProductNew);
}
module.exports.newProjectProductNewDialog = newProjectProductNewDialog;

// Deploy the source code (agent.nut, device.nut) on device group.
//
// Parameters:
//     none
function deploy(logstream, diagnostic) {
    const config = getWorkspaceData();
    if (config === undefined) {
        return;
    }

    diagnostic.clearDiagnostic();

    Auth.authorize().then((accessToken) => {
        const agentPre = new Preproc();
        const devicePre = new Preproc();
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
            agentSource = agentPre.preprocess(Consts.agentSourceFileName, agentSource);
            deviceSource = devicePre.preprocess(Consts.deviceSourceFileName, deviceSource);

            /*
             * The code below is only for debug purposes.
             * Write postprocessed files to workspace directory for future analyzes.
             */
            const storePostprocessed = false;
            if (storePostprocessed) {
                fs.writeFileSync(path.join(getCurrentFolderPath(), 'postprocessed.agent'), agentSource);
                fs.writeFileSync(path.join(getCurrentFolderPath(), 'postprocessed.device'), deviceSource);
                vscode.window.showInformationMessage('Postprocessed files were saved.');
                return;
            }
        } catch (err) {
            diagnostic.addBuilderError(err.message);
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
                /*
                 * Here is a developer's knob below.
                 * It is possible to open some device LogStream after successful deployment.
                 */
                const openLogStream = true;
                if (openLogStream) {
                    const dg = config.deviceGroupId;
                    api.devices.list({ [Devs.FILTER_DEVICE_GROUP_ID]: dg })
                        .then((devs) => {
                            if (devs.data.length >= 1) {
                                logstream.addDevice(accessToken, devs.data[0].id)
                                    .then(() => {
                                        api.deviceGroups.restartDevices(config.deviceGroupId)
                                            .then(() => {
                                                vscode.window.showInformationMessage(`Successfully deployed on ${dg}`);
                                            }, (err) => {
                                                User.showImpApiError('Reset devices:', err);
                                            });
                                    });
                            } else {
                                vscode.window.showWarningMessage(`The DG ${dg} have no devices`);
                            }
                        }, (err) => {
                            User.showImpApiError('Cannot list DG devices:', err);
                        });
                } else {
                    api.deviceGroups.restartDevices(config.deviceGroupId)
                        .then(() => {
                            vscode.window.showInformationMessage(`Successfully deployed on ${config.deviceGroupId}`);
                        }, (err) => {
                            User.showImpApiError('Reset devices:', err);
                        });
                }
            }, (err) => {
                diagnostic.addDeployError(agentPre, devicePre, err);
                User.showImpApiError('Deploy failed:', err);
            });
    });
}
module.exports.deploy = deploy;
