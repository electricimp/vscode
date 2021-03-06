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
const Auth = require('./auth');
const Workspace = require('./workspace');
const LogStream = require('./logstream');
const Devices = require('./devices');
const Diagnostic = require('./diagnostic');
const Dialog = require('./dialog');

const diagnostic = new Diagnostic();
const logstream = new LogStream(diagnostic);

function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('imp.auth.creds', () => {
        Auth.loginDialog();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.new', () => {
        if (Workspace.isWorkspaceFolderOpened()) {
            Dialog.newProjectDialog();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.workspace.project.deploy', () => {
        Workspace.deploy(logstream, diagnostic);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.add', () => {
        logstream.addDeviceDialog();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.remove', () => {
        logstream.removeDeviceDialog();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.pause', () => {
        logstream.pauseLogOutput();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.logstream.clean', () => {
        logstream.clearLogOutput();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.device.add', () => {
        Devices.addDeviceToDGDialog();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.device.remove', () => {
        Devices.removeDeviceFromDGDialog();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.device.agenturl', () => {
        Devices.getAgentURLDialog();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('imp.show.commands', () => {
        const extensionId = 'electricimp.vscode-electricimp';
        const pkgJSON = vscode.extensions.getExtension(extensionId).packageJSON;
        if (!pkgJSON.contributes || !pkgJSON.contributes.commands) {
            return;
        }

        const extCmds = vscode.extensions.getExtension(extensionId)
            .packageJSON.contributes.commands.filter(x => x.command !== 'imp.show.commands');
        vscode.window.showQuickPick(extCmds.map(x => x.title)).then((cmd) => {
            const selectedCmd = extCmds.find(x => x.title === cmd);
            if (selectedCmd) {
                vscode.commands.executeCommand(selectedCmd.command);
            }
        });
    }));

    const playPauseItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    const monitorItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);
    playPauseItem.command = 'imp.logstream.pause';
    context.subscriptions.push(playPauseItem);
    context.subscriptions.push(monitorItem);
    logstream.setPauseLogsItem(playPauseItem);
    logstream.setMonitoringItem(monitorItem);

    /*
     * Subscribe to unhandled rejections for debug purposes.
     */
    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    });
}
exports.activate = activate;

// This method is called when your extension is deactivated.
function deactivate() {
    Api.logStreamClose(logstream.impCentralApi, logstream.logStreamID)
        .then(() => {
            if (logstream.outputChannel) {
                logstream.outputChannel.dispose();
            }
        });
}
exports.deactivate = deactivate;
