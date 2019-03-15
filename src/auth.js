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

const IsReachable = require('is-reachable');
const validUrl = require('valid-url');
const vscode = require('vscode');
const Api = require('./api');
const User = require('./user');
const Workspace = require('./workspace');

const defaultCloudURL = 'https://api.electricimp.com/v5';
module.exports.defaultCloudURL = defaultCloudURL;

async function getCloudUrl(cloudURL) {
    if (cloudURL) {
        return cloudURL;
    }

    const pickCloudUrlOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: `Use default Imp Cloud URL (${defaultCloudURL}) ?`,
        ignoreFocusOut: true,
        canPickMany: false,
        onDidSelectItem: undefined,
    };

    const pick = await vscode.window.showQuickPick(['Yes', 'No'], pickCloudUrlOptions);
    if (pick === undefined) {
        throw new User.UserInputCanceledError();
    }

    if (pick === 'Yes') {
        return defaultCloudURL;
    }

    async function validateURL(url) { return validUrl.isWebUri(url) && await IsReachable(url) ? null : 'Incorrect URL'; }

    const urlOptions = {
        prompt: User.MESSAGES.AUTH_PROMPT_ENTER_URL,
        placeHolder: '',
        password: false,
        ignoreFocusOut: true,
        validateInput: validateURL,
    };

    const url = await vscode.window.showInputBox(urlOptions);
    if (url === undefined) {
        throw new User.UserInputCanceledError();
    }

    return url;
}
module.exports.getCloudUrl = getCloudUrl;

async function getUserCreds(url) {
    const userOptions = {
        prompt: User.MESSAGES.AUTH_PROMPT_ENTER_CREDS,
        placeHolder: '',
        password: false,
        ignoreFocusOut: true,
    };

    const user = await vscode.window.showInputBox(userOptions);
    if (user === undefined) {
        throw new User.UserInputCanceledError();
    }

    const pwdOptions = {
        prompt: User.MESSAGES.AUTH_PROMPT_ENTER_PWD,
        placeHolder: '',
        password: true,
        ignoreFocusOut: true,
    };

    const pwd = await vscode.window.showInputBox(pwdOptions);
    if (pwd === undefined) {
        throw new User.UserInputCanceledError();
    }

    let token;
    const creds = {
        username: user,
        password: pwd,
    };

    try {
        token = await Api.login(url, creds);
    } catch (err) {
        if (Api.isMFAError(err)) {
            const otpOptions = {
                prompt: User.MESSAGES.AUTH_PROMPT_ENTER_OTP,
                placeHolder: '',
                password: false,
                ignoreFocusOut: true,
            };

            const otp = await vscode.window.showInputBox(otpOptions);
            if (otp === undefined) {
                throw new User.UserInputCanceledError();
            }

            token = await Api.loginWithOTP(url, otp, Api.getMFALoginToken(err));
        } else {
            throw new User.LoginError(err);
        }
    }

    return {
        accessToken: token,
    };
}
module.exports.getUserCreds = getUserCreds;

// Initiate user login dialog using username/password authorization.
// Save file with access token in the workspace directory.
//
// Parameters:
//     none
//
// Returns:
//     none
//
function loginDialog() {
    Workspace.Data.getWorkspaceInfo()
        .then(cfg => getCloudUrl(cfg.cloudURL))
        .then(url => getUserCreds(url))
        .then(auth => Workspace.Data.storeAuthInfo(auth))
        .catch(err => User.processError(err));
}
module.exports.loginDialog = loginDialog;

function isAccessTokenExpired(auth) {
    if (!Number.isInteger(Date.parse(auth.expires_at)) ||
        !Number.isInteger(parseInt(auth.expires_in, 10))) {
        return true;
    }

    /*
     * Select the expiration gap as 0.05,
     * it is equal to 3 minutes if expires_in equals 3600 seconds.
     */
    const expirationGap = 0.05;
    const expires = new Date(auth.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff < auth.expires_in * expirationGap * 1000) {
        return true;
    }

    return false;
}

async function checkAccess(url, token) {
    try {
        await Api.getMe(url, token);
    } catch (err) {
        if (!Api.isAuthError(err)) {
            throw new User.LoginError(err);
        }

        return false;
    }

    return true;
}

async function validateAccessToken(url, token) {
    let newAccessToken;
    const auth = {
        accessToken: token,
    };

    if (await checkAccess(url, token.access_token) === false ||
        isAccessTokenExpired(token) === true) {
        try {
            newAccessToken = await Api.refreshAccessToken(url, token.refresh_token);
        } catch (err) {
            throw new User.RefreshAccessTokenError(err);
        }

        auth.accessToken = newAccessToken;
        await Workspace.Data.storeAuthInfo(auth);
    }

    return auth.accessToken;
}

// Authorization procedure using authorization file from current workspace.
//
// Parameters:
//     none
//
// Returns:                     Promise that resolves when the login is successfull,
//                              or rejects with an error
//
function authorize(config) {
    return new Promise((resolve, reject) => {
        Workspace.Data.getAuthInfo()
            .then(auth => validateAccessToken(config.cloudURL, auth.accessToken))
            .then((accessToken) => {
                const authorizedConfig = config;
                authorizedConfig.accessToken = accessToken.access_token;
                resolve(authorizedConfig);
            })
            .catch((err) => {
                /*
                 * Do not propose relogin to user if we have errors related to bad cloud URL.
                 */
                if (!Api.isENOTFOUNDError(err.apiErr) && !Api.isBadRequestError(err.apiErr)) {
                    vscode.commands.executeCommand('imp.auth.creds');
                }
                reject(err);
            });
    });
}
module.exports.authorize = authorize;

const hideAuthError = 'hideError';
module.exports.hideAuthError = hideAuthError;

// Check if 401 error was returned and call auth extension command if true.
//
// Parameters:
//     err    : Error returned from imp-central-api
//
// Returns:                     ture if auth error
//
function reloginIfAuthError(err, hideError = undefined) {
    if (typeof err.statusCode !== 'undefined' && err.statusCode === 401) {
        if (hideError !== hideAuthError) {
            vscode.window.showErrorMessage('Authorization error, please login.');
        }

        vscode.commands.executeCommand('imp.auth.creds');

        return true;
    }

    return false;
}
module.exports.reloginIfAuthError = reloginIfAuthError;
