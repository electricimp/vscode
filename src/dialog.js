// MIT License
//
// Copyright 2018-2023 Electric Imp
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
const vscode = require('vscode');
const Api = require('./api');
const Auth = require('./auth');
const User = require('./user');
const Workspace = require('./workspace');

function getCreateProjectTitle() {
    return 'Create New Project';
}

function getNewProductPickItem() {
    return '> Create New Product';
}

function getNewDeviceGroupPickItem() {
    return '> Create New Device Group';
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

async function getDGName(input, state) {
    let checkName;
    let dgList;
    function nameIsUnique(name) { return dgList.get(name) ? 'Already exist' : ''; }

    if (state.type === projectTypes.newDG) {
        try {
            dgList = await Api.getDGList(state.cloudURL, state.accessToken, state.product.id, state.owner);
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
        [],
        shouldResume,
    );

    const nextState = state;
    nextState.dgName = pick;
    nextState.completed = true;
}

async function getProductName(input, state) {
    let productList;
    try {
        productList = await Api.getProductList(state.cloudURL, state.accessToken, state.owner);
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
        [],
        shouldResume,
    );

    const nextState = state;
    nextState.productName = pick;

    return nextIn => getDGName(nextIn, nextState);
}

async function pickDGFromList(input, state) {
    let dgs;
    try {
        dgs = await Api.getDGList(state.cloudURL, state.accessToken, state.product.id, state.owner);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.DG_LIST}`, nextState.err);
        return;
    }

    const dgList = Array.from(dgs.keys());
    dgList.sort();
    dgList.unshift(getNewDeviceGroupPickItem());

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        2,
        3,
        'Pick the DG',
        dgList.map(label => ({ label })),
        typeof state.dgName !== 'string' ? state.dgName : undefined,
        [],
        shouldResume,
    );

    const nextState = state;
    if (pick.label === getNewDeviceGroupPickItem()) {
        nextState.type = projectTypes.newDG;
        return nextIn => getDGName(nextIn, nextState);
    }

    nextState.type = projectTypes.existDG;
    nextState.dgName = pick.label;
    nextState.dg = dgs.get(pick.label);
    nextState.completed = true;
}

async function pickProductFromList(input, state) {
    let products;
    try {
        products = await Api.getProductList(state.cloudURL, state.accessToken, state.owner);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.PRODUCT_LIST}`, nextState.err);
        return undefined;
    }

    const productsList = Array.from(products.keys());
    productsList.sort();
    productsList.unshift(getNewProductPickItem());

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        1,
        3,
        'Pick the product',
        productsList.map(label => ({ label })),
        typeof state.productName !== 'string' ? state.productName : undefined,
        [],
        shouldResume,
    );

    const nextState = state;
    if (pick.label === getNewProductPickItem()) {
        nextState.type = projectTypes.newProduct;
        return nextIn => getProductName(nextIn, nextState);
    }

    nextState.productName = pick.label;
    nextState.product = products.get(pick.label);
    return nextIn => pickDGFromList(nextIn, nextState);
}

async function pickOwner(input, state) {
    let me;
    let owners;
    try {
        me = await Api.getMe(state.cloudURL, state.accessToken);
        owners = await Api.getOwners(state.cloudURL, state.accessToken);
    } catch (err) {
        const nextState = state;
        nextState.err = err;
        User.showImpApiError(`${User.ERRORS.OWNERS_LIST}`, nextState.err);
        return undefined;
    }

    if (owners.size === 0) {
        const nextState = state;
        nextState.owner = me.data.id;
        return nextIn => pickProductFromList(nextIn, nextState);
    }

    const usersList = Array.from(owners.keys());
    usersList.sort();
    usersList.unshift(me.data.attributes.username);

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        0,
        3,
        'Pick the owner',
        usersList.map(label => ({ label })),
        typeof state.owner !== 'string' ? state.owner : undefined,
        undefined,
        shouldResume,
    );

    const nextState = state;

    if (pick.label === me.data.attributes.username) {
        nextState.owner = me.data.id;
    } else {
        nextState.owner = owners.get(pick.label);
    }

    return nextIn => pickProductFromList(nextIn, nextState);
}

