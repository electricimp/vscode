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


const Builder = require('Builder');

class Preprocessor {
    constructor() {
        this.lineTable = {};
    }

    buildLineTable(fileName, processedData) {
        const regex = /.*\/\/line (\d+) "(.+)"/;
        let origFile = fileName;
        let currLine = 0;
        let origLine = 0;
        /*
         * Here and below the loop logic is copied from imp sublime plugin.
         */
        this.lineTable[currLine] = [origFile, origLine];
        processedData.split('\n').forEach((line) => {
            this.lineTable[currLine] = [origFile, origLine];
            const result = line.match(regex);
            if (result) {
                origLine = parseInt(result[1], 10) - 1;
                origFile = result[2];
            }

            origLine += 1;
            currLine += 1;
        });
        this.lineTable[currLine] = [origFile, origLine];
    }

    // Preprocess source code data.
    //
    // Parameters:
    //     inputData    : Source code to preprocess
    //
    // Returns:
    //     none
    //
    preprocess(inputFileName, inputData, includeDir, githubCreds, variables, builderLibs) {
        const builder = new Builder({ libs: builderLibs });
        builder.machine.file = inputFileName;
        builder.machine.path = includeDir;
        builder.machine.generateLineControlStatements = true;

        // Remove default Builder include path and add own.
        builder.machine.readers.file.searchDirs.length = 0;
        builder.machine.readers.file.searchDirs.push(includeDir);

        if (githubCreds) {
            builder.machine.readers.github.username = githubCreds.username;
            builder.machine.readers.github.token = githubCreds.token;
        }

        let outputData = builder.machine.execute(inputData, variables);
        outputData = outputData.replace(/#line/g, '//line');
        this.buildLineTable(inputFileName, outputData);

        return outputData;
    }

    // Get original errors locations based on previously preprocessed data.
    //
    // Parameters:
    //     inputData    : Source code to preprocess
    //
    // Returns:
    //     none
    //
    getErrorLocation(line) {
        if (Object.keys(this.lineTable).length === 0) {
            return undefined;
        }

        return this.lineTable[line];
    }
}
module.exports = Preprocessor;
