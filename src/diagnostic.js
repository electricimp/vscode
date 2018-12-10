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
        const regex = /\(([^)]+)\)/;
        const result = msg.match(regex);
        if (result == null) {
            return null;
        }

        return {
            msg: result.input.split('(')[0],
            file: result[1].split(':')[0],
            line: result[1].split(':')[1],
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

    addDeployError(document, error) {
        this.diagnosticCollection.set(document, error);
    }

    addLogStreamError(document, error) {
        this.diagnosticCollection.set(document, error);
    }
}
module.exports = Diagnostic;
