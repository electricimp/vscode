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
        this.pre = undefined;
        if (!this.diagnosticCollection) {
            this.diagnosticCollection = vscode.languages.createDiagnosticCollection('imp');
        }
    }

    clearDiagnostic() {
        this.diagnosticCollection.clear();
    }

    static parseBuilderError(agentPre, devicePre, msg) {
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

        const sourceFile = path.join(Workspace.Path.getPWD(), parsedError.file);
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

    /*
     * Merge functions below to single function.
     */
    static getSourceFile(source) {
        if (source === 'agent_code') {
            return 'agent.nut';
        } else if (source === 'device_code') {
            return 'device.nut';
        }

        return undefined;
    }

    static getSourceFileWithPre(agentPre, devicePre, source) {
        if (source === 'agent_code') {
            return {
                file: 'agent.nut',
                pre: agentPre,
            };
        } else if (source === 'device_code') {
            return {
                file: 'device.nut',
                pre: devicePre,
            };
        }

        return undefined;
    }

    setPreprocessors(agentPre, devicePre) {
        this.pre = {
            agent: agentPre,
            device: devicePre,
        };
    }

    addDeployError(deployError) {
        if (deployError.body === undefined) {
            return;
        }

        deployError.body.errors.forEach((err) => {
            if (err.meta === undefined) {
                return;
            }

            err.meta.forEach((meta) => {
                const data =
                    Diagnostic.getSourceFileWithPre(this.pre.agent, this.pre.device, meta.file);
                if (data === undefined) {
                    return;
                }

                const sourceFile = path.join(Workspace.Path.getPWD(), data.file);
                const uri = vscode.Uri.file(sourceFile);
                const rowData = data.pre.getErrorLocation(parseInt(meta.row, 10) - 1);
                if (data === undefined) {
                    return;
                }

                const pos = new vscode.Position(rowData[1] - 1, meta.column - 1);
                this.diagnosticCollection.set(uri, [{
                    code: '',
                    message: `${meta.text} in ${rowData[0]}`,
                    range: new vscode.Range(pos, pos),
                    severity: vscode.DiagnosticSeverity.Error,
                    source: 'Deploy',
                    relatedInformation: [],
                }]);
            });
        });
    }

    addLogStreamError(logStreamError) {
        if (logStreamError.file === undefined) {
            return;
        }

        let pos;
        const sourceFile = path.join(Workspace.Path.getPWD(), logStreamError.file);
        const uri = vscode.Uri.file(sourceFile);
        if (this.pre) {
            let pre;
            if (logStreamError.source === 'agent_code') {
                pre = this.pre.agent;
            } else if (logStreamError.source === 'device_code') {
                pre = this.pre.device;
            }

            pos = new vscode.Position(pre.getErrorLocation(logStreamError.line - 1)[1] - 1, 0);
        } else {
            /*
             * TODO: Here, we have a hack in case if preprocessor was not defined previosly.
             * Handle this situation more correctly.
             * The second -1 below mean that we shold compensate "#line 1"
             * preprocessor derictive in on the top of source file.
             */
            pos = new vscode.Position(logStreamError.line - 1 - 1, 0);
        }
        this.diagnosticCollection.set(uri, [{
            code: '',
            message: 'Error',
            range: new vscode.Range(pos, pos),
            severity: vscode.DiagnosticSeverity.Error,
            source: 'Run-time',
            relatedInformation: [],
        }]);
    }
}
module.exports = Diagnostic;
