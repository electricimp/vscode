# Electric Imp impCentral Microsoft Visual Studio Code extension (Early Beta)

Microsoft Visual Studio Code extension for Electric Imp applications development.

## Overview

The Plug-in is designed to improve developer productivity. It allows you to rapidly build and maintain applications by
providing:

* Code auto-completion for [Electric Imp’s imp API](https://developer.electricimp.com/api)
* Advanced Squirrel code highlighting
* TODO: Complete list of features.

The Plug-in requires connection to the Internet as it leverages the
[Electric Imp impCentral™ API](https://developer.electricimp.com/tools/impcentralapi)
to work with the [Electric Imp impCloud™](https://electricimp.com/platform/cloud/).

## Installation

The installation process, starting from nodejs installation will be described here. 

## Extension Settings

This extension contributes the following commands:

* `imp.command1`: TODO:
* `imp.command2`: Describe available commands here.

## Current limitations

This is a very early version of extension, so the functionality is heavily restricted. The only available checked scenario is described below:
- Run % code . in the extension directory.
- Run extension debug mode, the another vscode window will be opened with [Extension Development] string in the window header.
- Choose the working directory. File -> Open Folder... in the [Extension Development] window.
- Run the 'imp: Auth User Password' extension command using Alt + Ctrl + P.
The successful login procedure will be ended with pop-up notification in the right corner of the extension development window.
- Run the 'imp: Create Project' command. Enter exist device group id, where the source code planned to be deployed. The files agent.nut, device.nut and imp.config should be appear in the working directory.
- Make some changes in the device.nut and agent.nut and run 'imp: Deploy Project'.
It is expected, that source code will be deployed on the device group and all devices will receive reset signal. It is possible to check the new deployment using impt tool or Web-based IDE.

## TODO (Current scope view)
### Development scope:
* Whole node codebase quality improvements (continuous).
* Auto-login functionality, store auth information somewhere (see impt) to avoid manual creds entering from user, when vscode workspace will be opened.
* Manage with devices logStreams streaming to vsode ouput console. Implement user interaction functionality to allow adding and removing device logs from/to output console.
* Products, device groups and devices manipulation (should be split).
* Errors detection in the device logs.
* Errors highlighting.
* Errors links between logs and source code.
* Investigate reasons to move the existing code base to TypeScript (some time later).

### Testing and doc scope:
* Fill this README file correctly.
* Test and document some use-cases for source code development and deployment.
* Test current syntax highlighting implementation.
* Investigate vscode extensions testing capabilities (some unit-test frameworks could be used).
