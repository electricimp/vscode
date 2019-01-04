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
const User = require('./user');
const Workspace = require('./workspace');

function promptUserPassword() {
    const usernameOptions = {
        prompt: User.MESSAGES.AUTH_PROMPT_ENTER_CREDS,
    };

    const passwordOptions = {
        password: true,
        prompt: User.MESSAGES.AUTH_PROMPT_ENTER_PWD,
    };

    return new Promise(((resolve, reject) => {
        vscode.window.showInputBox(usernameOptions).then((user) => {
            if (!user) {
                reject(new Error(`${User.ERRORS.AUTH_USERNAME_EMPTY}`));
                return;
            }
            vscode.window.showInputBox(passwordOptions).then((pass) => {
                if (!pass) {
                    reject(new Error(`${User.ERRORS.AUTH_PASSWORD_EMPTY}`));
                    return;
                }
                resolve({
                    username: user,
                    password: pass,
                });
            });
        });
    }));
}

// Initiate user login dialog using username/password authorization.
// Save file with access token in the workspace directory.
//
// Parameters:
//     none
//
// Returns:
//     none
//
function loginCredsDialog() {
    promptUserPassword()
        .then(Api.login)
        .then(Workspace.Data.storeAuthInfo)
        .then(() => vscode.window.showInformationMessage(User.MESSAGES.AUTH_SUCCESS))
        .catch(err => vscode.window.showErrorMessage(err.message));
}
module.exports.loginCredsDialog = loginCredsDialog;

// Authorization procedure using authorization file from current workspace.
//
// Parameters:
//     none
//
// Returns:                     Promise that resolves when the login is successfull,
//                              or rejects with an error
//
function authorize() {
    return new Promise(((resolve, reject) => {
        Workspace.Data.getAuthInfo()
            .then((auth) => {
                resolve(auth.access_token);
            }, (err) => {
                vscode.window.showErrorMessage(`${User.ERRORS.AUTH_FILE} ${err}. Please Login.`);
                vscode.commands.executeCommand('imp.auth.creds');
                reject(err);
            });
    }));
}
module.exports.authorize = authorize;

// Check if 401 error was returned and call auth extension command if true.
//
// Parameters:
//     err    : Error returned from imp-central-api
//
// Returns:                     ture if auth error
//
function reloginIfAuthError(err) {
    if (typeof err.statusCode !== 'undefined' && err.statusCode === 401) {
        vscode.window.showErrorMessage('Authorization error, please login.');
        vscode.commands.executeCommand('imp.auth.creds');
        return true;
    }

    return false;
}
module.exports.reloginIfAuthError = reloginIfAuthError;
