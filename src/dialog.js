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
const Api = require('./api');
const Auth = require('./auth');
const User = require('./user');
const Workspace = require('./workspace');

function getLoginTitle() {
    return 'Electric Imp Login';
}

function getCreateProjectTitle() {
    return 'Create New Project';
}

const projectTypes = {
    existDG: 'Exist DG',
    newDG: 'New DG',
    newProduct: 'New Product',
};

function shouldResume() {
    return new Promise((resolve) => {
        if (vscode.window.state.focused) {
            resolve(false);
        } else {
            resolve(true);
        }
    });
}

class Button {
    constructor(iconPath, tooltip) {
        this.iconPath = iconPath;
        this.tooltip = tooltip;
        this.isMyButton = true;
    }
}

const backButton = new Button({
    dark: vscode.Uri.file(path.join(Workspace.Path.getPWD(), 'resources/dark/add.svg')),
    light: vscode.Uri.file(path.join(Workspace.Path.getPWD(), 'resources/light/add.svg')),
}, 'Create Resource Group');

async function getPassword(input, state) {
    const pick = await input.showInputBox(
        getLoginTitle(),
        2,
        2,
        state.password || '',
        User.MESSAGES.AUTH_PROMPT_ENTER_PWD,
        () => {},
        undefined,
        shouldResume,
        true,
    );

    const nextState = state;
    nextState.password = pick;
}

async function getUsername(input, state) {
    const pick = await input.showInputBox(
        getLoginTitle(),
        1,
        2,
        state.username || '',
        User.MESSAGES.AUTH_PROMPT_ENTER_CREDS,
        () => {},
        undefined,
        shouldResume,
    );

    const nextState = state;
    nextState.username = pick;

    return nextIn => getPassword(nextIn, nextState);
}

async function getDGName(input, state) {
    let checkName;
    let dgList;
    function nameIsUnique(name) { return dgList.get(name) ? 'Already exist' : ''; }

    if (state.product) {
        try {
            dgList = await Api.getDGList(state.accessToken, state.product.id, state.owner);
        } catch (err) {
            const nextState = state;
            nextState.err = err;
            User.showImpApiError(`${User.ERRORS.DG_LIST}`, nextState.err);
            return;
        }

        checkName = nameIsUnique;
    } else {
        checkName = () => {};
    }

    const pick = await input.showInputBox(
        getCreateProjectTitle(),
        3,
        3,
        state.dgName || '',
        'Choose a unique DG name',
        checkName,
        [backButton],
        shouldResume,
    );

    const nextState = state;
    nextState.dgName = pick;
    nextState.completed = true;
}

async function getProductName(input, state) {
    let productList;
    try {
        productList = await Api.getProductList(state.accessToken, state.owner);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.PRODUCT_LIST}`, nextState.err);
        return undefined;
    }

    function nameIsUnique(name) { return productList.get(name) ? 'Already exist' : ''; }

    const pick = await input.showInputBox(
        getCreateProjectTitle(),
        2,
        3,
        state.productName || '',
        'Choose a unique Product name',
        nameIsUnique,
        [backButton],
        shouldResume,
    );

    const nextState = state;
    nextState.productName = pick;

    return nextIn => getDGName(nextIn, nextState);
}

async function pickDGFromList(input, state) {
    let dgList;
    try {
        dgList = await Api.getDGList(state.accessToken, state.product.id, state.owner);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.DG_LIST}`, nextState.err);
        return;
    }

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        3,
        3,
        'Pick the DG name',
        Array.from(dgList.keys()).map(label => ({ label })),
        typeof state.dgName !== 'string' ? state.dgName : undefined,
        [backButton],
        shouldResume,
    );

    const nextState = state;
    nextState.dgName = pick.label;
    nextState.dg = dgList.get(pick.label);
    nextState.completed = true;
}

