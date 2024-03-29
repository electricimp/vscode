// MIT License
//
// Copyright 2018-2023 Electric Imp
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


const upath = require('upath');
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
        return upath.join(Consts.settingsDirName, Consts.authFileName);
    }

    static get configFileName() {
        return 'imp.config';
    }

    static get configFileLocalPath() {
        return upath.join(Consts.settingsDirName, Consts.configFileName);
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
        return upath.join(Path.getPWD(), Consts.configFileLocalPath);
    }

    static getAuth() {
        return upath.join(Path.getPWD(), Consts.authFileLocalPath);
    }

    static getDefaultSrcDir() {
        return upath.join(Path.getPWD(), Consts.srcDirName);
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
    /*
     * The input function argument should have the next structure:
     * {   accessToken: object returned from ImpCentralApi.login(),
     *     cloudURL: string with actual cloud url }
     */
    static storeAuthInfo(auth) {
        return new Promise((resolve, reject) => {
            const authInfo = auth;
            authInfo.builderSettings = { github_user: null, github_token: null };

            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            const settingsDirPath = upath.join(Path.getPWD(), Consts.settingsDirName);
            if (!fs.existsSync(settingsDirPath)) {
                fs.mkdirSync(settingsDirPath);
            }

            const authFile = upath.join(Path.getPWD(), Consts.authFileLocalPath);
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

            const gitIgnoreFile = upath.join(Path.getPWD(), Consts.gitIgnoreFileName);
            try {
                fs.writeFileSync(authFile, JSON.stringify(authInfo, null, 2));
                if (!fs.existsSync(gitIgnoreFile)) {
                    fs.writeFileSync(gitIgnoreFile, Consts.gitIgnoreFileContent);
                } else {
                    /*
                     * Check if auth.info is added to it.
                     */
                    const gitIgnoreContent = fs.readFileSync(gitIgnoreFile);
                    const gitIgnoreItem = Consts.gitIgnoreFileContent;
                    if (gitIgnoreContent.includes(`${gitIgnoreItem}\n`) === false) {
                        fs.writeFileSync(gitIgnoreFile, `${gitIgnoreItem}\n${gitIgnoreContent}`);
                    }
                }
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

            let auth;
            try {
                auth = Data.getAuthInfoSync();
            } catch (err) {
                reject(new User.GetAuthFileError(err));
                return;
            }

            if (!Data.isAuthInfoValid(auth)) {
                reject(new Error(User.ERRORS.AUTH_FILE_ERROR));
                return;
            }

            resolve(auth);
        });
    }

    static getWorkspaceInfoFilePath() {
        return upath.join(Path.getPWD(), Consts.configFileLocalPath);
    }

    static storeWorkspaceInfo(info) {
        return new Promise((resolve, reject) => {
            if (!isWorkspaceFolderOpened()) {
                reject(User.ERRORS.WORKSPACE_FOLDER_SELECT);
                return;
            }

            const settingsDirPath = upath.join(Path.getPWD(), Consts.settingsDirName);
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

                const agentSrc = upath.join(Path.getPWD(), config.agent_code);
                if (!fs.existsSync(agentSrc)) {
                    vscode.window.showTextDocument(vscode.workspace.openTextDocument(cfgFile));
                    reject(new Error(User.ERRORS.WORKSPACE_SRC_AGENT_NONE));
                    return;
                }

                const deviceSrc = upath.join(Path.getPWD(), config.device_code);
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
            agent_path: upath.join(Path.getPWD(), config.agent_code),
            device_path: upath.join(Path.getPWD(), config.device_code),
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
                    const agentSourcePath = upath.join(Path.getPWD(), config.agent_code);
                    const agentSource = fs.readFileSync(agentSourcePath).toString();
                    const deviceSourcePath = upath.join(Path.getPWD(), config.device_code);
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

async function createProjectFiles(url, accessToken, dg, ownerID) {
    const defaultOptions = {
        cloudURL: url,
        ownerId: ownerID,
        deviceGroupId: dg.id,
        device_code: upath.join(Consts.srcDirName, Consts.deviceSourceFileName),
        agent_code: upath.join(Consts.srcDirName, Consts.agentSourceFileName),
        builderSettings: { variable_definitions: {}, builder_libs: [] },
    };

    const agentPath = upath.join(Path.getPWD(), defaultOptions.agent_code);
    const devPath = upath.join(Path.getPWD(), defaultOptions.device_code);
    const sourceFilesExist = fs.existsSync(agentPath) || fs.existsSync(devPath);
    const deploymentExists = 'current_deployment' in dg.relationships;
    const createSourcesCfg = await createSourcesDialog(sourceFilesExist, deploymentExists);

    let agentSrc = Consts.agentSourceHeader;
    let deviceSrc = Consts.deviceSourceHeader;

    if (createSourcesCfg.downloadCode) {
        const latestCode = await downloadLatestCode(url, accessToken, dg);
        agentSrc = latestCode.agentCode;
        deviceSrc = latestCode.deviceCode;
    }

    try {
        if (!fs.existsSync(Path.getDefaultSrcDir())) {
            fs.mkdirSync(Path.getDefaultSrcDir());
        }

        const writeFiles = createSourcesCfg.blankSources || createSourcesCfg.downloadCode;

        if (writeFiles || !fs.existsSync(agentPath)) {
            fs.writeFileSync(agentPath, agentSrc);
        }

        if (writeFiles || !fs.existsSync(devPath)) {
            fs.writeFileSync(devPath, deviceSrc);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_SRC_FILE} ${err}`);
        throw err;
    }

    try {
        await Data.storeWorkspaceInfo(defaultOptions);
    } catch (err) {
        vscode.window.showErrorMessage(`${User.ERRORS.WORSPACE_CFG_FILE} ${err}`);
    }
}

function downloadLatestCode(cloudURL, accessToken, dg) {
    return Api.getDeployment(cloudURL, accessToken, dg.relationships['current_deployment'].id)
        .then((result) => {
            const deployment = result.data;
            return { 'agentCode': deployment.attributes['agent_code'], 'deviceCode': deployment.attributes['device_code'] };
        });
}

async function createSourcesDialog(sourceFilesExist, deploymentExists) {
    let blankSources = false;
    let downloadCode = false;

    const pickCloudUrlOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        ignoreFocusOut: true,
        canPickMany: false,
        onDidSelectItem: undefined
    };

    if (sourceFilesExist) {
        pickCloudUrlOptions.placeHolder = User.PICK_PLACEHOLDERS.WORKSPACE_SRC_FILES_EXIST;
        const items = [User.PICK_ITEMS.WORKSPACE_LEAVE_SRC_FILES_AS_IS, User.PICK_ITEMS.WORKSPACE_MAKE_SRC_FILES_BLANK];

        if (deploymentExists) {
            items.push(User.PICK_ITEMS.WORKSPACE_PUT_DEPLOY_TO_SRC_FILES);
        }

        const pick = await vscode.window.showQuickPick(items, pickCloudUrlOptions);

        if (pick === User.PICK_ITEMS.WORKSPACE_MAKE_SRC_FILES_BLANK) {
            blankSources = true;
        } else if (pick === User.PICK_ITEMS.WORKSPACE_PUT_DEPLOY_TO_SRC_FILES) {
            downloadCode = true;
        }
    } else if (deploymentExists) {
        pickCloudUrlOptions.placeHolder = User.PICK_PLACEHOLDERS.WORKSPACE_DOWNLOAD_DEPLOYED_CODE;
        const items = [User.PICK_ITEMS.YES, User.PICK_ITEMS.NO];

        const pick = await vscode.window.showQuickPick(items, pickCloudUrlOptions);

        if (pick === User.PICK_ITEMS.YES) {
            downloadCode = true;
        }
    } else {
        blankSources = true;
    }

    return { 'blankSources': blankSources, 'downloadCode': downloadCode };
}

function validateDG(config) {
    return new Promise((resolve, reject) => {
        Api.getDG(config.cloudURL, config.accessToken, config.deviceGroupId)
            .then((group) => {
                const groupConfig = config;
                groupConfig.dgType = group.data.type;
                resolve(groupConfig);
            }, (err) => {
                Auth.reloginIfAuthError(err, Auth.hideAuthError);
                reject(new Error(`${User.ERRORS.DG_RETRIEVE} ${err}`));
            });
    });
}
module.exports.validateDG = validateDG;

function showSources(src) {
    vscode.window.showTextDocument(vscode.workspace.openTextDocument(src.agent_path), 1);
    vscode.window.showTextDocument(vscode.workspace.openTextDocument(src.device_path), 2);
    vscode.commands.executeCommand('workbench.action.output.toggleOutput');
    vscode.window.showInformationMessage(`${User.MESSAGES.WORKSPACE_CREATED}`);
}

function newProjectExistDG(cloudURL, accessToken, dg, ownerID) {
    createProjectFiles(cloudURL, accessToken, dg, ownerID)
        .then(Data.getSources)
        .then(showSources)
        .catch(err => User.showImpApiError(User.ERRORS.PROJECT_CREATE, err));
}

module.exports.newProjectExistDG = newProjectExistDG;

function newProjectNewDG(cloudURL, accessToken, product, dgName, ownerID) {
    Api.newDG(cloudURL, accessToken, product.id, dgName)
        .then(dg => createProjectFiles(cloudURL, accessToken, dg.data, ownerID))
        .then(Data.getSources)
        .then(showSources)
        .catch(err => User.showImpApiError(User.ERRORS.PROJECT_CREATE, err));
}
module.exports.newProjectNewDG = newProjectNewDG;

function newProjectNewProduct(cloudURL, accessToken, productName, dgName, ownerID) {
    Api.newProduct(cloudURL, accessToken, productName, ownerID)
        .then(product => Api.newDG(cloudURL, accessToken, product.data.id, dgName))
        .then(dg => createProjectFiles(cloudURL, accessToken, dg.data, ownerID))
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
    vscode.workspace.saveAll()
        .then(() => Data.getWorkspaceInfo())
        .then(cfg => Auth.authorize(cfg))
        .then(cfg => validateDG(cfg))
        .then((cfg) => {
            this.cloudURL = cfg.cloudURL;
            this.accessToken = cfg.accessToken;
            this.ownerId = cfg.ownerId;
            this.dg = cfg.deviceGroupId;
            this.dgType = cfg.dgType;
            this.agentCode = cfg.agent_code;
            this.deviceCode = cfg.device_code;
            this.builderSettings = cfg.builderSettings;
            this.diagnostic = diagnostic;
        })
        .then(() => Data.getAuthInfo())
        .then((auth) => { this.auth = auth; })
        .then(() => {
            const agentPre = new Preproc();
            const devicePre = new Preproc();
            diagnostic.setPreprocessors(agentPre, devicePre);
            this.agentPre = agentPre;
            this.devicePre = devicePre;
        })
        .then(() => Data.getSources())
        .then((src) => { this.src = src; })
        .then(() => {
            let agentSource;
            const agentInc = upath.dirname(this.src.agent_path);
            try {
                const agentName = upath.basename(this.agentCode);
                const code = this.src.agent_source;
                const gh = {
                    username: this.auth.builderSettings.github_user,
                    token: this.auth.builderSettings.github_token,
                };
                var defines = this.builderSettings.variable_definitions;
                if (!('vscodeWorkdir' in defines)) {
                    defines.vscodeWorkdir = Path.getPWD();
                }
                const builder_libs = (this.builderSettings.builder_libs) ?
                                      this.builderSettings.builder_libs.map(l => (upath.isAbsolute(l) ? l : upath.join(Path.getPWD(), l))) :
                                      [];
                agentSource = this.agentPre.preprocess(agentName, code, agentInc, gh, defines, builder_libs);
            } catch (err) {
                diagnostic.addBuilderError(agentInc, err.message);
                throw new User.BuilderError(err);
            }

            let deviceSource;
            const devInc = upath.dirname(this.src.device_path);
            try {
                const devName = upath.basename(this.deviceCode);
                const code = this.src.device_source;
                const gh = {
                    username: this.auth.builderSettings.github_user,
                    token: this.auth.builderSettings.github_token,
                };
                var defines = this.builderSettings.variable_definitions;
                if (!('vscodeWorkdir' in defines)) {
                    defines.vscodeWorkdir = Path.getPWD();
                }
                const builder_libs = (this.builderSettings.builder_libs) ?
                                      this.builderSettings.builder_libs.map(l => (upath.isAbsolute(l) ? l : upath.join(Path.getPWD(), l))) :
                                      [];
                deviceSource = this.devicePre.preprocess(devName, code, devInc, gh, defines, builder_libs);
            } catch (err) {
                diagnostic.addBuilderError(devInc, err.message);
                throw new User.BuilderError(err);
            }

            try {
                const buildPath = upath.join(Path.getPWD(), 'build');
                if (!fs.existsSync(buildPath)) {
                    fs.mkdirSync(buildPath);
                }
                fs.writeFileSync(upath.join(buildPath, 'preprocessed_agent.nut'), agentSource);
                fs.writeFileSync(upath.join(buildPath, 'preprocessed_device.nut'), deviceSource);
            } catch (err) {
                throw new User.PreprocessedFileError(err);
            }

            return {
                agent_code: agentSource,
                device_code: deviceSource,
            };
        })
        .then(async (attrs) => {
            let devices;
            try {
                devices = await Api.deploy(this.cloudURL, this.accessToken, this.dg, this.dgType, attrs);
            } catch (err) {
                this.diagnostic.addDeployError(err);
                throw new User.DeployError(err);
            }

            return devices;
        })
        .then((devices) => {
            if (devices) {
                this.devices = devices;
                return;
            }

            vscode.commands.executeCommand('imp.device.add');
            throw new User.DGHaveNoDevicesError(this.dg);
        })
        .then(() => logstream.setImpCentralApi(this.cloudURL))
        .then(() => logstream.addDevice(this.accessToken, this.devices.data[0].id, true))
        .then(() => Api.restartDevices(this.cloudURL, this.accessToken, this.dg))
        .then(() => vscode.window.showInformationMessage(`Successfully deployed on ${this.dg}`))
        .catch(err => User.processError(err));
}
module.exports.deploy = deploy;
