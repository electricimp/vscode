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


const util = require('util');
const path = require('path');
const vscode = require('vscode');
const Api = require('./api');
const Auth = require('./auth');
const User = require('./user');
const Workspace = require('./workspace');

function getTitle() {
    return 'Create New Project';
}

const projectTypes = {
    existDG: 'Exist DG',
    newDG: 'New DG',
    newProduct: 'New Product',
};

function shouldResume() {
    return new Promise(() => {});
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

async function getDGName(input, state) {
    let dgList;
    try {
        dgList = await Api.getDGList(state.accessToken);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.DG_LIST}`, nextState.err);
        return;
    }

    function nameIsUnique(name) { return dgList.get(name) ? 'Already exist' : ''; }

    const pick = await input.showInputBox(
        getTitle(),
        3,
        3,
        state.dgName || '',
        'Choose a unique DG name',
        nameIsUnique,
        [backButton],
        shouldResume,
    );

    const nextState = state;
    nextState.dgName = pick;
}

async function getProductName(input, state) {
    let productList;
    try {
        productList = await Api.getProductList(state.accessToken);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.PRODUCT_LIST}`, nextState.err);
        return undefined;
    }

    function nameIsUnique(name) { return productList.get(name); }

    const pick = await input.showInputBox(
        getTitle(),
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
        dgList = await Api.getDGList(state.accessToken);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.DG_LIST}`, nextState.err);
        return;
    }

    const pick = await input.showQuickPick(
        getTitle(),
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
}

async function pickProductFromList(input, state) {
    let productList;
    try {
        productList = await Api.getProductList(state.accessToken);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.PRODUCT_LIST}`, nextState.err);
        return undefined;
    }

    const pick = await input.showQuickPick(
        getTitle(),
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
        getTitle(),
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

class FlowAction {
    constructor() {
        this.back = new FlowAction();
        this.cancel = new FlowAction();
        this.resume = new FlowAction();
    }
}

class Project {
    constructor() {
        this.current = undefined;
        this.steps = [];
    }

    async showInputBox(title, step, totalSteps, value, prompt, validate, buttons, resume) {
        const disposables = [];
        try {
            return await new Promise((resolve, reject) => {
                const input = vscode.window.createInputBox();
                input.title = title;
                input.step = step;
                input.totalSteps = totalSteps;
                input.value = value || '';
                input.prompt = prompt;
                input.buttons = [
                    ...(this.steps.length > 1 ? [vscode.QuickInputButtons.Back] : []),
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
                    })()
                        .catch(reject);
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
                input.buttons = (this.steps.length > 1 ? [vscode.QuickInputButtons.Back] : [])
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
        const input = new Project();
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

    static async collectInputs(token) {
        const state = {
            accessToken: token,
        };
        await Project.run(input => pickNewProjectType(input, state));
        return state;
    }

    static async newProject(accessToken) {
        const state = await Project.collectInputs(accessToken);

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
         */
        console.log(util.inspect(state, { showHidden: false, depth: null }));
    }
}

function newProjectDialog() {
    Auth.authorize().then(Project.newProject);
}
module.exports.newProjectDialog = newProjectDialog;
