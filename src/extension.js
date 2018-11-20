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

const vscode = require('vscode');
const authHelper = require('./auth');
const workspaceHelper = require('./workspace');
const logStreamHelper = require('./logstream');

function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('imp.auth.creds', function () {
        let auth = new authHelper();
        auth.loginCredsDialog();
    }));

/*  
    // Second vscode auth command, not used for now.
    // Do not forget to add it to package.json later.
    context.subscriptions.push(vscode.commands.registerCommand('imp.auth.loginkey', function () {
        let auth = new authHelper();
        auth.loginLoginKeyDialog();
    }));
*/
    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.create', function () {
        let workspace = new workspaceHelper();
        workspace.createProject();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.open', function () {
        let workspace = new workspaceHelper();
        workspace.openProject();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.run', function () {
        let workspace = new workspaceHelper();
        workspace.deploy();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.open', function () {
        let logstream = new logStreamHelper();
        logstream.openOutputChannel();
    }));
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;