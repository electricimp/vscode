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
const Workspace = require('./workspace');

// Initiate user login dialog using username/password authorization.
// Save file with access token in the workspace directory.
//
// Parameters:
//     none
//
// Returns:
//     none
function loginCredsDialog() {
    const usernameOptions = {
        prompt: 'Enter username or email address:',
    };
    vscode.window.showInputBox(usernameOptions)
        .then((username) => {
            if (!username) {
                vscode.window.showErrorMessage('The username is empty');
                return;
            }

            const passwordOptions = {
                password: true,
                prompt: 'Enter password:',
            };

            vscode.window.showInputBox(passwordOptions)
                .then((password) => {
                    if (!password) {
                        vscode.window.showErrorMessage('The password is empty');
                        return;
                    }

                    const api = new ImpCentralApi();
                    api.auth.login(username, password)
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
                                vscode.window.showErrorMessage(`Auth file error: ${err}`);
                                return;
                            }
                            vscode.window.showInformationMessage('Workspace login is successful.');
                        }, (err) => {
                            vscode.window.showErrorMessage(`Auth failed: ${err}`);
                        });
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
            vscode.window.showErrorMessage(`Cannot read auth file: ${err}`);
            reject(err);
        }
    }));
}
module.exports.authorize = authorize;