async function pickProductFromList(input, state) {
    let productList;
    try {
        productList = await Api.getProductList(state.accessToken, state.owner);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.PRODUCT_LIST}`, nextState.err);
        return undefined;
    }

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        2,
        3,
        'Pick the product name',
        Array.from(productList.keys()).map(label => ({ label })),
        typeof state.productName !== 'string' ? state.productName : undefined,
        [backButton],
        shouldResume,
    );

    const nextState = state;
    nextState.productName = pick.label;
    nextState.product = productList.get(pick.label);
    switch (state.type) {
    case projectTypes.existDG:
        return nextIn => pickDGFromList(nextIn, nextState);
    case projectTypes.newDG:
        return nextIn => getDGName(nextIn, nextState);
    default:
        return undefined;
    }
}

async function pickNewProjectType(input, state) {
    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        1,
        3,
        'The project will be based on',
        Object.values(projectTypes).map(label => ({ label })),
        typeof state.projectType !== 'string' ? state.projectType : undefined,
        undefined,
        shouldResume,
    );

    const nextState = state;
    switch (pick.label) {
    case projectTypes.existDG:
        nextState.type = projectTypes.existDG;
        return nextIn => pickProductFromList(nextIn, nextState);
    case projectTypes.newDG:
        nextState.type = projectTypes.newDG;
        return nextIn => pickProductFromList(nextIn, nextState);
    case projectTypes.newProduct:
        nextState.type = projectTypes.newProduct;
        return nextIn => getProductName(nextIn, nextState);
    default:
        return undefined;
    }
}

async function pickOwner(input, state) {
    let owners;
    try {
        owners = await Api.getOwners(state.accessToken);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.OWNERS_LIST}`, nextState.err);
        return undefined;
    }

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        0,
        3,
        'Pick the owner',
        Array.from(owners.keys()).map(label => ({ label })),
        typeof state.owner !== 'string' ? state.owner : undefined,
        undefined,
        shouldResume,
    );

    const nextState = state;
    nextState.owner = owners.get(pick.label);
    return nextIn => pickNewProjectType(nextIn, nextState);
}

async function checkIfProjectAlreadyExist(input, state) {
    let config;
    try {
        config = await Workspace.Data.getWorkspaceInfo();
    } catch (err) {
        // Correct behaviour, we cannot read workspace in the cwd.
        const nextState = state;
        return nextIn => pickOwner(nextIn, nextState);
    }

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        0,
        3,
        'The project already exist, overwrite it?',
        ['No', 'Yes'].map(label => ({ label })),
        typeof state.alreadyExist !== 'string' ? state.projectType : undefined,
        undefined,
        shouldResume,
    );

    const nextState = state;
    if (pick.label === 'Yes') {
        return nextIn => pickOwner(nextIn, nextState);
    }

    nextState.config = config;
    return undefined;
}

const FlowAction = {
    back: 0,
    cancel: 1,
    resume: 2,
};

class Dialog {
    constructor() {
        this.showBackButtonAfterSteps = 2;
        this.current = undefined;
        this.steps = [];
    }

