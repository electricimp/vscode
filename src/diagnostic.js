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
const util = require('util');
const vscode = require('vscode');
const Workspace = require('./workspace');

class Diagnostic {
    constructor() {
        this.pre = undefined;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('imp');
    }

    clearDiagnostic() {
        this.diagnosticCollection.clear();
    }

    setPreprocessors(agentPre, devicePre) {
        this.clearDiagnostic();
        this.pre = {
            agent: agentPre,
            device: devicePre,
        };
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

    getSource(source) {
        try {
            if (source === 'agent_code') {
                return {
                    file: Workspace.Data.getSourcesPathsSync().agent_path,
                    pre: this.pre.agent,
                };
            } else if (source === 'device_code') {
                return {
                    file: Workspace.Data.getSourcesPathsSync().device_path,
                    pre: this.pre.device,
                };
            }
        } catch (err) {
            console.log("======== !catch! => getSource()" + err);
            console.log(util.inspect(source, { showHidden: false, depth: null }));
            return undefined;
        }

        return undefined;
    }

    addBuilderError(includeDir, builderError) {
        const parsedError = Diagnostic.parseBuilderError(builderError);
        if (parsedError == null) {
            return;
        }

        /*
         * There are some cases of Builder errors, when it is not possible
         * to restore full path to file with error.
         * It could be nested @include with relative path. In this case Builder returns
         * only filename without path prefix. So it is not possible to find a full file path
         * and report problem correctly.
         * Just return in this case.
         */
        const srcPath = path.join(includeDir, parsedError.file);
        if (!fs.existsSync(srcPath)) {
            return;
        }

        const uri = vscode.Uri.file(path.join(includeDir, parsedError.file));
        const pos = new vscode.Position(parsedError.line - 1, 0);
        if (fs.existsSync(uri.fsPath) && !this.diagnosticCollection.has(uri)) {
            this.diagnosticCollection.set(uri, [{
                code: '',
                message: parsedError.msg,
                range: new vscode.Range(pos, pos),
                severity: vscode.DiagnosticSeverity.Error,
                source: 'Builder',
                relatedInformation: [],
            }]);
            // vscode.window.showTextDocument(uri);
            vscode.commands.executeCommand('workbench.action.problems.focus');
        }
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
                const data = this.getSource(meta.file);
                if (data === undefined) {
                    return;
                }

                const errData = data.pre.getErrorLocation(parseInt(meta.row, 10) - 1);
                if (errData === undefined) {
                    return;
                }

                let uri;
                const relativeFilePath = path.join(path.dirname(data.file), errData[0]);
                const absoluteFilePath = errData[0];
                if (fs.existsSync(relativeFilePath)) {
                    uri = vscode.Uri.file(relativeFilePath);
                } else if (fs.existsSync(absoluteFilePath)) {
                    uri = vscode.Uri.file(absoluteFilePath);
                }

                const pos = new vscode.Position(errData[1] - 1, meta.column - 1);
                if (uri && fs.existsSync(uri.fsPath) && !this.diagnosticCollection.has(uri)) {
                    this.diagnosticCollection.set(uri, [{
                        code: '',
                        message: `${meta.text} in ${errData[0]}`,
                        range: new vscode.Range(pos, pos),
                        severity: vscode.DiagnosticSeverity.Error,
                        source: 'Deploy',
                        relatedInformation: [],
                    }]);
                    // vscode.window.showTextDocument(uri);
                    vscode.commands.executeCommand('workbench.action.problems.focus');
                }
            });
        });
    }

    addLogStreamError(logStreamError) {
        if (logStreamError.file === undefined) {
            return;
        }

        let pos;
        let uri;
        if (this.pre) {
            const src = this.getSource(logStreamError.source);
            if (src === undefined) {
                return;
            }

            const errData = src.pre.getErrorLocation(logStreamError.line - 1);
            if (errData === undefined) {
                return;
            }

            /*
             * The location could be a path relative to Builder include dir or absolute path.
             * Check the both cases below.
             */
            const relativeFilePath = path.join(path.dirname(src.file), errData[0]);
            const absoluteFilePath = errData[0];
            if (fs.existsSync(relativeFilePath)) {
                uri = vscode.Uri.file(relativeFilePath);
            } else if (fs.existsSync(absoluteFilePath)) {
                uri = vscode.Uri.file(absoluteFilePath);
            }

            pos = new vscode.Position(errData[1] - 1, 0);
        } else {
            /*
             * TODO: Here, we have a hack in case if preprocessor was not defined previosly.
             * Handle this situation more correctly.
             * The second -1 below mean that we shold compensate "#line 1"
             * preprocessor derictive on the top of source file.
             */
            const sourceFile = path.join(Workspace.Path.getPWD(), logStreamError.file);
            uri = vscode.Uri.file(sourceFile);
            pos = new vscode.Position(logStreamError.line - 1 - 1, 0);
        }

        if (uri && fs.existsSync(uri.fsPath) && !this.diagnosticCollection.has(uri)) {
            this.diagnosticCollection.set(uri, [{
                code: '',
                message: 'Error',
                range: new vscode.Range(pos, pos),
                severity: vscode.DiagnosticSeverity.Error,
                source: 'Run-time',
                relatedInformation: [],
            }]);
            // vscode.window.showTextDocument(uri);
            vscode.commands.executeCommand('workbench.action.problems.focus');
        }
    }
}
module.exports = Diagnostic;
