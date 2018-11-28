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
const workspaceHelper = require('./workspace');

/*
 * Here we should have all logic related with imp api auth.
 * For now it is slightly simplified. If we will get auth error, we will ask user to enter auth creds.
 * The whole login process should be automated and based on auth tokens like in the impt.
 * See impt ImpCentralApiHelper class.
 */

class AuthHelper {
    static _storeAuthInfo(authinfo) {
        const authFile = path.join(workspaceHelper.getCurrentFolderPath(), workspaceHelper.authFileName);
        fs.writeFile(authFile, JSON.stringify(authinfo) || '', (error) => {
            if (error) {
                vscode.window.showErrorMessage('Can not save auth file in the workspace.');
            }
        });
    }

    static _storeGitIgnoreFile() {
        const gitIgnoreFile = path.join(workspaceHelper.getCurrentFolderPath(), workspaceHelper.gitIgnoreFileName);
        fs.writeFile(gitIgnoreFile, workspaceHelper.gitIgnoreFileContent || '', (error) => {
            if (error) {
                vscode.window.showErrorMessage('Can not save .gitignore file in the workspace.');
            }
        });
    }

    // Check if imp-central-api returned auth error.
    //
    // Parameters:
    //     error : error from imp-central-api to check
    //
    // Returns:                     bool value dependent of error check
    //
    isAuthenticationError(error) {
        return error instanceof ImpCentralApi.Errors.ImpCentralApiError &&
            error._statusCode === 401;
    }

    // Initiate user login dialog using username/password authorization.
    //
    // Parameters:
    //     none
    //
    // Returns:
    //     none
    loginCredsDialog() {
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
                impCentralApi.auth.login(username, password).then(function(result) {
                    AuthHelper._storeAuthInfo(result);
                    AuthHelper._storeGitIgnoreFile(result);

                    /* 
                     * TODO: Add try/catch to do not display the successfull message,
                     * if we can not save the files above.
                     */

                    vscode.window.showInformationMessage('Global login is successful.'); 
                }, function() {
                    vscode.window.showErrorMessage('Invalid Credentials: The provided credentials are invalid.');
                });
            });			
        });
    }

// NOTE: Second vscode auth command.
// See description below. Need to be discussed. Comment for now.
/* 
    // Initiate user login dialog using loginKey authorization.
    // 
    // Parameters:
    //     none
    loginLoginKeyDialog() {
        let options = {
            password: true,
            prompt: 'Enter Login Key:'
        }

        vscode.window.showInputBox(options).then(loginkey => {
            if (!loginkey) {
                vscode.window.showErrorMessage('The loginkey is empty');
                return;
            }

            const impCentralApi = new ImpCentralApi();
            impCentralApi.auth.getAccessToken(loginkey).then(function(result) {
                vscode.window.showInformationMessage('Global login is successful.');
                    // Extract access-token from result
                }, function() {
                    vscode.window.showErrorMessage(`Login Key "${loginkey}" is not found.`);
                });
        });
    }
*/
}

module.exports = AuthHelper;