    async showInputBox(title, step, totalSteps, value, prompt, validate, buttons, resume, pwd) {
        const disposables = [];
        try {
            return await new Promise((resolve, reject) => {
                const input = vscode.window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.password = pwd;
                input.buttons = [
                    ...(this.steps.length > this.showBackButtonAfterSteps
                        ? [vscode.QuickInputButtons.Back] : []),
                    ...(buttons || []),
                ];
                let validating = validate('');
                disposables.push(input.onDidTriggerButton(() => {
                    reject(FlowAction.back);
                }), input.onDidAccept(async () => {
                    const value0 = input.value;
                    input.enabled = false;
                    input.busy = true;
                    if (!(await validate(value0))) {
                        resolve(value0);
                    }
                    input.enabled = true;
                    input.busy = false;
                }), input.onDidChangeValue(async (text) => {
                    const current = validate(text);
                    validating = current;
                    const validationMessage = await current;
                    if (current === validating) {
                        input.validationMessage = validationMessage;
                    }
                }), input.onDidHide(() => {
                    (async () => {
                        reject(resume &&
                            await shouldResume() ? FlowAction.resume : FlowAction.cancel);
                    })().catch(reject);
                }));
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    async showQuickPick(title, step, totalSteps, placeholder, items, activeItem, buttons, resume) {
        const disposables = [];
        try {
            return await new Promise((resolve, reject) => {
                const input = vscode.window.createQuickPick();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.placeholder = placeholder;
                input.items = items;
                if (activeItem) {
                    input.activeItems = [activeItem];
                }
                input.buttons = (this.steps.length > this.showBackButtonAfterSteps
                    ? [vscode.QuickInputButtons.Back] : [])
                    .concat((buttons || []));
                disposables.push(input.onDidTriggerButton(() => {
                    reject(FlowAction.back);
                }), input.onDidChangeSelection(itm =>
                    resolve(itm[0])), input.onDidHide(() => {
                    (async () => {
                        reject(resume && await shouldResume() ?
                            FlowAction.resume : FlowAction.cancel);
                    })().catch(reject);
                }));
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    static async run(start) {
        const input = new Dialog();
        return input.stepThrough(start);
    }

    async stepThrough(start) {
        let step = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            } catch (err) {
                if (err === FlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                } else if (err === FlowAction.resume) {
                    step = this.steps.pop();
                } else if (err === FlowAction.cancel) {
                    step = undefined;
                } else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }

    static async loginCollectInputs() {
        const state = {};
        await Dialog.run(input => getUsername(input, state));
        return state;
    }

    static async newProjectCollectInputs(token) {
        const state = {
            accessToken: token,
        };
        await Dialog.run(input => checkIfProjectAlreadyExist(input, state));
        return state;
    }

    // Initiate user login dialog using username/password authorization.
    // Save file with access token in the workspace directory.
    //
    // Parameters:
    //     none
    //
    // Returns:
    //     none
    //
    static async login() {
        const state = await Dialog.loginCollectInputs();

        /*
         * The state.username and state.password values are expected.
         */
        // console.log(util.inspect(state, { showHidden: false, depth: null }));
        if (state.username && state.password) {
            Api.login(state)
                .then(Workspace.Data.storeAuthInfo)
                .then(() => vscode.window.showInformationMessage(User.MESSAGES.AUTH_SUCCESS))
                .catch(err => vscode.window.showErrorMessage(err.message));
        }
    }

    static async newProject(accessToken) {
        const state = await Dialog.newProjectCollectInputs(accessToken);

        /*
         * Here we have state after user new project dialog.
         * How to use it:
         * 1) Ensure, that state.err is note defined.
         *
         * 2) If state.type == 'Exist DG':
         * state should contait state.dgName and state.dg variables.
         *
         * 3) If state.type == 'New DG':
         * state should contain state.productName, state.product and state.dgName.
         * The DG could be created later.
         *
         * 4) if state.type == 'New Product':
         * state should contain state.productName and state.dgName.
         * The product and device group could be created later.
         *
         * 5) if state.config is defined, it mean that user rejected new project creation.
         *
         * 6) The state.owner should be defined in all cases.
         */
        // console.log(util.inspect(state, { showHidden: false, depth: null }));
        if (state.completed === undefined) {
            return undefined;
        }

        switch (state.type) {
        case projectTypes.existDG:
            Workspace.newProjectExistDG(state.dg.id);
            break;
        case projectTypes.newDG:
            Workspace.newProjectNewDG(state.accessToken, state.product, state.dgName);
            break;
        case projectTypes.newProduct:
            Workspace.newProjectNewProduct(state.accessToken, state.productName, state.dgName, state.owner);
            break;
        default:
            break;
        }

        return undefined;
    }
}

function loginDialog() {
    Dialog.login();
}
module.exports.loginDialog = loginDialog;

function newProjectDialog() {
    Auth.authorize().then(Dialog.newProject);
}
module.exports.newProjectDialog = newProjectDialog;
