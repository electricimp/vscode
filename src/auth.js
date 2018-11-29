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

'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const ImpCentralApi = require('imp-central-api');
const WorkspaceHelper = require('./workspace');

// Initiate user login dialog using username/password authorization.
// Save file with access token in the workspace directory.
//
// Parameters:
//     none
//
// Returns:
//     none
function loginCredsDialog() {
    const username_options = {
        prompt: 'Enter username or email address:' 
    }
    vscode.window.showInputBox(username_options).then(username => {
        if (!username) {
            vscode.window.showErrorMessage('The username is empty');
            return;
        }

        const password_options = {
            password: true,
            prompt: 'Enter password:'
        }

        vscode.window.showInputBox(password_options).then(password => {
            if (!password) {
                vscode.window.showErrorMessage('The password is empty');
                return;
            }

            const impCentralApi = new ImpCentralApi();
            impCentralApi.auth.login(username, password).then(function(authInfo) {
                const authFile = path.join(WorkspaceHelper.getCurrentFolderPath(), WorkspaceHelper.authFileName);
                const gitIgnoreFile = path.join(WorkspaceHelper.getCurrentFolderPath(), WorkspaceHelper.gitIgnoreFileName);
                try {
                    fs.writeFileSync(authFile, JSON.stringify(authInfo));
                    fs.writeFileSync(gitIgnoreFile, JSON.stringify(authInfo));
                } catch(err) {
                    // TODO: Possibly it is required to split json and fs errors handling.
                    vscode.window.showErrorMessage('Auth error ' + err);
                    return;
                }
                vscode.window.showInformationMessage('Workspace login is successful.'); 
            }, function() {
                vscode.window.showErrorMessage('Invalid Credentials: The provided credentials are invalid.');
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
    return new Promise(function(resolve, reject) {
        const authFile = path.join(WorkspaceHelper.getCurrentFolderPath(), WorkspaceHelper.authFileName);
        try {
            let data = fs.readFileSync(authFile);
            const auth = JSON.parse(data);
            resolve(auth.access_token);
        } catch (err) {
            vscode.window.showErrorMessage('Cannot read auth file. ');
            reject(err);
        }
    });
}
module.exports.authorize = authorize;