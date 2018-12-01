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
const util = require('util');
const vscode = require('vscode');
const authHelper = require('./auth');
const workspaceHelper = require('./workspace');
const logStreamHelper = require('./logstream');

function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('imp.auth.creds', function () {
        if (workspaceHelper.isWorkspaceFolderOpened()) {
            authHelper.loginCredsDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.new', function () {
        if (workspaceHelper.isWorkspaceFolderOpened()) {
            let workspace = new workspaceHelper();
            workspace.newProjectDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.deploy', function () {
        if (workspaceHelper.isWorkspaceFolderOpened()) {
            let workspace = new workspaceHelper();
            workspace.deploy();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.add', function () {
        if (workspaceHelper.isWorkspaceFolderOpened()) {
            let logstream = new logStreamHelper.LogStreamHelper();
            logstream.addDeviceDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.remove', function () {
        if (workspaceHelper.isWorkspaceFolderOpened()) {
            vscode.window.showErrorMessage('The command is not implemented');
        }
    }));

    // === USE IN CASE OF DEBUG
    DEBUG_UNHANDLED_REJECTION();
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

// Debug stuff
function DEBUG_UNHANDLED_REJECTION() {
    process.on('unhandledRejection', (reason, p) => {
        fs.writeFileSync('/tmp/node.log', '=======================================\n');
        fs.appendFileSync('/tmp/node.log', 'Unhandled Rejection at: Promise');
        fs.appendFileSync('/tmp/node.log', 'p = ' + util.inspect(p, {showHidden: false, depth: null}));
        fs.appendFileSync('/tmp/node.log', 'r = ' + util.inspect(reason, {showHidden: false, depth: null}));
        fs.appendFileSync('/tmp/node.log', '\n');
    });
}
