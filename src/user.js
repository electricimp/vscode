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

const ERRORS = {
    AUTH_USERNAME_EMPTY: 'The username is empty',
    AUTH_PASSWORD_EMPTY: 'The password is empty',
    AUTH_LOGIN: 'Auth failed:',
    AUTH_FILE: 'Auth file:',
    AUTH_FILE_NONE: 'Auth file does not exist',
    AUTH_FILE_ERROR: 'Auth file corrupted',
    BUILDER_FAIL: 'Cannot apply Builder:',
    DEVICE_ID_EMPTY: 'The device ID is empty',
    DEVICE_RETRIEVE: 'Cannot retrieve device:',
    DG_ID_EMPTY: 'The device group ID is empty',
    DG_RETRIEVE: 'Cannot retrieve DG:',
    DG_CREATE: 'Cannot create DG:',
    DG_LIST: 'Cannot retrieve DG list:',
    OWNERS_LIST: 'Cannot retrieve owners list:',
    PRODUCT_ID_EMPTY: 'The product ID is empty',
    PRODUCT_CREATE: 'Cannot create new product:',
    PRODUCT_LIST: 'Cannot retrieve product list:',
    PROJECT_CREATE: 'Cannot create project:',
    REFREASH_AUTH: 'Cannot refresh access_token:',
    VSCODE_API: 'IMP API:',
    WORKSPACE_MULTIROOT: 'Multi-root workspaces are not supported',
    WORKSPACE_FOLDER_SELECT: 'Please select the workspace folder to proceed',
    WORSPACE_CFG_FILE: 'Project file:',
    WORSPACE_CFG_NONE: 'Project file does not exist',
    WORKSPACE_CFG_EXIST: 'A project file already exist',
    WORKSPACE_CFG_CORRUPTED: 'A project file is corrupted',
    WORSPACE_SRC_FILE: 'Source file:',
    WORKSPACE_SRC_AGENT_NONE: 'Agent source cannot be found',
    WORKSPACE_SRC_AGENT_EXIST: 'Agent source already exist',
    WORKSPACE_SRC_DEVICE_NONE: 'Device source cannot be found',
    WORKSPACE_SRC_DEVICE_EXIST: 'Device source already exist',
};
module.exports.ERRORS = ERRORS;

const MESSAGES = {
    AUTH_PROMPT_ENTER_CREDS: 'Enter username or email address:',
    AUTH_PROMPT_ENTER_PWD: 'Enter password:',
    AUTH_PROMPT_ENTER_OTP: 'Enter OTP (One Time Password):',
    AUTH_PROMPT_ENTER_URL: 'Enter Imp Cloud URL:',
    AUTH_SUCCESS: 'Workspace login is successful',
    DEVICE_PROMPT_DEVICE_ID: 'Enter a valid device ID:',
    WORKSPACE_CREATED: 'Project created.',
    WORKSPACE_PROMPT_DG_EXIST: 'Enter an exist device group ID:',
    WORKSPACE_PROMPT_DG_NEW: 'Enter a new device group name:',
    WORKSPACE_PROMPT_PRODUCT_EXIST: 'Enter an exist product ID:',
    WORKSPACE_PROMPT_PRODUCT_NEW: 'Enter an new product name:',
};
module.exports.MESSAGES = MESSAGES;

const NAMES = {
    OUTPUT_CHANNEL: 'imp: LogStream',
};
module.exports.NAMES = NAMES;

const CONSTS = {
    NEW_PROJECT_EXIST_DG: 'New Project, exist DG',
    NEW_PROJECT_NEW_DG: 'New Project, new DG',
    NEW_PROJECT_NEW_PRODUCT: 'New Project, new Product',
};
module.exports.CONSTS = CONSTS;

// Display imp-central-api error as pop-up message.
//
// Parameters:
//     err    : Error returned from imp-central-api
//
// Returns:
//     none
//
function showImpApiError(msg, err) {
    if (Auth.reloginIfAuthError(err)) {
        return;
    }

    vscode.window.showErrorMessage(`${msg} ${err}`);
}
module.exports.showImpApiError = showImpApiError;

