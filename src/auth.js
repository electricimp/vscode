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


const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const ImpCentralApi = require('imp-central-api');
const User = require('./user');
const Workspace = require('./workspace');


function promptUserPassword() {
    return new Promise(((resolve, reject) => {
        const usernameOptions = {
            prompt: User.MESSAGES.AUTH_PROMPT_ENTER_CREDS,
        };
        vscode.window.showInputBox(usernameOptions)
            .then((user) => {
                if (!user) {
                    vscode.window.showErrorMessage(User.ERRORS.AUTH_USERNAME_EMPTY);
                    reject();
                }

                const passwordOptions = {
                    password: true,
                    prompt: User.MESSAGES.AUTH_PROMPT_ENTER_PWD,
                };

                vscode.window.showInputBox(passwordOptions)
                    .then((pass) => {
                        if (!pass) {
                            vscode.window.showErrorMessage(User.ERRORS.AUTH_PASSWORD_EMPTY);
                            reject();
                        }

                        const creds = {
                            username: user,
                            password: pass,
                        };

                        resolve(creds);
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
function loginCredsDialog() {
    promptUserPassword()
        .then((creds) => {
            const api = new ImpCentralApi();
            api.auth.login(creds.username, creds.password)
                .then((authInfo) => {
                    const currentPath = Workspace.getCurrentFolderPath();
                    const authName = Workspace.Consts.authFileName;
                    const gitIgnoreName = Workspace.Consts.gitIgnoreFileName;
                    const authFile = path.join(currentPath, authName);
                    const gitIgnoreFile = path.join(currentPath, gitIgnoreName);
                    try {
                        fs.writeFileSync(authFile, JSON.stringify(authInfo));
                        fs.writeFileSync(gitIgnoreFile, JSON.stringify(authInfo));
                    } catch (err) {
                        /*
                         * TODO: Possibly it is required to split
                         * json and fs errors handling.
                         */
                        vscode.window.showErrorMessage(`${User.ERRORS.AUTH_FILE} ${err}`);
                        return;
                    }
                    vscode.window.showInformationMessage(User.MESSAGES.AUTH_SUCCESS);
                }, (err) => {
                    vscode.window.showErrorMessage(`${User.ERRORS.AUTH_LOGIN} ${err}`);
                });
        });
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
        const authName = Workspace.Consts.authFileName;
        const authFile = path.join(Workspace.getCurrentFolderPath(), authName);
        try {
            const data = fs.readFileSync(authFile);
            const auth = JSON.parse(data);
            resolve(auth.access_token);
        } catch (err) {
            vscode.window.showErrorMessage(`${User.ERRORS.AUTH_FILE} ${err}`);
            reject(err);
        }
    }));
}
module.exports.authorize = authorize;
