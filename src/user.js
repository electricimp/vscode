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
const Auth = require('./auth');

const ERRORS = {
    AUTH_USERNAME_EMPTY: 'The username is empty',
    AUTH_PASSWORD_EMPTY: 'The password is empty',
    AUTH_LOGIN: 'Auth failed:',
    AUTH_FILE: 'Auth file:',
    AUTH_FILE_NONE: 'Auth file does not exist',
    DEVICE_ID_EMPTY: 'The device ID is empty',
    DEVICE_RETRIEVE: 'Cannot retrieve device:',
    DG_ID_EMPTY: 'The device group ID is empty',
    DG_RETRIEVE: 'Cannot retrieve DG:',
    DG_CREATE: 'Cannot create DG:',
    PRODUCT_ID_EMPTY: 'The product ID is empty',
    PRODUCT_CREATE: 'Cannot create new product:',
    WORKSPACE_MULTIROOT: 'Multi-root workspaces are not supported',
    WORKSPACE_FOLDER_SELECT: 'Please select the workspace folder to proceed',
    WORSPACE_CFG_FILE: 'Project file:',
    WORSPACE_CFG_NONE: 'Project file does not exist',
    WORKSPACE_CFG_EXIST: 'A project file already exists',
    WORKSPACE_CFG_CORRUPTED: 'A project file is corrupted',
    WORSPACE_SRC_FILE: 'Source file:',
    WORKSPACE_SRC_AGENT_NONE: 'Agent source cannot be found',
    WORKSPACE_SRC_DEVICE_NONE: 'Device source cannot be found',
};
module.exports.ERRORS = ERRORS;

const MESSAGES = {
    AUTH_PROMPT_ENTER_CREDS: 'Enter username or email address:',
    AUTH_PROMPT_ENTER_PWD: 'Enter password:',
    AUTH_SUCCESS: 'Workspace login is successful',
    DEVICE_PROMPT_DEVICE_ID: 'Enter a valid device ID:',
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