/*
 * Internal vscode extension errors
 */
class LoginError extends Error {
    constructor(apiErr) {
        super();
        this.apiErr = apiErr;
    }
}
module.exports.LoginError = LoginError;

class RefreshAccessTokenError extends Error {
    constructor(apiErr) {
        super();
        this.apiErr = apiErr;
    }
}
module.exports.RefreshAccessTokenError = RefreshAccessTokenError;

class GetAuthFileError extends Error {
    constructor(sysErr) {
        super();
        this.sysErr = sysErr;
    }
}
module.exports.GetAuthFileError = GetAuthFileError;

class UserInputCanceledError extends Error {
    constructor(message) {
        super(message || 'User Input Canceled');
    }
}
module.exports.UserInputCanceledError = UserInputCanceledError;

class DGListRetrieveError extends Error {
    constructor(apiErr) {
        super();
        this.apiErr = apiErr;
    }
}
module.exports.DGListRetrieveError = DGListRetrieveError;

class DeviceListRetrieveError extends Error {
    constructor(apiErr) {
        super();
        this.apiErr = apiErr;
    }
}
module.exports.DeviceListRetrieveError = DeviceListRetrieveError;

class NoAvailableDevicesError extends Error {
    constructor(message) {
        super(message || 'No Available Devices');
    }
}
module.exports.NoAvailableDevicesError = NoAvailableDevicesError;

class BuilderError extends Error {
    constructor(builderErr) {
        super();
        this.builderErr = builderErr;
    }
}
module.exports.BuilderError = BuilderError;

class PreprocessedFileError extends Error {
    constructor(fileErr) {
        super();
        this.fileErr = fileErr;
    }
}
module.exports.PreprocessedFileError = PreprocessedFileError;

class DeployError extends Error {
    constructor(deployErr) {
        super();
        this.deployErr = deployErr;
    }
}
module.exports.DeployError = DeployError;

class DGHaveNoDevicesError extends Error {
    constructor(dgID) {
        super();
        this.dgID = dgID;
    }
}
module.exports.DGHaveNoDevicesError = DGHaveNoDevicesError;

function processError(err) {
    if (err instanceof LoginError) {
        vscode.window.showErrorMessage(`${ERRORS.AUTH_LOGIN} ${err.apiErr.message}`);
    } else if (err instanceof RefreshAccessTokenError) {
        vscode.window.showErrorMessage(`${ERRORS.REFREASH_AUTH} ${err.apiErr.message}`);
    } else if (err instanceof GetAuthFileError) {
        vscode.window.showErrorMessage(`${ERRORS.AUTH_FILE} ${err.sysErr.message}`);
    } else if (err instanceof UserInputCanceledError) {
        // It mean that user pressed 'Esc' in case of data input, so do nothing.
    } else if (err instanceof DGListRetrieveError) {
        // Will be added later.
    } else if (err instanceof DeviceListRetrieveError) {
        vscode.window.showErrorMessage(`${ERRORS.DEVICE_RETRIEVE} ${err.apiErr.message}`);
    } else if (err instanceof NoAvailableDevicesError) {
        vscode.window.showWarningMessage('There are no available devices.');
    } else if (err instanceof BuilderError) {
        vscode.window.showErrorMessage(`${ERRORS.BUILDER_FAIL} ${err.builderErr}`);
    } else if (err instanceof PreprocessedFileError) {
        vscode.window.showErrorMessage(`Preprocessed files error: ${err.fileErr}`);
    } else if (err instanceof DeployError) {
        vscode.window.showErrorMessage(`Deploy failed: ${err.deployErr}`);
    } else if (err instanceof DGHaveNoDevicesError) {
        vscode.window.showWarningMessage(`The DG ${err.dgID} have no devices`);
    } else if (err instanceof ImpCentralApi.Errors.InvalidDataError) {
        vscode.window.showErrorMessage(err.message);
    } else if (err instanceof ImpCentralApi.Errors.ImpCentralApiError) {
        vscode.window.showErrorMessage(err.message);
    } else if (err instanceof Error) {
        vscode.window.showErrorMessage(err.message);
    }
}
module.exports.processError = processError;
