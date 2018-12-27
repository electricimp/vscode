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
    static get gitIgnoreFileName() {
        return '.gitignore';
    }

    static get settingsDirName() {
        return 'settings';
    }

    static get authFileName() {
        return 'auth.info';
    }

    static get gitIgnoreFileContent() {
        return Consts.authFileName;
    }

    static get authFileLocalPath() {
        return path.join(Consts.settingsDirName, Consts.authFileName);
    }

    static get configFileName() {
        return 'imp.config';
    }

    static get configFileLocalPath() {
        return path.join(Consts.settingsDirName, Consts.configFileName);
    }

    static get srcDirName() {
        return 'src';
    }

    static get agentSourceFileName() {
        return 'agent.nut';
    }

    static get deviceSourceFileName() {
        return 'device.nut';
    }

    static get agentSourceHeader() {
        return '// This is agent code';
    }

    static get deviceSourceHeader() {
        return '// This is device code';
    }
}

// Get paths to different project files.
class Path {
    static getPWD() {
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

    static getConfig() {
        return path.join(Path.getPWD(), Consts.configFileLocalPath);
    }

    static getSrcDir() {
        return path.join(Path.getPWD(), Consts.srcDirName);
    }
}
module.exports.Path = Path;

// Check, if workspace working directory was selected by user.
//
// Parameters:
//     none
function isWorkspaceFolderOpened() {
    if (Path.getPWD()) {
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

// This class is required to hide all project files interaction logic.
class Data {
    static storeAuthInfo(authInfo) {
        return new Promise((resolve, reject) => {
            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            const settingsDirPath = path.join(Path.getPWD(), Consts.settingsDirName);
            if (!fs.existsSync(settingsDirPath)) {
                fs.mkdirSync(settingsDirPath);
            }

            const authFile = path.join(Path.getPWD(), Consts.authFileLocalPath);
            const gitIgnoreFile = path.join(Path.getPWD(), Consts.gitIgnoreFileName);
            try {
                fs.writeFileSync(authFile, JSON.stringify(authInfo));
                fs.writeFileSync(gitIgnoreFile, Consts.gitIgnoreFileContent);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    static getAuthInfo() {
        return new Promise((resolve, reject) => {
            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            const authFile = path.join(Path.getPWD(), Consts.authFileLocalPath);
            if (!fs.existsSync(authFile)) {
                reject(User.ERRORS.AUTH_FILE_NONE);
                return;
            }

            try {
                const data = fs.readFileSync(authFile);
                const auth = JSON.parse(data);
                resolve(auth);
            } catch (err) {
                reject(err);
            }
        });
    }

    static getWorkspaceInfoFilePath() {
        return path.join(Path.getPWD(), Consts.configFileLocalPath);
    }

    static storeWorkspaceInfo(info) {
        return new Promise((resolve, reject) => {
            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            const settingsDirPath = path.join(Path.getPWD(), Consts.settingsDirName);
            if (!fs.existsSync(settingsDirPath)) {
                fs.mkdirSync(settingsDirPath);
            }

            try {
                fs.writeFileSync(Data.getWorkspaceInfoFilePath(), JSON.stringify(info));
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    static getWorkspaceInfoSync() {
        const cfgFile = Data.getWorkspaceInfoFilePath();
        return JSON.parse(fs.readFileSync(cfgFile).toString());
    }

    static getWorkspaceInfo() {
        return new Promise((resolve, reject) => {
            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            const cfgFile = Data.getWorkspaceInfoFilePath();
            if (!fs.existsSync(cfgFile)) {
                reject(User.ERRORS.WORSPACE_CFG_NONE);
                return;
            }

            try {
                const config = Data.getWorkspaceInfoSync();
                if (config.deviceGroupId === undefined) {
                    reject(User.ERRORS.WORKSPACE_CFG_CORRUPTED);
                    return;
                }

                const agentSrc = path.join(Path.getPWD(), config.agent_code);
                if (!fs.existsSync(agentSrc)) {
                    reject(User.ERRORS.WORKSPACE_SRC_AGENT_NONE);
                    return;
                }

                const deviceSrc = path.join(Path.getPWD(), config.device_code);
                if (!fs.existsSync(deviceSrc)) {
                    reject(User.ERRORS.WORKSPACE_SRC_DEVICE_NONE);
                    return;
                }

                resolve(config);
            } catch (err) {
                reject(err);
            }
        });
    }

    static workspaceInfoFileExist() {
        const cfgFile = Data.getWorkspaceInfoFilePath();
        if (fs.existsSync(cfgFile)) {
            return true;
        }

        return false;
    }

    static getSourcesPathsSync() {
        const config = Data.getWorkspaceInfoSync();
        return {
            agent_path: path.join(Path.getPWD(), config.agent_code),
            device_path: path.join(Path.getPWD(), config.device_code),
        };
    }

    static getSources() {
        return new Promise((resolve, reject) => {
            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            Data.getWorkspaceInfo().then((config) => {
                try {
                    const agentSourcePath = path.join(Path.getPWD(), config.agent_code);
                    const agentSource = fs.readFileSync(agentSourcePath).toString();
                    const deviceSourcePath = path.join(Path.getPWD(), config.device_code);
                    const deviceSource = fs.readFileSync(deviceSourcePath).toString();
                    const sources = {
                        agent_source: agentSource,
                        device_source: deviceSource,
                    };

                    resolve(sources);
                } catch (err) {
                    reject(err);
                }
            }, (err) => {
                reject(err);
            });
        });
    }
}
module.exports.Data = Data;

function createProjectFiles(dgID) {
    const srcPath = path.join(Path.getPWD(), Consts.srcDirName);
    if (!fs.existsSync(srcPath)) {
        fs.mkdirSync(srcPath);
    }

    const defaultOptions = {
        deviceGroupId: dgID,
        device_code: path.join(Consts.srcDirName, Consts.deviceSourceFileName),
        agent_code: path.join(Consts.srcDirName, Consts.agentSourceFileName),
    };
    Data.storeWorkspaceInfo(defaultOptions).then(() => {
        try {
            const devPath = path.join(Path.getPWD(), defaultOptions.device_code);
            const agentPath = path.join(Path.getPWD(), defaultOptions.agent_code);
            fs.writeFileSync(agentPath, Consts.agentSourceHeader);
            fs.writeFileSync(devPath, Consts.deviceSourceHeader);
        } catch (err) {
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_SRC_FILE} ${err}`);
        }
    }, (err) => {
        vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${err}`);
    });
}

function newProjectDGExist(accessToken) {
    Data.getWorkspaceInfo().then(() => {
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_CFG_EXIST);
        const document = vscode.workspace.openTextDocument(Path.getConfig());
        vscode.window.showTextDocument(document);
    }, (workspaceErr) => {
        if (workspaceErr !== User.ERRORS.WORSPACE_CFG_NONE) {
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${workspaceErr}`);
            return;
        }

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
                        createProjectFiles(dg.data.id);
                    }, (err) => {
                        User.showImpApiError(`${User.ERRORS.DG_RETRIEVE}`, err);
                    });
            });
    });
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
                    return;
                }

                vscode.window.showInputBox({ prompt: User.MESSAGES.WORKSPACE_PROMPT_DG_NEW })
                    .then((dg) => {
                        if (!dg) {
                            vscode.window.showErrorMessage(User.MESSAGES.DG_ID_EMPTY);
                            reject();
                            return;
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
    Data.getWorkspaceInfo().then(() => {
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_CFG_EXIST);
        const document = vscode.workspace.openTextDocument(Path.getConfig());
        vscode.window.showTextDocument(document);
    }, (workspaceErr) => {
        if (workspaceErr !== User.ERRORS.WORSPACE_CFG_NONE) {
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${workspaceErr}`);
            return;
        }

        promptDGNew().then((newDGOptions) => {
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
                    createProjectFiles(dg.data.id);
                }, (err) => {
                    User.showImpApiError(`${User.ERRORS.DG_CREATE}`, err);
                });
        });
    });
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
                    return;
                }

                vscode.window.showInputBox({ prompt: User.MESSAGES.WORKSPACE_PROMPT_DG_NEW })
                    .then((dg) => {
                        if (!dg) {
                            vscode.window.showErrorMessage(User.ERRORS.DEVICE_ID_EMPTY);
                            reject();
                            return;
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
    Data.getWorkspaceInfo().then(() => {
        vscode.window.showErrorMessage(User.ERRORS.WORKSPACE_CFG_EXIST);
        const document = vscode.workspace.openTextDocument(Path.getConfig());
        vscode.window.showTextDocument(document);
    }, (workspaceErr) => {
        if (workspaceErr !== User.ERRORS.WORSPACE_CFG_NONE) {
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${workspaceErr}`);
            return;
        }

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
                            createProjectFiles(dg.data.id);
                        }, (err) => {
                            User.showImpApiError(`${User.ERRORS.DG_CREATE}`, err);
                        });
                }, (err) => {
                    User.showImpApiError(`${User.ERRORS.PRODUCT_CREATE}`, err);
                });
        });
    });
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
    Auth.authorize().then((accessToken) => {
        Data.getWorkspaceInfo().then((cfg) => {
            const agentPre = new Preproc();
            const devicePre = new Preproc();
            diagnostic.setPreprocessors(agentPre, devicePre);
            Data.getSources().then((src) => {
                let agentSource;
                let deviceSource;
                try {
                    const includeDir = Path.getSrcDir();
                    const agentCode = path.basename(cfg.agent_code);
                    const deviceCode = path.basename(cfg.device_code);
                    agentSource = agentPre.preprocess(agentCode, src.agent_source, includeDir);
                    deviceSource = devicePre.preprocess(deviceCode, src.device_source, includeDir);

                    /*
                     * The code below is only for debug purposes.
                     * Write postprocessed files to workspace directory for future analyzes.
                     */
                    const storePostprocessed = true;
                    if (storePostprocessed) {
                        const buildPath = path.join(Path.getPWD(), 'build');
                        if (!fs.existsSync(buildPath)) {
                            fs.mkdirSync(buildPath);
                        }
                        fs.writeFileSync(path.join(buildPath, 'postprocessed_agent.nut'), agentSource);
                        fs.writeFileSync(path.join(buildPath, 'postprocessed_device.nut'), deviceSource);
                        vscode.window.showInformationMessage('Postprocessed files were saved.');
                    }
                } catch (err) {
                    diagnostic.addBuilderError(err.message);
                    vscode.window.showErrorMessage(`Cannot apply Builder: ${err}`);
                    return;
                }

                const attrs = {
                    device_code: deviceSource,
                    agent_code: agentSource,
                };

                const api = new ImpCentralApi();
                api.auth.accessToken = accessToken;
                api.deployments.create(cfg.deviceGroupId, DevGroups.TYPE_DEVELOPMENT, attrs)
                    .then((/* result */) => {
                        /*
                         * Here is a developer's knob below.
                         * It is possible to open some device LogStream after successful deployment.
                         */
                        const openLogStream = true;
                        if (openLogStream) {
                            const dg = cfg.deviceGroupId;
                            api.devices.list({ [Devs.FILTER_DEVICE_GROUP_ID]: dg })
                                .then((devs) => {
                                    if (devs.data.length >= 1) {
                                        logstream.addDevice(accessToken, devs.data[0].id)
                                            .then(() => {
                                                api.deviceGroups.restartDevices(cfg.deviceGroupId)
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
                            api.deviceGroups.restartDevices(cfg.deviceGroupId)
                                .then(() => {
                                    vscode.window.showInformationMessage(`Successfully deployed on ${cfg.deviceGroupId}`);
                                }, (err) => {
                                    User.showImpApiError('Reset devices:', err);
                                });
                        }
                    }, (err) => {
                        diagnostic.addDeployError(err);
                        User.showImpApiError('Deploy failed:', err);
                    });
            }, (err) => {
                vscode.window.showErrorMessage(`Cannot read source files: ${err}`);
            });
        }, (workspaceErr) => {
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${workspaceErr}`);
        });
    });
}
module.exports.deploy = deploy;
