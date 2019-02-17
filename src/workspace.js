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
const Api = require('./api');
const Auth = require('./auth');
const Preproc = require('./preprocessor');
const User = require('./user');

const DevGroups = ImpCentralApi.DeviceGroups;

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

    static getAuth() {
        return path.join(Path.getPWD(), Consts.authFileLocalPath);
    }

    static getDefaultSrcDir() {
        return path.join(Path.getPWD(), Consts.srcDirName);
    }
}
module.exports.Path = Path;

// Check, if the workspace working directory was selected by user.
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
    static storeAuthInfo(impAccessToken) {
        return new Promise((resolve, reject) => {
            const authInfo = {
                accessToken: impAccessToken,
                builderSettings: { github_user: null, github_token: null },
            };

            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            const settingsDirPath = path.join(Path.getPWD(), Consts.settingsDirName);
            if (!fs.existsSync(settingsDirPath)) {
                fs.mkdirSync(settingsDirPath);
            }

            const authFile = path.join(Path.getPWD(), Consts.authFileLocalPath);
            try {
                if (fs.existsSync(authFile)) {
                    /*
                     * Do not overwrite github creds, in case of relogin.
                     */
                    const oldAuthInfo = JSON.parse(fs.readFileSync(authFile).toString());
                    authInfo.builderSettings = oldAuthInfo.builderSettings;
                }
            } catch (err) {
                vscode.window.showWarningMessage(`Cannot read old auth info ${err}`);
            }

            const gitIgnoreFile = path.join(Path.getPWD(), Consts.gitIgnoreFileName);
            try {
                fs.writeFileSync(authFile, JSON.stringify(authInfo, null, 2));
                fs.writeFileSync(gitIgnoreFile, Consts.gitIgnoreFileContent);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    static isAuthInfoValid(auth) {
        if (auth.accessToken === undefined) {
            return false;
        }

        if (auth.accessToken.access_token === undefined) {
            return false;
        }

        if (auth.builderSettings === undefined) {
            return false;
        }

        if (auth.builderSettings.github_user === undefined) {
            return false;
        }

        if (auth.builderSettings.github_token === undefined) {
            return false;
        }

        return true;
    }

    static getAuthInfoSync() {
        const authFile = Path.getAuth();
        return JSON.parse(fs.readFileSync(authFile).toString());
    }

    static getAuthInfo() {
        return new Promise((resolve, reject) => {
            if (!isWorkspaceFolderOpened()) {
                reject(new Error(User.ERRORS.WORKSPACE_FOLDER_SELECT));
                return;
            }

            try {
                const auth = Data.getAuthInfoSync();
                if (!Data.isAuthInfoValid(auth)) {
                    reject(new Error(User.ERRORS.AUTH_FILE_ERROR));
                    return;
                }

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
                fs.writeFileSync(Data.getWorkspaceInfoFilePath(), JSON.stringify(info, null, 2));
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
                reject(new Error(User.ERRORS.WORKSPACE_FOLDER_SELECT));
                return;
            }

            const cfgFile = Data.getWorkspaceInfoFilePath();
            if (!fs.existsSync(cfgFile)) {
                reject(new Error(User.ERRORS.WORSPACE_CFG_NONE));
                return;
            }

            try {
                const config = Data.getWorkspaceInfoSync();
                if (config.deviceGroupId === undefined) {
                    vscode.window.showTextDocument(vscode.workspace.openTextDocument(cfgFile));
                    reject(new Error(User.ERRORS.WORKSPACE_CFG_CORRUPTED));
                    return;
                }

                const agentSrc = path.join(Path.getPWD(), config.agent_code);
                if (!fs.existsSync(agentSrc)) {
                    vscode.window.showTextDocument(vscode.workspace.openTextDocument(cfgFile));
                    reject(new Error(User.ERRORS.WORKSPACE_SRC_AGENT_NONE));
                    return;
                }

                const deviceSrc = path.join(Path.getPWD(), config.device_code);
                if (!fs.existsSync(deviceSrc)) {
                    vscode.window.showTextDocument(vscode.workspace.openTextDocument(cfgFile));
                    reject(new Error(User.ERRORS.WORKSPACE_SRC_DEVICE_NONE));
                    return;
                }

                resolve(config);
            } catch (err) {
                reject(new Error(`${User.ERRORS.WORKSPACE_CFG_CORRUPTED}: ${err}`));
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
                        agent_path: agentSourcePath,
                        device_source: deviceSource,
                        device_path: deviceSourcePath,
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

function createProjectFiles(dgID, ownerID, force = false) {
    return new Promise((resolve, reject) => {
        const defaultOptions = {
            ownerId: ownerID,
            deviceGroupId: dgID,
            device_code: path.join(Consts.srcDirName, Consts.deviceSourceFileName),
            agent_code: path.join(Consts.srcDirName, Consts.agentSourceFileName),
            builderSettings: { variable_definitions: {} },
        };

        const agentPath = path.join(Path.getPWD(), defaultOptions.agent_code);
        if (fs.existsSync(agentPath) && !force) {
            vscode.window.showTextDocument(vscode.workspace.openTextDocument(agentPath));
            reject(User.ERRORS.WORKSPACE_SRC_AGENT_EXIST);
            return;
        }

        const devPath = path.join(Path.getPWD(), defaultOptions.device_code);
        if (fs.existsSync(devPath) && !force) {
            vscode.window.showTextDocument(vscode.workspace.openTextDocument(devPath));
            reject(User.ERRORS.WORKSPACE_SRC_DEVICE_EXIST);
            return;
        }

        if (!fs.existsSync(Path.getDefaultSrcDir())) {
            fs.mkdirSync(Path.getDefaultSrcDir());
        }

        try {
            fs.writeFileSync(agentPath, Consts.agentSourceHeader);
            fs.writeFileSync(devPath, Consts.deviceSourceHeader);
        } catch (err) {
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_SRC_FILE} ${err}`);
            reject(err);
            return;
        }

        Data.storeWorkspaceInfo(defaultOptions).then(() => resolve(), (err) => {
            vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${err}`);
            reject(err);
        });
    });
}

function showSources(src) {
    vscode.window.showTextDocument(vscode.workspace.openTextDocument(src.agent_path), 1);
    vscode.window.showTextDocument(vscode.workspace.openTextDocument(src.device_path), 2);
    vscode.commands.executeCommand('workbench.action.output.toggleOutput');
    vscode.window.showInformationMessage(`${User.MESSAGES.WORKSPACE_CREATED}`);
}

function newProjectExistDG(dgID, ownerID) {
    createProjectFiles(dgID, ownerID, true)
        .then(Data.getSources)
        .then(showSources)
        .catch(err => User.showImpApiError(User.ERRORS.PROJECT_CREATE, err));
}
module.exports.newProjectExistDG = newProjectExistDG;

function newProjectNewDG(accessToken, product, dgName, ownerID) {
    Api.newDG(accessToken, product.id, dgName)
        .then(dg => createProjectFiles(dg.data.id, ownerID, true))
        .then(Data.getSources)
        .then(showSources)
        .catch(err => User.showImpApiError(User.ERRORS.PROJECT_CREATE, err));
}
module.exports.newProjectNewDG = newProjectNewDG;

function newProjectNewProduct(accessToken, productName, dgName, ownerID) {
    Api.newProduct(accessToken, productName, ownerID)
        .then(product => Api.newDG(accessToken, product.data.id, dgName))
        .then(dg => createProjectFiles(dg.data.id, ownerID, true))
        .then(Data.getSources)
        .then(showSources)
        .catch(err => User.showImpApiError(User.ERRORS.PROJECT_CREATE, err));
}
module.exports.newProjectNewProduct = newProjectNewProduct;

// Deploy the source code (agent.nut, device.nut) on device group.
//
// Parameters:
//     none
function deploy(logstream, diagnostic) {
    Promise.all([Auth.authorize(), Data.getWorkspaceInfo(), vscode.workspace.saveAll()])
        .then(([accessToken, cfg]) => {
            const agentPre = new Preproc();
            const devicePre = new Preproc();
            diagnostic.setPreprocessors(agentPre, devicePre);
            Data.getSources().then((src) => {
                let agentSource;
                const agentInc = path.dirname(src.agent_path);
                try {
                    const agentName = path.basename(cfg.agent_code);
                    const code = src.agent_source;
                    const auth = Data.getAuthInfoSync();
                    const gh = {
                        username: auth.builderSettings.github_user,
                        token: auth.builderSettings.github_token,
                    };
                    const defines = cfg.builderSettings.variable_definitions;
                    agentSource = agentPre.preprocess(agentName, code, agentInc, gh, defines);
                } catch (err) {
                    diagnostic.addBuilderError(agentInc, err.message);
                    vscode.window.showErrorMessage(`${User.ERRORS.BUILDER_FAIL} ${err}`);
                    return;
                }

                let deviceSource;
                const devInc = path.dirname(src.device_path);
                try {
                    const devName = path.basename(cfg.device_code);
                    const code = src.device_source;
                    const auth = Data.getAuthInfoSync();
                    const gh = {
                        username: auth.builderSettings.github_user,
                        token: auth.builderSettings.github_token,
                    };
                    const defines = cfg.builderSettings.variable_definitions;
                    deviceSource = devicePre.preprocess(devName, code, devInc, gh, defines);
                } catch (err) {
                    diagnostic.addBuilderError(devInc, err.message);
                    vscode.window.showErrorMessage(`${User.ERRORS.BUILDER_FAIL} ${err}`);
                    return;
                }

                try {
                    /*
                     * The code below is only for debug purposes.
                     * Write preprocessed files to workspace directory for future analyzes.
                     */
                    const storePostprocessed = true;
                    if (storePostprocessed) {
                        const buildPath = path.join(Path.getPWD(), 'build');
                        if (!fs.existsSync(buildPath)) {
                            fs.mkdirSync(buildPath);
                        }
                        fs.writeFileSync(path.join(buildPath, 'preprocessed_agent.nut'), agentSource);
                        fs.writeFileSync(path.join(buildPath, 'preprocessed_device.nut'), deviceSource);
                        // vscode.window.showInformationMessage('Preprocessed files were saved.');
                    }
                } catch (err) {
                    vscode.window.showErrorMessage(`Preprocessed files error: ${err}`);
                    return;
                }

                const dg = cfg.deviceGroupId;
                const attrs = {
                    agent_code: agentSource,
                    device_code: deviceSource,
                };

                Api.deploy(accessToken, dg, DevGroups.TYPE_DEVELOPMENT, attrs)
                    .then((devices) => {
                        if (devices === undefined) {
                            vscode.window.showWarningMessage(`The DG ${dg} have no devices`);
                            vscode.commands.executeCommand('imp.device.add');
                            return;
                        }

                        logstream.addDevice(accessToken, devices.data[0].id, true)
                            .then(() => {
                                Api.restartDevices(accessToken, dg)
                                    .then(
                                        () => vscode.window.showInformationMessage(`Successfully deployed on ${dg}`),
                                        err => User.showImpApiError('Reset devices:', err),
                                    );
                            }, () => {});
                    }, (err) => {
                        diagnostic.addDeployError(err);
                        User.showImpApiError('Deploy failed:', err);
                    });
            }, err => vscode.window.showErrorMessage(`Cannot read source files: ${err}`));
        }).catch(err => vscode.window.showErrorMessage(err.message));
}
module.exports.deploy = deploy;