async function checkIfProjectAlreadyExist(input, state) {
    const nextState = state;

    try {
        nextState.auth = await Workspace.Data.getAuthInfo();
        nextState.accessToken = nextState.auth.accessToken.access_token;
    } catch (err) {
        /*
         * If we cannot get auth information, start the login procedure below.
         * The auth information should be saved later too.
         */
    }

    if (nextState.auth === undefined) {
        try {
            nextState.cloudURL = await Auth.getCloudUrl();
            nextState.auth = await Auth.getUserCreds(nextState.cloudURL);
            nextState.accessToken = nextState.auth.accessToken.access_token;
        } catch (error) {
            User.processError(error);
            return undefined;
        }
    }

    try {
        nextState.config = await Workspace.Data.getWorkspaceInfo();
    } catch (err) {
        /*
         * Correct behaviour, we cannot read workspace in the cwd.
         */
    }

    if (nextState.config === undefined) {
        if (nextState.cloudURL === undefined) {
            try {
                nextState.cloudURL = await Auth.getCloudUrl();
            } catch (error) {
                User.processError(error);
                return undefined;
            }
        }

        return nextIn => pickOwner(nextIn, nextState);
    }

    const pick = await input.showQuickPick(
        getCreateProjectTitle(),
        0,
        3,
        'The project already exist, overwrite it?',
        ['No', 'Yes'].map(label => ({ label })),
        typeof state.alreadyExist !== 'string' ? state.alreadyExist : undefined,
        undefined,
        shouldResume,
    );

    if (pick.label === 'Yes') {
        if (nextState.cloudURL === undefined) {
            try {
                nextState.cloudURL = await Auth.getCloudUrl();
            } catch (error) {
                User.processError(error);
                return undefined;
            }
        }

        return nextIn => pickOwner(nextIn, nextState);
    }

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

    static async newProjectCollectInputs() {
        const state = {};
        await Dialog.run(input => checkIfProjectAlreadyExist(input, state));
        return state;
    }

    static async newProject() {
        const state = await Dialog.newProjectCollectInputs();

        /*
         * Here we have state after user new project dialog.
         * How to use it:
         * 1) Ensure, that the state.err is not defined.
         *
         * 2) If state.auth is defined, do not forget to save it.
         *
         * 3) If state.type == 'Exist DG':
         * state should contain state.dgName and state.dg variables.
         *
         * 2) If state.type == 'New DG':
         * state should contain state.productName, state.product and state.dgName.
         * The DG could be created later.
         *
         * 5) if state.type == 'New Product':
         * state should contain state.productName and state.dgName.
         * The product and device group could be created later.
         *
         * 6) The state.owner should be defined in all cases.
         */
        // console.log(util.inspect(state, { showHidden: false, depth: null }));
        if (state.completed === undefined) {
            return undefined;
        }

        if (state.auth) {
            await Workspace.Data.storeAuthInfo({ accessToken: state.auth.accessToken });
        }

        switch (state.type) {
        case projectTypes.existDG:
            Workspace.newProjectExistDG(state.cloudURL, state.accessToken, state.dg, state.owner);
            break;
        case projectTypes.newDG:
            Workspace.newProjectNewDG(state.cloudURL, state.accessToken, state.product, state.dgName, state.owner);
            break;
        case projectTypes.newProduct:
            Workspace.newProjectNewProduct(state.cloudURL, state.accessToken, state.productName, state.dgName, state.owner);
            break;
        default:
            break;
        }

        return undefined;
    }
}

function newProjectDialog() {
    Dialog.newProject();
}
module.exports.newProjectDialog = newProjectDialog;
