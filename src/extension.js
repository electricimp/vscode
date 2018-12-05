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
const Workspace = require('./workspace');
const LogStream = require('./logstream');
const Devices = require('./devices');

function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('imp.auth.creds', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            Auth.loginCredsDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.new', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            Workspace.newProjectDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.deploy', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            Workspace.deploy();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.add', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            const logstream = new LogStream();
            logstream.addDeviceDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.remove', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            vscode.window.showErrorMessage('The command is not implemented');
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.pause', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            vscode.window.showErrorMessage('The command is not implemented');
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.clean', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            vscode.window.showErrorMessage('The command is not implemented');
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.device.add', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            Devices.addDeviceToDGDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.device.remove', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            Devices.removeDeviceFromDGDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.device.agenturl', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            Devices.getAgentURLDialog();
        }
    }));
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
