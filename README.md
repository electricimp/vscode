# Electric Imp impCentral Microsoft Visual Studio Code extension (Early Beta)

Microsoft Visual Studio Code extension for Electric Imp applications development.

## Overview

The Plug-in is designed to improve developer productivity. It allows you to rapidly build and maintain applications by providing:

* Advanced Squirrel code highlighting
* Code auto-completion for [Electric Imp’s imp API](https://developer.electricimp.com/api)
* Source code deployment and debug.
* Ability to work with imp infrastructure.

The Plug-in requires connection to the Internet as it leverages the
[Electric Imp impCentral™ API](https://developer.electricimp.com/tools/impcentralapi)
to work with the [Electric Imp impCloud™](https://electricimp.com/platform/cloud/).

## Installation

The installation process, starting from nodejs installation will be described here. 

## Extension Settings

This extension contributes the following commands:

* `imp: Auth User Password`: Create authrization file with access token in the selected workspace directory.
* `imp: New Project, exist DG`: Create configuration file and source code files in the selected workspace directory using exist device group ID.
* `imp: New Project, new DG`: Create configuration file and source code files in the selected workspace directory using freshly created device group.
* `imp: New Project, new Product`: Create configuration file and source code files in the selected workspace directory using freshly created product and device group.
* `imp: Deploy Project`: Deploy the source code on the selected device group and reset the devices.
* `imp: Add Device Logs`: Add selected device logs to the console output.
* `imp: Remove Device Logs`: Remove selected device logs from the console output.
* `imp: Pause Logs`: Pause the logs in the console output.
* `imp: Clear Logs`: Clear the logs in the console output.
* `imp: Add Device to current DG`: Add device to workspace device group.
* `imp: Remove Device from current DG`: Remove device from the workspace device group.
* `imp: Get agent URL`: Get agent URL.

## Current limitations

This is a very early version of extension, so the functionality is heavily restricted. The only available checked scenario is described below:
- Download the extension from github.
- Run the `npm install .` in the extension directory.
- Run `code .` in the extension directory.
- Start the extension debug procedure. Ctrl + Shift + D. The select "Start Debugging". The another vscode window will be opened with [Extension Development] string in the window header.
- Choose the squirrel project working directory using File -> Open Folder.
- Use the Alt + Ctrl + P and run the `imp: Auth User Password` extension command.
The successful login procedure will be ended with pop-up notification in the right corner of the extension development window.
- Run the `imp: New Project` command. Enter exist device group id, where the source code planned to be deployed. The files agent.nut, device.nut and imp.config should appear in the working directory.
- Make some changes in the device.nut and agent.nut and run `imp: Deploy Project`. The pop-up window with information message will be displayed in case of success.
It is expected, that source code will be deployed on the selected device group and all devices will receive reset signal.

## TODO (Current scope view)
### Development scope:
* Whole node codebase quality improvements (continuous).
* Refresh access token functionality.
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
