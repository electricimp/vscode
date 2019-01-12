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
const User = require('./user');
const Workspace = require('./workspace');

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
                resolve(auth.accessToken.access_token);
            }, (err) => {
                vscode.window.showErrorMessage(`${User.ERRORS.AUTH_FILE} ${err}`);
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
