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


const path = require('path');
const vscode = require('vscode');
const Workspace = require('./workspace');

class Diagnostic {
    constructor() {
        if (!this.diagnosticCollection) {
            this.diagnosticCollection = vscode.languages.createDiagnosticCollection('imp');
        }
    }

    clearDiagnostic() {
        this.diagnosticCollection.clear();
    }

    static parseBuilderError(msg) {
        const regex = /(\S.*)\((.*):(\d+)\)/;
        const result = msg.match(regex);
        if (result == null) {
            return null;
        }

        return {
            msg: result[1],
            file: result[2],
            line: result[3],
        };
    }

    addBuilderError(builderError) {
        const parsedError = Diagnostic.parseBuilderError(builderError);
        if (parsedError == null) {
            return;
        }

        const sourceFile = path.join(Workspace.getCurrentFolderPath(), parsedError.file);
        const uri = vscode.Uri.file(sourceFile);
        const pos = new vscode.Position(parsedError.line - 1, 0);
        this.diagnosticCollection.set(uri, [{
            code: '',
            message: parsedError.msg,
            range: new vscode.Range(pos, pos),
            severity: vscode.DiagnosticSeverity.Error,
            source: 'Builder',
            relatedInformation: [],
        }]);
        vscode.window.showTextDocument(uri);
    }

    static getSourceFile(source) {
        if (source === 'device_code') {
            return Workspace.Consts.agentSourceFileName;
        } else if (source === 'agent_code') {
            return Workspace.Consts.deviceSourceFileName;
        }

        return undefined;
    }

    addDeployError(deployError) {
        if (deployError.body.errors === undefined) {
            return;
        }

        deployError.body.errors.forEach((err) => {
            if (err.meta === undefined) {
                return;
            }

            err.meta.forEach((meta) => {
                const file = Diagnostic.getSourceFile(meta.file);
                if (file === undefined) {
                    return;
                }

                const sourceFile = path.join(Workspace.getCurrentFolderPath(), file);
                const uri = vscode.Uri.file(sourceFile);
                const pos = new vscode.Position(meta.row - 1, meta.column - 1);
                this.diagnosticCollection.set(uri, [{
                    code: '',
                    message: meta.text,
                    range: new vscode.Range(pos, pos),
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'Deploy',
                    relatedInformation: [],
                }]);
            });
        });
    }

    addLogStreamError(document, error) {
        this.diagnosticCollection.set(document, error);
    }
}
module.exports = Diagnostic;
