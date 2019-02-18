# Electric Imp impCentral Microsoft Visual Studio Code Extension (Alpha) #

This is a [Visual Studio Code](https://code.visualstudio.com/) extension which supports [Electric Imp](https://electricimp.com) application development.

## Contents ##

- [Overview](#overview)
- [Installation](#installation)
    1. [Install Node.js](#1-install-nodejs)
    2. [Install The Builder Node.js Module](#2-install-the-builder-nodejs-module)
    3. [Install Visual Studio Code](#3-install-visual-studio-code)
    4. [Install The Visual Studio Code Extension](#4-install-the-visual-studio-code-extension)
- [Extension Commands List](#extension-commands-list)
- [Visual Studio Code Extension Usage](#visual-studio-code-extension-usage)
    - [Create A New Project](#create-a-new-project)
    - [Open An Existing Project](#open-an-existing-project)
    - [Build And Run Code](#build-and-run-code)
    - [The Log Console](#the-log-console)
    - [Assign A Device To The Project Device Group](#assign-a-device-to-the-project-device-group)
    - [Unassign A Device From The Project Device Group](#unassign-a-device-from-the-project-device-group)
    - [Retrieve A Device’s Agent URL](#retrieve-a-devices-agent-url)
    - [Extension Keyboard Shortcuts](#extension-keyboard-shortcuts)
- [Preprocessor And Multiple File Support](#preprocessor-and-multiple-file-support)
    - [Specifying GitHub Authentication Information](#specifying-github-authentication-information)
    - [Specifying Builder Preset Variable Definitions](#specifying-builder-preset-variable-definitions)


## Overview ##

The plug-in is designed to improve developers’ productivity. It allows you to rapidly build and maintain applications by providing:

* Code auto-completion for [Electric Imp’s imp API](https://developer.electricimp.com/api).
* The ability to use a source control system to manage application code and configuration.
* Advanced Squirrel code highlighting.
* Integration with [impWorks™ Builder](https://github.com/electricimp/Builder) to enable multi-file
projects and code pre-processing.
* Live logs with clickable stack traces for errors, and navigation to the file and line in question.
* Key shortcuts for frequently performed operations (build and run, show console, etc).
* Leverages Visual Studio Code’s rich set of features.

The plug-in requires connection to the Internet as it leverages the [Electric Imp impCentral™ API](https://developer.electricimp.com/tools/impcentralapi).

## Installation ##

### 1. Install Node.js ###

The Extension requires Node.js 11.0 or above. Please follow [these instructions](https://nodejs.org/en/download/package-manager/) to install Node on your machine.

### 2. Install The Builder Node.js Module ###

The Extension uses the [Builder](https://github.com/electricimp/Builder) Node.js module for source code pre-processing. To install Builder, please use Node Package Manager (NPM):

```bash
npm i -g Builder
```

### 3. Install Visual Studio Code ###

Visual Studio Code can be [downloaded for a variety of platforms here](https://code.visualstudio.com/download).

### 4. Install The Visual Studio Code Extension ###

The Electric Imp Visual Studio Code Extension can be installed using a number of methods. Once the Extension has been published to the Visual Studio Marketplace, this will be the recommended way to install the Extension, but you may alternatively perform the install using a `.vsix` file or by building the Extension from the source code.

#### Installation From The Visual Studio Marketplace ####

The Marketplace can be accessed through Visual Studio Code. We will add further instructions here when the Extension becomes available in the Marketplace.

#### Installation From A .VSIX File ####

1. Download the `.vsix` file from [Electric Imp’s GitHub repository](https://github.com/electricimp/vscode).
2. Enter the following at the command line: `code --install-extension vscode-electricimp-0.x.x.vsix`

#### Installation From Source ####

Follow these steps to install the Extension manually:

1. At the command line, `cd` to the Visual Studio Code extension folder:
    - **macOS** *~/.vscode/extensions*
    - **Windows** *%USERPROFILE%\\.vscode\extensions*
2. Clone the [full GitHub source repository](https://github.com/electricimp/vscode.git).
3. Checkout the `develop` branch using `git`.
4. Run `npm install .`
5. Restart Visual Studio Code.

## Extension Commands List ##

The Extension provides the following commands:

* `imp: Auth User Password` &mdash; Create an authorization file with a new access token in the selected workspace directory.
* `imp: New Project` &mdash; Create a new configuration file and empty source code files in the selected workspace directory.
* `imp: Deploy Project` &mdash; Deploy the source code to the selected Device Group and restart the group’s devices.
* `imp: Start Device Logs` &mdash; Begin including a device’s logs to the console output.
* `imp: Stop Device Logs` &mdash; Stop showing a device’s logs in the console output.
* `imp: Pause Logs` &mdash; Pause the logs in the console output.
* `imp: Clear Logs` &mdash; Clear the logs in the console output.
* `imp: Add Device to current DG` &mdash; Add a device to the workspace Device Group.
* `imp: Remove Device from current DG` &mdash; Remove a device from the workspace Device Group.
* `imp: Get agent URL` &mdash; Display a device’s agent URL.
* `imp: Show All Commands...` &mdash; Show the list of Extension commands.

## Visual Studio Code Extension Usage ##

### Create A New Project ###

Select a new project working folder using **File > Open Folder...**, if you have not done so. Select the **View > Command Palette... > imp: New Project** menu item.

The project folder will be set up with the following files and structure:

```
-- <Project Working Folder>
  |--> settings                           - Electric Imp settings folder
  .   |--> auth.info                      - SENSITIVE impCentral API tokens and 
  .   |                                     GitHub authentication information
  .   |--> imp.config                     - Generic Electric Imp settings
  |--> src                                - Source folder
  .   |--> device.nut                     - Device code
  .   |--> agent.nut                      - Agent code
  |--> .gitignore                         - .gitignore file to exclude auth.info file 
                                            from git repository
```

**IMPORTANT** `settings/auth.info` should not be put under source control as it contains sensitive account information.

The `imp.config` file contains:

- A unique Device Group identifier.
- Device and agent code file names.

#### Example ####

```json
{ "deviceGroupId" : "<device group id>",
  "device_code"   : "<path to device source file, src/device.nut by default>",
  "agent_code"    : "<path to agent source file, src/agent.nut by default>" }
```

When a project is created, empty device and agent code files (`device.nut` and `agent.nut`) are automatically created and stored in the project working directory’s `src` sub-directory.

If the project was created successfully, the `imp.config` file is opened.

**Note** If the project working directory is not open in Visual Studio Code, no Extension commands will work.

**IMPORTANT** The code which is deployed to a Device Group is preprocessed and therefore contains line control markers. When you select an existing Device Group, the Extension downloads the code currently deployed to the group, but doesn’t transfer this code to the project file/folder structure. If you are working with collaborators on a project, please share the original Electric Imp Extension project sources/structure via a source control system.

### Open An Existing Project ###

To open an existing project, use **File > Open Folder...** to open the project working directory.

### Build And Run Code ###

To build code and deploy it, select the **View > Command Palette... > imp: Deploy Project** menu item.

This action uploads the agent and the device code to the impCloud™ server, and restarts all of the devices assigned to the target Device Group. 

If you want to run your code on specific devices and view the logs from those devices, you need to select them using the **View > Command Palette... > imp: Add Device to current DG** menu item. The **imp: Remove Device from current DG** menu item removes a device from the project’s Device Group.

**Note** It isn’t necessary to assign a device to the Device Group to build and deploy your code to the group. If you don’t have any devices assigned to the Device Group, you can still work on the code and see any compilation errors reported by the server.

### The Log Console ###

Live logs are streamed to the console, displayed by selecting the **View > Output** menu item. It is possible to add a specific device to the live logs by its ID using the **View > Command Palette... > imp: Start Device Logs** command. The console shows live logs streamed from the current Device Group if the group contains at least one device.

### Assign A Device To The Project Device Group ###

To assign devices to the project’s Device Group, select **View > Command Palette... > imp: Add Device to current DG**.

### Unassign A Device From The Project Device Group ###

Devices can be removed from the project’s Device Group by selecting **View > Command Palette... > imp: Remove Device from current DG**.

### Retrieve A Device’s Agent URL ###

The URL of a device’s agent can be retrieved by selecting **View > Command Palette... > imp: Get agent URL**. The URL is displayed in a dialog box.

### Extension Keyboard Shortcuts ###

**Note** Electric Imp-specific menu items are only available if an Electric Imp project is open in the currently active window.

| Command | Keypress |
| ------- | -------- |
| Show all imp Commands | Ctrl + Shift + C |
| Create Project | Ctrl + Shift + Y |
| Build and Run | Ctrl + Shift + X |

## Preprocessor And Multiple File Support ##

Please refer to the [Builder documentation](https://developer.electricimp.com/tools/builder) for more information on the preprocessor syntax that you can use in your Squirrel code.

### Specifying GitHub Authentication Information ###

Please use the project `<Project Working Folder>/settings/auth.info` file to specify your Builder GitHub authentication information:

```json
{ ...,
  "builderSettings": { "github_user"  : "GitHub user name",
                        "github_token": "Personal access token or password" }}
```

### Specifying Builder Preset Variable Definitions ###

Please use the project `<Project Working Folder>/settings/imp.config` file to specify Builder variable definitions:

```json
{ "builderSettings": { ...,
                        "variable_definitions": { "key1": "value1",
                                                  "key2": "value2" },
                        ... }}
```

## License ##

The Electric Imp Visual Studio Code Extension is made available under the [MIT License](./LICENSE).