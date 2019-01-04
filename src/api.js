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


const ImpCentralApi = require('imp-central-api');
const User = require('./user');

const DeviceGroups = ImpCentralApi.DeviceGroups;

function login(creds) {
    return new Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.login(creds.username, creds.password)
            .then(authInfo => resolve(authInfo), err => reject(new Error(`${User.ERRORS.AUTH_LOGIN} ${err}`)));
    });
}
module.exports.login = login;

function getAgentURL(accessToken, deviceID) {
    return new Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.devices.get(deviceID).then((result) => {
            resolve(result.data.attributes.agent_url);
        }, (err) => {
            reject(err);
        });
    });
}
module.exports.getAgentURL = getAgentURL;

function addDeviceToDG(accessToken, dgID, deviceID) {
    return new Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.deviceGroups.addDevices(dgID, deviceID).then(() => {
            resolve();
        }, (err) => {
            reject(err);
        });
    });
}
module.exports.addDeviceToDG = addDeviceToDG;

function removeDeviceFromDG(accessToken, dgID, deviceID) {
    return new Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.deviceGroups.removeDevices(dgID, null, deviceID)
            .then(() => {
                resolve();
            }, (err) => {
                reject(err);
            });
    });
}
module.exports.removeDeviceFromDG = removeDeviceFromDG;

function getProductList(accessToken) {
    return new Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.products.list().then((result) => {
            const products = new Map();
            result.data.forEach((item) => {
                products.set(item.attributes.name, item);
            });
            resolve(products);
        }, (err) => {
            reject(err);
        });
    });
}
module.exports.getProductList = getProductList;

function getDGList(accessToken) {
    return new Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.deviceGroups.list().then((result) => {
            const deviceGroups = new Map();
            result.data.forEach((item) => {
                deviceGroups.set(item.attributes.name, item);
            });
            resolve(deviceGroups);
        }, (err) => {
            reject(err);
        });
    });
}
module.exports.getDGList = getDGList;

function newProduct(accessToken, productName) {
    const attrs = {
        name: productName,
    };

    return Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.products.create(attrs).then((product) => {
            resolve(product);
        }, (err) => {
            reject(err);
        });
    });
}
module.exports.newProduct = newProduct;

function newDG(accessToken, productID, dgName) {
    const attrs = {
        name: dgName,
    };

    return new Promise((resolve, reject) => {
        const api = new ImpCentralApi();
        api.auth.accessToken = accessToken;
        api.deviceGroups.create(productID, DeviceGroups.TYPE_DEVELOPMENT, attrs).then((dg) => {
            resolve(dg);
        }, (err) => {
            reject(err);
        });
    });
}
module.exports.newDG = newDG;
