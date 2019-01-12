# Electric Imp impCentral Microsoft Visual Studio Code extension (Early Beta)

[Visual Studio Code](https://code.visualstudio.com/) extension for [Electric Imp](https://electricimp.com) applications development.

- [Overview](#overview)
- [Installation](#installation)
    - [Install Node.js](#1-install-nodejs)
    - [Install the Builder Node.js Module](#2-install-the-builder-nodejs-module)
    - [Install Visual Studio Code](#3-install-visual-studio-code)
    - [Install the Visual Studio Code Extension](#4-install-the-visual-studio-code-extension)
- [Extension Commands List](#extension-commands-list)
- [Visual Studio Code Extension Usage](#visual-studio-code-extension-usage)
    - [Creating a New Project](#creating-a-new-project)
    - [Opening an Existing Project](#opening-an-existing-project)
    - [Building and Running](#building-and-running)
    - [The Log Console](#the-log-console)
    - [Adding a Device to the Project Device Group](#adding-a-device-to-the-project-device-group)
    - [Removing a Device from the Project Device Group](#removing-a-device-from-the-project-device-group)
    - [Retrieving a Device’s Agent URL](#retrieving-a-devices-agent-url)
    - [Keyboard Shortcuts](#keyboard-shortcuts)
- [Preprocessor and Multi-File Support](#preprocessor-and-multi-file-support)
    - [Specifying GitHub Authentication Information](#specifying-github-authentication-information)
    - [Specifying Builder Preset Variable Definitions](#specifying-builder-preset-variable-definitions)


## Overview ##

The Plug-in is designed to improve developer productivity. It allows you to rapidly build and maintain applications by
providing:

* Code auto-completion for [Electric Imp’s imp API](https://developer.electricimp.com/api)
* The ability to use a source control system to manage application code and configuration
* Advanced Squirrel code highlighting
* Integration with [impWorks™ Builder](https://github.com/electricimp/Builder) to enable multi-file
projects and code pre-processing
* Live logs with clickable stack traces for errors, including navigation to the file and line in question
* Key shortcuts for frequent operations (build and run, show console, etc.)
* Leverages Visual Studio Code’s rich set of features.

The Plug-in requires connection to the Internet as it leverages the
[Electric Imp impCentral™ API](https://developer.electricimp.com/tools/impcentralapi)
to work with the [Electric Imp impCloud™](https://electricimp.com/platform/cloud/).

## Installation ##

### 1. Install Node.js ###

**Note** The plug-in requires Node.js 4.0 or above.

Please follow [these instructions](https://nodejs.org/en/download/package-manager/) to install Node on your machine.

### 2. Install the Builder Node.js Module ###

The plug-in uses the [Builder](https://github.com/electricimp/Builder) Node.js module for source code pre-processing.
To install Builder, please use Node Package Manager (NPM):

```bash
npm i -g Builder
```

### 3. Install Visual Studio Code ###

Visual Studio Code can be downloaded for a variety of platforms, [here](https://code.visualstudio.com/download).

### 4. Install the Visual Studio Code Extension ###

#### Manual Installation ####

Alternatively, follow these steps to install the plug-in manually:

1. Use the Visual Studio Code extension folder:
    - **macOS** *~/.vscode/extensions*
    - **Windows** *%USERPROFILE%\\.vscode\extensions*

2. Follow next steps:
    
    - cd into Visual Studio Code extension folder.
    - Clone the full GitHub source [repository](https://github.com/nobitlost/vscode.git).
    - Checkout the `develop` branch in the git.
    - npm install .
    - restart the Visual Studio Code

## Extension Commands List ##

This extension contributes the following commands:

* `imp: Auth User Password`: Create authrization file with access token in the selected workspace directory.
* `imp: New Project`: Create configuration file and source code files in the selected workspace directory.
* `imp: Deploy Project`: Deploy the source code on the selected device group and reset the devices.
* `imp: Add Device Logs`: Add selected device logs to the console output.
* `imp: Remove Device Logs`: Remove selected device logs from the console output.
* `imp: Pause Logs`: Pause the logs in the console output.
* `imp: Clear Logs`: Clear the logs in the console output.
* `imp: Add Device to current DG`: Add device to workspace device group.
* `imp: Remove Device from current DG`: Remove device from the workspace device group.
* `imp: Get agent URL`: Get agent URL.
* `imp: Show All Commands...`: Show the list of extension commands.

## Visual Studio Code Extension Usage ##

### Creating a New Project ###

Select new project working folder using the ’File’ > ’Open Folder...’, if it was not done previously. Your next step should be the creation of a new project. Do this by selecting the ‘View’ > ‘Command Palette...’ > ‘`imp: New Project`‘ menu item.

The project folder will be set up with the following:

```
-- <Project Working Folder>
  |--> settings                           - Electric Imp settings folder
  .   |--> auth.info                      - SENSITIVE: impCentral API tokens and 
  .   |                                     GitHub authentication information
  .   |--> imp.config                     - Generic Electric Imp settings
  |--> src                                - Source folder
  .   |--> device.nut                     - Device code
  .   |--> agent.nut                      - Agent code
  |--> .gitignore                         - .gitignore file to exclude auth.info file 
                                            from git repository
```

**Important** `settings/auth.info` **should not be put under source control as it contains sensitive information**

The `imp.config` file contains:

- A unique Device Group identifier.
- Device and agent code file names.

#### Example ####

```
{
  "deviceGroupId" : "<device group id>",
  "device_code"   : "<path to device source file, src/device.nut by default>",
  "agent_code"    : "<path to agent source file, src/agent.nut by default>",
}
```

When a project is created, empty device and agent code files (`device.nut` and `agent.nut`) are automatically created
and stored in the `<Project Working Folder>/src` folder.

If a project is created successfully, a `imp.config` file is opened.

**Note** If the Project Working Folder is not opened in the Visual Studio Code, all extension commands will not work.

**Important** The code which is deployed to the Device Group is preprocessed and contains line control markers. When you select an existing Device Group, the plug-in pulls down the code, but it doesn’t transfer the project file/folder structure. So for collaborative work on the same project, please share the original Electric Imp plug-in project sources/structure via a source control system.

### Opening an Existing Project ###

To open an existing Electric Imp project, just use the ‘File’ > ‘Open Folder...’ to open `<Project Working Folder>`.

### Building and Running ###

To build and deploy code, please select the ‘View’ > ‘Command Palette...’ > ‘`imp: Deploy Project`‘
menu item. This action uploads the agent and the device code to the server, and restarts all of the devices assigned to the target Device Group. If you want to have you code running on a specific devices and view the logs from that devices, you need to select them using the ‘View’ > ‘Command Palette...’ > ‘`imp: Add Device to current DG`’ menu item. The ‘`imp: Remove Device from current DG`’ menu item removes a device from the project’s Device Group.

**Note** To build and deploy your code it isn’t necessary to assign a device to the Device Group. If you don’t have a device assigned, you can still work on the code and see compilation errors reported by the server.

### The Log Console ###

The live logs are streamed to ‘View‘ > ‘Output‘. It is possible to add the specified device live logs by it's ID using `imp: Add Device Logs` extension command. The Output shows live logs streamed from the current Device Group if the group contains at least one device.

### Adding a Device to the Project Device Group ###

To assign devices to the project’s Device Group, use the ‘View’ > ‘Command Palette...’ > ‘`imp: Add Device to current DG`’ command.

### Removing a Device from the Project Device Group ###

Devices can be removed from the project’s Device Group by selecting the ‘View’ > ‘Command Palette...’ > ‘`imp: Remove Device from current DG`’.

### Retrieving a Device’s Agent URL ###

The URL of a device’s agent can be retrieved by selecting the ‘View’ > ‘Command Palette...’ > ‘`imp: Get agent URL`’ menu item. The URL is displayed in the pop-up Information Message.

### Keyboard Shortcuts ###

**Note** Electric Imp-specific menu items are only available if an Electric Imp project is opened in the currently active window.

| Command | Keypress |
| ------- | -------- |
| Show all imp commands | Ctrl + Shift + C |
| Create Project | Ctrl + Shift + Y |
| Build and Run | Ctrl + Shift + X |

## Preprocessor and Multi-File Support ##

Please refer to the [Builder documentation](https://developer.electricimp.com/tools/builder) for more information on the preprocessor syntax that you can use in your Squirrel code.

### Specifying GitHub Authentication Information ###

Please use the project `<Project Working Folder>/settings/auth.info` file to specify your Builder GitHub authentication information:

```
{ ...
  "builderSettings": { "github_user": "GitHub user name",
                        "github_token": "Personal access token or password" }
}
```

### Specifying Builder Preset Variable Definitions ###

Please use the project `<Project Working Folder>/settings/imp.config` file to specify the Builder variables definitions:

```
{ "builderSettings": { ...,
                        "variable_definitions": { "key1": "value1",
                                                  "key2": "value2" },
                        ... }
}
```

## License ##

The Electric Imp Sublime Plug-in is licensed under the [MIT License](./LICENSE).


